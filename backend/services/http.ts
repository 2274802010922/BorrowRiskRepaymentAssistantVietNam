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
            ].includes(rawCode)
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
