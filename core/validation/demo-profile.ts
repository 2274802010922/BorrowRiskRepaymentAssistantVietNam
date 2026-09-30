import { D } from "../risk/metrics";
export function demoProfile(
  slot: 201 | 202 | 203,
  collateralAtomic: string,
  collateralPrice: string,
  debtPrice: string,
  maxLtv: number,
  borrowFactor: number,
  liquidity: string,
) {
  const ltvPct = { 201: 65, 202: 55, 203: 45 }[slot];
  const ltv = ltvPct / 100;
  if (ltv >= maxLtv || borrowFactor <= 0) throw new Error("DEMO_PROFILE_UNAVAILABLE");
  const amount = new D(collateralAtomic)
    .div(1e9)
    .mul(collateralPrice)
    .mul(ltv)
    .div(borrowFactor)
    .div(debtPrice)
    .mul(1e6)
    .floor();
  if (amount.lt(1) || amount.gt(liquidity) || amount.gt(100000000))
    throw new Error("DEMO_PROFILE_UNAVAILABLE");
  return { amountAtomic: amount.toFixed(0), ltvPct };
}
