import { expect, it } from "vitest";
import { demoBorrow, demoProfileBorrow, protocolBorrowCap } from "../../core/validation/demo";
it("refreshes a profile quote downward without rejecting a now-higher displayed amount", () => {
  expect(demoProfileBorrow("7734567", "7721067")).toBe("7721067");
});
it("never increases the displayed cap when fresh prices increase", () => {
  expect(demoProfileBorrow("7721067", "7734567")).toBe("7721067");
});
it("checks signed amounts against a fresh conservative protocol cap and liquidity", () => {
  const cap = protocolBorrowCap("100000000", "100", "1", 0.75, 1, "100000000");
  expect(cap).toBe("7350000");
  expect(() => demoBorrow("6500000", cap)).not.toThrow();
  expect(() => demoBorrow("7400000", cap)).toThrow();
  expect(protocolBorrowCap("100000000", "100", "1", 0.75, 1, "1000000")).toBe("1000000");
});
it("keeps manual amounts strict and rejects empty/zero profile amounts", () => {
  expect(() => demoBorrow("7734567", "7721067")).toThrow();
  expect(() => demoProfileBorrow("0", "1000")).toThrow();
  expect(() => demoProfileBorrow(undefined, "1000")).toThrow();
  expect(() => demoProfileBorrow("1000", "0")).toThrow();
});
