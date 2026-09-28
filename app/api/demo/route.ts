import { NextResponse } from "next/server";
import { demoAction } from "../../../solana/transactions/demo";
import { apiError, readJson } from "../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    return NextResponse.json(await demoAction(await readJson(request)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
