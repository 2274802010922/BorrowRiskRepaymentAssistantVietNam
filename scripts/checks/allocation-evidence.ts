import { performance } from "node:perf_hooks";
import { writeFile, mkdir } from "node:fs/promises";
import { strict as assert } from "node:assert";
import { exampleAllocationContext } from "../../src/core/allocation/example";
import { planAllocation } from "../../src/core/allocation/plan";
import { SF } from "../../src/core/liquidation/fixed-point";

const goal = {
  budgetAtomic: "10000000",
  reserveAtomic: "20000000",
  shockBps: 3000,
  bufferBps: 500,
};
const demo = planAllocation(exampleAllocationContext(3000), goal);
assert.equal(demo.totalRepayAtomic, "9000001");
assert.equal(demo.unspentAtomic, "999999");
const riskFirst = demo.baselines.find((b) => b.id === "risk_first")!;
const proposed = demo.baselines.find((b) => b.id === "proposed")!;
assert.equal(riskFirst.costUsd, proposed.costUsd);
assert.equal(riskFirst.goalsMet, proposed.goalsMet);
await mkdir("docs/evidence/allocation", { recursive: true });
await writeFile(
  "docs/evidence/allocation/demo-comparison.json",
  JSON.stringify(
    {
      source: "synthetic-example-no-chain-execution",
      goal,
      assumptions:
        "65/55/45 USDC debt; each 1 SOL at100 USD; threshold80%, borrow factor1; shared balance80; SOL shock30%; fee6000lamports/step, SOL100 USD. One-event model; no forecast or measured savings.",
      model: demo.model,
      totalRepayAtomic: demo.totalRepayAtomic,
      unspentAtomic: demo.unspentAtomic,
      baselines: demo.baselines,
    },
    null,
    2,
  ) + "\n",
);

const samples = [];
for (const loans of [1, 2, 3]) {
  const context = exampleAllocationContext(
    3000,
    ["example-a", "example-b", "example-c"].slice(0, loans),
  );
  // All selected positions are stressed in this separate synthetic benchmark.
  for (const position of context.portfolio.positions) {
    position.debt.amountAtomic = "65000000";
    context.inputs[position.position].debtAmountSf = (65000000n * SF).toString();
  }
  let start = performance.now();
  const first = planAllocation(context, goal);
  const firstComputeMs = performance.now() - start;
  for (let i = 0; i < 3; i++) planAllocation(context, goal);
  const times = [];
  for (let i = 0; i < 30; i++) {
    start = performance.now();
    const plan = planAllocation(context, goal);
    times.push(performance.now() - start);
    assert.equal(plan.totalRepayAtomic, first.totalRepayAtomic);
    assert.equal(plan.totalCostUsd, first.totalCostUsd);
    assert(BigInt(plan.totalRepayAtomic) <= BigInt(goal.budgetAtomic));
  }
  times.sort((a, b) => a - b);
  samples.push({
    loans,
    candidateCounts: first.model.candidateCounts,
    firstComputeMs,
    sampleCount: times.length,
    p50Ms: times[Math.ceil(times.length * 0.5) - 1],
    p95Ms: times[Math.ceil(times.length * 0.95) - 1],
    minMs: times[0],
    maxMs: times.at(-1),
  });
}
await writeFile(
  "docs/evidence/allocation/benchmark.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      platform: process.platform,
      node: process.version,
      scope:
        "Synchronous planAllocation compute only, static synthetic stressed positions, one process. Excludes import/startup, RPC, HTTP, UI, wallet signing and network confirmations. Not worst-case or a production SLA.",
      command: "npx tsx scripts/checks/allocation-evidence.ts",
      warmupPerScenario: 3,
      samples,
    },
    null,
    2,
  ) + "\n",
);
console.log("ALLOCATION_EVIDENCE_PASS", JSON.stringify(samples));
