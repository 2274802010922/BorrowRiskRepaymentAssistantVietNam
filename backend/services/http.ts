import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export async function readJson(request: Request) {
  const raw = await request.text();
  if (raw.length > 32_000) throw new AppError("PAYLOAD_TOO_LARGE", 413);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new AppError("INVALID_INPUT");
  }
}
export function apiError(error: unknown) {
  const code =
    error instanceof AppError
      ? error.code
      : error instanceof ZodError
        ? "INVALID_INPUT"
        : "SERVICE_UNAVAILABLE";
  return NextResponse.json(
    { error: { code } },
    {
      status: error instanceof AppError ? error.status : error instanceof ZodError ? 400 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
