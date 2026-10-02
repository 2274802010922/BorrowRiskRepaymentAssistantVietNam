import { expect, it } from "vitest";
import { exampleAllocationContext } from "../../src/core/allocation/example";
import { planAllocation } from "../../src/core/allocation/plan";
import { D } from "../../src/core/risk/metrics";
const goal = {
  budgetAtomic: "10000000",
  reserveAtomic: "20000000",
  shockBps: 3000,
  bufferBps: 500,
};
it("allocates scarce money without inventing goal completion or spending the reserve", () => {
  const p = planAllocation(exampleAllocationContext(goal.shockBps), goal);
  expect(p.state).toBe("partial_available");
  expect(BigInt(p.totalRepayAtomic)).toBeLessThanOrEqual(10000000n);
  expect(BigInt(p.walletAfterAtomic)).toBeGreaterThanOrEqual(20000000n);
  expect(p.lossAfterUsd).toBe("0");
  expect(p.steps.some((s) => !s.meetsGoal)).toBe(true);
  expect(p.steps.reduce((a, s) => a + BigInt(s.repayAtomic), 0n)).toBe(BigInt(p.totalRepayAtomic));
  expect(BigInt(p.unspentAtomic)).toBeGreaterThan(0n);
  expect(p.model.candidateCounts.every((n) => n <= 201)).toBe(true);
});
it("scores every baseline with the same funds, model and fees", () => {
  const p = planAllocation(exampleAllocationContext(goal.shockBps), goal);
  const proposed = p.baselines.find((b) => b.id === "proposed")!;
  for (const baseline of p.baselines) {
    expect(new D(proposed.costUsd).lte(baseline.costUsd)).toBe(true);
    expect(BigInt(baseline.totalRepayAtomic)).toBeLessThanOrEqual(BigInt(p.spendableAtomic));
  }
  expect(proposed.costUsd).toBe(p.totalCostUsd);
});
it("can preserve money when the requested buffer is unmet but no one-wave loss is reduced", () => {
  const p = planAllocation(exampleAllocationContext(0), {
    ...goal,
    shockBps: 0,
    budgetAtomic: "1000000",
    bufferBps: 3000,
  });
  expect(p.state).toBe("no_beneficial_allocation");
  expect(p.totalRepayAtomic).toBe("0");
  expect(p.feeLamports).toBe("0");
  expect(p.steps.some((s) => !s.meetsGoal)).toBe(true);
});
it("never pays a completed position again while re-evaluating the full portfolio", () => {
  const p = planAllocation(exampleAllocationContext(3000), goal, {
    frozenPositions: ["example-a"],
  });
  expect(p.steps.find((s) => s.position === "example-a")?.repayAtomic).toBe("0");
  expect(p.lossBeforeUsd).not.toBe("0");
  expect(p.lossAfterUsd).toBe(p.lossBeforeUsd);
});
it("is independent of input order and retains a zero-budget result", () => {
  const context = exampleAllocationContext(3000),
    a = planAllocation(context, goal);
  context.portfolio.positions.reverse();
  expect(planAllocation(context, goal)).toEqual(a);
  const zero = planAllocation(context, { ...goal, budgetAtomic: "0" });
  expect(zero.totalRepayAtomic).toBe("0");
});
it("rejects mixed balances, unsupported insolvency and insufficient SOL", () => {
  const mismatch = exampleAllocationContext(3000);
  mismatch.portfolio.positions[1].walletDebtAtomic = "80000001";
  expect(() => planAllocation(mismatch, goal)).toThrow();
  expect(() => planAllocation(exampleAllocationContext(8000), { ...goal, shockBps: 8000 })).toThrow(
    "UNSUPPORTED_INSOLVENCY",
  );
  const poor = exampleAllocationContext(3000);
  for (const p of poor.portfolio.positions) p.walletSolLamports = "0";
  expect(() => planAllocation(poor, goal)).toThrow("INSUFFICIENT_SOL");
});
