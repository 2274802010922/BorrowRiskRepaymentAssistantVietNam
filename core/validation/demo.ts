import { D } from "../risk/metrics";
export function demoDeposit(value: string | undefined) {
  if (!value || !/^\d{1,10}$/.test(value)) throw new Error("INVALID_INPUT");
  const amount = BigInt(value);
  if (amount < 10000000n || amount > 1000000000n) throw new Error("INVALID_INPUT");
  return value; // 0.01–1 SOL per demo.
}
export function demoBorrow(value: string | undefined, maximum: string) {
  if (!value || !/^\d{1,10}$/.test(value)) throw new Error("INVALID_INPUT");
  if (BigInt(value) < 1n || BigInt(value) > BigInt(maximum)) throw new Error("INVALID_INPUT");
  return value;
}
export function demoProfileBorrow(value: string | undefined, currentMaximum: string) {
  if (!value || !/^\d{1,10}$/.test(value) || BigInt(value) < 1n) throw new Error("INVALID_INPUT");
  const cap = BigInt(currentMaximum),
    requested = BigInt(value);
  if (cap < 1n) throw new Error("INVALID_INPUT");
  // Fresh prices may lower the profile's amount. Never silently increase the
  // user's displayed amount; the final amount is still reviewed in the preview.
  return demoBorrow((requested < cap ? requested : cap).toString(), currentMaximum);
}
export function protocolBorrowCap(
  collateralAtomic: string,
  collateralPrice: string,
  debtPrice: string,
  maxLtv: number,
  borrowFactor: number,
  liquidity: string,
) {
  if (maxLtv <= 0 || borrowFactor <= 0) return "0";
  return D.min(
    new D(collateralAtomic)
      .div(1e9)
      .mul(collateralPrice)
      .mul(maxLtv)
      .mul("0.98")
      .div(borrowFactor)
      .div(debtPrice)
      .mul(1e6)
      .floor(),
    new D(liquidity).floor(),
    100000000,
  )
    .clamp(0, 100000000)
    .toFixed(0);
}
export function demoBorrowCap(
  collateralAtomic: string,
  collateralPrice: string,
  debtPrice: string,
  maxLtv: number,
  borrowFactor: number,
  liquidity: string,
) {
  if (maxLtv <= 0 || borrowFactor <= 0) return "0";
  return D.min(
    new D(collateralAtomic)
      .div(1e9)
      .mul(collateralPrice)
      .mul(Math.min(0.2, maxLtv * 0.5))
      .div(borrowFactor)
      .div(debtPrice)
      .mul(1e6)
      .floor(),
    new D(liquidity).floor(),
    10000000,
  )
    .clamp(0, 10000000)
    .toFixed(0);
}
