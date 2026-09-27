export const scenarioIds = [
  "ready",
  "loading",
  "empty",
  "error",
  "stale",
  "insufficient",
  "awaiting_signature",
  "rejected",
  "submitted",
  "confirmation_unknown",
  "confirmed",
  "verified",
] as const;

export type ScenarioId = (typeof scenarioIds)[number];
export type Tone = "neutral" | "info" | "warning" | "danger" | "success";

export const scenarioTones: Record<ScenarioId, Tone> = {
  ready: "info",
  loading: "neutral",
  empty: "neutral",
  error: "danger",
  stale: "warning",
  insufficient: "warning",
  awaiting_signature: "info",
  rejected: "warning",
  submitted: "info",
  confirmation_unknown: "warning",
  confirmed: "info",
  verified: "success",
};

// UI fixtures, not a transaction state machine or a live protocol implementation.
export function isScenarioId(value: string): value is ScenarioId {
  return scenarioIds.some((id) => id === value);
}

export const examplePosition = Object.freeze({
  source: "synthetic" as const,
  id: "example",
  collateralSol: "10",
  collateralUsd: "1500",
  debtUsdc: "700",
  walletUsdc: "700",
  projectedRepaymentUsdc: "300",
  projectedDebtUsdc: "400",
  projectedWalletUsdc: "400",
  networkTransaction: null,
});
