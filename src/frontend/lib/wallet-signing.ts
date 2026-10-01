import type { VersionedTransaction } from "@solana/web3.js";
export function signingSnapshot(tx: VersionedTransaction) {
  const m = tx.message;
  return {
    bytes: Uint8Array.from(m.serialize()),
    fields: {
      blockhash: m.recentBlockhash,
      accounts: JSON.stringify(m.staticAccountKeys.map((k) => k.toBase58())),
      header: JSON.stringify([
        m.header.numRequiredSignatures,
        m.header.numReadonlySignedAccounts,
        m.header.numReadonlyUnsignedAccounts,
      ]),
      instructions: JSON.stringify(
        m.compiledInstructions.map((i) => [
          i.programIdIndex,
          Array.from(i.accountKeyIndexes),
          Array.from(i.data),
        ]),
      ),
      nonBudgetInstructions: JSON.stringify(
        m.compiledInstructions
          .filter(
            (i) =>
              m.staticAccountKeys[i.programIdIndex]?.toBase58() !==
              "ComputeBudget111111111111111111111111111111",
          )
          .map((i) => [i.programIdIndex, Array.from(i.accountKeyIndexes), Array.from(i.data)]),
      ),
      lookups: JSON.stringify(
        m.addressTableLookups.map((l) => [
          l.accountKey.toBase58(),
          Array.from(l.writableIndexes),
          Array.from(l.readonlyIndexes),
        ]),
      ),
    },
  };
}
export function verifyWalletResult(
  before: ReturnType<typeof signingSnapshot>,
  signed: VersionedTransaction,
  expectedWallet: string,
  currentWallet: string | undefined,
  context: "demo" | "repayment" | "portfolio",
) {
  const after = signingSnapshot(signed),
    walletMatches = expectedWallet === currentWallet;
  const messageMatches =
    before.bytes.length === after.bytes.length &&
    before.bytes.every((b, i) => b === after.bytes[i]);
  if (walletMatches && messageMatches) return;
  const changedFields = (Object.keys(before.fields) as (keyof typeof before.fields)[]).filter(
    (k) => before.fields[k] !== after.fields[k],
  );
  console.warn(
    JSON.stringify({
      event: "wallet_signing_guard",
      context,
      walletMatches,
      messageMatches,
      changedFields,
      computeBudgetOnly: changedFields.length === 1 && changedFields[0] === "instructions",
      beforeBytes: before.bytes.length,
      afterBytes: after.bytes.length,
    }),
  );
  // Keep exact bytes required. Never accept a wallet's edited instructions, fee or blockhash.
  throw new Error(walletMatches ? "TRANSACTION_CHANGED" : "WALLET_ACCOUNT_CHANGED");
}
