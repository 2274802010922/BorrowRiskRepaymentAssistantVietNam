import { Connection } from "@solana/web3.js";
import { assertDevnetGenesis } from "./constants.mjs";
import { AppError } from "../../backend/services/http";

export function rpcUrl() {
  return process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
}
export function connection() {
  return new Connection(rpcUrl(), {
    commitment: "confirmed",
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    disableRetryOnRateLimit: true,
  });
}
export async function devnetConnection() {
  const c = connection();
  try {
    assertDevnetGenesis(await c.getGenesisHash());
  } catch {
    throw new AppError("DEVNET_UNAVAILABLE", 503);
  }
  return c;
}
