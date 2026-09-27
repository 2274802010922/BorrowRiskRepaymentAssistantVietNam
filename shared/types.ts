import { z } from "zod";

const atomic = z
  .string()
  .regex(/^\d{1,20}$/)
  .refine((v) => BigInt(v) <= 18446744073709551615n);
const positiveDecimal = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .refine((v) => Number(v) > 0 && Number.isFinite(Number(v)));

export const tokenSchema = z.object({
  mint: z.string().min(1),
  symbol: z.string().min(1).max(20),
  decimals: z.number().int().min(0).max(18),
  amountAtomic: atomic,
  priceUsd: positiveDecimal,
});

export const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.enum(["synthetic", "devnet"]),
  protocol: z.enum(["kamino", "borrowrisk-sandbox"]),
  cluster: z.literal("devnet"),
  wallet: z.string(),
  position: z.string(),
  market: z.string(),
  collateral: tokenSchema,
  debt: tokenSchema,
  walletDebtAtomic: atomic,
  walletSolLamports: atomic,
  liquidationThresholdBps: z.number().int().min(1).max(9999),
  borrowFactorBps: z.number().int().min(10000).max(1000000),
  observedAt: z.iso.datetime(),
  priceObservedAt: z.iso.datetime(),
  slot: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});
export type PositionSnapshot = z.infer<typeof snapshotSchema>;
export type Locale = "vi" | "en";

export const constraintsSchema = z.object({
  budgetAtomic: atomic,
  reserveAtomic: atomic,
  shockBps: z.number().int().min(0).max(9000),
  targetLtvBps: z.number().int().min(100).max(9500),
});
export type Constraints = z.infer<typeof constraintsSchema>;
export type Metrics = {
  collateralUsd: string;
  debtUsd: string;
  ltvPct: string;
  healthFactor: string | null;
  debtFree: boolean;
};
export type RepaymentOption = {
  id: "target" | "maximum";
  repayAtomic: string;
  walletAfterAtomic: string;
  debtAfterAtomic: string;
  current: Metrics;
  stressed: Metrics;
  meetsTarget: boolean;
};
export type RepaymentPlan = {
  current: Metrics;
  stressed: Metrics;
  maxRepayAtomic: string;
  requiredRepayAtomic: string;
  shortfallAtomic: string;
  targetAlreadyMet: boolean;
  options: RepaymentOption[];
};
export type ExecutionPhase =
  | "preview"
  | "awaiting_signature"
  | "submitted"
  | "confirmation_unknown"
  | "confirmed"
  | "verification_pending"
  | "verified"
  | "failed"
  | "rejected"
  | "expired";
export type ExecutionRecord = {
  signature: string;
  wallet: string;
  position: string;
  protocol: PositionSnapshot["protocol"];
  repayAtomic: string;
  debtBeforeAtomic: string;
  reserveAtomic: string;
  lastValidBlockHeight: number;
  createdAt: string;
  phase: ExecutionPhase;
  bindingToken: string;
};
