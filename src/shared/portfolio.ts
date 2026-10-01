import { z } from "zod";
import { constraintsSchema, snapshotSchema } from "./types";

export const goalSchema = constraintsSchema
  .pick({ budgetAtomic: true, reserveAtomic: true, shockBps: true })
  .extend({
    bufferBps: z.number().int().min(1).max(5000).default(500),
  });
export type RepaymentGoal = z.infer<typeof goalSchema>;
export const portfolioSchema = z
  .object({
    version: z.literal(1),
    positions: z.array(snapshotSchema).min(1).max(3),
  })
  .superRefine(({ positions }, ctx) => {
    const first = positions[0];
    const identity = (s: typeof first) =>
      [
        s.wallet,
        s.source,
        s.protocol,
        s.market,
        s.debt.mint,
        s.debt.decimals,
        s.debt.priceUsd,
        s.collateral.mint,
        s.collateral.decimals,
        s.walletDebtAtomic,
        s.walletSolLamports,
      ].join("|");
    if (positions.some((s) => identity(s) !== identity(first)))
      ctx.addIssue({ code: "custom", message: "INCONSISTENT_PORTFOLIO" });
    if (new Set(positions.map((s) => s.position)).size !== positions.length)
      ctx.addIssue({ code: "custom", message: "DUPLICATE_POSITION" });
  });
export type PortfolioSnapshot = z.infer<typeof portfolioSchema>;
export type GoalPlan = {
  version: "goal-v1";
  state: "already_met" | "achievable" | "insufficient_budget";
  spendableAtomic: string;
  requiredAtomic: string;
  shortfallAtomic: string;
  totalRepayAtomic: string;
  walletAfterAtomic: string;
  steps: {
    position: string;
    repayAtomic: string;
    bufferBeforePct: string | null;
    bufferAfterPct: string | null;
  }[];
  model: { available: false; reason: "LIQUIDATION_PARITY_NOT_VERIFIED" };
};
