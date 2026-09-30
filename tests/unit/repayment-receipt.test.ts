import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Keypair, TransactionMessage, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { seal } from "../../backend/services/binding";
import { exampleSnapshot } from "../fixtures/position";
const rpc = vi.hoisted(() => ({ getSignatureStatuses: vi.fn(), getTransaction: vi.fn() }));
const current = vi.hoisted(() => vi.fn());
vi.mock("../../solana/network/rpc", () => ({ devnetConnection: async () => rpc }));
const token = Keypair.generate().publicKey;
vi.mock("../../solana/adapters/kamino", () => ({
  readPosition: current,
  associatedToken: () => token,
  TOKEN_PROGRAM: {},
}));
import { repaymentStatus, submitRepayment } from "../../solana/transactions/repay";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PLAN_BINDING_SECRET", "x".repeat(32));
});
afterEach(() => vi.unstubAllEnvs());
function receipt(delta = "100000000") {
  const wallet = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey.toBase58();
  const message = new TransactionMessage({
    payerKey: wallet,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [SystemProgram.transfer({ fromPubkey: wallet, toPubkey: token, lamports: 1 })],
  }).compileToV0Message();
  const tokenIndex = message.staticAccountKeys.findIndex((key) => key.equals(token));
  const balance = (amount: string) => ({
    accountIndex: tokenIndex,
    mint,
    owner: wallet.toBase58(),
    uiTokenAmount: { amount, decimals: 6 },
  });
  rpc.getSignatureStatuses.mockResolvedValue({
    value: [{ err: null, confirmationStatus: "confirmed" }],
  });
  rpc.getTransaction.mockResolvedValue({
    slot: 42,
    transaction: { message },
    meta: {
      err: null,
      preTokenBalances: [balance("150000000")],
      postTokenBalances: [balance((150000000n - BigInt(delta)).toString())],
    },
  });
  const snapshot = exampleSnapshot();
  snapshot.debt.mint = mint;
  return {
    signature: "1".repeat(64),
    bindingToken: seal({
      version: 1,
      wallet: wallet.toBase58(),
      position: wallet.toBase58(),
      cluster: "devnet",
      snapshot,
      constraints: {
        budgetAtomic: "100000000",
        reserveAtomic: "50000000",
        shockBps: 2000,
        targetLtvBps: 6000,
      },
      repayAtomic: "100000000",
      messageHash: createHash("sha256").update(message.serialize()).digest("hex"),
      expiresAt: 1,
      lastValidBlockHeight: 10,
      feeLamports: "5000",
    }),
  };
}
it("verifies the historical receipt even after preview expiry without fetching oracle/current position", async () => {
  current.mockRejectedValue(new Error("STALE_DATA"));
  expect(await repaymentStatus(receipt())).toMatchObject({ phase: "verified", slot: 42 });
  expect(current).not.toHaveBeenCalled();
});
it("keeps confirmation separate from unmatched token effects", async () => {
  expect(await repaymentStatus(receipt("90000000"))).toMatchObject({
    phase: "confirmed",
    reason: "TOKEN_EFFECT_NOT_MATCHED",
  });
  expect(current).not.toHaveBeenCalled();
});
it("registers a known signed receipt in the portfolio journal without rechecking balances or broadcasting", async () => {
  const owner = Keypair.generate(),
    message = new TransactionMessage({
      payerKey: owner.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [
        SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: token, lamports: 1 }),
      ],
    }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([owner]);
  const binding = seal({
    version: 1,
    wallet: owner.publicKey.toBase58(),
    position: owner.publicKey.toBase58(),
    cluster: "devnet",
    snapshot: exampleSnapshot(),
    constraints: {
      budgetAtomic: "100000000",
      reserveAtomic: "50000000",
      shockBps: 2000,
      targetLtvBps: 6000,
    },
    repayAtomic: "100000000",
    messageHash: createHash("sha256").update(message.serialize()).digest("hex"),
    expiresAt: 1,
    lastValidBlockHeight: 10,
    feeLamports: "5000",
  });
  rpc.getSignatureStatuses.mockResolvedValue({
    value: [{ err: null, confirmationStatus: "confirmed" }],
  });
  const register = vi.fn();
  expect(
    await submitRepayment(
      { token: binding, transaction: Buffer.from(tx.serialize()).toString("base64") },
      register,
    ),
  ).toMatchObject({ phase: "submitted" });
  expect(register).toHaveBeenCalledOnce();
  expect(current).not.toHaveBeenCalled();
});
