import { expect, it } from "vitest";
import { isOracleFresh, normalizePyth } from "../../src/core/risk/oracle";
it("compares price and confidence in the same units", () => {
  const result = normalizePyth("11940134390", "1790711", -8, "11940134390", 0);
  expect(result.price.toString()).toBe("119.4013439");
  expect(result.confidence.toString()).toBe("0.01790711");
  expect(normalizePyth("99999964", "45036", -8, "99999964", 0).price.toString()).toBe("0.99999964");
});
it("rejects excessive confidence, zero/negative prices and TWAP divergence", () => {
  expect(() => normalizePyth("10000", "200", -2, "10000", 0)).toThrow("ORACLE_INVALID");
  expect(() => normalizePyth("0", "0", -8, "0", 0)).toThrow();
  expect(() => normalizePyth("-100", "1", -2, "100", 0)).toThrow();
  expect(() => normalizePyth("15000", "1", -2, "10000", 100)).toThrow();
  expect(normalizePyth("100", "1", 2, "100", 0).price.toString()).toBe("10000");
});
it("honors each reserve freshness limit and the application cap", () => {
  expect(isOracleFresh(1000n, "120", 1120000)).toBe(true);
  expect(isOracleFresh(1000n, "120", 1121000)).toBe(false);
  expect(isOracleFresh(1000n, "86400", 1241000)).toBe(true);
  expect(isOracleFresh(1000n, "86400", 1301000)).toBe(true);
  expect(isOracleFresh(1000n, "86400", 87401000)).toBe(false);
  expect(isOracleFresh(1000n, "172800", 87401000)).toBe(false);
  expect(isOracleFresh(1040n, "120", 1000000)).toBe(false);
  expect(isOracleFresh(1000n, "0", 1000000)).toBe(false);
});
