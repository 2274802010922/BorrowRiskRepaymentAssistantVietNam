import report from "../../../docs/evidence/liquidation/parity-report.json" with { type: "json" };
export const liquidationManifest = {
  version: "kamino-price-event-v1",
  verified:
    report.passed &&
    report.cases >= 25 &&
    [
      "event-cap",
      "protocol-fee",
      "threshold-80",
      "liquidation-boundary-0",
      "small-loan-full",
    ].every((id) => report.caseIds.includes(id)),
  program: report.program,
  programData: report.programData,
  upgradeSlot: report.upgradeSlot,
  executableSha256: report.executableSha256,
  evidence: "deployed-executable-in-local-vm",
  sourceBuildMatched: false,
  market: "9VaMhQPqEjQSByvZfjYFP6iiJLZFKzXTE5MNK9bDg1dr",
  collateral: "5jKCbPgqtJXbWfwi5zERhSmK16jrGuXdkicYekk1maVF",
  debt: "6DndsViDZXLSsQoq9JxCFijdr91Q3uAXoRsHRqjvxFE6",
} as const;
