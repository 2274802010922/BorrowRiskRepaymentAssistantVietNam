import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import { examplePortfolio } from "../../shared/examples/portfolio";
import type { PositionSnapshot } from "../../shared/types";
const deps = vi.hoisted(() => ({
  read: vi.fn(),
  prepare: vi.fn(),
  submit: vi.fn(),
  status: vi.fn(),
  redis: vi.fn(),
}));
vi.mock("../../solana/adapters/kamino", () => ({ readPositions: deps.read }));
vi.mock("../../solana/transactions/repay", () => ({
  prepareRepayment: deps.prepare,
  submitRepayment: deps.submit,
  repaymentStatus: deps.status,
}));
vi.mock("../../backend/services/redis", () => ({ redis: deps.redis }));
import {
  createPlan,
  preparePlan,
  submitPlan,
  statusPlan,
  cancelPlan,
} from "../../backend/services/plans";
let positions: PositionSnapshot[];
const store = new Map<string, string>();
const goal = {
  budgetAtomic: "30000000",
  reserveAtomic: "20000000",
  shockBps: 3000,
  bufferBps: 500,
};
beforeEach(() => {
  vi.stubEnv("PLAN_BINDING_SECRET", "x".repeat(32));
  vi.clearAllMocks();
  store.clear();
  const wallet = Keypair.generate().publicKey.toBase58();
  positions = examplePortfolio().positions.map((s) => ({
    ...s,
    wallet,
    position: Keypair.generate().publicKey.toBase58(),
    protocol: "kamino",
    source: "devnet",
  }));
  deps.read.mockImplementation(async () => positions);
  deps.prepare.mockImplementation(async (r) => ({
    token: `binding-${r.position}`,
    repayAtomic: r.repayAtomic,
    transaction: "unsigned",
    snapshot: positions.find((s) => s.position === r.position),
    expiresAt: Date.now() + 90000,
    feeLamports: "5000",
    lastValidBlockHeight: 123,
    messageHash: "hash",
  }));
  deps.submit.mockImplementation(async (_r, hook) => {
    const signature = `signature-${deps.submit.mock.calls.length}`;
    await hook(signature);
    return { signature, phase: "submitted" };
  });
  deps.status.mockResolvedValue({ phase: "verified" });
  // In-memory Redis command contract: CAS revisions and wallet ownership are atomic.
  deps.redis.mockImplementation(async (c: string[]) => {
    if (c[0] === "GET") return store.get(c[1]) ?? null;
    if (c[0] === "SET") {
      store.set(c[1], c[2]);
      return "OK";
    }
    if (c[0] !== "EVAL") throw new Error("Unexpected Redis command");
    if (c[1].includes("DEL")) {
      if (store.get(c[3]) === c[4]) {
        store.delete(c[3]);
        return 1;
      }
      return 0;
    }
    const two = c[2] === "2",
      value = store.get(c[3]);
    if (!value) return 0;
    const j = JSON.parse(value),
      offset = two ? 5 : 4;
    if (j.revision !== Number(c[offset])) return 0;
    if (two) {
      const lock = store.get(c[4]);
      if (j.pending || (lock && lock !== c[7])) return 0;
      store.set(c[4], c[7]);
    }
    store.set(c[3], c[offset + 1]);
    return 1;
  });
});
afterEach(() => vi.unstubAllEnvs());
const create = () =>
  createPlan({ wallet: positions[0].wallet, positions: positions.map((s) => s.position), goal });
it("requires verified historical receipts before preparing the next step", async () => {
  const r = await create(),
    p = await preparePlan({ token: r.token });
  await submitPlan({ token: r.token, bindingToken: p.token, transaction: "signed" });
  await expect(preparePlan({ token: r.token })).rejects.toThrow("PLAN_PENDING");
  deps.status.mockResolvedValueOnce({ phase: "confirmation_unknown" });
  expect(await statusPlan({ token: r.token })).toMatchObject({
    phase: "confirmation_unknown",
    cursor: 0,
  });
  const receipt = await statusPlan({ token: r.token });
  expect(receipt).toMatchObject({ phase: "ready", cursor: 1 });
  expect(receipt.receipts).toHaveLength(1);
});
it("completes both required steps using confirmed spend and releases the wallet lock", async () => {
  const r = await create();
  for (let step = 0; step < 2; step++) {
    const p = await preparePlan({ token: r.token });
    await submitPlan({ token: r.token, bindingToken: p.token, transaction: "signed" });
    positions = positions.map((s) => ({
      ...s,
      walletDebtAtomic: (BigInt(s.walletDebtAtomic) - BigInt(p.repayAtomic)).toString(),
      debt: {
        ...s.debt,
        amountAtomic:
          s.position === p.snapshot.position
            ? (BigInt(s.debt.amountAtomic) - BigInt(p.repayAtomic)).toString()
            : s.debt.amountAtomic,
      },
    }));
    const status = await statusPlan({ token: r.token });
    expect(status.cursor).toBe(step + 1);
  }
  const complete = await statusPlan({ token: r.token });
  expect(complete.phase).toBe("verified");
  expect(complete.receipts.reduce((a, r) => a + BigInt(r.repayAtomic), 0n)).toBe(13600000n);
  expect([...store.keys()].some((k) => k.includes("wallet-plan"))).toBe(false);
});
it("locks only after a valid signature and prevents two plans broadcasting simultaneously", async () => {
  const a = await create(),
    b = await create(),
    pa = await preparePlan({ token: a.token }),
    pb = await preparePlan({ token: b.token });
  expect([...store.keys()].some((k) => k.includes("wallet-plan"))).toBe(false);
  await submitPlan({ token: a.token, bindingToken: pa.token, transaction: "signed" });
  await expect(
    submitPlan({ token: b.token, bindingToken: pb.token, transaction: "signed" }),
  ).rejects.toThrow("PLAN_PENDING");
  await expect(cancelPlan({ token: a.token })).rejects.toThrow("PLAN_PENDING");
});
it("stops on wallet movements rather than silently replanning", async () => {
  const a = await create();
  positions = positions.map((s) => ({ ...s, walletDebtAtomic: "80000001" }));
  await expect(preparePlan({ token: a.token })).rejects.toThrow("PLAN_CHANGED");
  expect(deps.prepare).not.toHaveBeenCalled();
});
it("rejects mismatched binding tokens and cancellation invalidates prepared steps", async () => {
  const a = await create();
  await preparePlan({ token: a.token });
  await expect(
    submitPlan({ token: a.token, bindingToken: "wrong", transaction: "signed" }),
  ).rejects.toThrow("PLAN_CHANGED");
  await cancelPlan({ token: a.token });
  await expect(preparePlan({ token: a.token })).rejects.toThrow("PLAN_PENDING");
  expect(deps.submit).not.toHaveBeenCalled();
});
