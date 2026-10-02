import { writeFile, mkdir } from "node:fs/promises";
import { readAllocationContext } from "../../src/solana/adapters/kamino-liquidation";
import { planAllocation } from "../../src/core/allocation/plan";
import { liquidationManifest } from "../../src/core/liquidation/manifest";
process.env.KAMINO_MARKET_ID = liquidationManifest.market;
process.env.KAMINO_COLLATERAL_RESERVE = liquidationManifest.collateral;
process.env.KAMINO_DEBT_RESERVE = liquidationManifest.debt;
const context = await readAllocationContext(
  "3kHRwxR1vgCiyNRLozyQU3NWEv3hR54Cc5rsvreyFmRo",
  [
    "HuUuEHfYSUADS6XBJqznm5XnhhVQ11xukVJnqt62RKkE",
    "854aw3w9crTC6K8fmKLzPddYcg6rVJsDkZ6cmhb5cCx",
    "8PpZyrJaWYNyYduWyihN4Hf6vQWppzwVgfHvyGgrqx4K",
  ],
  4500,
);
const start = performance.now();
const plan = planAllocation(context, {
  budgetAtomic: "1000000",
  reserveAtomic: "1000000",
  shockBps: 4500,
  bufferBps: 500,
});
await mkdir("work/liquidation-vm", { recursive: true });
await writeFile(
  "work/liquidation-vm/live-readiness.json",
  JSON.stringify({ context, plan, computeMs: performance.now() - start }, null, 2),
);
console.log(
  JSON.stringify(
    {
      state: plan.state,
      totalRepayAtomic: plan.totalRepayAtomic,
      lossBefore: plan.lossBeforeUsd,
      lossAfter: plan.lossAfterUsd,
      fee: plan.feeLamports,
      computeMs: performance.now() - start,
      candidates: plan.model.candidateCounts,
      steps: plan.steps.map((s) => ({
        position: s.position,
        repay: s.repayAtomic,
        goal: s.meetsGoal,
      })),
    },
    null,
    2,
  ),
);
