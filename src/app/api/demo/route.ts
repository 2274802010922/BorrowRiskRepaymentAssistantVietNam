import { NextResponse } from "next/server";
import { consumeBudget } from "../../../backend/services/limits";
import { requireExecutionConfig } from "../../../backend/services/readiness";
import { apiError, readJson } from "../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await consumeBudget("rpc");
    const input = await readJson(request);
    if (!(input && typeof input === "object" && "action" in input && input.action === "status"))
      requireExecutionConfig();
    const { demoAction } = await import("../../../solana/transactions/demo");
    return NextResponse.json(await demoAction(input), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
