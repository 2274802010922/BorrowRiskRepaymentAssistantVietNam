import { describe, expect, it } from "vitest";
import { planRepayment } from "../../src/core/repayment/planner";
import { metrics } from "../../src/core/risk/metrics";
import { parseUsdcInput } from "../../src/core/validation/amount-input";
import { exampleSnapshot } from "../fixtures/position";

const c = {
  budgetAtomic: "200000000",
  reserveAtomic: "50000000",
  shockBps: 2000,
  targetLtvBps: 6000,
};

describe("repayment constraints", () => {
  it("distinguishes a feasible partial repayment from reaching the target", () => {
    const plan = planRepayment(exampleSnapshot(), c);
    expect(plan.requiredRepayAtomic).toBe("120000000");
    expect(plan.maxRepayAtomic).toBe("100000000");
    expect(plan.shortfallAtomic).toBe("20000000");
    expect(plan.options).toHaveLength(1);
    expect(plan.options[0]).toMatchObject({
      repayAtomic: "100000000",
      walletAfterAtomic: "50000000",
      meetsTarget: false,
    });
    expect(plan.options[0].stressed.ltvPct).toBe("62.50");
    expect(plan.options[0].current.ltvPct).toBe("50.00");
  });
  it("offers the minimal target amount when funded", () => {
    const s = { ...exampleSnapshot(), walletDebtAtomic: "250000000" };
    expect(planRepayment(s, c).options[0]).toMatchObject({
      id: "target",
      repayAtomic: "120000000",
      meetsTarget: true,
    });
  });
  it("never uses the reserve when it exceeds the balance", () => {
    expect(planRepayment(exampleSnapshot(), { ...c, reserveAtomic: "151000000" }).options).toEqual(
      [],
    );
  });
  it("caps repayment at debt and reports debt-free without Infinity", () => {
    const s = { ...exampleSnapshot(), walletDebtAtomic: "900000000" };
    const plan = planRepayment(s, { ...c, budgetAtomic: "900000000", reserveAtomic: "0" });
    expect(plan.maxRepayAtomic).toBe("600000000");
    expect(plan.options.at(-1)?.current).toMatchObject({
      debtFree: true,
      healthFactor: null,
      ltvPct: "0.00",
    });
  });
  it("rounds target debt down so a fractional atomic repayment cannot miss the target", () => {
    const s = {
      ...exampleSnapshot(),
      collateral: { ...exampleSnapshot().collateral, priceUsd: "100.00000001" },
      walletDebtAtomic: "900000000",
    };
    expect(planRepayment(s, { ...c, budgetAtomic: "900000000" }).requiredRepayAtomic).toBe(
      "120000000",
    );
  });
  it("uses borrow factors rather than assuming all debt has factor one", () => {
    const s = { ...exampleSnapshot(), borrowFactorBps: 12500 };
    expect(metrics(s).ltvPct).toBe("75.00");
    expect(planRepayment(s, c).requiredRepayAtomic).toBe("216000000");
  });
  it("rejects an unsafe target or invalid price instead of fabricating metrics", () => {
    expect(() => planRepayment(exampleSnapshot(), { ...c, targetLtvBps: 8000 })).toThrow();
    expect(() =>
      metrics({
        ...exampleSnapshot(),
        collateral: { ...exampleSnapshot().collateral, priceUsd: "0" },
      }),
    ).toThrow();
  });
  it("does not mutate the source snapshot", () => {
    const s = exampleSnapshot(),
      before = JSON.stringify(s);
    planRepayment(s, c);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("respects all spending bounds across budgets and reserves", () => {
    const s = exampleSnapshot();
    for (const budget of [0n, 1n, 100000000n, 900000000n])
      for (const reserve of [0n, 50000000n, 200000000n]) {
        const plan = planRepayment(s, {
          ...c,
          budgetAtomic: budget.toString(),
          reserveAtomic: reserve.toString(),
        });
        for (const o of plan.options) {
          expect(BigInt(o.repayAtomic) <= budget).toBe(true);
          expect(BigInt(o.debtAfterAtomic) >= 0n).toBe(true);
          expect(BigInt(o.walletAfterAtomic) >= reserve).toBe(true);
        }
      }
  });
  it.each(["-1", "1e3", "NaN", "1.0000001", "1,000", ""])("rejects ambiguous input %s", (input) =>
    expect(parseUsdcInput(input)).toBeNull(),
  );
  it("parses token quantities without floating point", () =>
    expect(parseUsdcInput("1.000001")).toBe(1000001n));
});
