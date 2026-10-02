import { planPortfolio, liquidationBuffer } from "../repayment/portfolio";
import { planRepayment } from "../repayment/planner";
import { D } from "../risk/metrics";
import {
  priceLiquidationEvent,
  type LiquidationInput,
  usdFromSf,
} from "../liquidation/kamino-price-event";
import { SF, bps, percent, mul, min, max, ceilAtomic } from "../liquidation/fixed-point";
import { liquidationManifest } from "../liquidation/manifest";
import { searchAllocation, type AllocationGrid, type Candidate } from "./search";
import {
  portfolioSchema,
  goalSchema,
  type PortfolioSnapshot,
  type RepaymentGoal,
} from "../../shared/portfolio";
import type { AllocationPlan } from "../../shared/allocation";

export type AllocationContext = {
  portfolio: PortfolioSnapshot;
  inputs: Record<string, LiquidationInput>;
  feePerStepLamports: string;
  solPriceUsd: string;
  programFingerprint: string;
  configFingerprint: string;
};
export function planAllocation(
  context: AllocationContext,
  values: RepaymentGoal,
  remaining?: { frozenPositions: string[] },
): AllocationPlan {
  if (!liquidationManifest.verified) throw new Error("LIQUIDATION_PARITY_NOT_VERIFIED");
  const portfolio = portfolioSchema.parse(context.portfolio),
    goal = goalSchema.parse(values),
    original = planPortfolio(portfolio, goal);
  if (!remaining && original.state !== "insufficient_budget")
    throw new Error("ALLOCATION_NOT_NEEDED");
  if (
    !/^\d{1,20}$/.test(context.feePerStepLamports) ||
    BigInt(context.feePerStepLamports) > 50000n ||
    !new D(context.solPriceUsd).isFinite() ||
    new D(context.solPriceUsd).lte(0)
  )
    throw new Error("INVALID_ALLOCATION_FEE");
  const positions = [...portfolio.positions].sort((a, b) =>
      a.position.localeCompare(b.position, "en"),
    ),
    spendable = BigInt(original.spendableAtomic);
  const feeUsd = new D(context.feePerStepLamports)
    .div(1000000000)
    .mul(context.solPriceUsd)
    .toString();
  const items = positions.map((s) => {
    const input = context.inputs[s.position];
    if (!input) throw new Error("UNSUPPORTED_LIQUIDATION_CONTEXT");
    const required = BigInt(planRepayment(s, { ...goal, targetLtvBps: 100 }).requiredRepayAtomic);
    const before = priceLiquidationEvent(input);
    const allowedRequired = remaining?.frozenPositions.includes(s.position) ? 0n : required;
    const limit = min(allowedRequired, spendable, ceilAtomic(BigInt(input.debtAmountSf)));
    const make = (amount: bigint): Candidate => {
      const event = priceLiquidationEvent(input, amount.toString());
      return {
        repayAtomic: amount.toString(),
        lossUsd: event.lossUsd,
        feeUsd: amount > 0n ? feeUsd : "0",
        protectedCollateralUsd: amount >= required ? usdFromSf(event.collateralValueSf) : "0",
      };
    };
    return { s, input, required, allowedRequired, before, limit, make };
  });
  function baseline(kind: "none" | "equal" | "risk_first") {
    const amounts = items.map(() => 0n);
    let left = spendable;
    if (kind === "equal") {
      const each = spendable / BigInt(items.length);
      items.forEach((v, i) => {
        amounts[i] = min(v.allowedRequired, each);
        left -= amounts[i];
      });
      for (let i = 0; i < items.length; i++) {
        const add = min(left, items[i].allowedRequired - amounts[i]);
        amounts[i] += add;
        left -= add;
      }
    }
    if (kind === "risk_first") {
      const order = items
        .map((v, i) => ({ i, buffer: liquidationBuffer(v.s, goal.shockBps) }))
        .sort((a, b) => new D(a.buffer ?? "100").cmp(b.buffer ?? "100") || a.i - b.i);
      for (const { i } of order) {
        amounts[i] = min(left, items[i].allowedRequired);
        left -= amounts[i];
      }
    }
    return amounts;
  }
  const baseAmounts = {
    none: baseline("none"),
    equal: baseline("equal"),
    risk_first: baseline("risk_first"),
  };
  const grid: AllocationGrid = items.map((v, i) => {
    const requiredPoints = new Set<string>([
      "0",
      v.limit.toString(),
      ...Object.values(baseAmounts).map((a) => a[i].toString()),
    ]);
    const add = (amount: bigint) => {
      for (const delta of [-1n, 0n, 1n])
        requiredPoints.add(max(0n, min(v.limit, amount + delta)).toString());
    };
    const coll = BigInt(v.before.collateralValueSf),
      debt = BigInt(v.input.debtAmountSf),
      debtPrice = BigInt(v.input.debtPriceSf),
      threshold = BigInt(v.before.thresholdSf);
    const levels = [
      threshold,
      threshold + bps(v.input.minBonusBps),
      threshold + bps(v.input.maxBonusBps),
      percent(v.input.insolvencyLtvPct),
      SF - bps(v.input.minBonusBps),
      SF - bps(v.input.maxBonusBps),
      (SF + threshold) / 2n,
    ];
    for (const level of levels) {
      const remain = (mul(coll, min(SF, level)) * SF * 1000000n) / debtPrice;
      add(debt > remain ? ceilAtomic(debt - remain) : 0n);
    }
    const small = (BigInt(v.input.minFullLiquidationUsd) * SF * SF * 1000000n) / debtPrice;
    add(debt > small ? ceilAtomic(debt - small) : 0n);
    add(v.required);
    if (requiredPoints.size > 201) throw new Error("ALLOCATION_GRID_LIMIT");
    const all = new Set(requiredPoints);
    for (let k = 1; k <= 160; k++) all.add(((v.limit * BigInt(k)) / 160n).toString());
    const candidates = [...all]
      .map(BigInt)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map(v.make);
    if (candidates.length > 201) throw new Error("ALLOCATION_GRID_LIMIT");
    return { position: v.s.position, candidates };
  });
  const result = searchAllocation(grid, spendable.toString(), {
    verified: liquidationManifest.verified,
    version: liquidationManifest.version,
  });
  const choices = result.steps,
    spent = BigInt(result.totalRepayAtomic),
    baselineCost = (id: "none" | "equal" | "risk_first" | "proposed", amounts: bigint[]) => {
      const candidates = items.map((v, i) => v.make(amounts[i]));
      const loss = candidates.reduce((a, c) => a.plus(c.lossUsd), new D(0)),
        fee = candidates.reduce((a, c) => a.plus(c.feeUsd), new D(0));
      return {
        id,
        totalRepayAtomic: amounts.reduce((a, b) => a + b, 0n).toString(),
        lossUsd: loss.toString(),
        feeUsd: fee.toString(),
        costUsd: loss.plus(fee).toString(),
        goalsMet: items.filter((v, i) => amounts[i] >= v.required).length,
      };
    };
  const proposed = baselineCost(
    "proposed",
    choices.map((c) => BigInt(c.repayAtomic)),
  );
  const baselines = [
    baselineCost("none", baseAmounts.none),
    baselineCost("equal", baseAmounts.equal),
    baselineCost("risk_first", baseAmounts.risk_first),
    proposed,
  ];
  const txCount = choices.filter((c) => BigInt(c.repayAtomic) > 0n).length,
    feeLamports = BigInt(context.feePerStepLamports) * BigInt(txCount);
  if (BigInt(positions[0].walletSolLamports) < feeLamports + 2000000n && spent > 0n)
    throw new Error("INSUFFICIENT_SOL");
  return {
    ...original,
    version: "allocation-v1",
    state: spent > 0n ? "partial_available" : "no_beneficial_allocation",
    source: positions[0].source,
    positionCount: positions.length,
    totalRepayAtomic: spent.toString(),
    walletAfterAtomic: (BigInt(positions[0].walletDebtAtomic) - spent).toString(),
    lossBeforeUsd: baselines[0].lossUsd,
    lossAfterUsd: proposed.lossUsd,
    feeUsd: proposed.feeUsd,
    feeLamports: feeLamports.toString(),
    totalCostUsd: proposed.costUsd,
    unspentAtomic: (spendable - spent).toString(),
    remainingGoalRepayAtomic: (BigInt(original.requiredAtomic) - spent).toString(),
    baselines,
    model: {
      available: true,
      version: liquidationManifest.version,
      algorithm: result.algorithm,
      candidateCounts: grid.map((g) => g.candidates.length),
    },
    steps: choices.map((c, i) => {
      const v = items[i],
        event = priceLiquidationEvent(v.input, c.repayAtomic),
        meetsGoal = BigInt(c.repayAtomic) >= v.required;
      return {
        position: c.position,
        repayAtomic: c.repayAtomic,
        bufferBeforePct: liquidationBuffer(v.s, goal.shockBps),
        bufferAfterPct: liquidationBuffer(v.s, goal.shockBps, c.repayAtomic),
        lossBeforeUsd: v.before.lossUsd,
        lossAfterUsd: c.lossUsd,
        meetsGoal,
        eligibleAtShock: event.eligible,
        reason: meetsGoal
          ? "goal_met"
          : BigInt(c.repayAtomic) > 0n
            ? "loss_reduced"
            : "not_allocated",
      };
    }),
  };
}
