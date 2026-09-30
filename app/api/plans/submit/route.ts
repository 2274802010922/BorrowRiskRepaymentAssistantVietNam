import { NextResponse } from "next/server";
import { consumeBudget } from "../../../../backend/services/limits";
import { apiError, readJson } from "../../../../backend/services/http";
import { requireExecutionConfig } from "../../../../backend/services/readiness";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await consumeBudget("rpc");
    const input = await readJson(request);
    requireExecutionConfig();
    const { submitPlan } = await import("../../../../backend/services/plans");
    return NextResponse.json(await submitPlan(input), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
