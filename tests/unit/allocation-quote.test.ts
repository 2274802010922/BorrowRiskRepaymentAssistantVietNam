import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import { exampleAllocationContext } from "../../src/core/allocation/example";
const deps = vi.hoisted(() => ({ context: vi.fn(), redis: vi.fn() }));
vi.mock("../../src/solana/adapters/kamino-liquidation", () => ({
  readAllocationContext: deps.context,
}));
vi.mock("../../src/backend/services/redis", () => ({ redis: deps.redis }));
import { allocationQuote, loadAllocationQuote } from "../../src/backend/services/allocation";
const store = new Map<string, string>(),
  goal = { budgetAtomic: "10000000", reserveAtomic: "20000000", shockBps: 3000, bufferBps: 500 };
let wallet: string, positions: string[];
beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  vi.stubEnv("PLAN_BINDING_SECRET", "x".repeat(32));
  wallet = Keypair.generate().publicKey.toBase58();
  positions = [0, 1, 2].map(() => Keypair.generate().publicKey.toBase58());
  const context = exampleAllocationContext(3000),
    old = Object.keys(context.inputs);
  context.inputs = Object.fromEntries(positions.map((id, i) => [id, context.inputs[old[i]]]));
  context.portfolio.positions = context.portfolio.positions.map((s, i) => ({
    ...s,
    wallet,
    position: positions[i],
    source: "devnet",
    protocol: "kamino",
  }));
  context.programFingerprint = "a".repeat(64);
  context.configFingerprint = "fixture";
  deps.context.mockResolvedValue(context);
  deps.redis.mockImplementation(async (c: string[]) => {
    if (c[0] === "SET") {
      store.set(c[1], c[2]);
      return "OK";
    }
    if (c[0] === "GET") return store.get(c[1]) ?? null;
    throw new Error("Unexpected command");
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("keeps examples non-executable and does not persist a journal", async () => {
  const q = await allocationQuote({ source: "synthetic", goal });
  expect(q).toMatchObject({ state: "ready", executionAllowed: false });
  expect("token" in q).toBe(false);
  expect(store.size).toBe(0);
  expect(deps.context).not.toHaveBeenCalled();
});
it("rejects client cost vectors, verification flags and snapshots", async () => {
  await expect(
    allocationQuote({
      source: "devnet",
      wallet,
      positions,
      goal,
      model: { verified: true },
      lossUsd: "0",
    }),
  ).rejects.toThrow();
  expect(deps.context).not.toHaveBeenCalled();
});
it("binds an executable quote to its wallet, selection and immutable goals", async () => {
  const q = await allocationQuote({ source: "devnet", wallet, positions, goal });
  if (q.state !== "ready" || !q.token) throw new Error("Expected quote");
  expect(await loadAllocationQuote(q.token, wallet, positions, goal)).toMatchObject({
    wallet,
    goal,
  });
  await expect(
    loadAllocationQuote(q.token, Keypair.generate().publicKey.toBase58(), positions, goal),
  ).rejects.toThrow("PLAN_CHANGED");
  await expect(loadAllocationQuote(q.token, wallet, positions.slice(1), goal)).rejects.toThrow(
    "PLAN_CHANGED",
  );
  await expect(
    loadAllocationQuote(q.token, wallet, positions, { ...goal, reserveAtomic: "1" }),
  ).rejects.toThrow("PLAN_CHANGED");
});
it("expires a quote and fails closed when the program version is unsupported", async () => {
  const q = await allocationQuote({ source: "devnet", wallet, positions, goal });
  if (q.state !== "ready" || !q.token) throw new Error("Expected quote");
  vi.useFakeTimers();
  vi.setSystemTime(q.expiresAt + 1);
  await expect(loadAllocationQuote(q.token, wallet, positions, goal)).rejects.toThrow(
    "PREVIEW_EXPIRED",
  );
  deps.context.mockRejectedValue(new Error("LIQUIDATION_PROGRAM_CHANGED"));
  expect(await allocationQuote({ source: "devnet", wallet, positions, goal })).toEqual({
    state: "unavailable",
    reason: "LIQUIDATION_PROGRAM_CHANGED",
  });
});
