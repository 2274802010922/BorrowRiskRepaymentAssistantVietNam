import { randomBytes } from "node:crypto";
import { demoAction, inspectDemo } from "../../src/solana/transactions/demo";
import { AppError } from "../../src/backend/services/http";
const [wallet, market, collateral, debt, rawSlot] = process.argv.slice(2);
const slot = rawSlot ? (Number(rawSlot) as 201 | 202 | 203) : 201;
if (![201, 202, 203].includes(slot)) throw new Error("INVALID_DEMO_SLOT");
const portfolioProfile = Boolean(rawSlot);
if (!wallet || !market || !collateral || !debt) {
  console.error(
    "Usage: npx tsx scripts/checks/simulate-demo.ts <wallet> <market> <collateral-reserve> <debt-reserve> [201|202|203 for portfolio profile]",
  );
  process.exit(1);
}
process.env.KAMINO_MARKET_ID = market;
process.env.KAMINO_COLLATERAL_RESERVE = collateral;
process.env.KAMINO_DEBT_RESERVE = debt;
process.env.PLAN_BINDING_SECRET ??= randomBytes(32).toString("hex");
const timer = setTimeout(() => {
  console.error("SIMULATION_PROBE_TIMEOUT");
  process.exit(1);
}, 90000);
try {
  const { check } = await inspectDemo(wallet, slot, portfolioProfile);
  console.log(JSON.stringify({ check, signed: false, submitted: false }));
  if (check.stage === "ready" || check.stage === "closed") {
    console.log("Existing session: no new transaction prepared.");
  } else {
    const prepared = await demoAction({
      action: "prepare",
      wallet,
      slot,
      portfolioProfile,
      depositAtomic: "100000000",
      borrowAtomic: check.profileBorrowAtomic ?? "1000000",
    });
    console.log(
      JSON.stringify({
        result: "SIMULATION_PASSED",
        stage: "stage" in prepared ? prepared.stage : undefined,
        feeLamports: "feeLamports" in prepared ? prepared.feeLamports : undefined,
        position: "position" in prepared ? prepared.position : undefined,
        signed: false,
        submitted: false,
      }),
    );
  }
} catch (error) {
  console.error(
    JSON.stringify({
      code: error instanceof AppError ? error.code : "PROBE_FAILED",
      detail:
        error instanceof AppError
          ? error.cause
          : error instanceof Error
            ? error.message
            : "unknown",
    }),
  );
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
