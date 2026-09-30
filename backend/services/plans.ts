import { randomUUID } from "node:crypto";
import { z } from "zod";
import { goalSchema, type RepaymentGoal, type GoalPlan } from "../../shared/portfolio";
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
const key = (id: string) => `picachu:plan:${id}`;
const identity = z.object({
  kind: z.literal("picachu-goal-v1"),
  id: z.uuid(),
  wallet: z.string().refine(isPublicKey),
});
type Journal = {
  id: string;
  wallet: string;
  positions: string[];
  goal: RepaymentGoal;
  plan: GoalPlan;
  cursor: number;
  revision: number;
  expiresAt: number;
  prepared?: Awaited<ReturnType<typeof prepareRepayment>>;
  pending?: { signature: string; bindingToken: string };
  receipts: { signature: string; position: string; repayAtomic: string }[];
  stopped?: boolean;
};
async function load(token: string) {
  const bound = identity.parse(unseal(token));
  const raw = await redis(["GET", key(bound.id)]);
  if (typeof raw !== "string") throw new AppError("PLAN_EXPIRED", 409);
  const journal = JSON.parse(raw) as Journal;
  if (journal.wallet !== bound.wallet) throw new AppError("TRANSACTION_CHANGED");
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
    })
    .parse(input);
  if (new Set(r.positions).size !== r.positions.length) throw new AppError("INVALID_INPUT");
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
  if (j.pending || j.stopped) throw new AppError("PLAN_PENDING", 409);
  if (Date.now() > j.expiresAt) throw new AppError("PLAN_EXPIRED", 409);
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
  // Fresh price/interest changes require a new review; never silently increase or spend excess.
  if (!needed || needed.repayAtomic !== step.repayAtomic || fresh.state === "insufficient_budget")
    throw new AppError("PLAN_CHANGED", 409);
  const prepared = await prepareRepayment({
    wallet: j.wallet,
    position: step.position,
    protocol: "kamino",
    constraints: { ...j.goal, budgetAtomic: step.repayAtomic, targetLtvBps: 100 },
    repayAtomic: step.repayAtomic,
  });
  const rev = j.revision;
  j.prepared = prepared;
  await save(j, rev);
  return { ...prepared, step: j.cursor + 1, total: j.plan.steps.length };
}
export async function submitPlan(input: unknown) {
  const r = z
      .object({
        token: z.string().max(20000),
        bindingToken: z.string().max(20000),
        transaction: z.string().max(8192),
      })
      .parse(input),
    j = await load(r.token);
  if (!j.prepared || j.prepared.token !== r.bindingToken || j.stopped)
    throw new AppError("PLAN_CHANGED", 409);
  if (j.pending) return { signature: j.pending.signature, phase: "submitted" };
  if (Date.now() > j.expiresAt) throw new AppError("PLAN_EXPIRED", 409);
  return submitRepayment(
    { token: r.bindingToken, transaction: r.transaction },
    async (signature) => {
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
    cursor: j.cursor,
    receipts: j.receipts,
  };
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
