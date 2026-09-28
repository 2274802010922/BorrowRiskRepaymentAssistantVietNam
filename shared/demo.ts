import { z } from "zod";
export const demoInputSchema = z.object({
  wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  action: z.enum(["check", "prepare", "submit", "status"]),
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
  stage: "deposit" | "borrow" | "ready";
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
  stage: "deposit" | "borrow";
  amountAtomic: string;
  feeLamports: string;
  position: string;
};
export type DemoRecord = {
  wallet: string;
  signature: string;
  token: string;
  stage: "deposit" | "borrow";
};
