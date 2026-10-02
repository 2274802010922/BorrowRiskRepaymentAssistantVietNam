import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import { examplePortfolio } from "../../src/shared/examples/portfolio";
import type { PositionSnapshot } from "../../src/shared/types";
import { exampleAllocationContext } from "../../src/core/allocation/example";
import { planAllocation } from "../../src/core/allocation/plan";
import { SF } from "../../src/core/liquidation/fixed-point";
const deps = vi.hoisted(() => ({
  read: vi.fn(),
  prepare: vi.fn(),
  submit: vi.fn(),
  status: vi.fn(),
  redis: vi.fn(),
  allocationContext: vi.fn(),
  allocationQuote: vi.fn(),
}));
vi.mock("../../src/solana/adapters/kamino", () => ({ readPositions: deps.read }));
vi.mock("../../src/solana/transactions/repay", () => ({
  prepareRepayment: deps.prepare,
  submitRepayment: deps.submit,
  repaymentStatus: deps.status,
}));
vi.mock("../../src/backend/services/redis", () => ({ redis: deps.redis }));
vi.mock("../../src/solana/adapters/kamino-liquidation", () => ({
  readAllocationContext: deps.allocationContext,
}));
vi.mock("../../src/backend/services/allocation", async (original) => ({
  ...(await original<typeof import("../../src/backend/services/allocation")>()),
  loadAllocationQuote: deps.allocationQuote,
}));
import {
  createPlan,
  preparePlan,
  submitPlan,
  statusPlan,
  cancelPlan,
} from "../../src/backend/services/plans";
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
  deps.allocationContext.mockImplementation(async () => {
    const context = exampleAllocationContext(3000),
      ids = Object.keys(context.inputs);
    context.portfolio = { version: 1, positions };
    context.inputs = Object.fromEntries(
      positions.map((s, i) => [
        s.position,
        { ...context.inputs[ids[i]], debtAmountSf: (BigInt(s.debt.amountAtomic) * SF).toString() },
      ]),
    );
    context.programFingerprint = "a".repeat(64);
    context.configFingerprint = "test-config";
    return context;
  });
  deps.allocationQuote.mockImplementation(async (_token, _wallet, _positions, values) => {
    const context = await deps.allocationContext();
    const { allocationDecisionHash } = await import("../../src/backend/services/allocation");
    const plan = planAllocation(context, values);
    return { context, plan, decisionHash: allocationDecisionHash(plan, context) };
  });
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
it("refreshes interest within the original limits and requires explicit review before submission", async () => {
  const a = await create();
  positions = positions.map((s) => ({
    ...s,
    debt: { ...s.debt, amountAtomic: (BigInt(s.debt.amountAtomic) + 100n).toString() },
  }));
  const p = await preparePlan({ token: a.token });
  expect(p.reviewRequired).toBe(true);
  expect(BigInt(p.plan.totalRepayAtomic)).toBeGreaterThan(BigInt(a.plan.totalRepayAtomic));
  expect(BigInt(p.plan.totalRepayAtomic)).toBeLessThanOrEqual(BigInt(goal.budgetAtomic));
  expect(BigInt(p.plan.walletAfterAtomic)).toBeGreaterThanOrEqual(BigInt(goal.reserveAtomic));
  await expect(
    submitPlan({ token: a.token, bindingToken: p.token, transaction: "signed" }),
  ).rejects.toThrow("PLAN_CHANGED");
  expect(deps.submit).not.toHaveBeenCalled();
  const again = await preparePlan({ token: a.token });
  expect(again.reviewRequired).toBe(true);
  await submitPlan({
    token: a.token,
    bindingToken: again.token,
    transaction: "signed",
    reviewAccepted: true,
  });
  const status = await statusPlan({ token: a.token });
  expect(status.receipts[0].repayAtomic).toBe(again.repayAtomic);
});
it("refuses a refreshed quote exceeding the original budget", async () => {
  const a = await create();
  positions = positions.map((s) => ({
    ...s,
    debt: { ...s.debt, amountAtomic: (BigInt(s.debt.amountAtomic) + 30000000n).toString() },
  }));
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

const scarce = { ...goal, budgetAtomic: "10000000" };
const createPartial = (values = scarce, accepted = true) =>
  createPlan({
    wallet: positions[0].wallet,
    positions: positions.map((s) => s.position),
    goal: values,
    mode: "loss-allocation-v1",
    quoteToken: "server-quote",
    acceptedPartial: accepted,
  });
it("requires explicit acceptance before creating a partial journal", async () => {
  await expect(createPartial(scarce, false)).rejects.toThrow("ALLOCATION_REVIEW_REQUIRED");
  expect(store.size).toBe(0);
});
it("prepares only positive allocations with a bound plan policy", async () => {
  const r = await createPartial(),
    p = await preparePlan({ token: r.token });
  expect(r.plan.version).toBe("allocation-v1");
  expect(BigInt(p.repayAtomic)).toBeGreaterThan(0n);
  expect(deps.prepare.mock.calls[0][1]).toMatchObject({
    kind: "allocation",
    programFingerprint: "a".repeat(64),
  });
  expect(BigInt(r.plan.totalRepayAtomic)).toBeLessThanOrEqual(BigInt(scarce.budgetAtomic));
});
it("retains confirmed receipts while reallocating only unexecuted positions", async () => {
  positions = positions.map((s) => ({ ...s, debt: { ...s.debt, amountAtomic: "65000000" } }));
  const r = await createPartial({ ...scarce, budgetAtomic: "20000000" });
  expect(r.plan.steps.length).toBeGreaterThan(1);
  const first = await preparePlan({ token: r.token });
  await submitPlan({
    token: r.token,
    bindingToken: first.token,
    transaction: "signed",
    reviewAccepted: true,
  });
  positions = positions.map((s) => ({
    ...s,
    walletDebtAtomic: (BigInt(s.walletDebtAtomic) - BigInt(first.repayAtomic)).toString(),
    debt: {
      ...s.debt,
      amountAtomic:
        s.position === first.snapshot.position
          ? (BigInt(s.debt.amountAtomic) - BigInt(first.repayAtomic)).toString()
          : s.debt.amountAtomic,
    },
  }));
  await statusPlan({ token: r.token });
  const second = await preparePlan({ token: r.token });
  expect(second.snapshot.position).not.toBe(first.snapshot.position);
  expect(second.plan.steps[0].repayAtomic).toBe(first.repayAtomic);
  expect(BigInt(second.plan.totalRepayAtomic)).toBeLessThanOrEqual(20000000n);
});
it("makes changed allocation review sticky and blocks signing without review", async () => {
  const r = await createPartial();
  positions = positions.map((s) => ({
    ...s,
    debt: { ...s.debt, amountAtomic: (BigInt(s.debt.amountAtomic) + 100000n).toString() },
  }));
  const p = await preparePlan({ token: r.token });
  expect(p.reviewRequired).toBe(true);
  const again = await preparePlan({ token: r.token });
  expect(again.reviewRequired).toBe(true);
  await expect(
    submitPlan({ token: r.token, bindingToken: again.token, transaction: "signed" }),
  ).rejects.toThrow("PLAN_CHANGED");
  expect(deps.submit).not.toHaveBeenCalled();
});
it("rejects outside wallet changes before allocation broadcast", async () => {
  const r = await createPartial(),
    p = await preparePlan({ token: r.token });
  positions = positions.map((s) => ({ ...s, walletDebtAtomic: "80000001" }));
  await expect(
    submitPlan({
      token: r.token,
      bindingToken: p.token,
      transaction: "signed",
      reviewAccepted: true,
    }),
  ).rejects.toThrow("PLAN_CHANGED");
  expect([...store.keys()].some((s) => s.includes("wallet-plan"))).toBe(false);
});
it("stops a partial plan when fresh data removes its benefit", async () => {
  const r = await createPartial();
  positions = positions.map((s) => ({ ...s, debt: { ...s.debt, amountAtomic: "1000000" } }));
  await expect(preparePlan({ token: r.token })).rejects.toThrow("ALLOCATION_NO_LONGER_BENEFICIAL");
  expect(await statusPlan({ token: r.token })).toMatchObject({
    phase: "failed",
    reason: "ALLOCATION_NO_LONGER_BENEFICIAL",
    receipts: [],
  });
  expect(deps.prepare).not.toHaveBeenCalled();
});
