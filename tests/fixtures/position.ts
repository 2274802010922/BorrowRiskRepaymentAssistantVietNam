import type { PositionSnapshot } from "../../shared/types";

export function exampleSnapshot(): PositionSnapshot {
  return {
    schemaVersion: 1,
    source: "synthetic",
    protocol: "borrowrisk-sandbox",
    cluster: "devnet",
    wallet: "example-wallet",
    position: "example",
    market: "example-market",
    collateral: {
      mint: "example-sol",
      symbol: "SOL",
      decimals: 9,
      amountAtomic: "10000000000",
      priceUsd: "100",
    },
    debt: {
      mint: "example-usdc",
      symbol: "USDC",
      decimals: 6,
      amountAtomic: "600000000",
      priceUsd: "1",
    },
    walletDebtAtomic: "150000000",
    walletSolLamports: "100000000",
    liquidationThresholdBps: 8000,
    borrowFactorBps: 10000,
    observedAt: "2026-09-27T00:00:00.000Z",
    priceObservedAt: "2026-09-27T00:00:00.000Z",
    slot: 0,
    warnings: ["SYNTHETIC_DATA"],
  };
}
