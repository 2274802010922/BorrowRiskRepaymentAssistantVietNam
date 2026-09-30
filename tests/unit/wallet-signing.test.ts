import { afterEach, it, expect, vi } from "vitest";
import {
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { signingSnapshot, verifyWalletResult } from "../../frontend/lib/wallet-signing";
afterEach(() => vi.restoreAllMocks());
it("identifies fee-only edits while continuing to block them", () => {
  const owner = Keypair.generate(),
    recipient = Keypair.generate().publicKey,
    blockhash = Keypair.generate().publicKey.toBase58();
  const limit = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }),
    transfer = SystemProgram.transfer({
      fromPubkey: owner.publicKey,
      toPubkey: recipient,
      lamports: 1,
    });
  const make = (price: boolean) =>
    new VersionedTransaction(
      new TransactionMessage({
        payerKey: owner.publicKey,
        recentBlockhash: blockhash,
        instructions: price
          ? [limit, ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), transfer]
          : [limit, transfer],
      }).compileToV0Message(),
    );
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect(() =>
    verifyWalletResult(
      signingSnapshot(make(false)),
      make(true),
      owner.publicKey.toBase58(),
      owner.publicKey.toBase58(),
      "demo",
    ),
  ).toThrow("TRANSACTION_CHANGED");
  expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
    computeBudgetOnly: true,
    changedFields: ["instructions"],
  });
});
function fixture() {
  const owner = Keypair.generate(),
    tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: owner.publicKey,
        recentBlockhash: Keypair.generate().publicKey.toBase58(),
        instructions: [
          SystemProgram.transfer({
            fromPubkey: owner.publicKey,
            toPubkey: Keypair.generate().publicKey,
            lamports: 1,
          }),
        ],
      }).compileToV0Message(),
    );
  return { owner, tx };
}
it("accepts a real signature over the unchanged approved message", () => {
  const { tx, owner } = fixture(),
    before = signingSnapshot(tx);
  tx.sign([owner]);
  expect(() =>
    verifyWalletResult(before, tx, owner.publicKey.toBase58(), owner.publicKey.toBase58(), "demo"),
  ).not.toThrow();
});
it("takes an immutable snapshot and explains blockhash changes without leaking addresses or transactions", () => {
  const { tx, owner } = fixture(),
    before = signingSnapshot(tx),
    log = vi.spyOn(console, "warn").mockImplementation(() => {});
  tx.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
  expect(() =>
    verifyWalletResult(before, tx, owner.publicKey.toBase58(), owner.publicKey.toBase58(), "demo"),
  ).toThrow("TRANSACTION_CHANGED");
  const info = JSON.parse(String(log.mock.calls[0][0]));
  expect(info.changedFields).toEqual(["blockhash"]);
  expect(String(log.mock.calls[0][0])).not.toContain(owner.publicKey.toBase58());
});
it("blocks wallet fee/instruction changes and account switches", () => {
  const { tx, owner } = fixture(),
    before = signingSnapshot(tx);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const changed = new VersionedTransaction(
    new TransactionMessage({
      payerKey: owner.publicKey,
      recentBlockhash: tx.message.recentBlockhash,
      instructions: [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })],
    }).compileToV0Message(),
  );
  expect(() =>
    verifyWalletResult(
      before,
      changed,
      owner.publicKey.toBase58(),
      owner.publicKey.toBase58(),
      "portfolio",
    ),
  ).toThrow("TRANSACTION_CHANGED");
  expect(() =>
    verifyWalletResult(before, tx, owner.publicKey.toBase58(), undefined, "repayment"),
  ).toThrow("WALLET_ACCOUNT_CHANGED");
});
