import { z } from "zod";
export const demoInputSchema = z.object({
  wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  action: z.enum(["check", "prepare", "submit", "status"]),
  slot: z.union([z.literal(201), z.literal(202), z.literal(203)]).default(201),
  portfolioProfile: z.boolean().default(false),
  operation: z.literal("withdraw").optional(),
  depositAtomic: z
    .string()
    .regex(/^\d{1,10}$/)
    .optional(),
  borrowAtomic: z
    .string()
    .regex(/^\d{1,10}$/)
    .optional(),
  token: z.string().max(12000).optional(),
  transaction: z.string().max(8192).optional(),
  signature: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/)
    .optional(),
});
export type DemoCheck = {
  slot?: number;
  profileBorrowAtomic?: string;
  profileLtvPct?: number;
  stage: "deposit" | "borrow" | "ready" | "closed";
  canWithdraw: boolean;
  oracleInfo?: { symbol: string; updatedAt: string; ageSeconds: number; maxAgeSeconds: number }[];
  position: string;
  walletSol: string;
  collateralAtomic: string;
  debtAtomic: string;
  maxBorrowAtomic: string;
  debtSymbol: string;
  config: { market: string; collateral: string; debt: string };
};
export type DemoPrepared = {
  token: string;
  transaction: string;
  expiresAt: number;
  stage: "deposit" | "borrow" | "withdraw";
  amountAtomic: string;
  feeLamports: string;
  totalSolDebitLamports?: string;
  position: string;
};
export type DemoRecord = {
  wallet: string;
  signature: string;
  token: string;
  stage: "deposit" | "borrow" | "withdraw";
};
