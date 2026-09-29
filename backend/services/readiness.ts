import bs58 from "bs58";
import { AppError } from "./http";
export function isPublicKey(value: string) {
  try {
    return bs58.decode(value).length === 32;
  } catch {
    return false;
  }
}
export function executionReadiness() {
  const required = [
    "KAMINO_MARKET_ID",
    "KAMINO_COLLATERAL_RESERVE",
    "KAMINO_DEBT_RESERVE",
    "PLAN_BINDING_SECRET",
  ] as const;
  const missing = required.filter((name) => !process.env[name]);
  const invalid: string[] = [];
  for (const name of required.slice(0, 3)) {
    if (process.env[name]) {
      try {
        if (bs58.decode(process.env[name]!).length !== 32) throw new Error();
      } catch {
        invalid.push(name);
      }
    }
  }
  if (process.env.PLAN_BINDING_SECRET && process.env.PLAN_BINDING_SECRET.length < 32)
    invalid.push("PLAN_BINDING_SECRET");
  return {
    configured: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    marketVerified: false,
  };
}
export function requireExecutionConfig() {
  if (!executionReadiness().configured) throw new AppError("EXECUTION_NOT_CONFIGURED", 503);
}
