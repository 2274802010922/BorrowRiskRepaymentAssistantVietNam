import { NextResponse } from "next/server";
import { draftGoal } from "../../../../backend/ai/portfolio";
import { apiError, readJson } from "../../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 20;
export async function POST(request: Request) {
  try {
    return NextResponse.json(await draftGoal(await readJson(request)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
