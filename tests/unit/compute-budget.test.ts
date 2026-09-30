import { it, expect } from "vitest";
import { ComputeBudgetProgram, SystemProgram, Keypair } from "@solana/web3.js";
import { quotedComputeBudget } from "../../solana/transactions/compute-budget";
it("adds one explicit price before binding and preserves protocol instructions and the SDK limit", () => {
  const limit = ComputeBudgetProgram.setComputeUnitLimit({ units: 800000 }),
    transfer = SystemProgram.transfer({
      fromPubkey: Keypair.generate().publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1,
    });
  const result = quotedComputeBudget([limit, transfer]);
  expect(result[1]).toBe(limit);
  expect(result[2]).toBe(transfer);
  expect(result[0].data[0]).toBe(3);
  expect(result[0].data.readBigUInt64LE(1)).toBe(1000n);
  expect(quotedComputeBudget(result).map((ix) => ix.data.toString("hex"))).toEqual(
    result.map((ix) => ix.data.toString("hex")),
  );
});
it("provides a limit when absent and never duplicates price instructions", () => {
  const result = quotedComputeBudget([
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 999999 }),
  ]);
  expect(result.map((i) => i.data[0])).toEqual([2, 3]);
  expect(result[1].data.readBigUInt64LE(1)).toBe(1000n);
});
