import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeBudget } from "../../../../backend/services/limits";
import { apiError, readJson } from "../../../../backend/services/http";
import { requireExecutionConfig, isPublicKey } from "../../../../backend/services/readiness";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    await consumeBudget("rpc");
    const { wallet } = z
      .object({ wallet: z.string().refine(isPublicKey) })
      .parse(await readJson(request));
    requireExecutionConfig();
    const { readPositions } = await import("../../../../solana/adapters/kamino");
    const positions = await readPositions(wallet);
    return NextResponse.json({ positions }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}
