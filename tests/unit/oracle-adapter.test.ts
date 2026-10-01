import { beforeEach, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
const mocks = vi.hoisted(() => ({ accounts: vi.fn(), data: vi.fn(), decode: vi.fn() }));
vi.mock("@kamino-finance/klend-sdk", () => ({
  getAllOracleAccounts: mocks.accounts,
  getTokenOracleData: mocks.data,
  isNotNullPubkey: (value: string) => value !== "11111111111111111111111111111111",
}));
vi.mock("@kamino-finance/klend-sdk/dist/@codegen/pyth_rec/accounts/priceUpdateV2.js", () => ({
  priceUpdateV2: { decode: mocks.decode },
}));
vi.mock("@kamino-finance/klend-sdk/dist/@codegen/pyth_rec/programId.js", () => ({
  PROGRAM_ID: "receiver",
}));
import { readOracleData } from "../../src/solana/adapters/oracle";
const nil = "11111111111111111111111111111111";
const entry = {
  address: "reserve",
  state: {
    config: {
      tokenInfo: {
        pythConfiguration: { price: "feed" },
        scopeConfiguration: { priceFeed: nil },
        switchboardConfiguration: { priceAggregator: nil },
        maxTwapDivergenceBps: { toNumber: () => 0 },
      },
    },
  },
};
const message = {
  price: 11940134390n,
  conf: 1790711n,
  exponent: -8,
  emaPrice: 11940134390n,
  publishTime: 1000n,
};
beforeEach(() => {
  mocks.accounts.mockResolvedValue(new Map([["feed", { programAddress: "receiver", data: [""] }]]));
  mocks.data.mockResolvedValue([
    [entry, { price: new Decimal(119), valid: false, timestamp: 1000n }],
  ]);
  mocks.decode.mockReturnValue({ verificationLevel: { kind: "Full" }, priceMessage: message });
});
async function read() {
  return readOracleData(
    {} as Parameters<typeof readOracleData>[0],
    [entry] as unknown as Parameters<typeof readOracleData>[1],
  );
}
it("normalizes a fully verified Pyth-only feed without changing timestamp", async () => {
  const result = await read();
  expect(result[0][1]?.valid).toBe(true);
  expect(result[0][1]?.price.toString()).toBe("119.4013439");
  expect(result[0][1]?.timestamp).toBe(1000n);
});
it("rejects accounts not owned by the receiver", async () => {
  mocks.accounts.mockResolvedValue(
    new Map([["feed", { programAddress: "wrong-owner", data: [""] }]]),
  );
  await expect(read()).rejects.toThrow("ORACLE_INVALID");
});
it("rejects partial verification", async () => {
  mocks.decode.mockReturnValue({ verificationLevel: { kind: "Partial" }, priceMessage: message });
  await expect(read()).rejects.toThrow("ORACLE_INVALID");
});
it("does not mark wide-confidence data valid", async () => {
  mocks.decode.mockReturnValue({
    verificationLevel: { kind: "Full" },
    priceMessage: { ...message, conf: 1000000000n },
  });
  await expect(read()).rejects.toThrow("ORACLE_INVALID");
});
