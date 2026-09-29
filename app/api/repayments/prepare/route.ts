import { NextResponse } from "next/server";
import { consumeBudget } from "../../../../backend/services/limits";
import { requireExecutionConfig } from "../../../../backend/services/readiness";
import { apiError, readJson } from "../../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await consumeBudget("rpc");
    const input = await readJson(request);
    requireExecutionConfig();
    const { prepareRepayment } = await import("../../../../solana/transactions/repay");
    return NextResponse.json(await prepareRepayment(input), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
