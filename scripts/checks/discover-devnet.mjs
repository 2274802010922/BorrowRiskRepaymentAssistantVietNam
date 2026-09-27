import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { assertDevnetGenesis, KAMINO_PROGRAM_ID } from "../../solana/network/constants.mjs";
const require = createRequire(import.meta.url);
const { Reserve } = require("@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/Reserve.js");
const url = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
async function rpc(method, params = []) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(30000),
  });
  const d = await r.json();
  if (d.error) throw new Error("RPC_ERROR");
  return d.result;
}
assertDevnetGenesis(await rpc("getGenesisHash"));
const accounts = await rpc("getProgramAccounts", [
  KAMINO_PROGRAM_ID,
  { encoding: "base64", commitment: "confirmed" },
]);
const reserves = [];
let failedDecodes = 0;
for (const a of accounts) {
  const bytes = Buffer.from(a.account.data[0], "base64");
  if (!bytes.subarray(0, 8).equals(Reserve.discriminator)) continue;
  try {
    const r = Reserve.decode(bytes);
    reserves.push({
      address: a.pubkey,
      market: r.lendingMarket,
      symbol: Buffer.from(r.config.tokenInfo.name).toString().replaceAll("\0", ""),
      mint: r.liquidity.mintPubkey,
      decimals: r.liquidity.mintDecimals.toString(),
      available: r.liquidity.totalAvailableAmount.toString(),
      priceUpdated: r.liquidity.marketPriceLastUpdatedTs.toString(),
      status: r.config.status,
      ltv: r.config.loanToValuePct,
      liquidationLtv: r.config.liquidationThresholdPct,
      pyth: r.config.tokenInfo.pythConfiguration.price,
      scope: r.config.tokenInfo.scopeConfiguration.priceFeed,
    });
  } catch {
    failedDecodes++;
  }
}
await mkdir("work", { recursive: true });
await writeFile(
  "work/devnet-discovery.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), reserves, failedDecodes }, null, 2),
);
console.log(
  JSON.stringify(
    {
      reserves: reserves.length,
      failedDecodes,
      candidates: reserves
        .filter((r) => /SOL|USD/.test(r.symbol) && BigInt(r.available) > 0n)
        .slice(0, 15),
    },
    null,
    2,
  ),
);
