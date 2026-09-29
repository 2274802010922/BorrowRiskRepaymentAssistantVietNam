import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  priceUpdateV2,
} = require("@kamino-finance/klend-sdk/dist/@codegen/pyth_rec/accounts/priceUpdateV2.js");
const Decimal = require("decimal.js");
const feeds = [
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
  "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX",
];
const r = await fetch("https://api.devnet.solana.com", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getMultipleAccounts",
    params: [feeds, { encoding: "base64", commitment: "confirmed" }],
  }),
  signal: AbortSignal.timeout(15000),
});
const result = await r.json();
if (result.error || !result.result) throw new Error("RPC_UNAVAILABLE");
for (const [i, account] of result.result.value.entries()) {
  if (!account) throw new Error("FEED_MISSING");
  const state = priceUpdateV2.decode(Buffer.from(account.data[0], "base64")),
    m = state.priceMessage;
  const price = new Decimal(m.price.toString()),
    confidence = new Decimal(m.conf.toString()),
    scale = new Decimal(10).pow(m.exponent);
  console.log(
    JSON.stringify({
      feed: feeds[i],
      owner: account.owner,
      verification: state.verificationLevel.kind,
      exponent: m.exponent,
      rawPrice: price.toString(),
      rawConfidence: confidence.toString(),
      priceUsd: price.mul(scale).toString(),
      confidenceUsd: confidence.mul(scale).toString(),
      confidencePercent: confidence.div(price).mul(100).toString(),
      sdk11Comparison: price.mul(scale).gt(confidence.mul(50)),
      sameUnitComparison: price.gt(confidence.mul(50)),
      ageSeconds: Math.floor(Date.now() / 1000) - Number(m.publishTime.toString()),
    }),
  );
}
