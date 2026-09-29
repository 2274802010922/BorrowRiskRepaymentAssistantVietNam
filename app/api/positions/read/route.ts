import { NextResponse } from "next/server";
import { consumeBudget } from "../../../../backend/services/limits";
import { z } from "zod";
import { apiError, AppError, readJson } from "../../../../backend/services/http";
import { requireExecutionConfig, isPublicKey } from "../../../../backend/services/readiness";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    await consumeBudget("rpc");
    const { wallet, position } = z
      .object({
        wallet: z.string().min(32).max(44).refine(isPublicKey),
        position: z.string().min(32).max(44).refine(isPublicKey).optional(),
      })
      .parse(await readJson(request));
    requireExecutionConfig();
    const { readPositions } = await import("../../../../solana/adapters/kamino");
    try {
      const positions = await readPositions(wallet, position);
      return NextResponse.json({ positions }, { headers: { "cache-control": "no-store" } });
    } catch (e) {
      if (e instanceof AppError && e.code === "NO_SUPPORTED_POSITION")
        return NextResponse.json({ positions: [] }, { headers: { "cache-control": "no-store" } });
      throw e;
    }
  } catch (e) {
    return apiError(e);
  }
}
