import { D } from "./metrics";

export function normalizePyth(
  price: string,
  confidence: string,
  exponent: number,
  emaPrice: string,
  maxTwapDivergenceBps: number,
) {
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 18) throw new Error("ORACLE_INVALID");
  const rawPrice = new D(price),
    rawConfidence = new D(confidence),
    ema = new D(emaPrice);
  if (
    !rawPrice.isFinite() ||
    !rawConfidence.isFinite() ||
    rawPrice.lte(0) ||
    rawConfidence.lt(0) ||
    !rawPrice.gt(rawConfidence.mul(50))
  )
    throw new Error("ORACLE_INVALID");
  if (
    maxTwapDivergenceBps > 0 &&
    (ema.lte(0) || rawPrice.sub(ema).abs().div(ema).mul(10000).gt(maxTwapDivergenceBps))
  )
    throw new Error("ORACLE_INVALID");
  const scale = new D(10).pow(exponent);
  return { price: rawPrice.mul(scale), confidence: rawConfidence.mul(scale) };
}

/** Honor each reserve's on-chain limit, never accepting a price older than one day. */
export function isOracleFresh(timestamp: bigint, protocolLimitSeconds: string, nowMs = Date.now()) {
  const configured = Number(protocolLimitSeconds);
  if (!Number.isFinite(configured) || configured <= 0) return false;
  const age = nowMs / 1000 - Number(timestamp);
  return age >= -30 && age <= Math.min(configured, 86400);
}
