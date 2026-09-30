import { expect, it } from "vitest";
import { searchAllocation, type AllocationGrid } from "../../core/allocation/search";
const verified = { verified: true, version: "abstract-test-vector" };
const grid: AllocationGrid = [
  {
    position: "a",
    candidates: [
      { repayAtomic: "0", lossUsd: "10", feeUsd: "0", protectedCollateralUsd: "0" },
      { repayAtomic: "3", lossUsd: "0", feeUsd: "1", protectedCollateralUsd: "100" },
    ],
  },
  {
    position: "b",
    candidates: [
      { repayAtomic: "0", lossUsd: "2", feeUsd: "0", protectedCollateralUsd: "0" },
      { repayAtomic: "2", lossUsd: "0", feeUsd: "1", protectedCollateralUsd: "100" },
    ],
  },
];
it("fails closed without a verified loss model", () => {
  expect(() => searchAllocation(grid, "5", { verified: false, version: "" })).toThrow(
    "LIQUIDATION_PARITY_NOT_VERIFIED",
  );
});
it("picks lower liquidation cost rather than splitting evenly", () => {
  const r = searchAllocation(grid, "3", verified);
  expect(r.steps.map((s) => s.repayAtomic)).toEqual(["3", "0"]);
  expect(r.totalCostUsd).toBe("3");
  expect(searchAllocation([...grid].reverse(), "3", verified)).toEqual(r);
});
it("does not spend when benefit is smaller than the fee", () => {
  const g: AllocationGrid = [
    {
      position: "a",
      candidates: [
        { repayAtomic: "0", lossUsd: "1", feeUsd: "0", protectedCollateralUsd: "0" },
        { repayAtomic: "1", lossUsd: "0", feeUsd: "2", protectedCollateralUsd: "100" },
      ],
    },
  ];
  expect(searchAllocation(g, "1", verified).totalRepayAtomic).toBe("0");
});
it("matches independent exhaustive search for three small candidate grids", () => {
  const g: AllocationGrid = [0, 1, 2].map((i) => ({
    position: String(i),
    candidates: [0, 1, 2, 3].map((amount) => ({
      repayAtomic: String(amount),
      lossUsd: String(Math.max(0, 8 - (i + 1) * amount)),
      feeUsd: amount ? "1" : "0",
      protectedCollateralUsd: "0",
    })),
  }));
  for (let budget = 0; budget <= 9; budget++) {
    let best = Infinity;
    for (const a of g[0].candidates)
      for (const b of g[1].candidates)
        for (const c of g[2].candidates) {
          if (Number(a.repayAtomic) + Number(b.repayAtomic) + Number(c.repayAtomic) > budget)
            continue;
          best = Math.min(
            best,
            [a, b, c].reduce((sum, x) => sum + Number(x.lossUsd) + Number(x.feeUsd), 0),
          );
        }
    expect(Number(searchAllocation(g, String(budget), verified).totalCostUsd)).toBe(best);
  }
});
