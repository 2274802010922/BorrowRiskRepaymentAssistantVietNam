// Read-only capture of public accounts and executable for a private local VM.
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import { address, createNoopSigner } from "@solana/kit";
import { KaminoAction } from "@kamino-finance/klend-sdk";
import { Obligation } from "@kamino-finance/klend-sdk/dist/@codegen/klend/accounts/index.js";
import BN from "bn.js";
import { devnetConnection } from "../../src/solana/network/rpc";
import { KAMINO_PROGRAM_ID } from "../../src/solana/network/constants.mjs";
import { readPosition } from "../../src/solana/adapters/kamino";

const output = "work/liquidation-vm/capture";
await mkdir(output, { recursive: true });
const rpc = await devnetConnection();
const positions = [
  "HuUuEHfYSUADS6XBJqznm5XnhhVQ11xukVJnqt62RKkE",
  "854aw3w9crTC6K8fmKLzPddYcg6rVJsDkZ6cmhb5cCx",
  "8PpZyrJaWYNyYduWyihN4Hf6vQWppzwVgfHvyGgrqx4K",
];
const original = await rpc.getMultipleAccountsInfoAndContext(
  positions.map((p) => new PublicKey(p)),
);
const obligation = Obligation.decode(original.value[0]!.data);
const collateral = obligation.deposits.find((d) => !d.depositedAmount.isZero())!.depositReserve;
const debt = obligation.borrows.find((b) => !b.borrowedAmountSf.isZero())!.borrowReserve;
process.env.KAMINO_MARKET_ID = obligation.lendingMarket;
process.env.KAMINO_COLLATERAL_RESERVE = collateral;
process.env.KAMINO_DEBT_RESERVE = debt;
const { context, obligation: loaded } = await readPosition(obligation.owner, positions[0]);
// Fixture signer identity only; no private key is written or used against Devnet.
const liquidator = Keypair.fromSeed(new Uint8Array(32).fill(42)).publicKey.toBase58();
const liquidation = await KaminoAction.buildLiquidateTxns({
  kaminoMarket: context.market,
  amount: new BN("18446744073709551615"),
  minCollateralReceiveAmount: new BN(0),
  repayReserveAddress: address(debt),
  withdrawReserveAddress: address(collateral),
  liquidator: createNoopSigner(address(liquidator)),
  obligationOwner: address(obligation.owner),
  obligation: loaded,
  useV2Ixs: true,
  scopeRefreshConfig: undefined,
  initUserMetadata: { skipInitialization: true, skipLutCreation: true },
  currentLedgerInstant: context.ledger,
});
const repayment = await KaminoAction.buildRepayTxns({
  kaminoMarket: context.market,
  amount: new BN("1000000"),
  reserveAddress: address(debt),
  owner: createNoopSigner(address(obligation.owner)),
  obligation: loaded,
  useV2Ixs: true,
  scopeRefreshConfig: undefined,
  initUserMetadata: { skipInitialization: true, skipLutCreation: true },
  currentLedgerInstant: context.ledger,
});
const serialize = (action: KaminoAction) =>
  KaminoAction.actionToIxs(action).map((ix) => ({
    program: ix.programAddress,
    data: Buffer.from(ix.data!).toString("base64"),
    keys: (ix.accounts ?? []).map((k) => ({
      address: k.address,
      signer: k.role >= 2,
      writable: k.role % 2 === 1,
    })),
  }));
const liquidationIxs = serialize(liquidation),
  repaymentIxs = serialize(repayment);
const addresses = [
  ...new Set([
    ...positions,
    obligation.lendingMarket,
    collateral,
    debt,
    obligation.owner,
    ...[...liquidationIxs, ...repaymentIxs].flatMap((ix) => [
      ix.program,
      ...ix.keys.map((k) => k.address),
    ]),
  ]),
];
const accounts: Record<
  string,
  { data: string; owner: string; lamports: number; executable: boolean }
> = {};
let capturedSlot = 0;
for (let start = 0; start < addresses.length; start += 60) {
  const batch = await rpc.getMultipleAccountsInfoAndContext(
    addresses.slice(start, start + 60).map((a) => new PublicKey(a)),
  );
  capturedSlot = Math.max(capturedSlot, batch.context.slot);
  batch.value.forEach((account, i) => {
    if (account)
      accounts[addresses[start + i]] = {
        data: account.data.toString("base64"),
        owner: account.owner.toBase58(),
        lamports: account.lamports,
        executable: account.executable,
      };
  });
}
const program = await rpc.getAccountInfo(new PublicKey(KAMINO_PROGRAM_ID));
if (!program || program.data.readUInt32LE(0) !== 2) throw new Error("EXPECTED_UPGRADEABLE_PROGRAM");
const programDataAddress = new PublicKey(program.data.subarray(4, 36));
const programData = await rpc.getAccountInfo(programDataAddress);
if (!programData || programData.data.readUInt32LE(0) !== 3)
  throw new Error("EXPECTED_PROGRAM_DATA");
const binary = programData.data.subarray(45);
if (binary.subarray(0, 4).toString("hex") !== "7f454c46") throw new Error("EXPECTED_ELF");
await writeFile(`${output}/kamino.so`, binary);
await writeFile(
  `${output}/capture.json`,
  JSON.stringify(
    {
      cluster: "devnet",
      capturedAt: new Date().toISOString(),
      capturedSlot,
      program: KAMINO_PROGRAM_ID,
      programData: programDataAddress.toBase58(),
      upgradeSlot: programData.data.readBigUInt64LE(4).toString(),
      executableSha256: createHash("sha256").update(binary).digest("hex"),
      ids: context.ids,
      owner: obligation.owner,
      liquidator,
      positions,
      liquidationIxs,
      repaymentIxs,
      accounts,
      market: context.market.state.toJSON(),
      collateral: context.market.getReserveByAddress(address(collateral))!.state.toJSON(),
      debt: context.market.getReserveByAddress(address(debt))!.state.toJSON(),
      obligation: obligation.toJSON(),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    capturedSlot,
    accounts: Object.keys(accounts).length,
    program: KAMINO_PROGRAM_ID,
    executableSha256: createHash("sha256").update(binary).digest("hex"),
    ids: context.ids,
  }),
);
