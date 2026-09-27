import { NextResponse } from "next/server";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { apiError, AppError, readJson } from "../../../../backend/services/http";
import { readPosition } from "../../../../solana/adapters/kamino";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const { wallet, position } = z
      .object({
        wallet: z.string().min(32).max(44),
        position: z.string().min(32).max(44).optional(),
      })
      .parse(await readJson(request));
    new PublicKey(wallet);
    try {
      const { snapshot } = await readPosition(wallet, position);
      return NextResponse.json(
        { positions: [snapshot] },
        { headers: { "cache-control": "no-store" } },
      );
    } catch (e) {
      if (e instanceof AppError && e.code === "NO_SUPPORTED_POSITION")
        return NextResponse.json({ positions: [] });
      throw e;
    }
  } catch (e) {
    return apiError(e);
  }
}
