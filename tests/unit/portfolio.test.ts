import { expect, it } from "vitest";
import { examplePortfolio } from "../../shared/examples/portfolio";
import { planPortfolio, liquidationBuffer } from "../../core/repayment/portfolio";
import { planRepayment } from "../../core/repayment/planner";
import { demoProfile } from "../../core/validation/demo-profile";
const goal = {
  budgetAtomic: "30000000",
  reserveAtomic: "20000000",
  shockBps: 3000,
  bufferBps: 500,
};
it("uses one shared wallet balance and spends only the minimum to reach every goal", () => {
  const p = examplePortfolio(),
    r = planPortfolio(p, goal);
  expect(r.requiredAtomic).toBe("13600000");
  expect(r.totalRepayAtomic).toBe("13600000");
  expect(r.walletAfterAtomic).toBe("66400000");
  expect(r.steps.map((s) => s.repayAtomic)).toEqual(["11800000", "1800000", "0"]);
  expect(r.steps.slice(0, 2).every((s) => s.bufferAfterPct === "5.0000")).toBe(true);
  expect(r.model.available).toBe(false);
});
it("does not invent partial allocations while loss parity is unavailable", () => {
  const r = planPortfolio(examplePortfolio(), { ...goal, budgetAtomic: "10000000" });
  expect(r.state).toBe("insufficient_budget");
  expect(r.shortfallAtomic).toBe("3600000");
  expect(r.totalRepayAtomic).toBe("0");
});
it("reserve larger than balance leaves no spendable funds", () => {
  const r = planPortfolio(examplePortfolio(), { ...goal, reserveAtomic: "90000000" });
  expect(r.spendableAtomic).toBe("0");
  expect(r.totalRepayAtomic).toBe("0");
});
it("rejects duplicate positions, mixed debt mints and disagreeing wallet reads", () => {
  const p = examplePortfolio();
  expect(() =>
    planPortfolio({ ...p, positions: [p.positions[0], p.positions[0]] }, goal),
  ).toThrow();
  p.positions[1] = { ...p.positions[1], walletDebtAtomic: "80000001" };
  expect(() => planPortfolio(p, goal)).toThrow();
  const q = examplePortfolio();
  q.positions[1].debt.mint = "other";
  expect(() => planPortfolio(q, goal)).toThrow();
});
it("is invariant to input order and additional budget cannot increase the shortfall", () => {
  const p = examplePortfolio();
  expect(planPortfolio({ ...p, positions: [...p.positions].reverse() }, goal)).toEqual(
    planPortfolio(p, goal),
  );
  let last = 13600001n;
  for (let b = 0; b <= 20; b++) {
    const r = planPortfolio(p, { ...goal, budgetAtomic: String(b * 1e6) });
    expect(BigInt(r.shortfallAtomic) <= last).toBe(true);
    last = BigInt(r.shortfallAtomic);
    expect(BigInt(r.totalRepayAtomic) <= BigInt(r.spendableAtomic)).toBe(true);
  }
});
it("debt-free and already protected loans require no signatures", () => {
  const p = examplePortfolio();
  p.positions.forEach((s) => (s.debt.amountAtomic = "0"));
  const r = planPortfolio(p, goal);
  expect(r.state).toBe("already_met");
  expect(r.steps.every((s) => s.bufferAfterPct === null)).toBe(true);
});
it("rounds repayment up at the exact atomic boundary", () => {
  const s = examplePortfolio().positions[0];
  s.debt.amountAtomic = "60000000";
  s.collateral.priceUsd = "100.000001";
  const r = planRepayment(s, { ...goal, targetLtvBps: 100 });
  expect(r.requiredRepayAtomic).toBe("6800000");
  const after = Number(liquidationBuffer(s, goal.shockBps, r.requiredRepayAtomic));
  expect(after).toBeGreaterThanOrEqual(5);
});
it("profiles derive nominal debt from prices and block protocol limits instead of changing the profile", () => {
  expect(demoProfile(201, "100000000", "100", "1", 0.75, 1, "1000000000")).toEqual({
    amountAtomic: "6500000",
    ltvPct: 65,
  });
  expect(demoProfile(202, "100000000", "100", "1", 0.75, 1, "1000000000").amountAtomic).toBe(
    "5500000",
  );
  expect(() => demoProfile(201, "100000000", "100", "1", 0.6, 1, "1000000000")).toThrow(
    "DEMO_PROFILE_UNAVAILABLE",
  );
  expect(() => demoProfile(201, "100000000", "100", "1", 0.75, 1, "1")).toThrow(
    "DEMO_PROFILE_UNAVAILABLE",
  );
});
