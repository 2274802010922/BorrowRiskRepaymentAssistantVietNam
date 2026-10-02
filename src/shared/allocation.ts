import type { GoalPlan, PortfolioSnapshot } from "./portfolio";
export type AllocationPlan = Omit<GoalPlan, "version" | "state" | "model" | "steps"> & {
  version: "allocation-v1";
  state: "partial_available" | "no_beneficial_allocation";
  source: "synthetic" | "devnet";
  positionCount: number;
  model: { available: true; version: string; algorithm: string; candidateCounts: number[] };
  lossBeforeUsd: string;
  lossAfterUsd: string;
  feeUsd: string;
  feeLamports: string;
  totalCostUsd: string;
  unspentAtomic: string;
  remainingGoalRepayAtomic: string;
  steps: (GoalPlan["steps"][number] & {
    lossBeforeUsd: string;
    lossAfterUsd: string;
    meetsGoal: boolean;
    eligibleAtShock: boolean;
    reason: "goal_met" | "loss_reduced" | "not_allocated";
  })[];
  baselines: {
    id: "none" | "equal" | "risk_first" | "proposed";
    totalRepayAtomic: string;
    lossUsd: string;
    feeUsd: string;
    costUsd: string;
    goalsMet: number;
  }[];
};
export type PortfolioPlan = GoalPlan | AllocationPlan;
export type AllocationQuote =
  | { state: "unavailable"; reason: string }
  | {
      state: "ready";
      token?: string;
      expiresAt: number;
      executionAllowed: boolean;
      plan: AllocationPlan;
      portfolio: PortfolioSnapshot;
    };
