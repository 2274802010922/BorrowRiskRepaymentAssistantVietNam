import Decimal from "decimal.js";
import { snapshotSchema, type Metrics, type PositionSnapshot } from "../../shared/types";

const D = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP });
export { D };
export const units = (atomic: string, decimals: number) =>
  new D(atomic).div(new D(10).pow(decimals));

export function metrics(input: PositionSnapshot, shockBps = 0, repayAtomic = "0"): Metrics {
  const s = snapshotSchema.parse(input);
  if (!Number.isInteger(shockBps) || shockBps < 0 || shockBps > 9000)
    throw new Error("INVALID_SHOCK");
  if (!/^\d+$/.test(repayAtomic) || BigInt(repayAtomic) > BigInt(s.debt.amountAtomic))
    throw new Error("INVALID_REPAYMENT");
  const collateral = units(s.collateral.amountAtomic, s.collateral.decimals)
    .mul(s.collateral.priceUsd)
    .mul(new D(10000 - shockBps).div(10000));
  const debt = units(
    (BigInt(s.debt.amountAtomic) - BigInt(repayAtomic)).toString(),
    s.debt.decimals,
  ).mul(s.debt.priceUsd);
  if (collateral.lte(0) && debt.gt(0)) throw new Error("NO_COLLATERAL");
  const adjustedDebt = debt.mul(s.borrowFactorBps).div(10000);
  return {
    collateralUsd: collateral.toFixed(2),
    debtUsd: debt.toFixed(2),
    ltvPct: debt.eq(0) ? "0.00" : adjustedDebt.div(collateral).mul(100).toFixed(2),
    healthFactor: debt.eq(0)
      ? null
      : collateral.mul(s.liquidationThresholdBps).div(10000).div(adjustedDebt).toFixed(4),
    debtFree: debt.eq(0),
  };
}
