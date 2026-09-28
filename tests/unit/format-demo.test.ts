import { expect, it } from "vitest";
import { compactNumber, exactToken } from "../../shared/format";
import { demoBorrow, demoBorrowCap, demoDeposit } from "../../core/validation/demo";
it("removes only insignificant zeros and localizes separators", () => {
  expect(exactToken("50000000", 6)).toBe("50");
  expect(exactToken("50120000", 6)).toBe("50,12");
  expect(exactToken("1", 6)).toBe("0,000001");
  expect(exactToken("1234567890", 6, "en")).toBe("1,234.56789");
  expect(compactNumber("0.0001", "vi", 2)).toBe("< 0,01");
});
it("bounds demo deposit, debt, borrow factor and liquidity", () => {
  expect(demoDeposit("100000000")).toBe("100000000");
  expect(() => demoDeposit("1000000001")).toThrow();
  expect(() => demoDeposit("0")).toThrow();
  expect(() => demoBorrow("11", "10")).toThrow();
  expect(demoBorrowCap("1000000000", "100", "1", 0.8, 1, "9000000")).toBe("9000000");
  expect(demoBorrowCap("100000000", "100", "1", 0.8, 2, "9000000")).toBe("1000000");
  expect(demoBorrowCap("100000000", "100", "1", 0, 1, "9000000")).toBe("0");
});
