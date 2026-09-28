import { createPublicKey, verify } from "node:crypto";
import { address, createNoopSigner } from "@solana/kit";
import { KaminoAction, VanillaObligation, PermissionedOp } from "@kamino-finance/klend-sdk";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { z } from "zod";
import bs58 from "bs58";
import { seal, unseal } from "../../backend/services/binding";
import { AppError } from "../../backend/services/http";
import { demoInputSchema, type DemoCheck } from "../../shared/demo";
import { demoBorrow, demoBorrowCap, demoDeposit } from "../../core/validation/demo";
import { loadMarket, readPosition, TOKEN_PROGRAM, associatedToken } from "../adapters/kamino";
import { devnetConnection } from "../network/rpc";
import { KAMINO_PROGRAM_ID } from "../network/constants.mjs";
import { messageHash } from "./repay";

const bindingSchema = z.object({
  purpose: z.literal("picachu-demo-v1"),
  wallet: z.string(),
  position: z.string(),
  stage: z.enum(["deposit", "borrow"]),
  amountAtomic: z.string(),
  messageHash: z.string(),
  expiresAt: z.number(),
  lastValidBlockHeight: z.number(),
  debtMint: z.string(),
});
// Dedicated deterministic obligation: initialization fails atomically if another tab already created it.
const demoType = () => new VanillaObligation(address(KAMINO_PROGRAM_ID), 201);
async function borrowMarker(wallet: string, position: string) {
  const seed = "picachu-" + messageHash(Buffer.from(position)).slice(0, 24);
  return {
    seed,
    key: await PublicKey.createWithSeed(new PublicKey(wallet), seed, SystemProgram.programId),
  };
}

export async function inspectDemo(wallet: string) {
  const owner = new PublicKey(wallet);
  const context = await loadMarket();
  const collateral = context.market.getReserveByAddress(address(context.ids.collateral))!;
  const debt = context.market.getReserveByAddress(address(context.ids.debt))!;
  if (
    context.market.requiresPermissioner(PermissionedOp.fromString("DEPOSIT"), [collateral]) ||
    context.market.requiresPermissioner(PermissionedOp.fromString("BORROW"), [debt])
  )
    throw new AppError("DEMO_MARKET_UNAVAILABLE");
  if (
    collateral.state.liquidity.mintPubkey !== "So11111111111111111111111111111111111111112" ||
    debt.state.liquidity.mintDecimals.toNumber() !== 6 ||
    debt.state.liquidity.tokenProgram !== TOKEN_PROGRAM.toBase58()
  )
    throw new AppError("UNSUPPORTED_POSITION");
  for (const reserve of [collateral, debt]) {
    const age = Date.now() / 1000 - Number(reserve.tokenOraclePrice.timestamp);
    if (age < -30 || age > 60 || !reserve.tokenOraclePrice.valid) throw new AppError("STALE_DATA");
  }
  const position = await demoType().toPda(address(context.ids.market), address(wallet));
  const obligations = await context.market.getAllUserObligations(address(wallet), context.ledger);
  const obligation = obligations.find((o) => o.obligationAddress === position);
  const deposits = obligation?.getDeposits() ?? [];
  const borrows = obligation?.getBorrows() ?? [];
  if (
    (obligation && deposits.length !== 1) ||
    borrows.length > 1 ||
    deposits.some((d) => d.reserveAddress !== context.ids.collateral) ||
    borrows.some((b) => b.reserveAddress !== context.ids.debt)
  )
    throw new AppError("UNSUPPORTED_POSITION");
  const connection = await devnetConnection();
  const walletSol = String(await connection.getBalance(owner, "confirmed"));
  const collateralAtomic = deposits[0]?.amount.floor().toFixed(0) ?? "0";
  const debtAtomic = borrows[0]?.amount.ceil().toFixed(0) ?? "0";
  const marker = await borrowMarker(wallet, position);
  const markerExists = Boolean(await connection.getAccountInfo(marker.key, "confirmed"));
  const stage =
    BigInt(debtAtomic) > 0n || (obligation && markerExists)
      ? "ready"
      : obligation
        ? "borrow"
        : "deposit";
  const risk = context.market.getMaxAndLiquidationLtvAndBorrowFactorForPair(
    collateral.address,
    debt.address,
    0,
  );
  const maxBorrowAtomic = demoBorrowCap(
    collateralAtomic,
    collateral.getOracleMarketPrice().toString(),
    debt.getOracleMarketPrice().toString(),
    risk.maxLtv,
    risk.borrowFactor,
    debt.getLiquidityAvailableAmount().toFixed(0),
  );
  if (
    stage !== "ready" &&
    (debt.state.config.borrowLimit.isZero() ||
      debt.borrowLimitCrossed() ||
      (stage === "deposit" && collateral.depositLimitCrossed()) ||
      debt.getLiquidityAvailableAmount().lte(0) ||
      risk.maxLtv <= 0)
  )
    throw new AppError("DEMO_MARKET_UNAVAILABLE");
  const check: DemoCheck = {
    stage,
    position,
    walletSol,
    collateralAtomic,
    debtAtomic,
    maxBorrowAtomic,
    debtSymbol: debt.getTokenSymbol(),
    config: context.ids,
  };
  return { check, context, obligation, connection, debt };
}

export async function demoAction(input: unknown) {
  const request = demoInputSchema.parse(input);
  new PublicKey(request.wallet);
  if (request.action === "check") return (await inspectDemo(request.wallet)).check;
  if (request.action === "prepare") {
    seal({ readiness: true });
    const { check, context, obligation, connection, debt } = await inspectDemo(request.wallet);
    if (check.stage === "ready") throw new AppError("DEMO_ALREADY_EXISTS");
    let amount: string;
    try {
      amount =
        check.stage === "deposit"
          ? demoDeposit(request.depositAtomic)
          : demoBorrow(request.borrowAtomic, check.maxBorrowAtomic);
    } catch {
      throw new AppError("INVALID_INPUT");
    }
    // Leave SOL for rent/fees; simulation remains the authoritative account-creation check.
    if (BigInt(check.walletSol) < (check.stage === "deposit" ? BigInt(amount) : 0n) + 50000000n)
      throw new AppError("INSUFFICIENT_SOL");
    const props = {
      kaminoMarket: context.market,
      amount,
      reserveAddress: address(
        check.stage === "deposit" ? context.ids.collateral : context.ids.debt,
      ),
      owner: createNoopSigner(address(request.wallet)),
      obligation: obligation ?? demoType(),
      useV2Ixs: true,
      scopeRefreshConfig: undefined,
      currentLedgerInstant: context.ledger,
      initUserMetadata: { skipInitialization: false, skipLutCreation: true },
      requestElevationGroup: false,
    };
    const action =
      check.stage === "deposit"
        ? await KaminoAction.buildDepositTxns(props)
        : await KaminoAction.buildBorrowTxns(props);
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
    if (check.stage === "borrow") {
      const marker = await borrowMarker(request.wallet, check.position);
      // Atomic once-only marker: concurrent tabs cannot both borrow, even with different blockhashes.
      instructions.unshift(
        SystemProgram.createAccountWithSeed({
          fromPubkey: new PublicKey(request.wallet),
          basePubkey: new PublicKey(request.wallet),
          newAccountPubkey: marker.key,
          seed: marker.seed,
          space: 0,
          lamports: await connection.getMinimumBalanceForRentExemption(0),
          programId: SystemProgram.programId,
        }),
      );
    }
    const latest = await connection.getLatestBlockhash("confirmed");
    const lookups = await Promise.all(
      action.luts.map((key) => connection.getAddressLookupTable(new PublicKey(key))),
    );
    if (lookups.some((l) => !l.value)) throw new AppError("SIMULATION_FAILED");
    const message = new TransactionMessage({
      payerKey: new PublicKey(request.wallet),
      recentBlockhash: latest.blockhash,
      instructions,
    }).compileToV0Message(lookups.map((l) => l.value!));
    if (message.header.numRequiredSignatures !== 1) throw new AppError("UNSUPPORTED_POSITION");
    const tx = new VersionedTransaction(message);
    let serialized: Uint8Array;
    try {
      serialized = tx.serialize();
    } catch {
      throw new AppError("DEMO_TRANSACTION_TOO_LARGE");
    }
    if (serialized.length > 1232) throw new AppError("DEMO_TRANSACTION_TOO_LARGE");
    const simulation = await connection.simulateTransaction(tx, {
      sigVerify: false,
      commitment: "confirmed",
    });
    if (simulation.value.err) throw new AppError("SIMULATION_FAILED");
    const fee = (await connection.getFeeForMessage(message, "confirmed")).value;
    if (fee === null || fee > 50000) throw new AppError("SIMULATION_FAILED");
    const expiresAt = Date.now() + 60000;
    const bound = bindingSchema.parse({
      purpose: "picachu-demo-v1",
      wallet: request.wallet,
      position: check.position,
      stage: check.stage,
      amountAtomic: amount,
      messageHash: messageHash(message.serialize()),
      expiresAt,
      lastValidBlockHeight: latest.lastValidBlockHeight,
      debtMint: debt.state.liquidity.mintPubkey,
    });
    return {
      token: seal(bound),
      transaction: Buffer.from(serialized).toString("base64"),
      expiresAt,
      stage: check.stage,
      amountAtomic: amount,
      feeLamports: String(fee),
      position: check.position,
    };
  }
  const bound = bindingSchema.parse(unseal(request.token ?? ""));
  if (bound.wallet !== request.wallet) throw new AppError("INVALID_PREVIEW");
  const connection = await devnetConnection();
  if (request.action === "submit") {
    const tx = VersionedTransaction.deserialize(Buffer.from(request.transaction ?? "", "base64"));
    const bytes = tx.message.serialize();
    if (
      tx.message.header.numRequiredSignatures !== 1 ||
      tx.message.staticAccountKeys[0].toBase58() !== bound.wallet ||
      messageHash(bytes) !== bound.messageHash
    )
      throw new AppError("TRANSACTION_CHANGED");
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        new PublicKey(bound.wallet).toBuffer(),
      ]),
      format: "der",
      type: "spki",
    });
    if (!verify(null, bytes, key, tx.signatures[0])) throw new AppError("TRANSACTION_CHANGED");
    const signature = bs58.encode(tx.signatures[0]);
    const status = (
      await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })
    ).value[0];
    if (status) return { signature, phase: status.err ? "failed" : "submitted" };
    if (Date.now() > bound.expiresAt) throw new AppError("PREVIEW_EXPIRED");
    const { check } = await inspectDemo(bound.wallet);
    if (check.stage !== bound.stage || check.position !== bound.position)
      throw new AppError("DEMO_ALREADY_EXISTS");
    if (bound.stage === "borrow") {
      try {
        demoBorrow(bound.amountAtomic, check.maxBorrowAtomic);
      } catch {
        throw new AppError("INVALID_PREVIEW");
      }
    }
    const sent = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 2,
    });
    if (sent !== signature) throw new AppError("TRANSACTION_CHANGED");
    return { signature, phase: "submitted" };
  }
  if (!request.signature) throw new AppError("INVALID_INPUT");
  const status = (
    await connection.getSignatureStatuses([request.signature], { searchTransactionHistory: true })
  ).value[0];
  if (!status)
    return {
      phase:
        (await connection.getBlockHeight("confirmed")) > bound.lastValidBlockHeight
          ? "expired"
          : "pending",
    };
  if (status.err) return { phase: "failed" };
  if (!["confirmed", "finalized"].includes(status.confirmationStatus ?? ""))
    return { phase: "pending" };
  const tx = await connection.getTransaction(request.signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta) return { phase: "pending" };
  if (tx.meta.err || messageHash(tx.transaction.message.serialize()) !== bound.messageHash)
    throw new AppError("TRANSACTION_CHANGED");
  const { snapshot } = await readPosition(bound.wallet, bound.position);
  if (snapshot.slot < tx.slot || snapshot.warnings.includes("STALE_DATA"))
    return { phase: "pending" };
  if (bound.stage === "deposit") {
    // Exchange-rate rounding can reduce the credited atomic collateral by a few lamports.
    if (BigInt(snapshot.collateral.amountAtomic) < (BigInt(bound.amountAtomic) * 999n) / 1000n)
      return { phase: "pending" };
  } else {
    const keys = tx.transaction.message.getAccountKeys({
      accountKeysFromLookups: tx.meta.loadedAddresses,
    });
    const ata = associatedToken(bound.wallet, bound.debtMint).toBase58();
    const matches = (b: NonNullable<typeof tx.meta.postTokenBalances>[number]) =>
      keys.get(b.accountIndex)?.toBase58() === ata &&
      b.mint === bound.debtMint &&
      b.owner === bound.wallet;
    const before = tx.meta.preTokenBalances?.find(matches);
    const after = tx.meta.postTokenBalances?.find(matches);
    if (
      !after ||
      BigInt(after.uiTokenAmount.amount) - BigInt(before?.uiTokenAmount.amount ?? "0") !==
        BigInt(bound.amountAtomic) ||
      BigInt(snapshot.debt.amountAtomic) < BigInt(bound.amountAtomic)
    )
      return { phase: "pending" };
  }
  return { phase: "verified", snapshot };
}
