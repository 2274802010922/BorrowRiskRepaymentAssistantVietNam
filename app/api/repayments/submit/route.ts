import { NextResponse } from "next/server";
import { submitRepayment } from "../../../../solana/transactions/repay";
import { apiError, readJson } from "../../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    return NextResponse.json(await submitRepayment(await readJson(request)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
