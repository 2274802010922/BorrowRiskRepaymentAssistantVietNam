import { Connection } from "@solana/web3.js";
import { assertDevnetGenesis } from "./constants.mjs";
import { AppError } from "../../backend/services/http";
import { rpcFetch } from "./fetch";
let cached: { url: string; connection: Connection } | undefined;

export function rpcUrl() {
  return process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
}
export function connection() {
  const url = rpcUrl();
  if (cached?.url === url) return cached.connection;
  const c = new Connection(url, {
    commitment: "confirmed",
    fetch: rpcFetch,
    disableRetryOnRateLimit: true,
  });
  cached = { url, connection: c };
  return c;
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
