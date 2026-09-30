import { address, createDefaultRpcTransport, createSolanaRpcFromTransport } from "@solana/kit";
import {
  KaminoMarket,
  KaminoReserve,
  getCurrentLedgerInstant,
  KaminoObligation,
} from "@kamino-finance/klend-sdk";
import {
  LendingMarket,
  Reserve,
  Obligation,
} from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/index.js";
import { PublicKey } from "@solana/web3.js";
import { AppError } from "../../backend/services/http";
import { devnetConnection, rpcUrl } from "../network/rpc";
import { KAMINO_PROGRAM_ID } from "../network/constants.mjs";
import { snapshotSchema, type PositionSnapshot } from "../../shared/types";
import { metrics } from "../../core/risk/metrics";
import { readOracleData } from "./oracle";
import { isOracleFresh } from "../../core/risk/oracle";

export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export function associatedToken(wallet: string, mint: string) {
  return PublicKey.findProgramAddressSync(
    [new PublicKey(wallet).toBuffer(), TOKEN_PROGRAM.toBuffer(), new PublicKey(mint).toBuffer()],
    ATA_PROGRAM,
  )[0];
}

export function configuredMarket() {
  const market = process.env.KAMINO_MARKET_ID;
  const collateral = process.env.KAMINO_COLLATERAL_RESERVE;
  const debt = process.env.KAMINO_DEBT_RESERVE;
  if (!market || !collateral || !debt) throw new AppError("EXECUTION_NOT_CONFIGURED", 503);
  return { market, collateral, debt };
}

export async function loadMarket() {
  const ids = configuredMarket();
  await devnetConnection();
  const transport = createDefaultRpcTransport({ url: rpcUrl() });
  const rpc = createSolanaRpcFromTransport((request) =>
    transport({
      ...request,
      signal: request.signal
        ? AbortSignal.any([request.signal, AbortSignal.timeout(12000)])
        : AbortSignal.timeout(12000),
    }),
  );
  // Explicitly load just the supported pair. Avoid mainnet CDN metadata in a Devnet reader.
  const [state] = await LendingMarket.fetchMultiple(
    rpc,
    [address(ids.market)],
    address(KAMINO_PROGRAM_ID),
  );
  if (!state) throw new AppError("MARKET_NOT_FOUND", 503);
  const reserves = await Reserve.fetchMultiple(
    rpc,
    [address(ids.collateral), address(ids.debt)],
    address(KAMINO_PROGRAM_ID),
  );
  if (!reserves[0] || !reserves[1]) throw new AppError("RESERVE_NOT_FOUND", 503);
  const entries = reserves.map((s, i) => ({
    address: address(i === 0 ? ids.collateral : ids.debt),
    state: s!,
  }));
  if (entries.some((e) => e.state.lendingMarket !== ids.market || e.state.config.status !== 0))
    throw new AppError("UNSUPPORTED_POSITION");
  const priced = await readOracleData(rpc, entries);
  const mapped = new Map(
    priced.map(([entry, price]) => {
      if (!price || !price.valid || price.price.lte(0)) throw new AppError("STALE_DATA");
      return [
        entry.address,
        KaminoReserve.initialize(
          entry.address,
          entry.state,
          price,
          rpc,
          400,
          state.reserveRewardsMaxAprBps,
        ),
      ];
    }),
  );
  const market = await KaminoMarket.loadWithReserves(
    rpc,
    state,
    mapped,
    address(ids.market),
    400,
    address(KAMINO_PROGRAM_ID),
  );
  return { rpc, market, ids, ledger: await getCurrentLedgerInstant(rpc) };
}

export async function readPosition(
  wallet: string,
  position?: string,
  existing?: {
    context: Awaited<ReturnType<typeof loadMarket>>;
    obligations: KaminoObligation[];
    balances?: Awaited<
      ReturnType<import("@solana/web3.js").Connection["getMultipleAccountsInfoAndContext"]>
    >;
  },
): Promise<{
  snapshot: PositionSnapshot;
  context: Awaited<ReturnType<typeof loadMarket>>;
  obligation: KaminoObligation;
}> {
  const context = existing?.context ?? (await loadMarket());
  const obligations =
    existing?.obligations ?? (await supportedObligations(context, wallet, position));
  const obligation = position
    ? obligations.find((o) => o.obligationAddress === position)
    : obligations.find((o) => supported(o, context.ids));
  if (!obligation && obligations.length && !position) throw new AppError("UNSUPPORTED_POSITION");
  if (!obligation) throw new AppError("NO_SUPPORTED_POSITION", 404);
  const deposits = obligation.getDeposits(),
    borrows = obligation.getBorrows();
  if (
    deposits.length !== 1 ||
    borrows.length > 1 ||
    deposits[0].reserveAddress !== context.ids.collateral ||
    (borrows[0] && borrows[0].reserveAddress !== context.ids.debt)
  )
    throw new AppError("UNSUPPORTED_POSITION");
  const collateral = context.market.getReserveByAddress(deposits[0].reserveAddress)!;
  const debt = context.market.getReserveByAddress(address(context.ids.debt))!;
  if (
    debt.state.liquidity.mintDecimals.toNumber() !== 6 ||
    debt.state.liquidity.tokenProgram !== TOKEN_PROGRAM.toBase58()
  )
    throw new AppError("UNSUPPORTED_POSITION");
  const owner = new PublicKey(wallet),
    ata = associatedToken(wallet, debt.state.liquidity.mintPubkey);
  const connection = await devnetConnection();
  const balances =
    existing?.balances ??
    (await connection.getMultipleAccountsInfoAndContext([owner, ata], {
      commitment: "confirmed",
    }));
  const account = balances.value[1];
  if (
    account &&
    (!account.owner.equals(TOKEN_PROGRAM) ||
      account.data.length < 165 ||
      !new PublicKey(account.data.subarray(0, 32)).equals(
        new PublicKey(debt.state.liquidity.mintPubkey),
      ) ||
      !new PublicKey(account.data.subarray(32, 64)).equals(owner))
  )
    throw new AppError("UNSUPPORTED_POSITION");
  const risk = context.market.getMaxAndLiquidationLtvAndBorrowFactorForPair(
    collateral.address,
    debt.address,
    obligation.state.elevationGroup,
  );
  const observedAt = new Date().toISOString();
  const priceTimestamp =
    collateral.tokenOraclePrice.timestamp < debt.tokenOraclePrice.timestamp
      ? collateral.tokenOraclePrice.timestamp
      : debt.tokenOraclePrice.timestamp;
  const snapshot = snapshotSchema.parse({
    schemaVersion: 1,
    source: "devnet",
    protocol: "kamino",
    cluster: "devnet",
    wallet,
    position: obligation.obligationAddress,
    market: context.ids.market,
    collateral: {
      mint: collateral.state.liquidity.mintPubkey,
      symbol: collateral.getTokenSymbol(),
      decimals: collateral.state.liquidity.mintDecimals.toNumber(),
      amountAtomic: deposits[0].amount.floor().toFixed(0),
      priceUsd: collateral.getOracleMarketPrice().toString(),
    },
    debt: {
      mint: debt.state.liquidity.mintPubkey,
      symbol: debt.getTokenSymbol(),
      decimals: debt.state.liquidity.mintDecimals.toNumber(),
      amountAtomic: borrows[0]?.amount.ceil().toFixed(0) ?? "0",
      priceUsd: debt.getOracleMarketPrice().toString(),
    },
    walletDebtAtomic: account ? account.data.readBigUInt64LE(64).toString() : "0",
    walletSolLamports: String(balances.value[0]?.lamports ?? 0),
    liquidationThresholdBps: Math.round(risk.liquidationLtv * 10000),
    borrowFactorBps: Math.round(risk.borrowFactor * 10000),
    observedAt,
    priceObservedAt: new Date(Number(priceTimestamp) * 1000).toISOString(),
    slot: Number(context.ledger.slot),
    warnings: [],
  });
  const engine = metrics(snapshot);
  const canonical = obligation.refreshedStats.loanToValue.mul(100).toNumber();
  if (Math.abs(Number(engine.ltvPct) - canonical) > 0.011)
    throw new AppError("UNSUPPORTED_POSITION");
  if (
    [collateral, debt].some(
      (r) =>
        !isOracleFresh(
          r.tokenOraclePrice.timestamp,
          r.state.config.tokenInfo.maxAgePriceSeconds.toString(),
        ),
    )
  )
    snapshot.warnings.push("STALE_DATA");
  if (Date.now() - Number(priceTimestamp) * 1000 > 300000) snapshot.warnings.push("PRICE_DELAYED");
  return { snapshot, context, obligation };
}

function supported(o: KaminoObligation, ids: ReturnType<typeof configuredMarket>) {
  const deposits = o.getDeposits(),
    borrows = o.getBorrows();
  return (
    deposits.length === 1 &&
    deposits[0].reserveAddress === ids.collateral &&
    borrows.length <= 1 &&
    (!borrows[0] || borrows[0].reserveAddress === ids.debt)
  );
}
async function supportedObligations(
  context: Awaited<ReturnType<typeof loadMarket>>,
  wallet: string,
  position?: string,
) {
  const c = await devnetConnection();
  const raw = await c.getProgramAccounts(new PublicKey(KAMINO_PROGRAM_ID), {
    commitment: "confirmed",
    filters: [
      { dataSize: Obligation.layout.span + 8 },
      { memcmp: { offset: 64, bytes: wallet } },
      { memcmp: { offset: 32, bytes: context.ids.market } },
    ],
  });
  const selected = raw.filter((account) => {
    if (position && account.pubkey.toBase58() !== position) return false;
    const state = Obligation.decode(account.account.data);
    if (!state || state.owner !== wallet || state.lendingMarket !== context.ids.market)
      return false;
    const deposits = state.deposits.filter((d) => !d.depositedAmount.isZero());
    const borrows = state.borrows.filter((b) => !b.borrowedAmountSf.isZero());
    return (
      deposits.length === 1 &&
      deposits[0].depositReserve === context.ids.collateral &&
      borrows.length <= 1 &&
      (!borrows[0] || borrows[0].borrowReserve === context.ids.debt)
    );
  });
  if (!selected.length && raw.length && !position) throw new AppError("UNSUPPORTED_POSITION");
  if (selected.length > 10) throw new AppError("TOO_MANY_POSITIONS");
  if (!selected.length) return [];
  const loaded = await context.market.getMultipleObligationsByAddress(
    selected.map((a) => address(a.pubkey.toBase58())),
    context.ledger,
  );
  return loaded.filter((o): o is KaminoObligation => o !== null);
}
export async function readPositions(
  wallet: string,
  position?: string,
): Promise<PositionSnapshot[]> {
  const context = await loadMarket();
  const obligations = await supportedObligations(context, wallet, position);
  const found = position
    ? obligations.filter((o) => o.obligationAddress === position)
    : obligations.filter((o) => supported(o, context.ids));
  if (!found.length && obligations.length && !position) throw new AppError("UNSUPPORTED_POSITION");
  if (found.length > 10) throw new AppError("TOO_MANY_POSITIONS");
  const connection = await devnetConnection();
  const debt = context.market.getReserveByAddress(address(context.ids.debt))!;
  const balances = await connection.getMultipleAccountsInfoAndContext(
    [new PublicKey(wallet), associatedToken(wallet, debt.state.liquidity.mintPubkey)],
    { commitment: "confirmed" },
  );
  return Promise.all(
    found.map(
      async (o) =>
        (await readPosition(wallet, o.obligationAddress, { context, obligations, balances }))
          .snapshot,
    ),
  );
}
