import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vectors from "../fixtures/liquidation/vectors.json";
import report from "../../docs/evidence/liquidation/parity-report.json";
import {
  priceLiquidationEvent,
  type LiquidationInput,
} from "../../src/core/liquidation/kamino-price-event";
import { SF, div, mul } from "../../src/core/liquidation/fixed-point";

it.each(vectors.vectors)("matches deployed executable effects: $id", (vector) => {
  const actual = priceLiquidationEvent(vector.input as LiquidationInput, vector.repayAtomic);
  expect(actual).toMatchObject(vector.expected);
});
it("pins every golden vector to the same executable and model source", () => {
  expect(report.passed).toBe(true);
  expect(vectors.executableSha256).toBe(report.executableSha256);
  expect(vectors.vectors).toHaveLength(report.cases);
  for (const file of report.modelFiles) {
    expect(createHash("sha256").update(readFileSync(file.path)).digest("hex")).toBe(file.sha256);
  }
});
it("rejects insolvency rather than treating an unsupported loss as zero", () => {
  const input = vectors.vectors[0].input as LiquidationInput;
  expect(() =>
    priceLiquidationEvent({
      ...input,
      collateralPriceSf: (BigInt(input.collateralPriceSf) / 3n).toString(),
    }),
  ).toThrow("UNSUPPORTED_INSOLVENCY");
});
it("rejects unsupported borrow factors and overspending", () => {
  const input = vectors.vectors[0].input as LiquidationInput;
  expect(() =>
    priceLiquidationEvent({ ...input, borrowFactorPct: 150 } as unknown as LiquidationInput),
  ).toThrow();
  expect(() => priceLiquidationEvent(input, "18446744073709551615")).toThrow("INVALID_REPAYMENT");
  expect(() => priceLiquidationEvent(input, "-1")).toThrow("INVALID_REPAYMENT");
});
it("preserves fixed-point products and rejects overflow/division by zero", () => {
  expect(mul(SF + 1n, SF + 1n)).toBe(SF + 2n);
  expect(() => div(SF, 0n)).toThrow("LIQUIDATION_ARITHMETIC_RANGE");
  expect(() => mul(1n << 128n, SF)).toThrow("LIQUIDATION_ARITHMETIC_RANGE");
});
