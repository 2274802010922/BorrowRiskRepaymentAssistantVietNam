import { z } from "zod";
import { D } from "../risk/metrics";
import {
  SF,
  checked,
  mul,
  div,
  percent,
  bps,
  min,
  max,
  ceilAtomic,
  valueUsdSf,
  collateralUnderlyingSf,
} from "./fixed-point";

const integer = z
  .string()
  .regex(/^\d{1,39}$/)
  .refine((s) => BigInt(s) < 1n << 128n);
export const liquidationInputSchema = z.object({
  debtAmountSf: integer,
  collateralCTAtomic: integer,
  collateralSupplyAtomic: integer,
  collateralLiquiditySf: integer,
  collateralPriceSf: integer,
  debtPriceSf: integer,
  collateralDecimals: z.literal(9),
  debtDecimals: z.literal(6),
  thresholdPct: z.number().int().min(1).max(99),
  borrowFactorPct: z.literal(100),
  closeFactorPct: z.number().int().min(1).max(100),
  insolvencyLtvPct: z.number().int().min(1).max(99),
  minFullLiquidationUsd: integer,
  maxDebtPerEventUsd: integer,
  minBonusBps: z.number().int().min(0).max(10000),
  maxBonusBps: z.number().int().min(0).max(10000),
  protocolFeePct: z.number().int().min(0).max(100),
});
export type LiquidationInput = z.infer<typeof liquidationInputSchema>;
export const usdFromSf = (value: string | bigint) =>
  new D(value.toString()).div(SF.toString()).toString();

// A supported, solvent, price-triggered event only. Version/provenance gate lives on server.
// Output units retain the debt fraction and cToken debit separately from liquidator payment.
export function priceLiquidationEvent(input: LiquidationInput, repayAtomic = "0") {
  const p = liquidationInputSchema.parse(input);
  if (!/^\d{1,20}$/.test(repayAtomic)) throw new Error("INVALID_REPAYMENT");
  const originalDebt = BigInt(p.debtAmountSf),
    payment = BigInt(repayAtomic);
  if (payment > ceilAtomic(originalDebt)) throw new Error("INVALID_REPAYMENT");
  const settledByUser = min(originalDebt, payment * SF),
    debt = originalDebt - settledByUser;
  const ct = BigInt(p.collateralCTAtomic);
  const underlying = collateralUnderlyingSf(
    ct,
    BigInt(p.collateralLiquiditySf),
    BigInt(p.collateralSupplyAtomic),
  );
  const collateralValue = valueUsdSf(underlying, BigInt(p.collateralPriceSf), 9);
  const debtValue = valueUsdSf(debt, BigInt(p.debtPriceSf), 6);
  if (collateralValue <= 0n) throw new Error("UNSUPPORTED_LIQUIDATION_CONTEXT");
  const threshold = div(mul(collateralValue, percent(p.thresholdPct)), collateralValue);
  const ltv = div(debtValue, collateralValue);
  if (ltv >= bps(9900)) throw new Error("UNSUPPORTED_INSOLVENCY");
  const base = {
    debtAfterUserSf: debt.toString(),
    collateralValueSf: collateralValue.toString(),
    debtValueSf: debtValue.toString(),
    ltvSf: ltv.toString(),
    thresholdSf: threshold.toString(),
  };
  if (debt === 0n || ltv < threshold)
    return {
      ...base,
      eligible: false,
      smallLoan: false,
      settleAmountSf: "0",
      liquidatorRepayAtomic: "0",
      collateralTakenAtomic: "0",
      grossRedeemedAtomic: "0",
      protocolFeeAtomic: "0",
      bonusSf: "0",
      lossUsd: "0",
    };
  const bonus = min(max(bps(p.minBonusBps), ltv - threshold), bps(p.maxBonusBps), SF - ltv);
  const smallLoan = debtValue < BigInt(p.minFullLiquidationUsd) * SF;
  const factor = ltv > percent(p.insolvencyLtvPct) ? SF : percent(p.closeFactorPct);
  const cappedValue = min(mul(debtValue, factor), debtValue, BigInt(p.maxDebtPerEventUsd) * SF);
  const liquidatable = smallLoan ? debt : mul(debt, div(cappedValue, debtValue));
  const totalTakenValue = mul(mul(debtValue, div(liquidatable, debt)), SF + bonus);
  let settled = liquidatable,
    taken = ct;
  if (totalTakenValue > collateralValue) {
    if (!smallLoan) settled = mul(liquidatable, div(collateralValue, totalTakenValue));
  } else if (totalTakenValue < collateralValue) {
    const takenFraction = mul(ct * SF, div(totalTakenValue, collateralValue));
    taken = smallLoan && takenFraction < SF ? 1n : takenFraction / SF;
  }
  if (taken > ct || taken === 0n || settled === 0n) throw new Error("UNSUPPORTED_LIQUIDATION_DUST");
  const takenUnderlying = collateralUnderlyingSf(
    taken,
    BigInt(p.collateralLiquiditySf),
    BigInt(p.collateralSupplyAtomic),
  );
  const gross = takenUnderlying / SF;
  const grossSf = gross * SF;
  const protocolFee = max(
    1n,
    ceilAtomic(mul(grossSf - div(grossSf, SF + bonus), percent(p.protocolFeePct))),
  );
  if (protocolFee > gross) throw new Error("UNSUPPORTED_LIQUIDATION_DUST");
  const seizedValue = valueUsdSf(takenUnderlying, BigInt(p.collateralPriceSf), 9);
  const clearedDebtValue = valueUsdSf(settled, BigInt(p.debtPriceSf), 6);
  if (seizedValue < clearedDebtValue) throw new Error("UNSUPPORTED_LIQUIDATION_DUST");
  return {
    ...base,
    eligible: true,
    smallLoan,
    settleAmountSf: checked(settled).toString(),
    liquidatorRepayAtomic: ceilAtomic(settled).toString(),
    collateralTakenAtomic: taken.toString(),
    grossRedeemedAtomic: gross.toString(),
    protocolFeeAtomic: protocolFee.toString(),
    bonusSf: bonus.toString(),
    lossUsd: usdFromSf(seizedValue - clearedDebtValue),
  };
}
