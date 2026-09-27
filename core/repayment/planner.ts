import {
  constraintsSchema,
  snapshotSchema,
  type Constraints,
  type PositionSnapshot,
  type RepaymentPlan,
  type RepaymentOption,
} from "../../shared/types";
import { D, metrics, units } from "../risk/metrics";

const min = (...v: bigint[]) => v.reduce((a, b) => (a < b ? a : b));

export function planRepayment(input: PositionSnapshot, values: Constraints): RepaymentPlan {
  const s = snapshotSchema.parse(input),
    c = constraintsSchema.parse(values);
  if (c.targetLtvBps >= s.liquidationThresholdBps)
    throw new Error("TARGET_AT_LIQUIDATION_THRESHOLD");
  const balance = BigInt(s.walletDebtAtomic),
    reserve = BigInt(c.reserveAtomic),
    debt = BigInt(s.debt.amountAtomic);
  const spendable = balance > reserve ? balance - reserve : 0n;
  const maximum = min(BigInt(c.budgetAtomic), spendable, debt);
  const stressedCollateral = units(s.collateral.amountAtomic, s.collateral.decimals)
    .mul(s.collateral.priceUsd)
    .mul(new D(10000 - c.shockBps).div(10000));
  if (stressedCollateral.lte(0) && debt > 0n) throw new Error("NO_COLLATERAL");
  const targetDebtTokens = stressedCollateral
    .mul(c.targetLtvBps)
    .div(s.borrowFactorBps)
    .div(s.debt.priceUsd);
  const targetDebtAtomic = BigInt(
    targetDebtTokens.mul(new D(10).pow(s.debt.decimals)).floor().toFixed(0),
  );
  const required = debt > targetDebtAtomic ? debt - targetDebtAtomic : 0n;
  const options: RepaymentOption[] = [];
  const add = (id: RepaymentOption["id"], amount: bigint) => {
    if (amount <= 0n || options.some((o) => o.repayAtomic === amount.toString())) return;
    options.push({
      id,
      repayAtomic: amount.toString(),
      debtAfterAtomic: (debt - amount).toString(),
      walletAfterAtomic: (balance - amount).toString(),
      current: metrics(s, 0, amount.toString()),
      stressed: metrics(s, c.shockBps, amount.toString()),
      meetsTarget: amount >= required,
    });
  };
  if (required > 0n && required <= maximum) add("target", required);
  add("maximum", maximum);
  return {
    current: metrics(s),
    stressed: metrics(s, c.shockBps),
    maxRepayAtomic: maximum.toString(),
    requiredRepayAtomic: required.toString(),
    shortfallAtomic: (required > maximum ? required - maximum : 0n).toString(),
    targetAlreadyMet: required === 0n,
    options,
  };
}
