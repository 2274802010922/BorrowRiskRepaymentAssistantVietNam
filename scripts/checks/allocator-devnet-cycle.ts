import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { Keypair, VersionedTransaction, Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { assertDevnetGenesis, KAMINO_PROGRAM_ID } from "../../src/solana/network/constants.mjs";
import { liquidationManifest } from "../../src/core/liquidation/manifest";
import type { AllocationQuote, PortfolioPlan } from "../../src/shared/allocation";
import type { PortfolioSnapshot } from "../../src/shared/portfolio";
const execute = process.argv.includes("--execute-devnet"),
  walletFile = process.argv.find((a) => a.startsWith("--wallet-file="))?.slice(14);
if (!walletFile) throw new Error("DEDICATED_TEST_WALLET_FILE_REQUIRED");
const signer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(await readFile(walletFile, "utf8"))),
  ),
  wallet = signer.publicKey.toBase58();
if (wallet !== "3kHRwxR1vgCiyNRLozyQU3NWEv3hR54Cc5rsvreyFmRo")
  throw new Error("ONLY_AUTHORIZED_DEDICATED_TEST_WALLET");
const base = "https://picachu-iota.vercel.app",
  rpc = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });
assertDevnetGenesis(await rpc.getGenesisHash());
const goal = { budgetAtomic: "1000000", reserveAtomic: "1000000", shockBps: 4500, bufferBps: 500 };
const positions = [
  "HuUuEHfYSUADS6XBJqznm5XnhhVQ11xukVJnqt62RKkE",
  "854aw3w9crTC6K8fmKLzPddYcg6rVJsDkZ6cmhb5cCx",
  "8PpZyrJaWYNyYduWyihN4Hf6vQWppzwVgfHvyGgrqx4K",
];
const root = "work/allocator-devnet-cycle",
  pendingFile = "work/private/allocator-cycle-pending.json";
await mkdir(root, { recursive: true });
await mkdir("work/private", { recursive: true });
async function api<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    }),
    data = await r.json();
  if (!r.ok) throw new Error(data.error?.code ?? "API_FAILED");
  return data;
}
type Status = {
  phase: string;
  reason?: string;
  cursor: number;
  receipts: { signature: string; position: string; repayAtomic: string }[];
};
async function status(token: string) {
  for (let i = 0; i < 12; i++) {
    const s = await api<Status>("/api/plans/status", { token });
    if (["ready", "verified", "failed"].includes(s.phase)) return s;
    await new Promise((r) => setTimeout(r, Math.min(8000, 1000 * 2 ** i)));
  }
  throw new Error("CONFIRMATION_UNKNOWN_NO_RESUBMIT");
}
try {
  const previous = JSON.parse(await readFile(pendingFile, "utf8")) as { token: string };
  const state = await status(previous.token);
  if (state.phase === "ready" || state.phase === "verified") {
    await unlink(pendingFile);
    console.log(JSON.stringify({ recovered: true, phase: state.phase, receipts: state.receipts }));
  } else throw new Error("EXISTING_PLAN_STOPPED_REVIEW_BEFORE_RETRY");
} catch (e) {
  if (!(e && typeof e === "object" && "code" in e && e.code === "ENOENT")) throw e;
}
const health = await fetch(base + "/api/health").then((r) => r.json());
if (health.cluster !== "devnet" || !health.allocator?.available)
  throw new Error("ALLOCATOR_DEPLOYMENT_NOT_READY");
const before = await api<{ positions: PortfolioSnapshot["positions"] }>("/api/portfolio/read", {
  wallet,
});
const quote = await api<AllocationQuote>("/api/portfolio/allocate", {
  source: "devnet",
  wallet,
  positions,
  goal,
});
if (quote.state !== "ready") throw new Error(quote.reason);
if (quote.plan.state !== "partial_available" || !quote.executionAllowed || !quote.token)
  throw new Error("NO_EXECUTABLE_PARTIAL_PLAN");
if (
  BigInt(quote.plan.totalRepayAtomic) > 1000000n ||
  BigInt(quote.plan.walletAfterAtomic) < 1000000n
)
  throw new Error("TEST_LIMIT_EXCEEDED");
console.log(
  JSON.stringify({
    wallet,
    execute,
    repay: quote.plan.totalRepayAtomic,
    fee: quote.plan.feeLamports,
  }),
);
if (!execute) {
  await writeFile(
    root + "/read-only.json",
    JSON.stringify({ source: "live-api-read-only", goal, before, plan: quote.plan }, null, 2),
  );
  process.exit(0);
}
const journal = await api<{ token: string; plan: PortfolioPlan; portfolio: PortfolioSnapshot }>(
  "/api/plans",
  {
    wallet,
    positions,
    goal,
    mode: "loss-allocation-v1",
    quoteToken: quote.token,
    acceptedPartial: true,
  },
);
const report: {
  source: string;
  wallet: string;
  goal: typeof goal;
  startedAt: string;
  before: typeof before;
  steps: unknown[];
  after?: typeof before;
  status?: Status;
} = {
  source: "vercel-api-dedicated-devnet-test-signer",
  wallet,
  goal,
  startedAt: new Date().toISOString(),
  before,
  steps: [],
};
let paid = 0n;
for (let step = 0; step < 3; step++) {
  const current = await status(journal.token);
  if (current.phase === "verified" || current.phase === "failed") {
    report.status = current;
    break;
  }
  const p = await api<{
    token: string;
    transaction: string;
    repayAtomic: string;
    feeLamports: string;
    expiresAt: number;
    plan: PortfolioPlan;
    position: string;
  }>("/api/plans/prepare", { token: journal.token });
  if (
    Date.now() >= p.expiresAt ||
    BigInt(p.repayAtomic) <= 0n ||
    paid + BigInt(p.repayAtomic) > 1000000n ||
    BigInt(p.feeLamports) > 50000n ||
    BigInt(p.plan.walletAfterAtomic) < 1000000n
  )
    throw new Error("TEST_LIMIT_EXCEEDED");
  const tx = VersionedTransaction.deserialize(Buffer.from(p.transaction, "base64"));
  if (
    tx.message.header.numRequiredSignatures !== 1 ||
    !tx.message.staticAccountKeys[0].equals(signer.publicKey) ||
    tx.message.addressTableLookups.length
  )
    throw new Error("UNSUPPORTED_TEST_MESSAGE");
  let repayments = 0;
  for (const ix of tx.message.compiledInstructions) {
    const program = tx.message.staticAccountKeys[ix.programIdIndex].toBase58(),
      data = Buffer.from(ix.data),
      discriminator = data.subarray(0, 8).toString("hex");
    if (program === KAMINO_PROGRAM_ID) {
      if (!["02da8aeb4fc91966", "218493e497c04859", "74aed54cb435d290"].includes(discriminator))
        throw new Error("ONLY_REFRESH_AND_REPAY_ALLOWED");
      if (discriminator === "74aed54cb435d290") {
        repayments++;
        if (data.readBigUInt64LE(8) !== BigInt(p.repayAtomic))
          throw new Error("WRONG_REPAY_AMOUNT");
      }
    } else if (program === "ComputeBudget111111111111111111111111111111") {
      if (data[0] === 2 && data.readUInt32LE(1) > 1000000)
        throw new Error("COMPUTE_LIMIT_EXCEEDED");
      if (data[0] === 3 && data.readBigUInt64LE(1) > 1000n)
        throw new Error("PRIORITY_FEE_EXCEEDED");
      if (![2, 3].includes(data[0])) throw new Error("UNEXPECTED_COMPUTE_INSTRUCTION");
    } else if (program === "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") {
      if (data[0] !== 1) throw new Error("UNEXPECTED_ATA_INSTRUCTION");
      const mint = tx.message.staticAccountKeys[ix.accountKeyIndexes[3]].toBase58();
      if (mint !== "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
        throw new Error("UNEXPECTED_TOKEN_MINT");
    } else throw new Error("UNEXPECTED_PROGRAM");
  }
  if (
    repayments !== 1 ||
    !tx.message.staticAccountKeys.some((k) => k.toBase58() === liquidationManifest.debt)
  )
    throw new Error("EXPECTED_REPAY_MISSING");
  const message = tx.message.serialize();
  tx.sign([signer]);
  if (!Buffer.from(message).equals(Buffer.from(tx.message.serialize())))
    throw new Error("MESSAGE_CHANGED");
  const signature = bs58.encode(tx.signatures[0]);
  await writeFile(
    pendingFile,
    JSON.stringify({
      wallet,
      token: journal.token,
      bindingToken: p.token,
      signature,
      repayAtomic: p.repayAtomic,
    }),
  );
  await api("/api/plans/submit", {
    token: journal.token,
    bindingToken: p.token,
    transaction: Buffer.from(tx.serialize()).toString("base64"),
    reviewAccepted: true,
  });
  const verified = await status(journal.token);
  if (!verified.receipts.some((r) => r.signature === signature))
    throw new Error("RECEIPT_NOT_VERIFIED");
  paid += BigInt(p.repayAtomic);
  await unlink(pendingFile);
  report.steps.push({
    signature,
    repayAtomic: p.repayAtomic,
    feeLamports: p.feeLamports,
    position: p.position,
    verified: true,
  });
  report.status = verified;
  await writeFile(root + "/report.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({ step: step + 1, signature, paid: paid.toString(), phase: verified.phase }),
  );
  if (verified.phase === "verified" || verified.phase === "failed") break;
}
report.after = await api("/api/portfolio/read", { wallet });
await writeFile(root + "/report.json", JSON.stringify(report, null, 2));
if (BigInt(report.after!.positions[0].walletDebtAtomic) < 1000000n)
  throw new Error("RESERVE_NOT_HELD");
console.log(
  JSON.stringify({
    completed: true,
    paid: paid.toString(),
    phase: report.status?.phase,
    balance: report.after!.positions[0].walletDebtAtomic,
  }),
);
