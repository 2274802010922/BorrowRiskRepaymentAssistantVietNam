import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";

export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
    cause?: unknown,
  ) {
    super(code, { cause });
  }
}
export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_INPUT");
  const decoder = new TextDecoder();
  let size = 0,
    raw = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32000) {
      await reader.cancel();
      throw new AppError("PAYLOAD_TOO_LARGE", 413);
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError("INVALID_INPUT");
  }
}
export function apiError(error: unknown) {
  const requestId = randomUUID();
  const diagnostics = safeErrorDiagnostics(error);
  const rawCode = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const code =
    error instanceof AppError
      ? error.code
      : error instanceof ZodError
        ? "INVALID_INPUT"
        : [
              "MODULE_NOT_FOUND",
              "ERR_MODULE_NOT_FOUND",
              "ERR_UNSUPPORTED_DIR_IMPORT",
              "ERR_REQUIRE_ESM",
            ].some((code) => diagnostics.causeCodes.includes(code))
          ? "SERVER_DEPENDENCY_ERROR"
          : "SERVICE_UNAVAILABLE";
  // Never log request bodies, headers, wallet addresses, RPC URLs or provider messages.
  console.error(
    JSON.stringify({
      event: "api_error",
      requestId,
      code,
      kind: error instanceof Error ? error.name : "Unknown",
      moduleError:
        rawCode.startsWith("ERR_") || rawCode === "MODULE_NOT_FOUND" ? rawCode : undefined,
      diagnostics,
    }),
  );
  return NextResponse.json(
    { error: { code, requestId } },
    {
      status: error instanceof AppError ? error.status : error instanceof ZodError ? 400 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}

// Internal logs expose only fixed categories and stack file/line numbers, never raw
// error messages, full paths, URLs, request data or provider response bodies.
export function safeErrorDiagnostics(error: unknown) {
  const causeCodes: string[] = [],
    frames: string[] = [],
    categories: string[] = [];
  const seen = new Set<unknown>();
  for (
    let current: unknown = error;
    current && typeof current === "object" && !seen.has(current) && seen.size < 4;
  ) {
    seen.add(current);
    const item = current as {
      code?: unknown;
      message?: unknown;
      stack?: unknown;
      cause?: unknown;
      context?: { __code?: unknown; statusCode?: unknown };
    };
    const context = item.context;
    if (context && typeof context === "object") {
      if (typeof context.__code === "number" && Number.isSafeInteger(context.__code))
        causeCodes.push(`SOLANA_${context.__code}`);
      if (
        typeof context.statusCode === "number" &&
        Number.isInteger(context.statusCode) &&
        context.statusCode >= 100 &&
        context.statusCode <= 599
      )
        causeCodes.push(`RPC_HTTP_${context.statusCode}`);
    }
    if (
      typeof item.code === "string" &&
      /^(MODULE_NOT_FOUND|ERR_[A-Z_0-9]+|UND_ERR_[A-Z_0-9]+|ECONN[A-Z_]+|ETIMEDOUT)$/.test(
        item.code,
      )
    )
      causeCodes.push(item.code.slice(0, 64));
    const message = typeof item.message === "string" ? item.message : "";
    const category =
      /Cannot find module|Failed to load external module|require is not defined|require\(\) of ES Module/i.test(
        message,
      )
        ? "module_load"
        : /Invalid URL|Endpoint URL must start/i.test(message)
          ? "rpc_url"
          : /fetch failed|timeout|timed out/i.test(message)
            ? "network"
            : "other";
    categories.push(category);
    if (typeof item.stack === "string")
      for (const line of item.stack.split("\n").slice(1)) {
        const match = line.match(/[/\\]([^/\\():]+\.(?:js|mjs|cjs|ts)):(\d+):(\d+)\)?$/);
        if (match && frames.length < 6)
          frames.push(
            `${match[1].replace(/[^A-Za-z0-9_.-]/g, "").slice(-100)}:${match[2]}:${match[3]}`,
          );
      }
    current = item.cause;
  }
  return {
    causeCodes: [...new Set(causeCodes)],
    categories: [...new Set(categories)],
    frames: [...new Set(frames)],
  };
}
