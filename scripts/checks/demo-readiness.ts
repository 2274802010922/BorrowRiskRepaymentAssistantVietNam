import dotenv from "dotenv";
import { inspectDemo } from "../../solana/transactions/demo";
import { AppError } from "../../backend/services/http";
dotenv.config({ path: ".env.local", quiet: true });
const wallet = process.argv[2];
if (!wallet) {
  console.error("Usage: npm run check:demo -- <public-wallet-address>");
  process.exit(1);
}
const timer = setTimeout(() => {
  console.error("DEMO_CHECK_TIMEOUT");
  process.exit(1);
}, 60000);
try {
  const { check } = await inspectDemo(wallet);
  console.log(
    JSON.stringify(
      { ...check, note: "Read-only check; no transaction was signed or submitted." },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof AppError ? error.code : "DEMO_CHECK_FAILED");
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
