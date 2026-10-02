import { examplePortfolio } from "../../shared/examples/portfolio";
import { SF } from "../liquidation/fixed-point";
import { D } from "../risk/metrics";
import type { AllocationContext } from "./plan";
export function exampleAllocationContext(shockBps: number, selected?: string[]): AllocationContext {
  const portfolio = examplePortfolio(),
    inputs: AllocationContext["inputs"] = {};
  if (selected)
    portfolio.positions = portfolio.positions.filter((s) => selected.includes(s.position));
  for (const s of portfolio.positions)
    inputs[s.position] = {
      debtAmountSf: (BigInt(s.debt.amountAtomic) * SF).toString(),
      collateralCTAtomic: s.collateral.amountAtomic,
      collateralSupplyAtomic: "1000000000",
      collateralLiquiditySf: (1000000000n * SF).toString(),
      collateralPriceSf: new D(s.collateral.priceUsd)
        .mul(SF.toString())
        .mul(10000 - shockBps)
        .div(10000)
        .floor()
        .toFixed(0),
      debtPriceSf: new D(s.debt.priceUsd).mul(SF.toString()).floor().toFixed(0),
      collateralDecimals: 9,
      debtDecimals: 6,
      borrowFactorPct: 100,
      thresholdPct: s.liquidationThresholdBps / 100,
      closeFactorPct: 20,
      insolvencyLtvPct: 95,
      minFullLiquidationUsd: "2",
      maxDebtPerEventUsd: "500000",
      minBonusBps: 100,
      maxBonusBps: 1000,
      protocolFeePct: 0,
    };
  return {
    portfolio,
    inputs,
    feePerStepLamports: "6000",
    solPriceUsd: "100",
    programFingerprint: "synthetic-no-chain-execution",
    configFingerprint: "fixed-demo-pair-v1",
  };
}
