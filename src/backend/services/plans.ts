import { randomUUID } from "node:crypto";
import { z } from "zod";
import { goalSchema, type RepaymentGoal } from "../../shared/portfolio";
import { planPortfolio } from "../../core/repayment/portfolio";
import { readPositions } from "../../solana/adapters/kamino";
import {
  prepareRepayment,
  repaymentStatus,
  submitRepayment,
} from "../../solana/transactions/repay";
import { seal, unseal } from "./binding";
import { redis } from "./redis";
import { AppError } from "./http";
import { isPublicKey } from "./readiness";
import type { AllocationPlan, PortfolioPlan } from "../../shared/allocation";
import { planAllocation } from "../../core/allocation/plan";
import { priceLiquidationEvent } from "../../core/liquidation/kamino-price-event";
const key = (id: string) => `picachu:plan:${id}`;
const identity = z.object({
  kind: z.enum(["picachu-goal-v1", "picachu-allocation-plan-v1"]),
  id: z.uuid(),
  wallet: z.string().refine(isPublicKey),
});
type Journal = {
  id: string;
  wallet: string;
  positions: string[];
  goal: RepaymentGoal;
  plan: PortfolioPlan;
  mode?: "loss-allocation-v1";
  allocation?: {
    programFingerprint: string;
    configFingerprint: string;
    feePerStepLamports: string;
  };
  cursor: number;
  revision: number;
  expiresAt: number;
  prepared?: Awaited<ReturnType<typeof prepareRepayment>>;
  reviewRequired?: boolean;
  pending?: { signature: string; bindingToken: string };
  receipts: { signature: string; position: string; repayAtomic: string }[];
  stopped?: boolean;
  stopReason?: string;
};
async function load(token: string) {
  const bound = identity.parse(unseal(token));
  const raw = await redis(["GET", key(bound.id)]);
  if (typeof raw !== "string") throw new AppError("PLAN_EXPIRED", 409);
  const journal = JSON.parse(raw) as Journal;
  if (journal.wallet !== bound.wallet) throw new AppError("TRANSACTION_CHANGED");
  if ((journal.mode === "loss-allocation-v1") !== (bound.kind === "picachu-allocation-plan-v1"))
    throw new AppError("TRANSACTION_CHANGED");
  return journal;
}
async function save(j: Journal, expected: number) {
  const lua =
    "local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local j=cjson.decode(v); if j.revision~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',86400); return 1";
  j.revision = expected + 1;
  if ((await redis(["EVAL", lua, "1", key(j.id), String(expected), JSON.stringify(j)])) !== 1)
    throw new AppError("PLAN_CHANGED", 409);
}
export async function createPlan(input: unknown) {
  const r = z
    .object({
      wallet: z.string().refine(isPublicKey),
      positions: z.array(z.string().refine(isPublicKey)).min(1).max(3),
      goal: goalSchema,
      mode: z.enum(["goal-v1", "loss-allocation-v1"]).default("goal-v1"),
      quoteToken: z.string().max(20000).optional(),
      acceptedPartial: z.boolean().optional(),
    })
    .parse(input);
  if (new Set(r.positions).size !== r.positions.length) throw new AppError("INVALID_INPUT");
  if (r.mode === "loss-allocation-v1") return createAllocationPlan(r);
  const all = await readPositions(r.wallet),
    positions = r.positions.map((p) => all.find((s) => s.position === p));
  if (positions.some((s) => !s || s.warnings.includes("STALE_DATA")))
    throw new AppError("STALE_DATA");
  const portfolio = { version: 1 as const, positions: positions.filter((s) => s !== undefined) };
  const plan = planPortfolio(portfolio, r.goal);
  if (plan.state !== "achievable") throw new AppError("PLAN_NOT_ACHIEVABLE", 409);
  const j: Journal = {
    id: randomUUID(),
    wallet: r.wallet,
    positions: r.positions,
    goal: r.goal,
    plan,
    cursor: 0,
    revision: 0,
    expiresAt: Date.now() + 15 * 60 * 1000,
    receipts: [],
  };
  j.plan.steps = plan.steps.filter((s) => BigInt(s.repayAtomic) > 0n);
  await redis(["SET", key(j.id), JSON.stringify(j), "EX", "86400", "NX"]);
  return {
    token: seal({ kind: "picachu-goal-v1", id: j.id, wallet: j.wallet }),
    plan,
    portfolio,
    expiresAt: j.expiresAt,
  };
}
export async function preparePlan(input: unknown) {
  const { token } = z.object({ token: z.string().max(20000) }).parse(input),
    j = await load(token);
  if (j.stopped && j.mode === "loss-allocation-v1")
    throw new AppError(j.stopReason ?? "PLAN_CHANGED", 409);
  if (j.pending || j.stopped) throw new AppError("PLAN_PENDING", 409);
  if (Date.now() > j.expiresAt) throw new AppError("PLAN_EXPIRED", 409);
  if (j.mode === "loss-allocation-v1") return prepareAllocationPlan(j);
  if (j.plan.version !== "goal-v1") throw new AppError("PLAN_CHANGED", 409);
  const step = j.plan.steps[j.cursor];
  if (!step) throw new AppError("PLAN_COMPLETE", 409);
  const positions = await readPositions(j.wallet);
  const selected = j.positions.map((p) => positions.find((s) => s.position === p));
  if (selected.some((s) => !s || s.warnings.includes("STALE_DATA")))
    throw new AppError("STALE_DATA");
  const first = selected[0]!;
  const paid = j.receipts.reduce((a, r) => a + BigInt(r.repayAtomic), 0n);
  const expectedBalance = BigInt(j.plan.walletAfterAtomic) + BigInt(j.plan.totalRepayAtomic) - paid;
  if (BigInt(first.walletDebtAtomic) !== expectedBalance) throw new AppError("PLAN_CHANGED", 409);
  const fresh = planPortfolio(
    { version: 1, positions: selected.filter((s) => s !== undefined) },
    { ...j.goal, budgetAtomic: (BigInt(j.goal.budgetAtomic) - paid).toString() },
  );
  const needed = fresh.steps.find((s) => s.position === step.position);
  if (!needed || BigInt(needed.repayAtomic) === 0n || fresh.state === "insufficient_budget")
    throw new AppError("PLAN_CHANGED", 409);
  // Refresh only unexecuted steps. Confirmed receipts are immutable and never replayed.
  const remaining = j.plan.steps.slice(j.cursor).map((s) => {
    const updated = fresh.steps.find((f) => f.position === s.position);
    if (!updated || BigInt(updated.repayAtomic) === 0n) throw new AppError("PLAN_CHANGED", 409);
    return updated;
  });
  const total = paid + remaining.reduce((sum, s) => sum + BigInt(s.repayAtomic), 0n);
  const balanceAfter = expectedBalance - (total - paid);
  if (total > BigInt(j.goal.budgetAtomic) || balanceAfter < BigInt(j.goal.reserveAtomic))
    throw new AppError("PLAN_CHANGED", 409);
  const reviewRequired = remaining.some(
    (s, i) => s.repayAtomic !== j.plan.steps[j.cursor + i].repayAtomic,
  );
  const prepared = await prepareRepayment({
    wallet: j.wallet,
    position: step.position,
    protocol: "kamino",
    constraints: { ...j.goal, budgetAtomic: needed.repayAtomic, targetLtvBps: 100 },
    repayAtomic: needed.repayAtomic,
  });
  const rev = j.revision;
  j.plan = {
    ...j.plan,
    steps: [...j.plan.steps.slice(0, j.cursor), ...remaining],
    totalRepayAtomic: total.toString(),
    requiredAtomic: total.toString(),
    walletAfterAtomic: balanceAfter.toString(),
  };
  j.prepared = prepared;
  // Keep a pending review sticky across repeated previews until that step is signed.
  j.reviewRequired = Boolean(j.reviewRequired || reviewRequired);
  await save(j, rev);
  return {
    ...prepared,
    step: j.cursor + 1,
    total: j.plan.steps.length,
    plan: j.plan,
    portfolio: { version: 1 as const, positions: selected.filter((s) => s !== undefined) },
    reviewRequired: j.reviewRequired,
  };
}
export async function submitPlan(input: unknown) {
  const r = z
      .object({
        token: z.string().max(20000),
        bindingToken: z.string().max(20000),
        transaction: z.string().max(8192),
        reviewAccepted: z.boolean().optional(),
      })
      .parse(input),
    j = await load(r.token);
  if (!j.prepared || j.prepared.token !== r.bindingToken || j.stopped)
    throw new AppError("PLAN_CHANGED", 409);
  if (j.reviewRequired && !r.reviewAccepted) throw new AppError("PLAN_CHANGED", 409);
  if (j.pending) return { signature: j.pending.signature, phase: "submitted" };
  if (Date.now() > j.expiresAt) throw new AppError("PLAN_EXPIRED", 409);
  return submitRepayment(
    { token: r.bindingToken, transaction: r.transaction },
    async (signature, recovered) => {
      if (j.mode === "loss-allocation-v1" && !recovered) {
        const { readAllocationContext } = await import("../../solana/adapters/kamino-liquidation");
        const fresh = await readAllocationContext(j.wallet, j.positions, j.goal.shockBps);
        if (
          !j.allocation ||
          fresh.programFingerprint !== j.allocation.programFingerprint ||
          fresh.configFingerprint !== j.allocation.configFingerprint
        )
          throw new AppError("PLAN_CHANGED", 409);
        const paid = j.receipts.reduce((sum, receipt) => sum + BigInt(receipt.repayAtomic), 0n);
        if (
          BigInt(fresh.portfolio.positions[0].walletDebtAtomic) !==
          BigInt(j.plan.walletAfterAtomic) + BigInt(j.plan.totalRepayAtomic) - paid
        )
          throw new AppError("PLAN_CHANGED", 409);
        if (Date.now() + 3000 >= j.prepared!.expiresAt) throw new AppError("PREVIEW_EXPIRED", 409);
        try {
          for (const [position, values] of Object.entries(fresh.inputs))
            priceLiquidationEvent(
              values,
              position === j.plan.steps[j.cursor].position
                ? j.plan.steps[j.cursor].repayAtomic
                : "0",
            );
        } catch {
          throw new AppError("PLAN_CHANGED", 409);
        }
      }
      const lua =
        "local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local j=cjson.decode(v); if j.revision~=tonumber(ARGV[1]) or j.pending then return 0 end; local w=redis.call('GET',KEYS[2]); if w and w~=ARGV[3] then return 0 end; redis.call('SET',KEYS[2],ARGV[3],'EX',86400); redis.call('SET',KEYS[1],ARGV[2],'EX',86400); return 1";
      const revision = j.revision;
      j.pending = { signature, bindingToken: r.bindingToken };
      j.revision++;
      if (
        (await redis([
          "EVAL",
          lua,
          "2",
          key(j.id),
          `picachu:wallet-plan:${j.wallet}`,
          String(revision),
          JSON.stringify(j),
          j.id,
        ])) !== 1
      )
        throw new AppError("PLAN_PENDING", 409);
    },
  );
}
export async function statusPlan(input: unknown) {
  const { token } = z.object({ token: z.string().max(20000) }).parse(input),
    j = await load(token);
  if (j.pending) {
    const status = await repaymentStatus(j.pending);
    if (["verified", "failed", "expired"].includes(status.phase)) {
      const rev = j.revision;
      if (status.phase === "verified") {
        const step = j.plan.steps[j.cursor];
        j.receipts.push({
          signature: j.pending.signature,
          position: step.position,
          repayAtomic: step.repayAtomic,
        });
        j.cursor++;
      } else j.stopped = true;
      delete j.pending;
      delete j.prepared;
      delete j.reviewRequired;
      await save(j, rev);
      if (j.stopped || j.cursor === j.plan.steps.length)
        await redis([
          "EVAL",
          "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0",
          "1",
          `picachu:wallet-plan:${j.wallet}`,
          j.id,
        ]);
    } else return { phase: status.phase, cursor: j.cursor, receipts: j.receipts };
  }
  return {
    phase: j.stopped ? "failed" : j.cursor === j.plan.steps.length ? "verified" : "ready",
    reason: j.stopReason,
    cursor: j.cursor,
    receipts: j.receipts,
  };
}

async function createAllocationPlan(r: {
  wallet: string;
  positions: string[];
  goal: RepaymentGoal;
  quoteToken?: string;
  acceptedPartial?: boolean;
}) {
  if (!r.quoteToken || r.acceptedPartial !== true)
    throw new AppError("ALLOCATION_REVIEW_REQUIRED", 409);
  const { loadAllocationQuote, allocationDecisionHash } = await import("./allocation");
  const { readAllocationContext } = await import("../../solana/adapters/kamino-liquidation");
  const quoted = await loadAllocationQuote(r.quoteToken, r.wallet, r.positions, r.goal);
  const context = await readAllocationContext(r.wallet, r.positions, r.goal.shockBps);
  if (
    context.portfolio.positions[0].walletDebtAtomic !==
      quoted.context.portfolio.positions[0].walletDebtAtomic ||
    context.programFingerprint !== quoted.context.programFingerprint ||
    context.configFingerprint !== quoted.context.configFingerprint
  )
    throw new AppError("PLAN_CHANGED", 409);
  let plan: AllocationPlan;
  try {
    plan = planAllocation(context, r.goal);
  } catch {
    throw new AppError("ALLOCATION_NO_LONGER_BENEFICIAL", 409);
  }
  if (plan.state !== "partial_available")
    throw new AppError("ALLOCATION_NO_LONGER_BENEFICIAL", 409);
  const j: Journal = {
    id: randomUUID(),
    wallet: r.wallet,
    positions: r.positions,
    goal: r.goal,
    mode: "loss-allocation-v1",
    plan,
    allocation: {
      programFingerprint: context.programFingerprint,
      configFingerprint: context.configFingerprint,
      feePerStepLamports: context.feePerStepLamports,
    },
    cursor: 0,
    revision: 0,
    expiresAt: Date.now() + 15 * 60 * 1000,
    receipts: [],
    reviewRequired: allocationDecisionHash(plan, context) !== quoted.decisionHash,
  };
  j.plan = { ...plan, steps: plan.steps.filter((s) => BigInt(s.repayAtomic) > 0n) };
  await redis(["SET", key(j.id), JSON.stringify(j), "EX", "86400", "NX"]);
  return {
    token: seal({ kind: "picachu-allocation-plan-v1", id: j.id, wallet: j.wallet }),
    plan: j.plan,
    portfolio: context.portfolio,
    expiresAt: j.expiresAt,
    reviewRequired: j.reviewRequired,
  };
}

async function prepareAllocationPlan(j: Journal) {
  if (j.plan.version !== "allocation-v1" || !j.allocation) throw new AppError("PLAN_CHANGED", 409);
  if (!j.plan.steps[j.cursor]) throw new AppError("PLAN_COMPLETE", 409);
  const { readAllocationContext } = await import("../../solana/adapters/kamino-liquidation");
  const context = await readAllocationContext(j.wallet, j.positions, j.goal.shockBps);
  const paid = j.receipts.reduce((a, r) => a + BigInt(r.repayAtomic), 0n);
  const expectedBalance = BigInt(j.plan.walletAfterAtomic) + BigInt(j.plan.totalRepayAtomic) - paid;
  if (
    BigInt(context.portfolio.positions[0].walletDebtAtomic) !== expectedBalance ||
    context.programFingerprint !== j.allocation.programFingerprint ||
    context.configFingerprint !== j.allocation.configFingerprint
  )
    throw new AppError("PLAN_CHANGED", 409);
  const fresh = planAllocation(
    context,
    { ...j.goal, budgetAtomic: (BigInt(j.goal.budgetAtomic) - paid).toString() },
    { frozenPositions: j.receipts.map((r) => r.position) },
  );
  if (fresh.state !== "partial_available") {
    const revision = j.revision;
    j.stopped = true;
    j.stopReason = "ALLOCATION_NO_LONGER_BENEFICIAL";
    await save(j, revision);
    await releaseWalletLock(j);
    throw new AppError("ALLOCATION_NO_LONGER_BENEFICIAL", 409);
  }
  const remaining = fresh.steps.filter((s) => BigInt(s.repayAtomic) > 0n);
  const old = j.plan.steps.slice(j.cursor);
  const changed =
    remaining.length !== old.length ||
    remaining.some(
      (s, i) => s.position !== old[i]?.position || s.repayAtomic !== old[i]?.repayAtomic,
    ) ||
    fresh.feeLamports !== (BigInt(j.allocation.feePerStepLamports) * BigInt(old.length)).toString();
  const total = paid + BigInt(fresh.totalRepayAtomic);
  if (
    total > BigInt(j.goal.budgetAtomic) ||
    BigInt(fresh.walletAfterAtomic) < BigInt(j.goal.reserveAtomic)
  )
    throw new AppError("PLAN_CHANGED", 409);
  const step = remaining[0];
  const prepared = await prepareRepayment(
    {
      wallet: j.wallet,
      position: step.position,
      protocol: "kamino",
      constraints: { ...j.goal, budgetAtomic: step.repayAtomic, targetLtvBps: 100 },
      repayAtomic: step.repayAtomic,
    },
    {
      kind: "allocation",
      planId: j.id,
      revision: j.revision + 1,
      programFingerprint: context.programFingerprint,
    },
  );
  if (BigInt(prepared.feeLamports) > BigInt(context.feePerStepLamports))
    throw new AppError("PLAN_CHANGED", 409);
  const revision = j.revision;
  const prefix = j.plan.steps.slice(0, j.cursor);
  j.plan = {
    ...fresh,
    steps: [...prefix, ...remaining],
    totalRepayAtomic: total.toString(),
    requiredAtomic: (paid + BigInt(fresh.requiredAtomic)).toString(),
  };
  j.prepared = prepared;
  j.reviewRequired = Boolean(j.reviewRequired || changed);
  j.allocation.feePerStepLamports = context.feePerStepLamports;
  await save(j, revision);
  return {
    ...prepared,
    position: step.position,
    step: j.cursor + 1,
    total: j.plan.steps.length,
    plan: j.plan,
    portfolio: context.portfolio,
    reviewRequired: j.reviewRequired,
  };
}

async function releaseWalletLock(j: Journal) {
  await redis([
    "EVAL",
    "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0",
    "1",
    `picachu:wallet-plan:${j.wallet}`,
    j.id,
  ]);
}
export async function cancelPlan(input: unknown) {
  const { token } = z.object({ token: z.string().max(20000) }).parse(input),
    j = await load(token);
  if (j.pending) throw new AppError("PLAN_PENDING", 409);
  const rev = j.revision;
  j.stopped = true;
  delete j.prepared;
  await save(j, rev);
  await redis([
    "EVAL",
    "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0",
    "1",
    `picachu:wallet-plan:${j.wallet}`,
    j.id,
  ]);
  return { phase: "cancelled" };
}
