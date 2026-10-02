// Explicit unsigned 60-bit fixed-point units. BigInt intermediates retain full products.
export const SF = 1n << 60n;
const MAX = (1n << 128n) - 1n;
export function checked(value: bigint) {
  if (value < 0n || value > MAX) throw new Error("LIQUIDATION_ARITHMETIC_RANGE");
  return value;
}
export const mul = (a: bigint, b: bigint) => checked((a * b) / SF);
export function div(a: bigint, b: bigint) {
  if (b <= 0n) throw new Error("LIQUIDATION_ARITHMETIC_RANGE");
  return checked((a * SF) / b);
}
export const percent = (value: number) => checked((BigInt(value) * SF) / 100n);
export const bps = (value: number) => checked((BigInt(value) * SF) / 10000n);
export const ceilAtomic = (value: bigint) => (value + SF - 1n) / SF;
export const min = (...values: bigint[]) => values.reduce((a, b) => (a < b ? a : b));
export const max = (...values: bigint[]) => values.reduce((a, b) => (a > b ? a : b));
export function valueUsdSf(amountSf: bigint, priceSf: bigint, decimals: number) {
  return checked((amountSf * priceSf) / (SF * 10n ** BigInt(decimals)));
}
export function collateralUnderlyingSf(
  ctAtomic: bigint,
  liquiditySf: bigint,
  supplyAtomic: bigint,
) {
  if (supplyAtomic <= 0n || liquiditySf <= 0n) throw new Error("LIQUIDATION_ARITHMETIC_RANGE");
  return checked((ctAtomic * liquiditySf) / supplyAtomic);
}
