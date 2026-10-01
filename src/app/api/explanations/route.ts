import { NextResponse } from "next/server";
import { explain } from "../../../backend/ai/explain";
import { apiError, readJson } from "../../../backend/services/http";
export const runtime = "nodejs";
export const maxDuration = 20;
export async function POST(request: Request) {
  try {
    return NextResponse.json(await explain(await readJson(request)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
