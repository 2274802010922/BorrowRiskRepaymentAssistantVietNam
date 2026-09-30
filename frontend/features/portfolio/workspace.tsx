"use client";
import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import Link from "next/link";
import { WorkspaceShell } from "../../components/layout/shell";
import { PageHeading, Notice, ContentSkeleton } from "../../components/feedback/states";
import { PreviewExpiry } from "../../components/feedback/preview-expiry";
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
type Prepared = {
  token: string;
  transaction: string;
  expiresAt: number;
  repayAtomic: string;
  feeLamports: string;
  step: number;
  total: number;
  lastValidBlockHeight: number;
};
type Session = {
  token: string;
  plan: GoalPlan;
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
  const plan = session?.plan ?? calculated,
    shown = session?.portfolio.positions ?? portfolio.positions;
  const locked = Boolean(session) || busy;
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
        const r = await postApi<Omit<Session, "goal" | "pending">>("/api/plans", {
          wallet,
          positions: selected,
          goal,
        });
        s = { ...r, goal, pending: false };
        persist(wallet, s);
        setSession(s);
      }
      const p = await postApi<Prepared>("/api/plans/prepare", { token: s.token });
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
    setBusy(true);
    setError(null);
    try {
      if (Date.now() >= prepared.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const { VersionedTransaction } = await import("@solana/web3.js"),
        tx = VersionedTransaction.deserialize(Buffer.from(prepared.transaction, "base64")),
        before = tx.message.serialize();
      if (provider.publicKey?.toBase58() !== wallet) throw new Error("TRANSACTION_CHANGED");
      const signed = await provider.signTransaction(tx),
        after = signed.message.serialize();
      if (
        provider.publicKey?.toBase58() !== wallet ||
        before.length !== after.length ||
        before.some((b, i) => b !== after[i])
      )
        throw new Error("TRANSACTION_CHANGED");
      if (Date.now() >= prepared.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const pending = {
        ...session,
        pending: true,
        pendingReceipt: {
          signature: bs58.encode(signed.signatures[0]),
          bindingToken: prepared.token,
          position: prepared.step > 0 ? session.plan.steps[prepared.step - 1].position : "",
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
                {t("Chưa có khoản vay được hỗ trợ.", "No supported loans found.")}{" "}
                <Link href="/setup">{t("Thiết lập demo", "Set up a demo")}</Link>
              </p>
            ) : (
              positions.map((s, i) => (
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
                    <strong>
                      {t("Khoản vay", "Loan")} {i + 1}
                    </strong>
                    <small className="goal-address">{s.position}</small>
                  </span>
                  <span>
                    {amount(s.debt.amountAtomic)} {s.debt.symbol}
                  </span>
                </label>
              ))
            )}
          </section>
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
            <div className="goal-fields">
              <label>
                {t("Tiền muốn giữ lại (USDC)", "Keep in wallet (USDC)")}
                <input
                  value={reserve}
                  disabled={locked}
                  inputMode="decimal"
                  onChange={(e) => setReserve(e.target.value)}
                />
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
          {plan && (
            <section className="panel goal-section">
              <h2>{t("3. Phương án của bạn", "3. Your plan")}</h2>
              <p className="goal-total">{amount(plan.requiredAtomic)} USDC</p>
              <p>
                {t(
                  "Tổng cần trả để các khoản đã chọn đạt mục tiêu.",
                  "Total repayment needed for your selected loans to meet the goal.",
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
                    "Chưa đề xuất chia tiền trả một phần vì mô hình tổn thất thanh lý chưa được kiểm chứng.",
                    "Partial allocations are unavailable until the liquidation loss model is verified.",
                  )}
                </Notice>
              ) : (
                <Notice tone="success" title={t("Có thể đạt mục tiêu", "The goal is achievable")}>
                  {t("Sau khi trả, còn", "After repayment, you keep")}{" "}
                  {amount(plan.walletAfterAtomic)} USDC {t("trong ví.", "in your wallet.")}
                </Notice>
              )}
              <div className="goal-results">
                {plan.steps.map((step) => {
                  const i = shown.findIndex((s) => s.position === step.position);
                  return (
                    <div className="goal-result" key={step.position}>
                      <strong>
                        {t("Khoản vay", "Loan")} {i + 1}
                      </strong>
                      <span>
                        {t("Trả", "Repay")} {amount(step.repayAtomic)} USDC
                      </span>
                      <span>
                        {t("Dư địa sau trả", "Buffer after repayment")}:{" "}
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
              {wallet && plan.state === "achievable" && (
                <div className="goal-actions">
                  {!session?.pending &&
                    status?.phase !== "verified" &&
                    status?.phase !== "failed" && (
                      <button
                        className="button"
                        disabled={busy || shown.some((s) => s.warnings.includes("STALE_DATA"))}
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
                      <button className="button" disabled={busy} onClick={() => void sign()}>
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
                      ? t("Đã xác minh toàn bộ bước trả nợ", "All repayments verified")
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
            </section>
          )}
        </>
      )}
      <details className="goal-section">
        <summary>{t("Nguồn dữ liệu và giới hạn", "Data and limitations")}</summary>
        <p>
          {t(
            "MVP: tối đa ba vị thế, một ví, cùng cặp SOL/USDC trên Kamino Devnet. Dư địa được tính từ giá đã giảm trong kịch bản. Mô hình allocator theo tổn thất đang tắt vì chưa hoàn tất kiểm chứng protocol.",
            "MVP: up to three positions, one wallet, one SOL/USDC pair on Kamino Devnet. Buffer is measured from the stressed price. Loss-based allocation is disabled pending protocol verification.",
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
