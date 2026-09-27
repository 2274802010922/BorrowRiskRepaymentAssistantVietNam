import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  KaminoMarket,
  KaminoReserve,
  getCurrentLedgerInstant,
  getTokenOracleData,
} = require("@kamino-finance/klend-sdk");
const {
  LendingMarket,
  Reserve,
} = require("@kamino-finance/klend-sdk/dist/@codegen/klend/accounts");
const { createSolanaRpc, address } = require("@solana/kit");
const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
const marketId = process.argv[2] || "9VaMhQPqEjQSByvZfjYFP6iiJLZFKzXTE5MNK9bDg1dr";
const timer = setTimeout(() => {
  console.error("PROBE_TIMEOUT");
  process.exit(1);
}, 45000);
console.log("Loading market account");
const [state] = await LendingMarket.fetchMultiple(rpc, [address(marketId)]);
if (!state) throw new Error("MARKET_NOT_FOUND");
const reserveIds = [
  "5jKCbPgqtJXbWfwi5zERhSmK16jrGuXdkicYekk1maVF",
  "6DndsViDZXLSsQoq9JxCFijdr91Q3uAXoRsHRqjvxFE6",
].map(address);
console.log("Loading configured reserves");
const states = await Reserve.fetchMultiple(rpc, reserveIds);
const entries = states.map((state, i) => ({ address: reserveIds[i], state }));
console.log("Loading oracle accounts");
const oracles = await getTokenOracleData(rpc, entries);
const reserves = new Map(
  oracles.map(([r, oracle]) => {
    if (!oracle) throw new Error("ORACLE_MISSING");
    return [
      r.address,
      KaminoReserve.initialize(r.address, r.state, oracle, rpc, 400, state.reserveRewardsMaxAprBps),
    ];
  }),
);
const market = await KaminoMarket.loadWithReserves(rpc, state, reserves, address(marketId), 400);
const instant = await getCurrentLedgerInstant(rpc);
clearTimeout(timer);
console.log(
  JSON.stringify(
    {
      market: marketId,
      ledger: { slot: String(instant.slot), time: String(instant.blockTime) },
      reserves: market.getReserves().map((r) => ({
        address: r.address,
        symbol: r.getTokenSymbol(),
        mint: r.state.liquidity.mintPubkey,
        price: r.getOracleMarketPrice().toString(),
        oracle: r.tokenOraclePrice,
        priceAgeLimit: r.state.config.tokenInfo.maxAgePriceSeconds.toString(),
        lastPrice: r.state.liquidity.marketPriceLastUpdatedTs.toString(),
      })),
    },
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
