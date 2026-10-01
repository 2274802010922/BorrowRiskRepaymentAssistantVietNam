import {
  goalSchema,
  portfolioSchema,
  type GoalPlan,
  type PortfolioSnapshot,
  type RepaymentGoal,
} from "../../shared/portfolio";
import { D, units } from "../risk/metrics";
import { planRepayment } from "./planner";
import type { PositionSnapshot } from "../../shared/types";

export function liquidationBuffer(
  s: PositionSnapshot,
  shockBps: number,
  repayAtomic = "0",
): string | null {
  const debt = units(
    (BigInt(s.debt.amountAtomic) - BigInt(repayAtomic)).toString(),
    s.debt.decimals,
  )
    .mul(s.debt.priceUsd)
    .mul(s.borrowFactorBps)
    .div(10000);
  if (debt.eq(0)) return null;
  const collateral = units(s.collateral.amountAtomic, s.collateral.decimals)
    .mul(s.collateral.priceUsd)
    .mul(10000 - shockBps)
    .div(10000);
  if (collateral.lte(0)) throw new Error("NO_COLLATERAL");
  return new D(1)
    .minus(debt.div(collateral.mul(s.liquidationThresholdBps).div(10000)))
    .mul(100)
    .toFixed(4);
}

// All-or-goal planning. Partial allocation deliberately requires a verified loss model.
export function planPortfolio(input: PortfolioSnapshot, values: RepaymentGoal): GoalPlan {
  const p = portfolioSchema.parse(input),
    g = goalSchema.parse(values),
    first = p.positions[0];
  const balance = BigInt(first.walletDebtAtomic),
    reserve = BigInt(g.reserveAtomic);
  const available = balance > reserve ? balance - reserve : 0n;
  const spendable = available < BigInt(g.budgetAtomic) ? available : BigInt(g.budgetAtomic);
  const requirements = p.positions.map((s) => ({
    s,
    amount: BigInt(planRepayment(s, { ...g, targetLtvBps: 100 }).requiredRepayAtomic),
  }));
  const required = requirements.reduce((sum, r) => sum + r.amount, 0n);
  const feasible = required <= spendable;
  const steps = requirements
    .sort((a, b) => a.s.position.localeCompare(b.s.position, "en"))
    .map(({ s, amount }) => ({
      position: s.position,
      repayAtomic: (feasible ? amount : 0n).toString(),
      bufferBeforePct: liquidationBuffer(s, g.shockBps),
      bufferAfterPct: liquidationBuffer(s, g.shockBps, (feasible ? amount : 0n).toString()),
    }));
  return {
    version: "goal-v1",
    state: required === 0n ? "already_met" : feasible ? "achievable" : "insufficient_budget",
    spendableAtomic: spendable.toString(),
    requiredAtomic: required.toString(),
    shortfallAtomic: (feasible ? 0n : required - spendable).toString(),
    totalRepayAtomic: (feasible ? required : 0n).toString(),
    walletAfterAtomic: (balance - (feasible ? required : 0n)).toString(),
    steps,
    model: { available: false, reason: "LIQUIDATION_PARITY_NOT_VERIFIED" },
  };
}
