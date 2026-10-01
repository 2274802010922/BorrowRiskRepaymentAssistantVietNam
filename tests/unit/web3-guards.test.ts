import { afterEach, expect, it, vi } from "vitest";
import { executionReadiness } from "../../src/backend/services/readiness";
import { readJson } from "../../src/backend/services/http";
import { consumeBudget } from "../../src/backend/services/limits";
import { previewKey, writeRecovery } from "../../src/frontend/lib/transaction-state";
import { exampleSnapshot } from "../fixtures/position";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("does not accept a non-base58 market as configured", () => {
  vi.stubEnv("KAMINO_MARKET_ID", "not-a-public-key");
  vi.stubEnv("KAMINO_COLLATERAL_RESERVE", "11111111111111111111111111111111");
  vi.stubEnv("KAMINO_DEBT_RESERVE", "11111111111111111111111111111111");
  vi.stubEnv("PLAN_BINDING_SECRET", "x".repeat(32));
  expect(executionReadiness()).toMatchObject({ configured: false, invalid: ["KAMINO_MARKET_ID"] });
});
it("rejects oversized request bytes before parsing", async () => {
  await expect(
    readJson(new Request("https://example.test", { method: "POST", body: "x".repeat(32001) })),
  ).rejects.toThrow("PAYLOAD_TOO_LARGE");
});
it("rejects invalid JSON with a stable application error", async () => {
  await expect(
    readJson(new Request("https://example.test", { method: "POST", body: "{" })),
  ).rejects.toThrow("INVALID_INPUT");
});
it("invalidates signing context when reserve, wallet or snapshot changes", () => {
  const s = exampleSnapshot();
  const c = {
    budgetAtomic: "100000000",
    reserveAtomic: "50000000",
    targetLtvBps: 6000,
    shockBps: 2000,
  };
  const base = previewKey("wallet", "devnet", s, c, "100000000");
  expect(
    previewKey("wallet", "devnet", s, { ...c, reserveAtomic: "60000000" }, "100000000"),
  ).not.toBe(base);
  expect(previewKey("other-wallet", "devnet", s, c, "100000000")).not.toBe(base);
  expect(previewKey("wallet", "devnet", { ...s, slot: 42 }, c, "100000000")).not.toBe(base);
});
it("fails closed when a browser cannot persist a signed transaction", () => {
  vi.stubGlobal("localStorage", {
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(() => writeRecovery("key", { signature: "pending" })).toThrow("STORAGE_UNAVAILABLE");
});
it("blocks paid AI on Vercel without shared quota configuration", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("RATE_LIMIT_REDIS_URL", "");
  vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "");
  await expect(consumeBudget("ai")).rejects.toThrow("AI_BUDGET_NOT_CONFIGURED");
});
it("enforces a distributed exhausted budget without provider calls", async () => {
  vi.stubEnv("RATE_LIMIT_REDIS_URL", "https://budget.example.test");
  vi.stubEnv("RATE_LIMIT_REDIS_TOKEN", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ result: 0 })));
  await expect(consumeBudget("ai")).rejects.toThrow("RATE_LIMITED");
});
