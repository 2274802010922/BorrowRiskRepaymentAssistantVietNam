import { D } from "../risk/metrics";
export type Candidate = {
  repayAtomic: string;
  lossUsd: string;
  feeUsd: string;
  protectedCollateralUsd: string;
};
export type AllocationGrid = { position: string; candidates: Candidate[] }[];
type Score = {
  cost: InstanceType<typeof D>;
  protected: InstanceType<typeof D>;
  spend: bigint;
  transactions: number;
  choices: Candidate[];
};
function score(choices: Candidate[]): Score {
  return {
    cost: choices.reduce((a, c) => a.plus(c.lossUsd).plus(c.feeUsd), new D(0)),
    protected: choices.reduce((a, c) => a.plus(c.protectedCollateralUsd), new D(0)),
    spend: choices.reduce((a, c) => a + BigInt(c.repayAtomic), 0n),
    transactions: choices.filter((c) => BigInt(c.repayAtomic) > 0n).length,
    choices,
  };
}
function better(a: Score, b: Score) {
  return (
    a.cost.cmp(b.cost) < 0 ||
    (a.cost.eq(b.cost) &&
      (a.protected.gt(b.protected) ||
        (a.protected.eq(b.protected) &&
          (a.spend < b.spend ||
            (a.spend === b.spend &&
              (a.transactions < b.transactions ||
                (a.transactions === b.transactions &&
                  a.choices.map((c) => c.repayAtomic.padStart(20, "0")).join("") <
                    b.choices.map((c) => c.repayAtomic.padStart(20, "0")).join(""))))))))
  );
}
// Search mechanics only. No Kamino liquidation formula or production parity claim here.
// Cost vectors must come from a separately verified, versioned liquidation model.
export function searchAllocation(
  grid: AllocationGrid,
  budgetAtomic: string,
  model: { verified: boolean; version: string },
) {
  if (!model.verified || !model.version) throw new Error("LIQUIDATION_PARITY_NOT_VERIFIED");
  if (!/^\d{1,20}$/.test(budgetAtomic) || BigInt(budgetAtomic) > 18446744073709551615n)
    throw new Error("INVALID_BUDGET");
  if (!grid.length || grid.length > 3 || new Set(grid.map((g) => g.position)).size !== grid.length)
    throw new Error("INVALID_GRID");
  const sorted = [...grid]
    .sort((a, b) => a.position.localeCompare(b.position, "en"))
    .map((g) => ({
      ...g,
      candidates: [...g.candidates].sort((a, b) =>
        BigInt(a.repayAtomic) < BigInt(b.repayAtomic) ? -1 : 1,
      ),
    }));
  for (const g of sorted) {
    if (
      !g.candidates.length ||
      g.candidates.length > 201 ||
      !g.candidates.some((c) => c.repayAtomic === "0")
    )
      throw new Error("INVALID_GRID");
    for (const c of g.candidates) {
      if (!/^\d{1,20}$/.test(c.repayAtomic) || BigInt(c.repayAtomic) > 18446744073709551615n)
        throw new Error("INVALID_GRID");
      for (const value of [c.lossUsd, c.feeUsd, c.protectedCollateralUsd])
        if (!new D(value).isFinite() || new D(value).lt(0)) throw new Error("INVALID_COST");
      if (c.repayAtomic === "0" && !new D(c.feeUsd).eq(0)) throw new Error("INVALID_COST");
    }
  }
  const budget = BigInt(budgetAtomic);
  const last = sorted.at(-1)!.candidates;
  const prefix: Candidate[] = [];
  let bestLast = last[0];
  for (const c of last) {
    if (better(score([c]), score([bestLast]))) bestLast = c;
    prefix.push(bestLast);
  }
  function lookup(left: bigint) {
    let lo = 0,
      hi = last.length - 1,
      result = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (BigInt(last[mid].repayAtomic) <= left) {
        result = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return result < 0 ? null : prefix[result];
  }
  const zero: Candidate = {
    repayAtomic: "0",
    lossUsd: "0",
    feeUsd: "0",
    protectedCollateralUsd: "0",
  };
  const first = sorted.length === 3 ? sorted[0].candidates : [zero],
    second = sorted.length >= 2 ? sorted[sorted.length - 2].candidates : [zero];
  let best: Score | null = null;
  for (const a of first)
    for (const b of second) {
      const remaining = budget - BigInt(a.repayAtomic) - BigInt(b.repayAtomic);
      if (remaining < 0n) continue;
      const c = lookup(remaining);
      if (!c) continue;
      const choices = sorted.length === 3 ? [a, b, c] : sorted.length === 2 ? [b, c] : [c],
        candidate = score(choices);
      if (!best || better(candidate, best)) best = candidate;
    }
  if (!best) throw new Error("NO_FEASIBLE_ALLOCATION");
  return {
    algorithm: "finite-grid-prefix-v1",
    modelVersion: model.version,
    totalCostUsd: best.cost.toString(),
    totalRepayAtomic: best.spend.toString(),
    steps: best.choices.map((c, i) => ({ position: sorted[i].position, ...c })),
  };
}
