import { NextResponse } from "next/server";
import { consumeBudget } from "../../../../backend/services/limits";
import { apiError, readJson } from "../../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await consumeBudget("rpc");
    const input = await readJson(request);
    const { repaymentStatus } = await import("../../../../solana/transactions/repay");
    return NextResponse.json(await repaymentStatus(input), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
