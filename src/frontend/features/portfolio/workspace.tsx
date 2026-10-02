"use client";
import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import Link from "next/link";
import { WorkspaceShell } from "../../components/layout/shell";
import { PageHeading, Notice, ContentSkeleton } from "../../components/feedback/states";
import { PreviewExpiry } from "../../components/feedback/preview-expiry";
import { signingSnapshot, verifyWalletResult } from "../../lib/wallet-signing";
import { useLanguage } from "../../i18n/provider";
import { useWallet } from "../../components/wallet/provider";
import { postApi, errorMessage } from "../../lib/errors";
import { writeRecovery, pendingPhases } from "../../lib/transaction-state";
import { parseUsdcInput } from "../../../core/validation/amount-input";
import { planPortfolio } from "../../../core/repayment/portfolio";
import { examplePortfolio } from "../../../shared/examples/portfolio";
import { compactNumber, exactToken } from "../../../shared/format";
import type { PositionSnapshot, ExecutionRecord } from "../../../shared/types";
import type { GoalPlan, RepaymentGoal, PortfolioSnapshot } from "../../../shared/portfolio";
import { GoalDraft, PortfolioExplanation } from "./assistance";
import { AllocationControls, AllocationDetails } from "./allocation";
import type { AllocationQuote, PortfolioPlan } from "../../../shared/allocation";
type Prepared = {
  token: string;
  transaction: string;
  expiresAt: number;
  repayAtomic: string;
  feeLamports: string;
  step: number;
  total: number;
  lastValidBlockHeight: number;
  plan: PortfolioPlan;
  position?: string;
  portfolio: PortfolioSnapshot;
  reviewRequired: boolean;
};
type Session = {
  token: string;
  plan: PortfolioPlan;
  portfolio: PortfolioSnapshot;
  goal: RepaymentGoal;
  expiresAt: number;
  pending: boolean;
  pendingReceipt?: {
    signature: string;
    bindingToken: string;
    position: string;
    repayAtomic: string;
  };
};
type Status = {
  phase: string;
  reason?: string;
  cursor: number;
  receipts: { signature: string; position: string; repayAtomic: string }[];
};
const storageKey = (wallet: string) => `picachu-goal-plan:${wallet}`;
function persist(wallet: string, s: Session) {
  try {
    localStorage.setItem(storageKey(wallet), JSON.stringify(s));
  } catch {
    throw new Error("STORAGE_UNAVAILABLE");
  }
}
function saveReceiptBackup(record: ExecutionRecord) {
  const key = "borrowrisk-devnet-executions",
    records = JSON.parse(localStorage.getItem(key) ?? "[]") as ExecutionRecord[];
  if (!Array.isArray(records)) throw new Error("STORAGE_UNAVAILABLE");
  const all = [record, ...records.filter((r) => r.signature !== record.signature)];
  writeRecovery(key, [
    ...all.filter((r) => pendingPhases.includes(r.phase)),
    ...all.filter((r) => !pendingPhases.includes(r.phase)).slice(0, 30),
  ]);
}
export function PortfolioWorkspace() {
  const w = useWallet();
  return (
    <WorkspaceShell>
      <Content key={w.wallet ?? "guest"} wallet={w.wallet} />
    </WorkspaceShell>
  );
}
function Content({ wallet }: { wallet: string | null }) {
  const { t, locale } = useLanguage(),
    w = useWallet();
  const [positions, setPositions] = useState<PositionSnapshot[]>(
    wallet ? [] : examplePortfolio().positions,
  );
  const [selected, setSelected] = useState<string[]>(
    wallet ? [] : examplePortfolio().positions.map((s) => s.position),
  );
  const [loading, setLoading] = useState(Boolean(wallet)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState("30"),
    [reserve, setReserve] = useState("20"),
    [shock, setShock] = useState("30"),
    [buffer, setBuffer] = useState("5");
  const [session, setSession] = useState<Session | null>(null),
    [prepared, setPrepared] = useState<Prepared | null>(null),
    [status, setStatus] = useState<Status | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [allocationResult, setAllocationResult] = useState<{
    key: string;
    quote: AllocationQuote;
  } | null>(null);
  const [acceptedPartial, setAcceptedPartial] = useState(false);
  const [afterPlan, setAfterPlan] = useState<GoalPlan | null>(null);
  const [afterError, setAfterError] = useState(false);
  const [afterInfo, setAfterInfo] = useState<{ balance: string; observedAt: string } | null>(null);
  const amount = (s: string) => exactToken(s, 6, locale),
    number = (s: string) => compactNumber(s, locale, 2);
  const goal = useMemo<RepaymentGoal | null>(() => {
    const b = parseUsdcInput(budget),
      r = parseUsdcInput(reserve),
      s = Number(shock),
      m = Number(buffer);
    return /^\d+(\.\d{1,2})?$/.test(shock) &&
      /^\d+(\.\d{1,2})?$/.test(buffer) &&
      b !== null &&
      r !== null &&
      Number.isFinite(s) &&
      s >= 0 &&
      s <= 90 &&
      Number.isFinite(m) &&
      m >= 0.01 &&
      m <= 50
      ? {
          budgetAtomic: b.toString(),
          reserveAtomic: r.toString(),
          shockBps: Math.round(s * 100),
          bufferBps: Math.round(m * 100),
        }
      : null;
  }, [budget, reserve, shock, buffer]);
  const portfolio = useMemo<PortfolioSnapshot>(
    () => ({ version: 1, positions: positions.filter((s) => selected.includes(s.position)) }),
    [positions, selected],
  );
  const calculated = useMemo(() => {
    try {
      return goal && portfolio.positions.length ? planPortfolio(portfolio, goal) : null;
    } catch {
      return null;
    }
  }, [portfolio, goal]);
  const allocationKey = JSON.stringify({ wallet, selected, goal, portfolio });
  const allocation = allocationResult?.key === allocationKey ? allocationResult.quote : null;
  const plan = session?.plan ?? (allocation?.state === "ready" ? allocation.plan : calculated),
    shown =
      session?.portfolio.positions ??
      (allocation?.state === "ready" ? allocation.portfolio.positions : portfolio.positions);
  const locked = Boolean(session) || busy;
  const balance = portfolio.positions[0]?.walletDebtAtomic ?? "0";
  const label = (s: PositionSnapshot) =>
    s.position.startsWith("example-")
      ? t(
          `Khoản ${s.position.slice(-1).toUpperCase()}`,
          `Loan ${s.position.slice(-1).toUpperCase()}`,
        )
      : `${s.collateral.symbol}/${s.debt.symbol} · ${s.position.slice(0, 6)}…${s.position.slice(-4)}`;
  function applyGoal(g: RepaymentGoal) {
    setBudget(exactToken(g.budgetAtomic, 6, "en").replaceAll(",", ""));
    setReserve(exactToken(g.reserveAtomic, 6, "en").replaceAll(",", ""));
    setShock(String(g.shockBps / 100));
    setBuffer(String(g.bufferBps / 100));
    setError(null);
  }
  async function refresh() {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      const r = await postApi<{ positions: PositionSnapshot[] }>("/api/portfolio/read", { wallet });
      setPositions(r.positions);
      setSelected((prev) => {
        const kept = prev.filter((id) => r.positions.some((s) => s.position === id));
        return kept.length ? kept : r.positions.slice(0, 3).map((s) => s.position);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "RPC_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!wallet) return;
    let active = true;
    void postApi<{ positions: PositionSnapshot[] }>("/api/portfolio/read", { wallet })
      .then((r) => {
        if (active) {
          setPositions(r.positions);
          setSelected(r.positions.slice(0, 3).map((s) => s.position));
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "RPC_UNAVAILABLE");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const restoreTimer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey(wallet));
        if (raw) {
          const s = JSON.parse(raw) as Session;
          if (s.portfolio.positions.every((p) => p.wallet === wallet) && s.token && s.goal) {
            setSession(s);
            setBudget(exactToken(s.goal.budgetAtomic, 6, "en").replaceAll(",", ""));
            setReserve(exactToken(s.goal.reserveAtomic, 6, "en").replaceAll(",", ""));
            setShock(String(s.goal.shockBps / 100));
            setBuffer(String(s.goal.bufferBps / 100));
          }
        }
      } catch {
        /* A corrupt cache cannot authorize any server action. */
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(restoreTimer);
    };
  }, [wallet]);
  async function checkStatus() {
    if (!session || !wallet) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postApi<Status>("/api/plans/status", { token: session.token });
      setStatus(r);
      const next = { ...session, pending: !["ready", "verified", "failed"].includes(r.phase) };
      persist(wallet, next);
      setSession(next);
      if (r.phase === "ready" || r.phase === "verified") await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "RPC_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!session || status) return;
    const timer = setTimeout(() => void checkStatus(), 0);
    return () => clearTimeout(timer);
    // Initial recovery makes no signing request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);
  useEffect(() => {
    if (status?.phase !== "verified" || !session || !wallet) return;
    let active = true;
    void postApi<{ positions: PositionSnapshot[] }>("/api/portfolio/read", { wallet })
      .then((r) => {
        if (!active) return;
        const snapshots = session.portfolio.positions.map((s) =>
          r.positions.find((p) => p.position === s.position),
        );
        if (snapshots.some((s) => !s || s.warnings.includes("STALE_DATA")))
          throw new Error("STALE_DATA");
        const fresh = planPortfolio(
          { version: 1, positions: snapshots.filter((s) => s !== undefined) },
          session.goal,
        );
        setPositions(r.positions);
        setAfterPlan(fresh);
        setAfterInfo({
          balance: snapshots[0]!.walletDebtAtomic,
          observedAt: snapshots[0]!.observedAt,
        });
        setAfterError(false);
      })
      .catch(() => {
        if (active) setAfterError(true);
      });
    return () => {
      active = false;
    };
    // A completed receipt is immutable; this fresh goal check does not send anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.phase, session?.token, wallet]);
  useEffect(() => {
    if (!session?.pending || !wallet) return;
    let active = true,
      attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!active || attempt++ >= 8) return;
      try {
        const r = await postApi<Status>("/api/plans/status", { token: session.token });
        if (!active) return;
        setStatus(r);
        if (["ready", "verified", "failed"].includes(r.phase)) {
          const next = { ...session, pending: false };
          persist(wallet, next);
          setSession(next);
          return;
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "RPC_UNAVAILABLE");
      }
      if (active) timer = setTimeout(() => void poll(), Math.min(15000, 2000 * 2 ** attempt));
    };
    timer = setTimeout(() => void poll(), 2000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // One bounded polling run for each pending step, with manual recovery afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, session?.pending, wallet]);
  async function prepare() {
    if (!wallet || !goal || !calculated || busy) return;
    setBusy(true);
    setError(null);
    try {
      let s = session;
      if (!s) {
        const partial =
          allocation?.state === "ready" && allocation.plan.state === "partial_available";
        if (partial && (!acceptedPartial || !allocation.executionAllowed || !allocation.token))
          throw new Error("ALLOCATION_REVIEW_REQUIRED");
        const r = await postApi<Omit<Session, "goal" | "pending">>("/api/plans", {
          wallet,
          positions: selected,
          goal,
          ...(partial
            ? { mode: "loss-allocation-v1", quoteToken: allocation.token, acceptedPartial: true }
            : {}),
        });
        s = { ...r, goal, pending: false };
        persist(wallet, s);
        setSession(s);
      }
      const p = await postApi<Prepared>("/api/plans/prepare", { token: s.token });
      const updated = { ...s, plan: p.plan, portfolio: p.portfolio };
      persist(wallet, updated);
      setSession(updated);
      setReviewed(false);
      setPrepared(p);
      setStatus((prev) => prev ?? { phase: "ready", cursor: 0, receipts: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "RPC_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    const provider = w.provider();
    if (!wallet || !session || !prepared || busy || !provider) return;
    if (prepared.reviewRequired && !reviewed) return;
    setBusy(true);
    setError(null);
    try {
      if (Date.now() >= prepared.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const { VersionedTransaction } = await import("@solana/web3.js"),
        tx = VersionedTransaction.deserialize(Buffer.from(prepared.transaction, "base64")),
        before = signingSnapshot(tx);
      if (provider.publicKey?.toBase58() !== wallet) throw new Error("TRANSACTION_CHANGED");
      const signed = await provider.signTransaction(tx);
      verifyWalletResult(before, signed, wallet, provider.publicKey?.toBase58(), "portfolio");
      if (Date.now() >= prepared.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const pending = {
        ...session,
        pending: true,
        pendingReceipt: {
          signature: bs58.encode(signed.signatures[0]),
          bindingToken: prepared.token,
          position:
            prepared.position ??
            (prepared.step > 0 ? session.plan.steps[prepared.step - 1].position : ""),
          repayAtomic: prepared.repayAtomic,
        },
      };
      const beforeSnapshot = session.portfolio.positions.find(
        (s) => s.position === pending.pendingReceipt.position,
      )!;
      saveReceiptBackup({
        signature: pending.pendingReceipt.signature,
        wallet,
        position: beforeSnapshot.position,
        protocol: beforeSnapshot.protocol,
        repayAtomic: prepared.repayAtomic,
        debtBeforeAtomic: beforeSnapshot.debt.amountAtomic,
        reserveAtomic: session.goal.reserveAtomic,
        lastValidBlockHeight: prepared.lastValidBlockHeight,
        createdAt: new Date().toISOString(),
        phase: "confirmation_unknown",
        bindingToken: prepared.token,
      });
      persist(wallet, pending);
      setSession(pending);
      setPrepared(null);
      setStatus({
        phase: "confirmation_unknown",
        cursor: prepared.step - 1,
        receipts: status?.receipts ?? [],
      });
      await postApi("/api/plans/submit", {
        token: session.token,
        bindingToken: prepared.token,
        transaction: Buffer.from(signed.serialize()).toString("base64"),
        reviewAccepted: reviewed,
      });
      const r = await postApi<Status>("/api/plans/status", { token: session.token });
      setStatus(r);
      const next = { ...pending, pending: !["ready", "verified", "failed"].includes(r.phase) };
      persist(wallet, next);
      setSession(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "WALLET_REJECTED");
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!wallet || !session || session.pending || busy) return;
    setBusy(true);
    try {
      await postApi("/api/plans/cancel", { token: session.token });
      localStorage.removeItem(storageKey(wallet));
      setSession(null);
      setPrepared(null);
      setStatus(null);
      setAfterPlan(null);
      setAfterError(false);
      setAfterInfo(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "PLAN_PENDING");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        index={t("LẬP PHƯƠNG ÁN TRẢ NỢ", "REPAYMENT PLANNER")}
        title={t("Trả bao nhiêu để đạt mục tiêu?", "How much meets your goal?")}
        description={t(
          "Chọn khoản vay, giữ lại tiền cần dùng, rồi xem số tiền cần trả.",
          "Choose your loans, keep a cash reserve, and see the repayment needed.",
        )}
      />
      {!wallet && (
        <Notice
          tone="info"
          title={t("Ví dụ minh họa · không phải khoản vay thật", "Example · not real loans")}
        >
          {t(
            "Ba khoản vay giả định. Kết nối ví để đọc khoản vay Devnet của bạn.",
            "Three synthetic positions. Connect your wallet to read your Devnet loans.",
          )}
        </Notice>
      )}
      {error && (
        <Notice tone="danger" title={t("Chưa thể tiếp tục", "Unable to continue")}>
          {errorMessage(error, locale)}
        </Notice>
      )}
      {loading ? (
        <ContentSkeleton />
      ) : (
        <>
          <section className="panel goal-section">
            <div className="section-heading">
              <h2>{t("1. Chọn khoản vay", "1. Choose loans")}</h2>
              {wallet && (
                <button
                  className="button secondary"
                  disabled={locked}
                  onClick={() => void refresh()}
                >
                  {t("Làm mới", "Refresh")}
                </button>
              )}
            </div>
            {!positions.length ? (
              <p>
                {error
                  ? t(
                      "Chưa đọc được khoản vay. Hãy làm mới để thử lại.",
                      "Loans could not be read. Refresh to retry.",
                    )
                  : t("Chưa có khoản vay được hỗ trợ.", "No supported loans found.")}{" "}
                {!error && <Link href="/setup">{t("Thiết lập demo", "Set up a demo")}</Link>}
              </p>
            ) : (
              positions.map((s) => (
                <label key={s.position} className="goal-position">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.position)}
                    disabled={locked || (!selected.includes(s.position) && selected.length >= 3)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, s.position]
                          : selected.filter((id) => id !== s.position),
                      )
                    }
                  />
                  <span>
                    <strong>{label(s)}</strong>
                    <small className="goal-address">
                      {s.position.startsWith("example-")
                        ? s.position
                        : `${s.position.slice(0, 8)}…${s.position.slice(-6)}`}
                    </small>
                  </span>
                  <span>
                    {amount(s.debt.amountAtomic)} {s.debt.symbol}
                  </span>
                </label>
              ))
            )}
          </section>
          {positions.length > 0 && (
            <details className="goal-section">
              <summary>{t("Địa chỉ đầy đủ của các khoản", "Full position addresses")}</summary>
              {positions.map((s) => (
                <p key={s.position} className="goal-address">
                  <strong>{label(s)}</strong>
                  <br />
                  {s.position}
                </p>
              ))}
            </details>
          )}
          {!selected.length && positions.length > 0 && (
            <Notice title={t("Chọn ít nhất một khoản vay", "Choose at least one loan")}>
              {t(
                "Có thể chọn tối đa ba khoản để lập phương án.",
                "Select up to three loans to create a plan.",
              )}
            </Notice>
          )}
          {goal && selected.length > 0 && !calculated && !session && (
            <Notice
              tone="danger"
              title={t("Chưa tính được phương án", "Plan could not be calculated")}
            >
              {t(
                "Dữ liệu các khoản vay không nhất quán hoặc ngoài phạm vi hỗ trợ. Làm mới để kiểm tra lại.",
                "Loan data is inconsistent or unsupported. Refresh to check again.",
              )}
            </Notice>
          )}
          <section className="panel goal-section">
            <h2>{t("2. Đặt mục tiêu", "2. Set your goal")}</h2>
            <p>
              {t("Số dư chung", "Shared wallet balance")}: <strong>{amount(balance)} USDC</strong>
              {calculated && (
                <>
                  {" "}
                  · {t("Có thể dùng", "Available")}:{" "}
                  <strong>{amount(calculated.spendableAtomic)} USDC</strong>
                </>
              )}
            </p>
            {wallet && !locked && positions.length > 0 && (
              <div className="goal-demo-preset">
                <p className="muted">
                  {t(
                    "Mục tiêu demo: ngân sách bằng số dư, giữ tối đa 1 USDC, SOL giảm 30%, dư địa 5%.",
                    "Demo goal: budget equals balance, keep up to 1 USDC, SOL drops 30%, buffer 5%.",
                  )}
                </p>
                <button
                  className="button secondary"
                  onClick={() =>
                    applyGoal({
                      budgetAtomic: balance,
                      reserveAtomic: (BigInt(balance) > 1000000n
                        ? 1000000n
                        : BigInt(balance)
                      ).toString(),
                      shockBps: 3000,
                      bufferBps: 500,
                    })
                  }
                >
                  {t("Dùng mục tiêu demo", "Use demo goal")}
                </button>
              </div>
            )}
            <div className="goal-fields">
              <label>
                {t("Tiền muốn giữ lại (USDC)", "Keep in wallet (USDC)")}
                <input
                  value={reserve}
                  disabled={locked}
                  inputMode="decimal"
                  onChange={(e) => setReserve(e.target.value)}
                />
                {goal && BigInt(goal.reserveAtomic) > BigInt(balance) && (
                  <small className="field-warning">
                    {t(
                      "Tiền muốn giữ cao hơn số dư. Chưa có tiền khả dụng để trả nợ.",
                      "Reserve exceeds balance. No funds are available for repayment.",
                    )}
                  </small>
                )}
              </label>
              <label>
                {t("Trả tối đa (USDC)", "Maximum repayment (USDC)")}
                <input
                  value={budget}
                  disabled={locked}
                  inputMode="decimal"
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
              <label>
                {t("Nếu giá SOL giảm (%)", "If SOL price falls (%)")}
                <select
                  value={["10", "20", "30"].includes(shock) ? shock : "custom"}
                  disabled={locked}
                  onChange={(e) => setShock(e.target.value === "custom" ? "15" : e.target.value)}
                >
                  {["10", "20", "30"].map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                  <option value="custom">{t("Tùy chọn", "Custom")}</option>
                </select>
              </label>
            </div>
            {!["10", "20", "30"].includes(shock) && (
              <label className="setup-field">
                {t("Mức giảm tùy chọn (0–90%)", "Custom price drop (0–90%)")}
                <input
                  value={shock}
                  disabled={locked}
                  inputMode="decimal"
                  onChange={(e) => setShock(e.target.value)}
                />
              </label>
            )}
            <details>
              <summary>{t("Điều chỉnh mục tiêu", "Adjust goal")}</summary>
              <label>
                {t(
                  "Dư địa giảm giá thêm sau kịch bản (%)",
                  "Additional price buffer after the scenario (%)",
                )}
                <input
                  value={buffer}
                  disabled={locked}
                  inputMode="decimal"
                  onChange={(e) => setBuffer(e.target.value)}
                />
              </label>
            </details>
            <p>
              {t(
                `Sau khi giá giảm ${shock}%, mục tiêu là còn chịu được mức giảm thêm ${buffer}% trước ngưỡng thanh lý.`,
                `After a ${shock}% drop, the goal is another ${buffer}% price buffer before liquidation.`,
              )}
            </p>
            {!goal && (
              <Notice tone="danger" title={t("Kiểm tra số đã nhập", "Check your inputs")}>
                {t(
                  "Số tiền không âm, tối đa 6 chữ số thập phân; dư địa từ 0,01% đến 50%.",
                  "Amounts must be nonnegative with up to 6 decimals; buffer must be 0.01% to 50%.",
                )}
              </Notice>
            )}
          </section>
          {!session && <GoalDraft locked={locked} onApply={applyGoal} />}
          {plan && (
            <section className="panel goal-section">
              <h2>{t("3. Phương án của bạn", "3. Your plan")}</h2>
              <p className="goal-total">
                {amount(
                  status?.phase === "verified"
                    ? status.receipts.reduce((sum, r) => sum + BigInt(r.repayAtomic), 0n).toString()
                    : plan.version === "allocation-v1"
                      ? plan.totalRepayAtomic
                      : plan.requiredAtomic,
                )}{" "}
                USDC
              </p>
              <p>
                {t(
                  status?.phase === "verified"
                    ? "Tổng đã trả, đối chiếu từ biên nhận."
                    : plan.version === "allocation-v1"
                      ? "Tổng tiền phân bổ trong ngân sách; chưa đạt mọi mục tiêu."
                      : "Tổng cần trả để các khoản đã chọn đạt mục tiêu.",
                  status?.phase === "verified"
                    ? "Total repaid, verified from receipts."
                    : plan.version === "allocation-v1"
                      ? "Total allocated within budget; not all goals are met."
                      : "Total repayment needed for your selected loans to meet the goal.",
                )}
              </p>
              {plan.state === "already_met" ? (
                <Notice tone="success" title={t("Đã đạt mục tiêu", "Goal already met")}>
                  {t(
                    "Không cần trả thêm theo kịch bản này.",
                    "No additional repayment is needed for this scenario.",
                  )}
                </Notice>
              ) : plan.state === "insufficient_budget" ? (
                <Notice tone="warning" title={t("Chưa đủ ngân sách", "Budget is insufficient")}>
                  {t("Cần thêm", "You need another")} {amount(plan.shortfallAtomic)} USDC.{" "}
                  {t(
                    "Chưa đủ để đạt mọi mục tiêu. Bạn có thể xem cách phân bổ để cải thiện một phần hoặc điều chỉnh ngân sách.",
                    "The budget cannot meet every goal. Explore partial allocation or review the budget.",
                  )}
                </Notice>
              ) : plan.version === "allocation-v1" ? (
                <Notice
                  tone="warning"
                  title={
                    plan.state === "no_beneficial_allocation"
                      ? t("Chưa đề xuất trả thêm", "No further repayment proposed")
                      : t("Cải thiện một phần", "Partial improvement")
                  }
                >
                  {t("Sau khi trả, còn", "After repayment, you keep")}{" "}
                  {amount(plan.walletAfterAtomic)} USDC.{" "}
                  {t(
                    "Một số khoản vẫn chưa đạt dư địa mục tiêu.",
                    "Some loans still fall short of the target buffer.",
                  )}
                </Notice>
              ) : (
                <Notice tone="success" title={t("Có thể đạt mục tiêu", "The goal is achievable")}>
                  {t("Sau khi trả, còn", "After repayment, you keep")}{" "}
                  {amount(plan.walletAfterAtomic)} USDC {t("trong ví.", "in your wallet.")}
                </Notice>
              )}
              {!session && calculated?.state === "insufficient_budget" && goal && (
                <AllocationControls
                  key={allocationKey}
                  wallet={wallet}
                  positions={selected}
                  goal={goal}
                  quote={allocation}
                  disabled={busy}
                  onQuote={(quote) => {
                    setAllocationResult({ key: allocationKey, quote });
                    setAcceptedPartial(false);
                    setError(null);
                  }}
                />
              )}
              <div className="goal-results">
                {plan.steps.map((step) => {
                  const i = shown.findIndex((s) => s.position === step.position);
                  return (
                    <div className="goal-result" key={step.position}>
                      <strong>
                        {shown[i]
                          ? label(shown[i])
                          : `${step.position.slice(0, 6)}…${step.position.slice(-4)}`}
                      </strong>
                      <span>
                        {plan.state === "insufficient_budget" ? (
                          t("Chưa lập bước trả nợ", "No repayment step prepared")
                        ) : plan.version === "allocation-v1" && BigInt(step.repayAtomic) === 0n ? (
                          t(
                            "meetsGoal" in step && step.meetsGoal
                              ? "Không cần trả"
                              : "Chưa phân bổ",
                            "meetsGoal" in step && step.meetsGoal
                              ? "No repayment needed"
                              : "Not allocated",
                          )
                        ) : (
                          <>
                            {t(session ? "Theo phương án" : "Trả", session ? "Planned" : "Repay")}{" "}
                            {amount(step.repayAtomic)} USDC
                          </>
                        )}
                      </span>
                      {"meetsGoal" in step && (
                        <span>
                          {step.meetsGoal
                            ? t("Đạt mục tiêu", "Goal met")
                            : t("Chưa đạt mục tiêu", "Goal not met")}
                        </span>
                      )}
                      <span>
                        {t(
                          plan.state === "insufficient_budget"
                            ? "Dư địa hiện tại trong kịch bản"
                            : "Dư địa theo phương án",
                          plan.state === "insufficient_budget"
                            ? "Current scenario buffer"
                            : "Planned buffer",
                        )}
                        :{" "}
                        {step.bufferAfterPct === null
                          ? t("Đã hết nợ", "Debt free")
                          : `${number(step.bufferAfterPct)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="muted">
                {t(
                  "Ước tính theo giá và tham số hiện tại; lãi hoặc giá thay đổi sẽ cần lập lại phương án. Không bảo đảm tránh thanh lý.",
                  "Estimates use current prices and parameters. Interest or price changes require a new plan. Liquidation avoidance is not guaranteed.",
                )}
              </p>
              {plan.version === "allocation-v1" && (
                <AllocationDetails plan={plan} active={Boolean(session)} />
              )}
              {!session &&
                plan.version !== "allocation-v1" &&
                goal &&
                portfolio.positions.length > 0 && (
                  <PortfolioExplanation
                    key={JSON.stringify({ goal, locale, portfolio })}
                    portfolio={portfolio}
                    goal={goal}
                  />
                )}
              {wallet && (plan.state === "achievable" || plan.state === "partial_available") && (
                <div className="goal-actions">
                  {!session && plan.state === "partial_available" && (
                    <label className="allocation-accept">
                      <input
                        type="checkbox"
                        checked={acceptedPartial}
                        onChange={(e) => setAcceptedPartial(e.target.checked)}
                      />
                      {t(
                        "Tôi đã xem phân bổ và chấp nhận trả một phần; chưa đạt mọi mục tiêu.",
                        "I reviewed this partial repayment and accept that not all goals are met.",
                      )}
                    </label>
                  )}
                  {!session?.pending &&
                    status?.phase !== "verified" &&
                    status?.phase !== "failed" && (
                      <button
                        className="button"
                        disabled={
                          busy ||
                          (!session && plan.state === "partial_available" && !acceptedPartial) ||
                          shown.some((s) => s.warnings.includes("STALE_DATA"))
                        }
                        onClick={() => void prepare()}
                      >
                        {busy
                          ? t("Đang xử lý…", "Working…")
                          : t("Chuẩn bị bước trả nợ", "Prepare repayment step")}
                      </button>
                    )}
                  {prepared && (
                    <div className="goal-preview">
                      <p>
                        {t("Bước", "Step")} {prepared.step}/{prepared.total}:{" "}
                        {amount(prepared.repayAtomic)} USDC · {t("Phí", "Fee")}{" "}
                        {exactToken(prepared.feeLamports, 9, locale)} SOL
                      </p>
                      <PreviewExpiry expiresAt={prepared.expiresAt} />
                      {prepared.reviewRequired && (
                        <Notice title={t("Phương án vừa được cập nhật", "Plan updated")}>
                          <p>
                            {t(
                              "Giá hoặc lãi đã thay đổi. Xem lại số tiền trả và tiền còn lại trước khi ký.",
                              "Prices or interest changed. Review repayments and remaining funds before signing.",
                            )}
                          </p>
                          <label>
                            <input
                              type="checkbox"
                              checked={reviewed}
                              onChange={(e) => setReviewed(e.target.checked)}
                            />{" "}
                            {t("Tôi đã xem lại phương án mới", "I reviewed the updated plan")}
                          </label>
                        </Notice>
                      )}
                      <button
                        className="button"
                        disabled={busy || (prepared.reviewRequired && !reviewed)}
                        onClick={() => void sign()}
                      >
                        {t("Ký bằng ví", "Sign with wallet")}
                      </button>
                    </div>
                  )}
                  {session && (
                    <>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void checkStatus()}
                      >
                        {t("Kiểm tra kết quả", "Check result")}
                      </button>
                      {!session.pending && (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => void cancel()}
                        >
                          {t("Lập phương án mới", "Create a new plan")}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {status && (
                <Notice
                  tone={status.phase === "verified" ? "success" : "info"}
                  title={
                    status.phase === "verified"
                      ? plan.version === "allocation-v1"
                        ? t("Đã xác minh các bước trả nợ", "Repayments verified")
                        : t("Đã xác minh toàn bộ bước trả nợ", "All repayments verified")
                      : status.phase === "ready"
                        ? t("Có thể chuẩn bị bước tiếp theo", "Ready for the next step")
                        : status.phase === "failed"
                          ? t("Đã dừng kế hoạch", "Plan stopped")
                          : t(
                              "Đang chờ xác minh · chưa gửi bước tiếp theo",
                              "Awaiting verification · next step blocked",
                            )
                  }
                >
                  {status.reason && <p>{errorMessage(status.reason, locale)}</p>}
                  {status.receipts.map((r) => (
                    <p key={r.signature}>
                      <a
                        href={`https://explorer.solana.com/tx/${r.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("Biên nhận", "Receipt")}: {r.signature.slice(0, 8)}…
                      </a>{" "}
                      · {amount(r.repayAtomic)} USDC
                    </p>
                  ))}
                </Notice>
              )}
              {status?.phase === "verified" && (
                <Notice title={t("Mục tiêu theo dữ liệu mới", "Goal with fresh data")}>
                  {afterInfo && (
                    <p>
                      {t("Số dư đọc lại", "Refreshed balance")}: {amount(afterInfo.balance)} USDC ·{" "}
                      {new Date(afterInfo.observedAt).toLocaleString(
                        locale === "vi" ? "vi-VN" : "en-US",
                      )}
                    </p>
                  )}
                  {afterPlan ? (
                    afterPlan.state === "already_met" ? (
                      <p>
                        {t(
                          "Đã đạt mục tiêu tại lần đọc này. Giá và lãi có thể tiếp tục thay đổi.",
                          "Goal met at this reading. Prices and interest can still change.",
                        )}
                      </p>
                    ) : (
                      <p>
                        {t(
                          session?.plan.version === "allocation-v1"
                            ? "Phương án trả một phần đã được xác minh. Để đạt mọi mục tiêu, cần trả thêm"
                            : "Giá hoặc lãi đã đổi sau khi trả. Cần trả thêm",
                          session?.plan.version === "allocation-v1"
                            ? "Partial repayment was verified. To meet all goals, further repayment is needed:"
                            : "Prices or interest changed after repayment. Additional repayment needed:",
                        )}{" "}
                        {amount(afterPlan.requiredAtomic)} USDC.{" "}
                        {t(
                          "Chọn ‘Lập phương án mới’ để xem lại; chưa có giao dịch bổ sung nào được gửi.",
                          "Choose ‘Create a new plan’ to review; no additional transaction has been sent.",
                        )}
                      </p>
                    )
                  ) : (
                    <p>
                      {afterError
                        ? t(
                            "Chưa đọc được dữ liệu mới. Biên nhận đã xác minh; mục tiêu hiện tại chưa được xác nhận. Chọn ‘Lập phương án mới’ để thử lại.",
                            "Fresh data unavailable. Receipts are verified, but the current goal is unconfirmed. Choose ‘Create a new plan’ to retry.",
                          )
                        : t(
                            "Đang đọc dữ liệu mới để kiểm tra mục tiêu…",
                            "Reading fresh data to check the goal…",
                          )}
                    </p>
                  )}
                </Notice>
              )}
            </section>
          )}
        </>
      )}
      <details className="goal-section">
        <summary>{t("Nguồn dữ liệu và giới hạn", "Data and limitations")}</summary>
        <p>
          {t(
            "MVP: tối đa ba vị thế, một ví, cùng cặp SOL/USDC trên Kamino Devnet. Dư địa tính từ giá kịch bản. Phân bổ xét một lượt thanh lý, theo mô hình đã đối chiếu executable Devnet; phiên bản hoặc cấu hình không hỗ trợ sẽ chặn tính năng.",
            "MVP: up to three positions, one wallet, one SOL/USDC pair on Kamino Devnet. Buffer uses the scenario price. Allocation models one liquidation event and was compared with the Devnet executable; unsupported versions or configurations disable the feature.",
          )}
        </p>
        {positions.some((s) => s.warnings.includes("PRICE_DELAYED")) && (
          <p>
            {t(
              "Giá oracle đã hơn 5 phút; cần xem thời gian cập nhật trước khi ký.",
              "Oracle prices are over 5 minutes old; review timestamps before signing.",
            )}
          </p>
        )}
        {positions.map((s) => (
          <p key={s.position} className="goal-address">
            {s.position} · {s.priceObservedAt}
          </p>
        ))}
      </details>
    </>
  );
}
