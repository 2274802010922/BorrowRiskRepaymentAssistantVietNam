import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import BN from "bn.js";
import { address, createNoopSigner } from "@solana/kit";
import { KaminoAction } from "@kamino-finance/klend-sdk";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { AppError } from "../../backend/services/http";
import { seal, unseal } from "../../backend/services/binding";
import { readPosition, associatedToken, TOKEN_PROGRAM } from "../adapters/kamino";
import { devnetConnection } from "../network/rpc";
import { planRepayment } from "../../core/repayment/planner";
import { constraintsSchema, snapshotSchema } from "../../shared/types";

const addressText = z
  .string()
  .min(32)
  .max(44)
  .refine((v) => {
    try {
      new PublicKey(v);
      return true;
    } catch {
      return false;
    }
  });
const prepareSchema = z.object({
  wallet: addressText,
  position: addressText,
  protocol: z.literal("kamino"),
  constraints: constraintsSchema,
  repayAtomic: z.string().regex(/^\d{1,20}$/),
});
const bindingSchema = z.object({
  version: z.literal(1),
  wallet: addressText,
  position: addressText,
  cluster: z.literal("devnet"),
  snapshot: snapshotSchema,
  constraints: constraintsSchema,
  repayAtomic: z.string(),
  messageHash: z.string(),
  expiresAt: z.number(),
  lastValidBlockHeight: z.number(),
  feeLamports: z.string(),
});
export const messageHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function prepareRepayment(input: unknown) {
  const request = prepareSchema.parse(input);
  // Validate deployment readiness before spending RPC calls.
  seal({ readiness: true });
  const { snapshot, context, obligation } = await readPosition(request.wallet, request.position);
  if (snapshot.warnings.includes("STALE_DATA")) throw new AppError("STALE_DATA");
  const plan = planRepayment(snapshot, request.constraints);
  if (!plan.options.some((o) => o.repayAtomic === request.repayAtomic))
    throw new AppError("INSUFFICIENT_FUNDS");
  const action = await KaminoAction.buildRepayTxns({
    kaminoMarket: context.market,
    amount: new BN(request.repayAtomic),
    reserveAddress: address(context.ids.debt),
    owner: createNoopSigner(address(request.wallet)),
    obligation,
    useV2Ixs: true,
    scopeRefreshConfig: undefined,
    currentLedgerInstant: context.ledger,
    initUserMetadata: { skipInitialization: true, skipLutCreation: true },
  });
  const instructions = KaminoAction.actionToIxs(action).map(
    (ix) =>
      new TransactionInstruction({
        programId: new PublicKey(ix.programAddress),
        keys: (ix.accounts ?? []).map((a) => ({
          pubkey: new PublicKey(a.address),
          isSigner: (a.role & 2) !== 0,
          isWritable: (a.role & 1) !== 0,
        })),
        data: Buffer.from(ix.data ?? []),
      }),
  );
  const c = await devnetConnection(),
    latest = await c.getLatestBlockhash("confirmed");
  const lookups = await Promise.all(
    action.luts.map((key) => c.getAddressLookupTable(new PublicKey(key))),
  );
  if (lookups.some((l) => l.value === null)) throw new AppError("SIMULATION_FAILED");
  const message = new TransactionMessage({
    payerKey: new PublicKey(request.wallet),
    recentBlockhash: latest.blockhash,
    instructions,
  }).compileToV0Message(lookups.map((l) => l.value!));
  if (message.header.numRequiredSignatures !== 1) throw new AppError("UNSUPPORTED_POSITION");
  const tx = new VersionedTransaction(message);
  const fee = await c.getFeeForMessage(message, "confirmed");
  if (fee.value === null || fee.value > 50000) throw new AppError("SIMULATION_FAILED");
  if (BigInt(snapshot.walletSolLamports) < BigInt(fee.value))
    throw new AppError("INSUFFICIENT_SOL");
  const tokenAccount = associatedToken(request.wallet, snapshot.debt.mint);
  const simulation = await c.simulateTransaction(tx, {
    sigVerify: false,
    commitment: "confirmed",
    accounts: { encoding: "base64", addresses: [request.position, tokenAccount.toBase58()] },
  });
  if (simulation.value.err || !simulation.value.accounts?.[0] || !simulation.value.accounts?.[1])
    throw new AppError("SIMULATION_FAILED");
  const tokenAfter = simulation.value.accounts[1];
  const data = Buffer.from(tokenAfter.data[0], "base64");
  if (
    tokenAfter.owner !== TOKEN_PROGRAM.toBase58() ||
    data.length < 165 ||
    data.readBigUInt64LE(64) < BigInt(request.constraints.reserveAtomic)
  )
    throw new AppError("INSUFFICIENT_FUNDS");
  const payload = bindingSchema.parse({
    version: 1,
    wallet: request.wallet,
    position: request.position,
    cluster: "devnet",
    snapshot,
    constraints: request.constraints,
    repayAtomic: request.repayAtomic,
    messageHash: messageHash(message.serialize()),
    expiresAt: Date.now() + 90000,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    feeLamports: String(fee.value),
  });
  return {
    token: seal(payload),
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    messageHash: payload.messageHash,
    expiresAt: payload.expiresAt,
    lastValidBlockHeight: payload.lastValidBlockHeight,
    feeLamports: payload.feeLamports,
    repayAtomic: payload.repayAtomic,
    snapshot,
  };
}

export async function submitRepayment(input: unknown) {
  const { token, transaction } = z
    .object({ token: z.string().max(20000), transaction: z.string().max(8192) })
    .parse(input);
  const bound = bindingSchema.parse(unseal(token));
  const tx = VersionedTransaction.deserialize(Buffer.from(transaction, "base64")),
    message = tx.message.serialize();
  if (
    messageHash(message) !== bound.messageHash ||
    tx.message.staticAccountKeys[0].toBase58() !== bound.wallet ||
    tx.message.header.numRequiredSignatures !== 1
  )
    throw new AppError("TRANSACTION_CHANGED");
  const publicKey = createPublicKey({
    key: Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      new PublicKey(bound.wallet).toBuffer(),
    ]),
    format: "der",
    type: "spki",
  });
  if (!verify(null, message, publicKey, tx.signatures[0]))
    throw new AppError("TRANSACTION_CHANGED");
  const c = await devnetConnection();
  const signature = bs58.encode(tx.signatures[0]);
  const existing = await c.getSignatureStatuses([signature], { searchTransactionHistory: true });
  if (existing.value[0])
    return { signature, phase: existing.value[0].err ? "failed" : "submitted" };
  if (
    Date.now() > bound.expiresAt ||
    (await c.getBlockHeight("confirmed")) > bound.lastValidBlockHeight
  )
    throw new AppError("PREVIEW_EXPIRED");
  const { snapshot } = await readPosition(bound.wallet, bound.position);
  if (snapshot.warnings.includes("STALE_DATA")) throw new AppError("STALE_DATA");
  if (
    BigInt(snapshot.walletDebtAtomic) <
      BigInt(bound.repayAtomic) + BigInt(bound.constraints.reserveAtomic) ||
    BigInt(snapshot.walletSolLamports) < BigInt(bound.feeLamports)
  )
    throw new AppError("INSUFFICIENT_FUNDS");
  const sent = await c.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 2,
  });
  if (sent !== signature) throw new AppError("TRANSACTION_CHANGED");
  return { signature, phase: "submitted" };
}

export async function repaymentStatus(input: unknown) {
  const { signature, bindingToken } = z
    .object({
      signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/),
      bindingToken: z.string().max(20000),
    })
    .parse(input);
  const bound = bindingSchema.parse(unseal(bindingToken));
  const c = await devnetConnection(),
    statuses = await c.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const status = statuses.value[0];
  if (!status) {
    const height = await c.getBlockHeight("confirmed");
    return { phase: height > bound.lastValidBlockHeight ? "expired" : "confirmation_unknown" };
  }
  if (status.err) return { phase: "failed" };
  if (status.confirmationStatus !== "confirmed" && status.confirmationStatus !== "finalized")
    return { phase: "submitted" };
  const tx = await c.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || !tx.meta) return { phase: "verification_pending" };
  if (tx.meta.err || messageHash(tx.transaction.message.serialize()) !== bound.messageHash)
    throw new AppError("TRANSACTION_CHANGED");
  const keys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta.loadedAddresses,
  });
  const ata = associatedToken(bound.wallet, bound.snapshot.debt.mint).toBase58();
  const matches = (b: NonNullable<typeof tx.meta.postTokenBalances>[number]) =>
    keys.get(b.accountIndex)?.toBase58() === ata &&
    b.owner === bound.wallet &&
    b.mint === bound.snapshot.debt.mint;
  const preToken = tx.meta.preTokenBalances?.find(matches);
  const postToken = tx.meta.postTokenBalances?.find(matches);
  const enoughReserve =
    preToken &&
    postToken &&
    BigInt(postToken.uiTokenAmount.amount) >= BigInt(bound.constraints.reserveAtomic) &&
    BigInt(preToken.uiTokenAmount.amount) - BigInt(postToken.uiTokenAmount.amount) ===
      BigInt(bound.repayAtomic);
  if (!enoughReserve)
    return { phase: "confirmed", reason: "TOKEN_EFFECT_NOT_MATCHED", slot: tx.slot };
  // Historical receipt is authoritative. Current position refresh is a separate request.
  return { phase: "verified", reason: "REPAYMENT_CONFIRMED_REFRESH_PENDING", slot: tx.slot };
}
