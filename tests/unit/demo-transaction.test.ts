import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { seal } from "../../backend/services/binding";
import { createHash } from "node:crypto";
const rpc = vi.hoisted(() => ({
  getSignatureStatuses: vi.fn(),
  getBlockHeight: vi.fn(),
  sendRawTransaction: vi.fn(),
}));
vi.mock("../../solana/network/rpc", () => ({
  devnetConnection: async () => rpc,
  rpcUrl: () => "test",
}));
vi.mock("../../solana/adapters/kamino", () => ({
  loadMarket: vi.fn(async () => {
    throw new Error("No market configured in this test");
  }),
  readPosition: vi.fn(),
  associatedToken: vi.fn(),
  TOKEN_PROGRAM: { toBase58: () => "" },
}));
import { demoAction } from "../../solana/transactions/demo";
const owner = Keypair.generate();
function preview(expiresAt = Date.now() + 60000) {
  const message = new TransactionMessage({
    payerKey: owner.publicKey,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [
      SystemProgram.transfer({
        fromPubkey: owner.publicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      }),
    ],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([owner]);
  const token = seal({
    purpose: "picachu-demo-v1",
    wallet: owner.publicKey.toBase58(),
    position: owner.publicKey.toBase58(),
    stage: "deposit",
    amountAtomic: "10000000",
    messageHash: createHash("sha256").update(message.serialize()).digest("hex"),
    expiresAt,
    lastValidBlockHeight: 100,
    debtMint: owner.publicKey.toBase58(),
  });
  return {
    wallet: owner.publicKey.toBase58(),
    token,
    transaction: Buffer.from(tx.serialize()).toString("base64"),
  };
}
beforeEach(() => {
  vi.stubEnv("PLAN_BINDING_SECRET", "x".repeat(32));
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
it("rejects a binding submitted from another wallet before sending", async () => {
  await expect(
    demoAction({ ...preview(), wallet: Keypair.generate().publicKey.toBase58(), action: "submit" }),
  ).rejects.toThrow("INVALID_PREVIEW");
  expect(rpc.sendRawTransaction).not.toHaveBeenCalled();
});
it("rejects a signed transaction different from the approved message", async () => {
  const a = preview(),
    b = preview();
  await expect(demoAction({ ...a, transaction: b.transaction, action: "submit" })).rejects.toThrow(
    "TRANSACTION_CHANGED",
  );
  expect(rpc.sendRawTransaction).not.toHaveBeenCalled();
});
it("does not resubmit a signature already known on chain", async () => {
  rpc.getSignatureStatuses.mockResolvedValue({ value: [{ err: null }] });
  expect(await demoAction({ ...preview(), action: "submit" })).toMatchObject({
    phase: "submitted",
  });
  expect(rpc.sendRawTransaction).not.toHaveBeenCalled();
});
it("rejects an expired unseen preview", async () => {
  rpc.getSignatureStatuses.mockResolvedValue({ value: [null] });
  await expect(demoAction({ ...preview(Date.now() - 1), action: "submit" })).rejects.toThrow(
    "PREVIEW_EXPIRED",
  );
  expect(rpc.sendRawTransaction).not.toHaveBeenCalled();
});
it("only declares unseen transactions expired past their blockheight", async () => {
  rpc.getSignatureStatuses.mockResolvedValue({ value: [null] });
  const input = { ...preview(), action: "status", signature: "1".repeat(64) };
  rpc.getBlockHeight.mockResolvedValue(100);
  expect(await demoAction(input)).toEqual({ phase: "pending" });
  rpc.getBlockHeight.mockResolvedValue(101);
  expect(await demoAction(input)).toEqual({ phase: "expired" });
});
