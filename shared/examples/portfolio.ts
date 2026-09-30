import type { PortfolioSnapshot } from "../portfolio";
import type { PositionSnapshot } from "../types";
export function examplePortfolio(): PortfolioSnapshot {
  const base: PositionSnapshot = {
    schemaVersion: 1,
    source: "synthetic",
    protocol: "borrowrisk-sandbox",
    cluster: "devnet",
    wallet: "example-wallet",
    market: "example-market",
    position: "example-a",
    collateral: {
      mint: "example-sol",
      symbol: "SOL",
      decimals: 9,
      amountAtomic: "1000000000",
      priceUsd: "100",
    },
    debt: {
      mint: "example-usdc",
      symbol: "USDC",
      decimals: 6,
      amountAtomic: "65000000",
      priceUsd: "1",
    },
    walletDebtAtomic: "80000000",
    walletSolLamports: "100000000",
    liquidationThresholdBps: 8000,
    borrowFactorBps: 10000,
    observedAt: "2026-09-30T00:00:00.000Z",
    priceObservedAt: "2026-09-30T00:00:00.000Z",
    slot: 0,
    warnings: ["SYNTHETIC_DATA"],
  };
  return {
    version: 1,
    positions: [65, 55, 45].map((debt, i) => ({
      ...base,
      position: `example-${String.fromCharCode(97 + i)}`,
      debt: { ...base.debt, amountAtomic: String(debt * 1e6) },
    })),
  };
}
