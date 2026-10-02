import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { goalSchema, type RepaymentGoal } from "../../shared/portfolio";
import type { AllocationPlan, AllocationQuote } from "../../shared/allocation";
import { planAllocation, type AllocationContext } from "../../core/allocation/plan";
import { exampleAllocationContext } from "../../core/allocation/example";
import { readAllocationContext } from "../../solana/adapters/kamino-liquidation";
import { isPublicKey } from "./readiness";
import { redis } from "./redis";
import { seal, unseal } from "./binding";
import { AppError } from "./http";
import { D } from "../../core/risk/metrics";
const hash = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const identity = z.object({
  kind: z.literal("picachu-allocation-quote-v1"),
  id: z.uuid(),
  wallet: z.string().refine(isPublicKey),
});
const key = (id: string) => `picachu:allocation-quote:${id}`;
export type StoredAllocation = {
  id: string;
  wallet: string;
  positions: string[];
  goal: RepaymentGoal;
  context: AllocationContext;
  plan: AllocationPlan;
  decisionHash: string;
  expiresAt: number;
};
export function allocationDecisionHash(plan: AllocationPlan, context: AllocationContext) {
  // Quote changes which matter to the decision and visible money require explicit review.
  return hash({
    program: context.programFingerprint,
    config: context.configFingerprint,
    steps: plan.steps.map((s) => ({
      position: s.position,
      amount: s.repayAtomic,
      meetsGoal: s.meetsGoal,
      eligible: s.eligibleAtShock,
    })),
    fee: plan.feeLamports,
    lossBefore: new D(plan.lossBeforeUsd).toFixed(2),
    lossAfter: new D(plan.lossAfterUsd).toFixed(2),
  });
}
export async function allocationQuote(input: unknown): Promise<AllocationQuote> {
  const request = z
    .discriminatedUnion("source", [
      z
        .object({
          source: z.literal("synthetic"),
          positions: z
            .array(z.enum(["example-a", "example-b", "example-c"]))
            .min(1)
            .max(3)
            .refine((a) => new Set(a).size === a.length)
            .optional(),
          goal: goalSchema,
        })
        .strict(),
      z
        .object({
          source: z.literal("devnet"),
          wallet: z.string().refine(isPublicKey),
          positions: z.array(z.string().refine(isPublicKey)).min(1).max(3),
          goal: goalSchema,
        })
        .strict(),
    ])
    .parse(input);
  let context: AllocationContext, plan: AllocationPlan;
  try {
    context =
      request.source === "synthetic"
        ? exampleAllocationContext(request.goal.shockBps, request.positions)
        : await readAllocationContext(request.wallet, request.positions, request.goal.shockBps);
    plan = planAllocation(context, request.goal);
  } catch (e) {
    const code = e instanceof AppError ? e.code : e instanceof Error ? e.message : "";
    if (
      /^(UNSUPPORTED_|LIQUIDATION_|ALLOCATION_NOT_NEEDED|ALLOCATION_GRID_LIMIT|INSUFFICIENT_SOL|STALE_DATA|SIMULATION_FAILED|NO_SUPPORTED_POSITION)/.test(
        code,
      )
    )
      return { state: "unavailable", reason: code };
    throw e;
  }
  const expiresAt = Date.now() + 90000;
  if (request.source === "synthetic" || plan.state !== "partial_available")
    return {
      state: "ready",
      expiresAt,
      executionAllowed: false,
      plan,
      portfolio: context.portfolio,
    };
  const stored: StoredAllocation = {
    id: randomUUID(),
    wallet: request.wallet,
    positions: request.positions,
    goal: request.goal,
    context,
    plan,
    decisionHash: allocationDecisionHash(plan, context),
    expiresAt,
  };
  await redis(["SET", key(stored.id), JSON.stringify(stored), "EX", "120", "NX"]);
  return {
    state: "ready",
    token: seal({ kind: "picachu-allocation-quote-v1", id: stored.id, wallet: stored.wallet }),
    expiresAt,
    executionAllowed: true,
    plan,
    portfolio: context.portfolio,
  };
}
export async function loadAllocationQuote(
  token: string,
  wallet: string,
  positions: string[],
  goal: RepaymentGoal,
) {
  const bound = identity.parse(unseal(token));
  if (bound.wallet !== wallet) throw new AppError("PLAN_CHANGED", 409);
  const raw = await redis(["GET", key(bound.id)]);
  if (typeof raw !== "string") throw new AppError("PREVIEW_EXPIRED", 409);
  const stored = JSON.parse(raw) as StoredAllocation;
  if (Date.now() >= stored.expiresAt) throw new AppError("PREVIEW_EXPIRED", 409);
  if (
    stored.wallet !== wallet ||
    hash([...stored.positions].sort()) !== hash([...positions].sort()) ||
    hash(stored.goal) !== hash(goal) ||
    stored.plan.source !== "devnet" ||
    stored.plan.state !== "partial_available"
  )
    throw new AppError("PLAN_CHANGED", 409);
  return stored;
}
