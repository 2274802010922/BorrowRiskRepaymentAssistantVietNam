import { readFile, writeFile, mkdir, unlink, rename } from "node:fs/promises";
import { Keypair, Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { assertDevnetGenesis } from "../../solana/network/constants.mjs";
import type { DemoCheck, DemoPrepared } from "../../shared/demo";
import type { PositionSnapshot } from "../../shared/types";
const execute = process.argv.includes("--execute-devnet"),
  keyFile = process.argv.find((a) => a.startsWith("--wallet-file="))?.slice(14);
if (!keyFile)
  throw new Error(
    "Provide a dedicated test wallet using --wallet-file=PATH; never use a mainnet wallet.",
  );
const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keyFile, "utf8")))),
  wallet = keypair.publicKey.toBase58();
const base = "https://picachu-iota.vercel.app",
  rpc = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });
assertDevnetGenesis(await rpc.getGenesisHash());
await mkdir("work/private", { recursive: true });
const report: {
  wallet: string;
  cluster: "devnet";
  executed: boolean;
  steps: Record<string, unknown>[];
} = { wallet, cluster: "devnet", executed: execute, steps: [] };
const pendingFile = "work/private/auto-cycle-pending.json";
async function api<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      (data.error?.code ?? "API_FAILED") +
        (data.error?.requestId ? "|" + data.error.requestId : ""),
    );
  return data;
}
function sign(prepared: { transaction: string; expiresAt: number; feeLamports: string }) {
  if (Date.now() >= prepared.expiresAt) throw new Error("PREVIEW_EXPIRED");
  if (BigInt(prepared.feeLamports) > 50000n) throw new Error("FEE_EXCEEDS_TEST_CAP");
  const tx = VersionedTransaction.deserialize(Buffer.from(prepared.transaction, "base64"));
  if (
    tx.message.header.numRequiredSignatures !== 1 ||
    !tx.message.staticAccountKeys[0].equals(keypair.publicKey)
  )
    throw new Error("WRONG_TEST_WALLET");
  if (
    !tx.message.staticAccountKeys.some(
      (k) => k.toBase58() === "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
    )
  )
    throw new Error("EXPECTED_KAMINO_PROGRAM_MISSING");
  const before = tx.message.serialize();
  tx.sign([keypair]);
  const after = tx.message.serialize();
  if (before.length !== after.length || before.some((b, i) => b !== after[i]))
    throw new Error("TRANSACTION_CHANGED");
  return {
    signature: bs58.encode(tx.signatures[0]),
    transaction: Buffer.from(tx.serialize()).toString("base64"),
  };
}
type Pending =
  | { kind: "demo"; wallet: string; token: string; signature: string }
  | { kind: "plan"; wallet: string; token: string };
async function verify(p: Pending) {
  if (p.wallet !== wallet) throw new Error("PENDING_FROM_OTHER_WALLET");
  for (let attempt = 0; attempt < 12; attempt++) {
    const status = await api<{
      phase: string;
      cursor?: number;
      receipts?: { signature: string; repayAtomic: string }[];
    }>(
      p.kind === "demo" ? "/api/demo" : "/api/plans/status",
      p.kind === "demo" ? { ...p, action: "status" } : { token: p.token },
    );
    if (status.phase === "verified" || (p.kind === "plan" && status.phase === "ready")) {
      await unlink(pendingFile).catch(() => {});
      return status;
    }
    if (["failed", "expired"].includes(status.phase))
      throw new Error("TEST_TRANSACTION_" + status.phase.toUpperCase());
    await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 1000 * 2 ** attempt)));
  }
  throw new Error("CONFIRMATION_UNKNOWN_STOPPED_NO_RESUBMIT");
}
try {
  const health = await fetch(base + "/api/health").then((r) => r.json());
  if (health.cluster !== "devnet" || !health.executionConfigured)
    throw new Error("DEVNET_EXECUTION_NOT_READY");
  const balance = await rpc.getBalance(keypair.publicKey, "confirmed");
  report.steps.push({ action: "readiness", solLamports: balance });
  console.log(JSON.stringify({ wallet, cluster: "devnet", solLamports: balance, execute }));
  if (!execute) {
    console.log(
      "Read-only check finished. --execute-devnet explicitly enables test signatures and submission.",
    );
  } else {
    try {
      const pending = JSON.parse(await readFile(pendingFile, "utf8")) as Pending;
      await verify(pending);
    } catch (e) {
      if (e instanceof Error && e.message === "TEST_TRANSACTION_EXPIRED")
        await rename(pendingFile, `work/private/expired-pending-${Date.now()}.json`);
      else if (!(e && typeof e === "object" && "code" in e && e.code === "ENOENT")) throw e;
    }
    if (balance < 450000000) throw new Error("FUND_TEST_WALLET_WITH_AT_LEAST_0_45_DEVNET_SOL");
    for (const slot of [201, 202, 203] as const) {
      for (let stage = 0; stage < 2; stage++) {
        const check = await api<DemoCheck>("/api/demo", {
          wallet,
          action: "check",
          slot,
          portfolioProfile: true,
        });
        if (check.stage === "ready") break;
        if (check.stage === "closed") throw new Error("TEST_SLOT_CLOSED");
        const prepared = await api<DemoPrepared>("/api/demo", {
          wallet,
          action: "prepare",
          slot,
          portfolioProfile: true,
          depositAtomic: "100000000",
          borrowAtomic: check.profileBorrowAtomic,
        });
        if (prepared.stage === "deposit" && prepared.amountAtomic !== "100000000")
          throw new Error("DEPOSIT_EXCEEDS_TEST_CAP");
        if (
          prepared.stage === "borrow" &&
          (!check.profileBorrowAtomic ||
            BigInt(prepared.amountAtomic) > BigInt(check.profileBorrowAtomic))
        )
          throw new Error("BORROW_EXCEEDS_REVIEWED_CAP");
        const signed = sign(prepared),
          pending: Pending = {
            kind: "demo",
            wallet,
            token: prepared.token,
            signature: signed.signature,
          };
        await writeFile(pendingFile, JSON.stringify(pending), { mode: 0o600 });
        await api("/api/demo", {
          wallet,
          action: "submit",
          token: prepared.token,
          transaction: signed.transaction,
        });
        await verify(pending);
        report.steps.push({
          action: prepared.stage,
          slot,
          position: prepared.position,
          amountAtomic: prepared.amountAtomic,
          feeLamports: prepared.feeLamports,
          signature: signed.signature,
        });
        console.log(JSON.stringify(report.steps.at(-1)));
      }
    }
    const before = await api<{ positions: PositionSnapshot[] }>("/api/portfolio/read", { wallet });
    if (before.positions.length !== 3) throw new Error("EXPECTED_THREE_TEST_POSITIONS");
    const plan = await api<{ token: string; plan: { totalRepayAtomic: string } }>("/api/plans", {
      wallet,
      positions: before.positions.map((s) => s.position),
      goal: {
        budgetAtomic: before.positions[0].walletDebtAtomic,
        reserveAtomic: "1000000",
        shockBps: 3000,
        bufferBps: 500,
      },
    });
    const budget = BigInt(before.positions[0].walletDebtAtomic),
      reserve = 1000000n;
    let paid = 0n;
    for (let step = 0; step < 3; step++) {
      const state = await api<{ phase: string }>("/api/plans/status", { token: plan.token });
      if (state.phase === "verified") break;
      if (state.phase !== "ready") throw new Error("PLAN_NOT_READY");
      const prepared = await api<{
        transaction: string;
        expiresAt: number;
        feeLamports: string;
        token: string;
        repayAtomic: string;
        reviewRequired: boolean;
        plan: { totalRepayAtomic: string; walletAfterAtomic: string };
      }>("/api/plans/prepare", { token: plan.token });
      if (
        BigInt(prepared.plan.totalRepayAtomic) > budget ||
        BigInt(prepared.plan.walletAfterAtomic) < reserve ||
        paid + BigInt(prepared.repayAtomic) > budget - reserve
      )
        throw new Error("UPDATED_PLAN_EXCEEDS_TEST_CAP");
      if (prepared.reviewRequired)
        report.steps.push({
          action: "review_updated_quote",
          totalRepayAtomic: prepared.plan.totalRepayAtomic,
          walletAfterAtomic: prepared.plan.walletAfterAtomic,
        });
      const signed = sign(prepared),
        pending: Pending = { kind: "plan", wallet, token: plan.token };
      await writeFile(pendingFile, JSON.stringify(pending), { mode: 0o600 });
      await api("/api/plans/submit", {
        token: plan.token,
        bindingToken: prepared.token,
        transaction: signed.transaction,
        reviewAccepted: true,
      });
      await verify(pending);
      paid += BigInt(prepared.repayAtomic);
      report.steps.push({
        action: "repay",
        repayAtomic: prepared.repayAtomic,
        signature: signed.signature,
      });
      console.log(JSON.stringify(report.steps.at(-1)));
    }
    const final = await api<{ phase: string }>("/api/plans/status", { token: plan.token });
    if (final.phase !== "verified") throw new Error("PLAN_NOT_COMPLETE");
    const after = await api<{ positions: PositionSnapshot[] }>("/api/portfolio/read", { wallet });
    report.steps.push({
      action: "portfolio_after",
      positions: after.positions.map((s) => ({
        position: s.position,
        debtAtomic: s.debt.amountAtomic,
        walletDebtAtomic: s.walletDebtAtomic,
      })),
    });
  }
} catch (e) {
  report.steps.push({ action: "stopped", reason: e instanceof Error ? e.message : "UNKNOWN" });
  console.error(JSON.stringify(report.steps.at(-1)));
  process.exitCode = 1;
} finally {
  await writeFile("work/automated-devnet-report.json", JSON.stringify(report, null, 2));
}
