import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { address, getTransactionDecoder } from "@solana/kit";
import {
  Obligation,
  Reserve,
  LendingMarket,
} from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/index.js";
import { priceUpdateV2 } from "@kamino-finance/klend-sdk/dist/@codegen/pyth_rec/accounts/priceUpdateV2.js";
import BN from "bn.js";
const { LiteSVM, Clock, FailedTransactionMetadata } = await import(
  pathToFileURL(resolve("work/liquidation-vm/node_modules/litesvm/dist/index.js")).href
);
const capture = JSON.parse(await readFile("work/liquidation-vm/capture/capture.json", "utf8"));
async function runCase(options) {
  const shock = options.shockBps;
  const svm = new LiteSVM()
    .withSigverify(false)
    .withBlockhashCheck(false)
    .withTransactionHistory(0n);
  const native = new Set([
    "11111111111111111111111111111111",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "ComputeBudget111111111111111111111111111111",
  ]);
  for (const [key, account] of Object.entries(capture.accounts)) {
    if (native.has(key) || key.startsWith("Sysvar")) continue;
    svm.setAccount({
      address: address(key),
      programAddress: address(account.owner),
      data: Buffer.from(account.data, "base64"),
      executable: account.executable,
      lamports: BigInt(account.lamports),
    });
  }
  svm.addProgram(address(capture.program), await readFile("work/liquidation-vm/capture/kamino.so"));
  const timestamp = BigInt(Math.floor(Date.parse(capture.capturedAt) / 1000));
  svm.setClock(new Clock(BigInt(capture.capturedSlot), timestamp, 0n, 0n, timestamp));
  svm.setAccount({
    address: address(capture.liquidator),
    programAddress: address("11111111111111111111111111111111"),
    data: new Uint8Array(),
    executable: false,
    lamports: 100000000000n,
  });
  function setPrices(stressBps) {
    // Controlled oracle writes exist only inside this VM and are never sent to RPC.
    for (const reserve of [capture.collateral, capture.debt]) {
      const key = reserve.config.tokenInfo.pythConfiguration.price;
      const original = capture.accounts[key];
      const bytes = Buffer.from(original.data, "base64"),
        data = priceUpdateV2.layout.decode(bytes.subarray(8));
      data.priceMessage.publishTime = new BN(timestamp.toString());
      data.priceMessage.prevPublishTime = data.priceMessage.publishTime;
      if (reserve === capture.collateral) {
        data.priceMessage.price = data.priceMessage.price.muln(10000 - stressBps).divn(10000);
        data.priceMessage.emaPrice = data.priceMessage.emaPrice.muln(10000 - stressBps).divn(10000);
        data.priceMessage.conf = data.priceMessage.conf.muln(10000 - stressBps).divn(10000);
      }
      priceUpdateV2.layout.encode(data, bytes.subarray(8));
      svm.setAccount({
        address: address(key),
        programAddress: address(original.owner),
        data: bytes,
        executable: false,
        lamports: BigInt(original.lamports),
      });
    }
  }
  const debtMint = capture.debt.liquidity.mintPubkey;
  const liquidationIx = capture.liquidationIxs.find(
    (i) => Buffer.from(i.data, "base64").subarray(0, 8).toString("hex") === "a2a1238f1ebbb967",
  );
  const source = liquidationIx.keys[13].address;
  const token = Buffer.alloc(165);
  new PublicKey(debtMint).toBuffer().copy(token, 0);
  new PublicKey(capture.liquidator).toBuffer().copy(token, 32);
  token.writeBigUInt64LE(10000000000000n, 64);
  token[108] = 1;
  svm.setAccount({
    address: address(source),
    programAddress: address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    data: token,
    executable: false,
    lamports: 2039280n,
  });
  const decodeReserve = (key) =>
    Reserve.decode(Buffer.from(svm.getAccount(address(key)).data)).toJSON();
  const decodeObligation = () =>
    Obligation.decode(Buffer.from(svm.getAccount(address(capture.positions[0])).data)).toJSON();
  function send(instructions, payer = capture.liquidator) {
    const ixs = instructions.map(
      (i) =>
        new TransactionInstruction({
          programId: new PublicKey(i.program),
          data: Buffer.from(i.data, "base64"),
          keys: i.keys.map((k) => ({
            pubkey: new PublicKey(k.address),
            isSigner: k.signer,
            isWritable: k.writable,
          })),
        }),
    );
    const tx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: new PublicKey(payer),
        recentBlockhash: svm.latestBlockhash(),
        instructions: ixs,
      }).compileToV0Message(),
    );
    return svm.sendTransaction(getTransactionDecoder().decode(tx.serialize()));
  }
  const refresh = capture.liquidationIxs.filter(
    (i) =>
      i.program === "ComputeBudget111111111111111111111111111111" ||
      (i.program === capture.program &&
        ["02da8aeb4fc91966", "218493e497c04859"].includes(
          Buffer.from(i.data, "base64").subarray(0, 8).toString("hex"),
        )),
  );
  function edit(key, layout, callback) {
    const account = svm.getAccount(address(key)),
      bytes = Buffer.from(account.data),
      decoded = layout.decode(bytes.subarray(8));
    callback(decoded);
    layout.encode(decoded, bytes.subarray(8));
    svm.setAccount({ ...account, data: bytes });
  }
  if (options.debtAtomic)
    edit(capture.positions[0], Obligation.layout, (o) => {
      o.borrows[0].borrowedAmountSf = new BN((BigInt(options.debtAtomic) * (1n << 60n)).toString());
      o.borrows[0].borrowedAmountOutsideElevationGroups = new BN(options.debtAtomic);
    });
  if (options.collateralAtomic)
    edit(capture.positions[0], Obligation.layout, (o) => {
      o.deposits[0].depositedAmount = new BN(options.collateralAtomic);
    });
  if (options.feePct !== undefined)
    edit(capture.ids.collateral, Reserve.layout, (r) => {
      r.config.protocolLiquidationFeePct = options.feePct;
    });
  if (options.supplyPct)
    edit(capture.ids.collateral, Reserve.layout, (r) => {
      r.collateral.mintTotalSupply = r.collateral.mintTotalSupply.muln(options.supplyPct).divn(100);
    });
  if (options.capUsd)
    edit(capture.ids.market, LendingMarket.layout, (m) => {
      m.maxLiquidatableDebtMarketValueAtOnce = new BN(options.capUsd);
    });
  if (options.thresholdPct)
    edit(capture.ids.collateral, Reserve.layout, (r) => {
      r.config.liquidationThresholdPct = options.thresholdPct;
    });
  setPrices(0);
  const first = send(refresh);
  if (first instanceof FailedTransactionMetadata) throw new Error(first.meta().logs().join("\n"));
  const normal = {
    obligation: decodeObligation(),
    collateral: decodeReserve(capture.ids.collateral),
    debt: decodeReserve(capture.ids.debt),
  };
  const userRepay = options.repayAtomic ?? "0";
  if (userRepay !== "0") {
    const instructions = structuredClone(capture.repaymentIxs);
    const payment = instructions.find(
      (i) =>
        i.program === capture.program &&
        i.keys.some((k) => k.address === capture.positions[0]) &&
        !["02da8aeb4fc91966", "218493e497c04859"].includes(
          Buffer.from(i.data, "base64").subarray(0, 8).toString("hex"),
        ),
    );
    const data = Buffer.from(payment.data, "base64");
    data.writeBigUInt64LE(BigInt(userRepay), 8);
    payment.data = data.toString("base64");
    const paid = send(instructions, capture.owner);
    if (paid instanceof FailedTransactionMetadata) throw new Error(paid.meta().logs().join("\n"));
  }
  setPrices(shock);
  const refreshed = send(refresh);
  if (refreshed instanceof FailedTransactionMetadata)
    throw new Error(refreshed.meta().logs().join("\n"));
  if (options.boundaryOffsetAtomic !== undefined) {
    const o = decodeObligation(),
      r = decodeReserve(capture.ids.debt);
    const target =
      (BigInt(o.unhealthyBorrowValueSf) * (1n << 60n) * 1000000n +
        BigInt(r.liquidity.marketPriceSf) -
        1n) /
        BigInt(r.liquidity.marketPriceSf) +
      BigInt(options.boundaryOffsetAtomic) * (1n << 60n);
    edit(capture.positions[0], Obligation.layout, (raw) => {
      raw.borrows[0].borrowedAmountSf = new BN(target.toString());
      raw.borrows[0].borrowedAmountOutsideElevationGroups = new BN(
        ((target + (1n << 60n) - 1n) / (1n << 60n)).toString(),
      );
    });
    const boundary = send(refresh);
    if (boundary instanceof FailedTransactionMetadata)
      throw new Error(boundary.meta().logs().join("\n"));
    normal.obligation.borrows[0].borrowedAmountSf = decodeObligation().borrows[0].borrowedAmountSf;
  }
  const before = decodeObligation(),
    stressedCollateral = decodeReserve(capture.ids.collateral),
    stressedDebt = decodeReserve(capture.ids.debt);
  const result = send(capture.liquidationIxs);
  const failed = result instanceof FailedTransactionMetadata;
  const meta = failed ? result.meta() : result;
  const report = {
    id: options.id,
    source: "local-vm-clone",
    executableSha256: capture.executableSha256,
    market: LendingMarket.decode(
      Buffer.from(svm.getAccount(address(capture.ids.market)).data),
    ).toJSON(),
    shockBps: shock,
    userRepayAtomic: userRepay,
    normal,
    stressedCollateral,
    stressedDebt,
    failed,
    error: failed ? result.err().toString() : null,
    logs: meta.logs(),
    before,
    after: decodeObligation(),
  };
  console.log(
    JSON.stringify({
      id: options.id,
      failed,
      error: report.error,
      liquidationLog: report.logs.filter((s) =>
        /liquidation bonus|Obligation is healthy|pnl:/.test(s),
      ),
      debtBefore: before.borrows[0].borrowedAmountSf,
      debtAfter: report.after.borrows[0].borrowedAmountSf,
    }),
  );
  return report;
}
if (process.argv.includes("--matrix")) {
  const cases = [
    { id: "healthy", shockBps: 0 },
    ...[3000, 3500, 4000, 4500, 4700, 4750, 4800].map((s) => ({ id: `shock-${s}`, shockBps: s })),
    ...[1, 100000, 500000, 1000000, 2000000, 3000000].map((r) => ({
      id: `repay-${r}`,
      shockBps: 4500,
      repayAtomic: String(r),
    })),
    { id: "small-loan-full", shockBps: 8000, debtAtomic: "1900000" },
    { id: "small-loan-edge", shockBps: 7900, debtAtomic: "2000001" },
    { id: "fraction-exchange", shockBps: 4000, supplyPct: 102 },
    { id: "protocol-fee", shockBps: 4500, feePct: 10 },
    { id: "small-collateral", shockBps: 4500, debtAtomic: "10000", collateralAtomic: "200000" },
    { id: "event-cap", shockBps: 4500, capUsd: "1" },
    { id: "threshold-80", shockBps: 4000, thresholdPct: 80 },
    { id: "threshold-80-repay", shockBps: 4500, thresholdPct: 80, repayAtomic: "1000000" },
    ...[-1, 0, 1].map((v) => ({
      id: `liquidation-boundary-${v}`,
      shockBps: 4500,
      boundaryOffsetAtomic: v,
    })),
  ];
  const reports = [];
  for (const c of cases) reports.push(await runCase(c));
  await writeFile(
    "work/liquidation-vm/matrix.json",
    JSON.stringify(
      { captureHash: capture.executableSha256, generatedAt: new Date().toISOString(), reports },
      null,
      2,
    ),
  );
} else {
  const report = await runCase({
    id: "probe",
    shockBps: Number(process.argv.find((a) => a.startsWith("--shock="))?.split("=")[1] ?? 0),
    repayAtomic: process.argv.find((a) => a.startsWith("--repay="))?.split("=")[1] ?? "0",
  });
  await writeFile("work/liquidation-vm/probe.json", JSON.stringify(report, null, 2));
}
