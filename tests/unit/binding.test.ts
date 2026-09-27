import { afterEach, describe, expect, it, vi } from "vitest";
import { seal, unseal } from "../../backend/services/binding";
import { assertDevnetGenesis, DEVNET_GENESIS_HASH } from "../../solana/network/constants.mjs";
afterEach(() => vi.unstubAllEnvs());
describe("preview authenticity", () => {
  it("fails closed when the binding secret is missing", () => {
    vi.stubEnv("PLAN_BINDING_SECRET", "");
    expect(() => seal({ amount: "1" })).toThrow("EXECUTION_NOT_CONFIGURED");
  });
  it("rejects changes to a prepared amount", () => {
    vi.stubEnv("PLAN_BINDING_SECRET", "test-only-secret-not-a-production-credential");
    const token = seal({ amount: "1", wallet: "fixture" });
    expect(unseal(token)).toEqual({ amount: "1", wallet: "fixture" });
    const tampered = `${Buffer.from(JSON.stringify({ amount: "1000", wallet: "fixture" })).toString("base64url")}.${token.split(".")[1]}`;
    expect(() => unseal(tampered)).toThrow("INVALID_PREVIEW");
    expect(() => unseal(`${token}.extra`)).toThrow("INVALID_PREVIEW");
  });
  it("does not trust a Devnet-looking URL as cluster identity", () => {
    expect(() => assertDevnetGenesis("a-mainnet-or-unknown-genesis")).toThrow();
    expect(() => assertDevnetGenesis(DEVNET_GENESIS_HASH)).not.toThrow();
  });
});
