import { createHash } from "node:crypto";
import { address, none, some, type Instruction } from "@solana/kit";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  Obligation,
  Reserve,
} from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/index.js";
import {
  refreshReserve,
  refreshObligation,
} from "@kamino-finance/klend-sdk/dist/@codegen/klend/instructions/index.js";
import { loadMarket, supportedObligations, associatedToken, TOKEN_PROGRAM } from "./kamino";
import { devnetConnection } from "../network/rpc";
import { quotedComputeBudget } from "../transactions/compute-budget";
import { AppError } from "../../backend/services/http";
import { snapshotSchema } from "../../shared/types";
import type { AllocationContext } from "../../core/allocation/plan";
import { liquidationManifest as manifest } from "../../core/liquidation/manifest";
import { SF, collateralUnderlyingSf } from "../../core/liquidation/fixed-point";
import { usdFromSf, liquidationInputSchema } from "../../core/liquidation/kamino-price-event";
import { isOracleFresh } from "../../core/risk/oracle";

const NULL = "11111111111111111111111111111111";
const LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
const checkedConnections = new WeakSet<object>();
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function requireLiquidationProgram() {
  if (!manifest.verified) throw new AppError("LIQUIDATION_PARITY_NOT_VERIFIED");
  const rpc = await devnetConnection();
  const program = await rpc.getAccountInfo(new PublicKey(manifest.program));
  if (
    !program?.executable ||
    program.owner.toBase58() !== LOADER ||
    program.data.length < 36 ||
    program.data.readUInt32LE(0) !== 2 ||
    new PublicKey(program.data.subarray(4, 36)).toBase58() !== manifest.programData
  )
    throw new AppError("LIQUIDATION_PROGRAM_CHANGED");
  const data = await rpc.getAccountInfo(new PublicKey(manifest.programData), {
    commitment: "confirmed",
    dataSlice: { offset: 0, length: 45 },
  });
  if (
    !data ||
    data.owner.toBase58() !== LOADER ||
    data.data.length < 45 ||
    data.data.readUInt32LE(0) !== 3 ||
    data.data.readBigUInt64LE(4).toString() !== manifest.upgradeSlot
  )
    throw new AppError("LIQUIDATION_PROGRAM_CHANGED");
  // The historical upgrade slot is immutable without a new deployment. Every warm
  // call still checks owner, ProgramData address and slot; cold calls hash all bytes.
  if (!checkedConnections.has(rpc)) {
    const full = await rpc.getAccountInfo(new PublicKey(manifest.programData));
    if (
      !full ||
      full.owner.toBase58() !== LOADER ||
      full.data.length < 45 ||
      full.data.readBigUInt64LE(4).toString() !== manifest.upgradeSlot ||
      createHash("sha256").update(full.data.subarray(45)).digest("hex") !==
        manifest.executableSha256
    )
      throw new AppError("LIQUIDATION_PROGRAM_CHANGED");
    checkedConnections.add(rpc);
  }
  return manifest.executableSha256;
}
export async function readAllocationContext(
  wallet: string,
  selected: string[],
  shockBps: number,
): Promise<AllocationContext> {
  const programFingerprint = await requireLiquidationProgram(),
    context = await loadMarket();
  if (
    context.ids.market !== manifest.market ||
    context.ids.collateral !== manifest.collateral ||
    context.ids.debt !== manifest.debt
  )
    throw new AppError("UNSUPPORTED_LIQUIDATION_CONTEXT");
  const all = await supportedObligations(context, wallet),
    chosen = selected.map((p) => all.find((o) => o.obligationAddress === p));
  if (
    chosen.some((o) => !o) ||
    new Set(selected).size !== selected.length ||
    selected.length < 1 ||
    selected.length > 3
  )
    throw new AppError("UNSUPPORTED_POSITION");
  const market = context.market.state;
  if (
    market.emergencyMode ||
    market.priceTriggeredLiquidationDisabled ||
    market.liquidationMaxDebtCloseFactorPct !== 20 ||
    market.insolvencyRiskUnhealthyLtvPct !== 95 ||
    market.minFullLiquidationValueThreshold.toString() !== "2" ||
    market.maxLiquidatableDebtMarketValueAtOnce.toString() !== "500000"
  )
    throw new AppError("UNSUPPORTED_LIQUIDATION_CONTEXT");
  const pair = [
    context.market.getReserveByAddress(address(context.ids.collateral))!,
    context.market.getReserveByAddress(address(context.ids.debt))!,
  ];
  for (const reserve of pair) {
    const cfg = reserve.state.config,
      info = cfg.tokenInfo;
    if (
      cfg.status !== 0 ||
      cfg.emergencyMode ||
      (cfg.autodeleverageEnabled &&
        (reserve.state.liquidity.depositLimitCrossedTimestamp.toString() !== "0" ||
          reserve.state.liquidity.borrowLimitCrossedTimestamp.toString() !== "0")) ||
      cfg.debtTermSeconds.toString() !== "0" ||
      cfg.debtMaturityTimestamp.toString() !== "0" ||
      cfg.earlyRepayRemainingInterestPct !== 0 ||
      cfg.minLiquidationBonusBps !== 100 ||
      cfg.maxLiquidationBonusBps !== 1000 ||
      cfg.protocolLiquidationFeePct !== 0 ||
      reserve.state.farmCollateral !== NULL ||
      reserve.state.farmDebt !== NULL ||
      info.pythConfiguration.price === NULL ||
      info.scopeConfiguration.priceFeed !== NULL ||
      info.switchboardConfiguration.priceAggregator !== NULL
    )
      throw new AppError("UNSUPPORTED_LIQUIDATION_CONTEXT");
  }
  if (
    pair[1].state.config.borrowFactorPct.toString() !== "100" ||
    pair[0].state.config.liquidationThresholdPct !== 75 ||
    pair[0].state.liquidity.mintDecimals.toString() !== "9" ||
    pair[1].state.liquidity.mintDecimals.toString() !== "6" ||
    pair.some((r) => r.state.liquidity.tokenProgram !== TOKEN_PROGRAM.toBase58())
  )
    throw new AppError("UNSUPPORTED_LIQUIDATION_CONTEXT");
  for (const obligation of chosen) {
    const s = obligation!.state;
    if (
      s.elevationGroup !== 0 ||
      s.autodeleverageTargetLtvPct !== 0 ||
      s.autodeleverageMarginCallStartedTimestamp.toString() !== "0" ||
      s.deposits.filter((d) => !d.depositedAmount.isZero()).length !== 1 ||
      s.borrows.filter((b) => !b.borrowedAmountSf.isZero()).length > 1 ||
      s.deposits.find((d) => !d.depositedAmount.isZero())?.depositReserve !==
        context.ids.collateral ||
      s.borrows.some((b) => !b.borrowedAmountSf.isZero() && b.borrowReserve !== context.ids.debt) ||
      s.obligationOrders.some((o) => o.conditionType !== 0)
    )
      throw new AppError("UNSUPPORTED_LIQUIDATION_CONTEXT");
  }
  const instructions: Instruction[] = pair.map((r) =>
    refreshReserve(
      {
        reserve: r.address,
        lendingMarket: address(context.ids.market),
        pythOracle: some(r.state.config.tokenInfo.pythConfiguration.price),
        switchboardPriceOracle: none(),
        switchboardTwapOracle: none(),
        scopePrices: none(),
      },
      [],
      address(manifest.program),
    ),
  );
  for (const id of selected)
    instructions.push(
      refreshObligation(
        { lendingMarket: address(context.ids.market), obligation: address(id) },
        (chosen.find((o) => o!.obligationAddress === id)!.getBorrows().length
          ? pair
          : [pair[0]]
        ).map((r) => ({ address: r.address, role: 0 })),
        address(manifest.program),
      ),
    );
  const rpc = await devnetConnection(),
    latest = await rpc.getLatestBlockhash("confirmed");
  const nativeInstructions = instructions.map(
    (ix) =>
      new TransactionInstruction({
        programId: new PublicKey(ix.programAddress),
        data: Buffer.from(ix.data ?? []),
        keys: (ix.accounts ?? []).map((a) => ({
          pubkey: new PublicKey(a.address),
          isSigner: (a.role & 2) !== 0,
          isWritable: (a.role & 1) !== 0,
        })),
      }),
  );
  const message = new TransactionMessage({
    payerKey: new PublicKey(wallet),
    recentBlockhash: latest.blockhash,
    instructions: quotedComputeBudget(nativeInstructions),
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  const addresses = [...selected, context.ids.collateral, context.ids.debt];
  const [simulation, balances, fee] = await Promise.all([
    rpc.simulateTransaction(tx, {
      sigVerify: false,
      commitment: "confirmed",
      accounts: { encoding: "base64", addresses },
    }),
    rpc.getMultipleAccountsInfoAndContext(
      [new PublicKey(wallet), associatedToken(wallet, pair[1].state.liquidity.mintPubkey)],
      { commitment: "confirmed" },
    ),
    rpc.getFeeForMessage(tx.message, "confirmed"),
  ]);
  if (
    simulation.value.err ||
    !simulation.value.accounts?.every((a) => a?.owner === manifest.program) ||
    fee.value === null ||
    fee.value > 50000
  )
    throw new AppError("SIMULATION_FAILED");
  const accounts = simulation.value.accounts;
  const collateral = Reserve.decode(Buffer.from(accounts[selected.length]!.data[0], "base64")),
    debt = Reserve.decode(Buffer.from(accounts[selected.length + 1]!.data[0], "base64"));
  const priceTime = Math.min(
    Number(collateral.liquidity.marketPriceLastUpdatedTs.toString()),
    Number(debt.liquidity.marketPriceLastUpdatedTs.toString()),
  );
  if (
    [collateral, debt].some(
      (r) =>
        !isOracleFresh(
          BigInt(r.liquidity.marketPriceLastUpdatedTs.toString()),
          r.config.tokenInfo.maxAgePriceSeconds.toString(),
        ),
    )
  )
    throw new AppError("STALE_DATA");
  const liquidity = collateral.liquidity;
  const supplySf =
    BigInt(liquidity.totalAvailableAmount.toString()) * SF +
    BigInt(liquidity.borrowedAmountSf.toString()) -
    BigInt(liquidity.accumulatedProtocolFeesSf.toString()) -
    BigInt(liquidity.accumulatedReferrerFeesSf.toString()) -
    BigInt(liquidity.pendingReferrerFeesSf.toString());
  const ata = balances.value[1],
    owner = new PublicKey(wallet);
  if (
    ata &&
    (!ata.owner.equals(TOKEN_PROGRAM) ||
      ata.data.length < 165 ||
      !new PublicKey(ata.data.subarray(0, 32)).equals(new PublicKey(debt.liquidity.mintPubkey)) ||
      !new PublicKey(ata.data.subarray(32, 64)).equals(owner))
  )
    throw new AppError("UNSUPPORTED_POSITION");
  const walletDebtAtomic = ata ? ata.data.readBigUInt64LE(64).toString() : "0",
    walletSolLamports = String(balances.value[0]?.lamports ?? 0),
    inputs: AllocationContext["inputs"] = {};
  const priceSf = BigInt(collateral.liquidity.marketPriceSf.toString()),
    stressedPrice = ((priceSf * BigInt(10000 - shockBps)) / 10000n).toString();
  const positions = selected.map((id, i) => {
    const raw = Obligation.decode(Buffer.from(accounts[i]!.data[0], "base64")),
      dep = raw.deposits.find((d) => !d.depositedAmount.isZero())!,
      loan = raw.borrows.find((b) => !b.borrowedAmountSf.isZero());
    const underlying = collateralUnderlyingSf(
      BigInt(dep.depositedAmount.toString()),
      supplySf,
      BigInt(collateral.collateral.mintTotalSupply.toString()),
    );
    inputs[id] = liquidationInputSchema.parse({
      debtAmountSf: loan?.borrowedAmountSf.toString() ?? "0",
      collateralCTAtomic: dep.depositedAmount.toString(),
      collateralSupplyAtomic: collateral.collateral.mintTotalSupply.toString(),
      collateralLiquiditySf: supplySf.toString(),
      collateralPriceSf: stressedPrice,
      debtPriceSf: debt.liquidity.marketPriceSf.toString(),
      collateralDecimals: 9,
      debtDecimals: 6,
      borrowFactorPct: 100,
      thresholdPct: collateral.config.liquidationThresholdPct,
      closeFactorPct: market.liquidationMaxDebtCloseFactorPct,
      insolvencyLtvPct: market.insolvencyRiskUnhealthyLtvPct,
      minFullLiquidationUsd: market.minFullLiquidationValueThreshold.toString(),
      maxDebtPerEventUsd: market.maxLiquidatableDebtMarketValueAtOnce.toString(),
      minBonusBps: Math.max(
        collateral.config.minLiquidationBonusBps,
        debt.config.minLiquidationBonusBps,
      ),
      maxBonusBps: Math.max(
        collateral.config.maxLiquidationBonusBps,
        debt.config.maxLiquidationBonusBps,
      ),
      protocolFeePct: collateral.config.protocolLiquidationFeePct,
    });
    return snapshotSchema.parse({
      schemaVersion: 1,
      source: "devnet",
      protocol: "kamino",
      cluster: "devnet",
      wallet,
      position: id,
      market: context.ids.market,
      collateral: {
        mint: collateral.liquidity.mintPubkey,
        symbol: "SOL",
        decimals: 9,
        amountAtomic: (underlying / SF).toString(),
        priceUsd: usdFromSf(priceSf),
      },
      debt: {
        mint: debt.liquidity.mintPubkey,
        symbol: "USDC",
        decimals: 6,
        amountAtomic: (
          (BigInt(loan?.borrowedAmountSf.toString() ?? "0") + SF - 1n) /
          SF
        ).toString(),
        priceUsd: usdFromSf(debt.liquidity.marketPriceSf.toString()),
      },
      walletDebtAtomic,
      walletSolLamports,
      liquidationThresholdBps: 7500,
      borrowFactorBps: 10000,
      observedAt: new Date().toISOString(),
      priceObservedAt: new Date(priceTime * 1000).toISOString(),
      slot: simulation.context.slot,
      warnings: Date.now() - priceTime * 1000 > 300000 ? ["PRICE_DELAYED"] : [],
    });
  });
  if (
    positions.reduce((sum, s) => sum + BigInt(s.collateral.amountAtomic), 0n) >
    BigInt(collateral.liquidity.totalAvailableAmount.toString())
  )
    throw new AppError("UNSUPPORTED_LIQUIDATION_LIQUIDITY");
  const risk = inputs[positions[0].position];
  return {
    portfolio: { version: 1, positions },
    inputs,
    feePerStepLamports: String(fee.value),
    solPriceUsd: usdFromSf(priceSf),
    programFingerprint,
    configFingerprint: digest({
      market: context.ids.market,
      thresholdPct: risk.thresholdPct,
      borrowFactorPct: risk.borrowFactorPct,
      closeFactorPct: risk.closeFactorPct,
      insolvencyLtvPct: risk.insolvencyLtvPct,
      minFullLiquidationUsd: risk.minFullLiquidationUsd,
      maxDebtPerEventUsd: risk.maxDebtPerEventUsd,
      minBonusBps: risk.minBonusBps,
      maxBonusBps: risk.maxBonusBps,
      protocolFeePct: risk.protocolFeePct,
    }),
  };
}
