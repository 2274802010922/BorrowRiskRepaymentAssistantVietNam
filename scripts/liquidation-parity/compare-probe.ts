import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  priceLiquidationEvent,
  type LiquidationInput,
} from "../../src/core/liquidation/kamino-price-event";
const capture = JSON.parse(await readFile("work/liquidation-vm/capture/capture.json", "utf8"));
import { D } from "../../src/core/risk/metrics";
function compare(probe: ReturnType<typeof JSON.parse>) {
  const c = probe.normal.collateral,
    d = probe.normal.debt,
    m = probe.market ?? capture.market;
  const liquidity = c.liquidity;
  const totalSupply =
    (BigInt(liquidity.totalAvailableAmount) << 60n) +
    BigInt(liquidity.borrowedAmountSf) -
    BigInt(liquidity.accumulatedProtocolFeesSf) -
    BigInt(liquidity.accumulatedReferrerFeesSf) -
    BigInt(liquidity.pendingReferrerFeesSf);
  const input: LiquidationInput = {
    debtAmountSf: probe.normal.obligation.borrows[0].borrowedAmountSf,
    collateralCTAtomic: probe.normal.obligation.deposits[0].depositedAmount,
    collateralSupplyAtomic: c.collateral.mintTotalSupply,
    collateralLiquiditySf: totalSupply.toString(),
    collateralPriceSf: probe.stressedCollateral.liquidity.marketPriceSf,
    debtPriceSf: probe.stressedDebt.liquidity.marketPriceSf,
    collateralDecimals: 9,
    debtDecimals: 6,
    borrowFactorPct: 100,
    thresholdPct: c.config.liquidationThresholdPct,
    closeFactorPct: m.liquidationMaxDebtCloseFactorPct,
    insolvencyLtvPct: m.insolvencyRiskUnhealthyLtvPct,
    minFullLiquidationUsd: m.minFullLiquidationValueThreshold,
    maxDebtPerEventUsd: m.maxLiquidatableDebtMarketValueAtOnce,
    minBonusBps: Math.max(c.config.minLiquidationBonusBps, d.config.minLiquidationBonusBps),
    maxBonusBps: Math.max(c.config.maxLiquidationBonusBps, d.config.maxLiquidationBonusBps),
    protocolFeePct: c.config.protocolLiquidationFeePct,
  };
  const predicted = priceLiquidationEvent(input, probe.userRepayAtomic);
  if (
    probe.failed &&
    !probe.logs.some((s: string) => s.includes("Obligation is healthy and cannot"))
  )
    throw new Error(`UNEXPECTED_VM_FAILURE:${probe.id}`);
  const expected: Record<string, string | boolean> = {
    eligible: !probe.failed,
    debtAfterUserSf: probe.before.borrows[0].borrowedAmountSf,
    collateralValueSf: probe.before.depositedValueSf,
    debtValueSf: probe.before.borrowedAssetsMarketValueSf,
    settleAmountSf: (
      BigInt(probe.before.borrows[0].borrowedAmountSf) -
      BigInt(probe.after.borrows[0].borrowedAmountSf)
    ).toString(),
    collateralTakenAtomic: (
      BigInt(probe.before.deposits[0].depositedAmount) -
      BigInt(probe.after.deposits[0].depositedAmount)
    ).toString(),
  };
  const pnl = probe.logs
    .join("\n")
    .match(/pnl: Liquidator repaid (\d+) and withdrew (\d+) collateral with fees (\d+)/);
  if (!probe.failed) {
    if (!pnl) throw new Error(`MISSING_PROTOCOL_PNL:${probe.id}`);
    expected.liquidatorRepayAtomic = pnl[1];
    expected.protocolFeeAtomic = pnl[3];
    expected.grossRedeemedAtomic = (BigInt(pnl[2]) + BigInt(pnl[3])).toString();
  } else {
    expected.liquidatorRepayAtomic = "0";
    expected.protocolFeeAtomic = "0";
    expected.grossRedeemedAtomic = "0";
  }
  const scale = 1n << 60n;
  const ctDebit = BigInt(expected.collateralTakenAtomic as string);
  const underlyingLostSf = (ctDebit * totalSupply) / BigInt(input.collateralSupplyAtomic);
  const seizedUsdSf = (underlyingLostSf * BigInt(input.collateralPriceSf)) / (scale * 1000000000n);
  const clearedUsdSf =
    (BigInt(expected.settleAmountSf as string) * BigInt(input.debtPriceSf)) / (scale * 1000000n);
  expected.lossUsd = new D((seizedUsdSf - clearedUsdSf).toString())
    .div(scale.toString())
    .toString();
  const differences = Object.entries(expected).filter(
    ([field, value]) => predicted[field as keyof typeof predicted] !== value,
  );
  return {
    id: probe.id,
    source: "deployed-devnet-executable-in-local-vm",
    input,
    repayAtomic: probe.userRepayAtomic,
    expected,
    differences,
  };
}
const matrixMode = process.argv.includes("--matrix"),
  sourcePath = matrixMode ? "work/liquidation-vm/matrix.json" : "work/liquidation-vm/probe.json";
const raw = JSON.parse(await readFile(sourcePath, "utf8"));
const reports: Array<ReturnType<typeof JSON.parse>> = matrixMode ? raw.reports : [raw];
const vectors = reports.map(compare),
  failures = vectors.filter((v) => v.differences.length);
console.log(
  JSON.stringify(
    {
      cases: vectors.length,
      failures: failures.map((v) => ({ id: v.id, differences: v.differences })),
      executableSha256: capture.executableSha256,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
else if (matrixMode) {
  await mkdir("tests/fixtures/liquidation", { recursive: true });
  await mkdir("docs/evidence/liquidation", { recursive: true });
  await writeFile(
    "tests/fixtures/liquidation/vectors.json",
    JSON.stringify(
      {
        version: 1,
        executableSha256: capture.executableSha256,
        vectors: vectors.map((v) => ({
          id: v.id,
          source: v.source,
          input: v.input,
          repayAtomic: v.repayAtomic,
          expected: v.expected,
        })),
      },
      null,
      2,
    ),
  );
  const hashes = await Promise.all(
    ["src/core/liquidation/fixed-point.ts", "src/core/liquidation/kamino-price-event.ts"].map(
      async (p) => ({
        path: p,
        sha256: createHash("sha256")
          .update(await readFile(p))
          .digest("hex"),
      }),
    ),
  );
  await writeFile(
    "docs/evidence/liquidation/parity-report.json",
    JSON.stringify(
      {
        version: 1,
        passed: true,
        cases: vectors.length,
        generatedAt: new Date().toISOString(),
        captureAt: capture.capturedAt,
        program: capture.program,
        programData: capture.programData,
        upgradeSlot: capture.upgradeSlot,
        executableSha256: capture.executableSha256,
        sourceCommitReference: "a08760976f51a3a58c4a0c6ea27b4a0e565bca79",
        sourceBuildMatched: false,
        vm: "litesvm@1.5.0",
        scope:
          "solvent, price-triggered, one collateral/debt, 100% borrow factor, no elevation group",
        modelFiles: hashes,
        verifiedFields: Object.keys(vectors[0].expected),
        caseIds: vectors.map((v) => v.id),
      },
      null,
      2,
    ),
  );
}
