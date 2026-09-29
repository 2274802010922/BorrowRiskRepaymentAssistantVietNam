"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Buffer } from "buffer";
import bs58 from "bs58";
import Link from "next/link";
import { compactNumber, exactToken } from "../../../shared/format";
import { previewKey, writeRecovery, pendingPhases } from "../../lib/transaction-state";
import { ExecutionReadiness } from "../../components/feedback/readiness";
import { PreviewExpiry } from "../../components/feedback/preview-expiry";
import { WorkspaceShell } from "../../components/layout/shell";
import {
  ContentSkeleton,
  Notice,
  PageHeading,
  StatusBadge,
} from "../../components/feedback/states";
import { useLanguage } from "../../i18n/provider";
import { useWallet } from "../../components/wallet/provider";
import { errorMessage, postApi } from "../../lib/errors";
import { planRepayment } from "../../../core/repayment/planner";
import { parseUsdcInput } from "../../../core/validation/amount-input";
import { exampleSnapshot } from "../../../tests/fixtures/position";
import { metrics, units } from "../../../core/risk/metrics";
import type {
  Constraints,
  ExecutionRecord,
  PositionSnapshot,
  RepaymentPlan,
} from "../../../shared/types";

type Prepared = {
  contextKey: string;
  token: string;
  transaction: string;
  messageHash: string;
  expiresAt: number;
  lastValidBlockHeight: number;
  feeLamports: string;
  repayAtomic: string;
  snapshot: PositionSnapshot;
};
const recordKey = "borrowrisk-devnet-executions";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(recordKey, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(recordKey, callback);
  };
}
function readRecords() {
  try {
    return window.localStorage.getItem(recordKey) || "[]";
  } catch {
    return "[]";
  }
}
function saveRecord(record: ExecutionRecord) {
  const records: ExecutionRecord[] = JSON.parse(readRecords());
  if (!Array.isArray(records)) throw new Error("STORAGE_UNAVAILABLE");
  const all = [record, ...records.filter((r) => r.signature !== record.signature)];
  writeRecovery(recordKey, [
    ...all.filter((r) => pendingPhases.includes(r.phase)),
    ...all.filter((r) => !pendingPhases.includes(r.phase)).slice(0, 30),
  ]);
}

export function Workspace() {
  const w = useWallet();
  return (
    <WorkspaceShell>
      <WorkspaceContent key={w.wallet ?? "guest"} wallet={w.wallet} />
    </WorkspaceShell>
  );
}
function WorkspaceContent({ wallet }: { wallet: string | null }) {
  const { t, locale } = useLanguage(),
    w = useWallet();
  const [source, setSource] = useState<"synthetic" | "devnet">(wallet ? "devnet" : "synthetic");
  const [snapshot, setSnapshot] = useState<PositionSnapshot | null>(
    wallet ? null : exampleSnapshot(),
  );
  const [positions, setPositions] = useState<PositionSnapshot[]>([]);
  const [loading, setLoading] = useState(Boolean(wallet)),
    [error, setError] = useState<string | null>(null);
  const [shock, setShock] = useState(20),
    [budget, setBudget] = useState("100"),
    [reserve, setReserve] = useState("50"),
    [target, setTarget] = useState("60");
  const [choice, setChoice] = useState(""),
    [prepared, setPrepared] = useState<Prepared | null>(null),
    [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "preparing" | "awaiting_signature" | "submitting">(
    "idle",
  );
  const [currentRecord, setCurrentRecord] = useState<ExecutionRecord | null>(null);
  const [verification, setVerification] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{
      text: string;
      contextKey?: string;
      lines?: string[];
      caution?: string;
      summary?: string;
      source: "template" | "model";
    } | null>(null),
    [explaining, setExplaining] = useState(false);
  const stored = useSyncExternalStore(subscribe, readRecords, () => "[]");
  const records = useMemo(() => {
    try {
      const rows: ExecutionRecord[] = JSON.parse(stored);
      return Array.isArray(rows)
        ? rows.filter((r) => r.wallet === wallet && typeof r.signature === "string")
        : [];
    } catch {
      return [];
    }
  }, [stored, wallet]);
  const shownRecords = useMemo(
    () =>
      currentRecord
        ? [currentRecord, ...records.filter((r) => r.signature !== currentRecord.signature)]
        : records,
    [currentRecord, records],
  );
  const format = (value: string, decimals = 2) => compactNumber(value, locale, decimals);
  const amount = (value: string) => exactToken(value, snapshot?.debt.decimals ?? 6, locale);
  const constraints = useMemo<Constraints | null>(() => {
    const b = parseUsdcInput(budget),
      r = parseUsdcInput(reserve),
      n = Number(target);
    if (b === null || r === null || !Number.isFinite(n) || n < 1 || n > 95) return null;
    return {
      budgetAtomic: b.toString(),
      reserveAtomic: r.toString(),
      shockBps: shock * 100,
      targetLtvBps: Math.round(n * 100),
    };
  }, [budget, reserve, target, shock]);
  const calculation = useMemo<{ plan: RepaymentPlan | null; error: string | null }>(() => {
    if (!snapshot || !constraints) return { plan: null, error: "INVALID_INPUT" };
    try {
      return { plan: planRepayment(snapshot, constraints), error: null };
    } catch (e) {
      return { plan: null, error: e instanceof Error ? e.message : "INVALID_INPUT" };
    }
  }, [snapshot, constraints]);
  const plan = calculation.plan;
  const displayed = useMemo(
    () =>
      snapshot ? { current: metrics(snapshot), stressed: metrics(snapshot, shock * 100) } : null,
    [snapshot, shock],
  );
  const selected = plan?.options.find((option) => option.id === choice) ?? plan?.options[0];
  const currentPreviewKey = previewKey(
    wallet,
    source,
    snapshot,
    constraints,
    selected?.repayAtomic,
  );
  const activePrepared = prepared?.contextKey === currentPreviewKey ? prepared : null;
  const requestVersion = useRef(0);
  const pollAttempts = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!wallet) return;
    let stopped = false;
    const version = requestVersion.current;
    void postApi<{ positions: PositionSnapshot[] }>("/api/positions/read", {
      wallet,
      position: new URLSearchParams(window.location.search).get("position") ?? undefined,
    })
      .then((result) => {
        if (stopped || version !== requestVersion.current) return;
        setPositions(result.positions);
        setSnapshot(result.positions[0] ?? null);
      })
      .catch((e) => {
        if (!stopped) setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [wallet]);
  useEffect(() => {
    if (busy) return;
    const record = shownRecords.find(
      (r) => pendingPhases.includes(r.phase) && (pollAttempts.current[r.signature] ?? 0) < 8,
    );
    if (!record) return;
    let stopped = false;
    const timer = setTimeout(
      () => {
        pollAttempts.current[record.signature] = (pollAttempts.current[record.signature] ?? 0) + 1;
        void postApi<{ phase: ExecutionRecord["phase"]; reason?: string }>(
          "/api/repayments/status",
          record,
        )
          .then((result) => {
            if (stopped) return;
            const updated = { ...record, phase: result.phase };
            setCurrentRecord(updated);
            saveRecord(updated);
            setVerification(result.reason ?? null);
          })
          .catch((e) => {
            if (!stopped) {
              setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
              setCurrentRecord({ ...record });
            }
          });
      },
      Math.min(15000, 2000 * 2 ** (pollAttempts.current[record.signature] ?? 0)),
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [busy, shownRecords]);
  const explanationKey = JSON.stringify({
    snapshot,
    constraints,
    repayAtomic: selected?.repayAtomic,
    locale,
  });
  const invalidate = () => {
    requestVersion.current++;
    setPrepared(null);
    setExplanation(null);
    setError(null);
  };
  async function load() {
    if (!wallet) {
      await w.connect();
      return;
    }
    setLoading(true);
    setError(null);
    setPrepared(null);
    const version = ++requestVersion.current;
    setSnapshot(null);
    setPositions([]);
    setSource("devnet");
    try {
      const result = await postApi<{ positions: PositionSnapshot[] }>("/api/positions/read", {
        wallet,
        position: new URLSearchParams(window.location.search).get("position") ?? undefined,
      });
      if (version !== requestVersion.current) return;
      setPositions(result.positions);
      setSnapshot(result.positions[0] ?? null);
      // Refresh never changes the user's spending, reserve or target choices.
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }
  async function prepare() {
    if (!wallet || !snapshot || !constraints || !selected || snapshot.source !== "devnet") return;
    setBusy(true);
    setPhase("preparing");
    setError(null);
    const version = requestVersion.current;
    try {
      const p = await postApi<Prepared>("/api/repayments/prepare", {
        wallet,
        position: snapshot.position,
        protocol: snapshot.protocol,
        constraints,
        repayAtomic: selected.repayAtomic,
      });
      if (version !== requestVersion.current) return;
      setSnapshot(p.snapshot);
      setPrepared({
        ...p,
        contextKey: previewKey(wallet, source, p.snapshot, constraints, selected.repayAtomic),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }
  async function checkRecord(record: ExecutionRecord) {
    setBusy(true);
    setError(null);
    try {
      const result = await postApi<{
        phase: ExecutionRecord["phase"];
        snapshot?: PositionSnapshot;
        reason?: string;
      }>("/api/repayments/status", record);
      const updated = { ...record, phase: result.phase };
      setCurrentRecord(updated);
      saveRecord(updated);
      setVerification(result.reason ?? null);
      if (
        result.snapshot &&
        source === "devnet" &&
        result.snapshot.wallet === wallet &&
        result.snapshot.position === snapshot?.position
      ) {
        setSnapshot(result.snapshot);
        invalidate();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    const p = activePrepared,
      provider = w.provider();
    if (!p || !provider || !wallet || !snapshot || !constraints || busy) return;
    setBusy(true);
    setPhase("awaiting_signature");
    setError(null);
    let record: ExecutionRecord | null = null;
    const version = requestVersion.current;
    try {
      if (Date.now() >= p.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const { VersionedTransaction } = await import("@solana/web3.js");
      const tx = VersionedTransaction.deserialize(Buffer.from(p.transaction, "base64"));
      const before = tx.message.serialize();
      const signed = await provider.signTransaction(tx);
      if (version !== requestVersion.current) throw new Error("PREVIEW_CHANGED");
      const after = signed.message.serialize();
      if (
        provider.publicKey?.toBase58() !== wallet ||
        before.length !== after.length ||
        before.some((b, i) => b !== after[i])
      )
        throw new Error("TRANSACTION_CHANGED");
      if (Date.now() >= p.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const signature = bs58.encode(signed.signatures[0]);
      record = {
        signature,
        wallet,
        position: snapshot.position,
        protocol: snapshot.protocol,
        repayAtomic: p.repayAtomic,
        debtBeforeAtomic: p.snapshot.debt.amountAtomic,
        reserveAtomic: constraints.reserveAtomic,
        lastValidBlockHeight: p.lastValidBlockHeight,
        createdAt: new Date().toISOString(),
        phase: "confirmation_unknown",
        bindingToken: p.token,
      };
      setCurrentRecord(record);
      try {
        saveRecord(record);
      } catch {
        record = null;
        setCurrentRecord(null);
        throw new Error("STORAGE_UNAVAILABLE");
      }
      setPhase("submitting");
      setPrepared(null);
      await postApi("/api/repayments/submit", {
        token: p.token,
        transaction: Buffer.from(signed.serialize()).toString("base64"),
      });
      record = { ...record, phase: "submitted" };
      setCurrentRecord(record);
      saveRecord(record);
    } catch (e) {
      if (!record)
        setError(
          e instanceof Error &&
            [
              "PREVIEW_EXPIRED",
              "TRANSACTION_CHANGED",
              "STORAGE_UNAVAILABLE",
              "PREVIEW_CHANGED",
            ].includes(e.message)
            ? e.message
            : "WALLET_REJECTED",
        );
      else {
        setCurrentRecord(record);
        try {
          saveRecord(record);
        } catch {
          setError("STORAGE_UNAVAILABLE");
        }
      }
    } finally {
      setBusy(false);
      setPhase("idle");
      setPrepared(null);
    }
    if (record) await checkRecord(record);
  }
  async function explain() {
    if (!snapshot || !constraints) return;
    setExplaining(true);
    try {
      setExplanation({
        ...(await postApi<{
          text: string;
          source: "template" | "model";
          lines?: string[];
          caution?: string;
          summary?: string;
        }>("/api/explanations", {
          snapshot,
          constraints,
          locale,
          repayAtomic: selected?.repayAtomic,
        })),
        contextKey: explanationKey,
      });
    } catch {
      setExplanation({
        source: "template",
        contextKey: explanationKey,
        text: t(
          "Giá tài sản thế chấp giảm sẽ làm tỷ lệ nợ tăng nếu khoản nợ giữ nguyên. Hãy xem cả số dư dự trữ và trạng thái sau trả nợ trong bảng trước khi lựa chọn.",
          "A lower collateral price increases the debt ratio when debt stays constant. Check both your reserve balance and the after-repayment scenario before choosing.",
        ),
      });
    } finally {
      setExplaining(false);
    }
  }
  const phaseText = (value: ExecutionRecord["phase"]) =>
    ({
      preview: t("Xem trước", "Preview"),
      awaiting_signature: t("Chờ ký", "Awaiting signature"),
      submitted: t("Đã gửi", "Submitted"),
      confirmation_unknown: t("Chưa rõ kết quả", "Confirmation unknown"),
      confirmed: t("Đã xác nhận", "Confirmed"),
      verification_pending: t("Đang đối chiếu", "Verification pending"),
      verified: t("Đã đối chiếu", "Verified"),
      failed: t("Giao dịch lỗi", "Failed"),
      rejected: t("Đã từ chối", "Rejected"),
      expired: t("Đã hết hạn", "Expired"),
    })[value];

  return (
    <>
      <PageHeading
        index={t("KHOẢN VAY / 01", "POSITIONS / 01")}
        title={t("Khoản vay trong tầm nhìn.", "Your loan, clearly.")}
        description={t(
          "Xem tác động của biến động giá và phương án phù hợp với số tiền bạn muốn giữ lại.",
          "Explore price changes and repayment options that respect the balance you want to keep.",
        )}
        action={<StatusBadge tone="info">Solana Devnet</StatusBadge>}
      />
      <ExecutionReadiness />
      <nav className="workspace-map" aria-label={t("Các bước xử lý khoản vay", "Loan workflow")}>
        <a href="#position">{t("01 · Khoản vay", "01 · Position")}</a>
        <a href="#scenario">{t("02 · Kịch bản", "02 · Scenario")}</a>
        <a href="#repayment">{t("03 · Phương án", "03 · Plan")}</a>
        <a href="#activity">{t("04 · Hoạt động", "04 · Activity")}</a>
      </nav>
      <div className="setup-entry">
        <span>{t("Chưa có khoản vay thử nghiệm?", "No test loan yet?")}</span>
        <Link href="/setup" className="text-link">
          {t("Thiết lập demo Devnet →", "Set up your Devnet demo →")}
        </Link>
      </div>
      <div className="toolbar">
        <div className="segmented" aria-label={t("Nguồn dữ liệu", "Data source")}>
          <button
            disabled={busy || loading}
            aria-pressed={source === "synthetic"}
            onClick={() => {
              setSource("synthetic");
              setSnapshot(exampleSnapshot());
              setPositions([]);
              setBudget("100");
              setReserve("50");
              invalidate();
            }}
          >
            {t("Dữ liệu minh họa", "Illustrative data")}
          </button>
          <button
            disabled={busy || loading}
            aria-pressed={source === "devnet"}
            onClick={() => void load()}
          >
            {t("Đọc ví của tôi", "Read my wallet")}
          </button>
        </div>
        {source === "devnet" && (
          <button
            className="button button-secondary"
            disabled={loading || busy}
            onClick={() => void load()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {t("Làm mới", "Refresh")}
          </button>
        )}
      </div>
      {source === "synthetic" && (
        <Notice title={t("Bạn đang xem dữ liệu minh họa", "You are viewing illustrative data")}>
          {t(
            "Các số liệu giả định dùng để khám phá sản phẩm. Không có giao dịch nào được tạo hoặc gửi từ chế độ này.",
            "These hypothetical values help you explore the product. This mode does not create or send transactions.",
          )}
        </Notice>
      )}
      {w.error && (
        <Notice tone="warning" title={t("Thông tin kết nối ví", "Wallet connection")}>
          {errorMessage(w.error, locale)}
        </Notice>
      )}
      {error && (
        <Notice
          tone="danger"
          title={t("Chưa thể hoàn thành thao tác", "The action could not be completed")}
        >
          {errorMessage(error, locale)}
        </Notice>
      )}
      {snapshot?.warnings.includes("STALE_DATA") && (
        <Notice tone="warning" title={t("Dữ liệu giá đã cũ", "Price data is stale")}>
          {t(
            "Các số dưới đây chỉ để tham khảo. Làm mới trước khi chuẩn bị giao dịch.",
            "These values are for inspection only. Refresh before preparing a transaction.",
          )}
        </Notice>
      )}
      {snapshot?.warnings.includes("PRICE_DELAYED") &&
        !snapshot.warnings.includes("STALE_DATA") && (
          <Notice
            tone="warning"
            title={t(
              "Giá chưa cập nhật trong 5 phút gần đây",
              "Price has not updated in the last 5 minutes",
            )}
          >
            {t(
              "Giá còn trong giới hạn của reserve Devnet. Thời điểm giá: ",
              "Price remains within the Devnet reserve limit. Price timestamp: ",
            )}
            {new Date(snapshot.priceObservedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}
          </Notice>
        )}
      {loading ? (
        <ContentSkeleton />
      ) : snapshot && displayed ? (
        <>
          {positions.length > 1 && (
            <label className="form-field">
              <span>{t("Chọn khoản vay", "Choose a position")}</span>
              <select
                disabled={busy}
                value={snapshot.position}
                onChange={(e) => {
                  setSnapshot(positions.find((s) => s.position === e.target.value) ?? null);
                  invalidate();
                }}
              >
                {positions.map((s) => (
                  <option key={s.position} value={s.position}>
                    {s.collateral.symbol}/{s.debt.symbol} · {s.position.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <section
            id="position"
            className="data-panel"
            aria-label={t("Vị thế hiện tại", "Current position")}
          >
            <div className="data-panel-header">
              <h2>
                {snapshot.collateral.symbol} / {snapshot.debt.symbol}
              </h2>
              <StatusBadge>
                {source === "synthetic"
                  ? t("Vị thế giả định", "Example position")
                  : snapshot.protocol === "kamino"
                    ? "Kamino · Devnet"
                    : t("Pool thử nghiệm picachu", "picachu test pool")}
              </StatusBadge>
            </div>
            <div className="metrics-row">
              <div className="metric">
                <span>{t("Tài sản thế chấp", "Collateral")}</span>
                <strong>
                  {format(displayed.current.collateralUsd)}
                  <small>USD</small>
                </strong>
              </div>
              <div className="metric">
                <span>{t("Khoản nợ", "Debt")}</span>
                <strong>
                  {amount(snapshot.debt.amountAtomic)}
                  <small>{snapshot.debt.symbol}</small>
                </strong>
              </div>
              <div className="metric">
                <span>{t("LTV hiện tại", "Current LTV")}</span>
                <strong>
                  {format(displayed.current.ltvPct)}
                  <small>%</small>
                </strong>
              </div>
            </div>
            <div className="detail-meta">
              <span>
                {t("NGƯỠNG THANH LÝ", "LIQUIDATION THRESHOLD")}:{" "}
                {snapshot.liquidationThresholdBps / 100}%
              </span>
              <span>
                {t("HỆ SỐ VAY", "BORROW FACTOR")}: {snapshot.borrowFactorBps / 10000}
              </span>
            </div>
            {source === "devnet" && (
              <details className="technical-details">
                <summary>{t("Nguồn và thời điểm đọc", "Source and observation time")}</summary>
                <p>
                  {new Date(snapshot.observedAt).toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US",
                  )}{" "}
                  · Slot {snapshot.slot}
                </p>
                <code>{snapshot.position}</code>
              </details>
            )}
          </section>
          <section className="section-rail" id="scenario">
            <p className="eyebrow">02 / {t("THỬ KỊCH BẢN", "EXPLORE A SCENARIO")}</p>
            <h2>{t("Nếu giá tài sản giảm thì sao?", "What if collateral prices fall?")}</h2>
            <p>
              {t(
                "Giả định giá token nợ giữ nguyên, chưa tính lãi phát sinh. Kịch bản không thay đổi vị thế trên chain.",
                "Debt-token price is held constant; additional interest is excluded. This scenario does not change on-chain state.",
              )}
            </p>
            <div className="two-column">
              <div>
                <label className="form-field" htmlFor="shock">
                  <span>
                    {t("Mức giảm giá tài sản thế chấp", "Collateral price decrease")}: {shock}%
                  </span>
                  <input
                    id="shock"
                    disabled={busy}
                    className="range-control"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={shock}
                    onChange={(e) => {
                      setShock(Number(e.target.value));
                      invalidate();
                    }}
                  />
                </label>
                <div className="preset-buttons">
                  {[0, 10, 20, 30].map((n) => (
                    <button
                      key={n}
                      disabled={busy}
                      aria-pressed={shock === n}
                      onClick={() => {
                        setShock(n);
                        invalidate();
                      }}
                    >
                      {n === 0 ? "0%" : `−${n}%`}
                    </button>
                  ))}
                </div>
              </div>
              <table className="comparison-table">
                <caption className="sr-only">
                  {t("Hiện tại và kịch bản", "Current and scenario comparison")}
                </caption>
                <thead>
                  <tr>
                    <th>{t("Chỉ số", "Metric")}</th>
                    <th>{t("Hiện tại", "Current")}</th>
                    <th>{t("Giả định", "Scenario")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t("Thế chấp", "Collateral")}</td>
                    <td>{format(displayed.current.collateralUsd)} USD</td>
                    <td>{format(displayed.stressed.collateralUsd)} USD</td>
                  </tr>
                  <tr>
                    <td>LTV</td>
                    <td>{format(displayed.current.ltvPct)}%</td>
                    <td>{format(displayed.stressed.ltvPct)}%</td>
                  </tr>
                  <tr>
                    <td>{t("Hệ số sức khỏe", "Health factor")}</td>
                    <td>
                      {displayed.current.healthFactor === null
                        ? "—"
                        : format(displayed.current.healthFactor)}
                    </td>
                    <td>
                      {displayed.stressed.healthFactor === null
                        ? "—"
                        : format(displayed.stressed.healthFactor)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        !loading &&
        !error && (
          <div className="empty-state">
            <h2>{t("Chưa có khoản vay để hiển thị", "No position to display")}</h2>
            <p>
              {t(
                "Kết nối ví có vị thế được hỗ trợ hoặc thử với dữ liệu minh họa.",
                "Connect a wallet with a supported position or explore illustrative data.",
              )}
            </p>
          </div>
        )
      )}
      {snapshot && (
        <section className="section-rail" id="repayment">
          <p className="eyebrow">03 / {t("CÂN ĐỐI KHẢ NĂNG", "SET YOUR LIMITS")}</p>
          <h2>{t("Trả nợ trong giới hạn của bạn.", "Repay within your limits.")}</h2>
          <p>
            {t(
              "Chọn số tiền có thể dùng và khoản muốn giữ. Bạn luôn là người quyết định phương án.",
              "Choose what you can spend and what you want to keep. You decide which option to use.",
            )}
          </p>
          <div className="two-column">
            <div className="data-panel">
              <label className="form-field" htmlFor="budget">
                <span>
                  {t("Ngân sách tối đa", "Maximum budget")} ({snapshot.debt.symbol})
                </span>
                <input
                  id="budget"
                  disabled={busy}
                  inputMode="decimal"
                  value={budget}
                  aria-invalid={parseUsdcInput(budget) === null}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    invalidate();
                  }}
                />
                <small>
                  {t(
                    "Dùng dấu chấm cho phần thập phân, tối đa 6 chữ số.",
                    "Use a decimal point, with up to 6 decimal places.",
                  )}
                </small>
              </label>
              <label className="form-field" htmlFor="reserve">
                <span>
                  {t("Tiền muốn giữ lại", "Reserve to keep")} ({snapshot.debt.symbol})
                </span>
                <input
                  id="reserve"
                  disabled={busy}
                  inputMode="decimal"
                  value={reserve}
                  aria-invalid={parseUsdcInput(reserve) === null}
                  onChange={(e) => {
                    setReserve(e.target.value);
                    invalidate();
                  }}
                />
                <small>
                  {t("Số dư token nợ trong ví", "Debt-token wallet balance")}:{" "}
                  {amount(snapshot.walletDebtAtomic)} {snapshot.debt.symbol}
                </small>
              </label>
              <label className="form-field" htmlFor="target">
                <span>{t("Mục tiêu LTV sau kịch bản", "Target LTV after the scenario")} (%)</span>
                <input
                  id="target"
                  disabled={busy}
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    invalidate();
                  }}
                />
                <small>
                  {t(
                    "Đây là mục tiêu bạn chọn, không phải mức bảo đảm an toàn.",
                    "This is your chosen target, not a guaranteed safe level.",
                  )}
                </small>
              </label>
              {calculation.error && (
                <p className="field-error" role="alert">
                  {errorMessage(calculation.error, locale)}
                </p>
              )}
            </div>
            <div>
              {plan && BigInt(plan.shortfallAtomic) > 0n && (
                <Notice
                  tone="warning"
                  title={t(
                    "Ngân sách chưa đủ để đạt mục tiêu",
                    "Your limits do not reach the target",
                  )}
                >
                  {t("Cần thêm", "An additional")} {amount(plan.shortfallAtomic)}{" "}
                  {snapshot.debt.symbol}{" "}
                  {t(
                    "để đạt mục tiêu trong kịch bản này. Phương án bên dưới chỉ cải thiện một phần.",
                    "would be needed in this scenario. The option below provides partial improvement.",
                  )}
                </Notice>
              )}
              {plan?.targetAlreadyMet && (
                <Notice
                  title={t(
                    "Kịch bản đã đáp ứng mục tiêu bạn chọn",
                    "The scenario already meets your target",
                  )}
                >
                  {t(
                    "Bạn có thể giữ nguyên. Trả thêm nợ là lựa chọn của bạn.",
                    "You may leave the position unchanged. Additional repayment is optional.",
                  )}
                </Notice>
              )}
              <fieldset className="option-list" disabled={busy}>
                <legend className="sr-only">{t("Phương án trả nợ", "Repayment options")}</legend>
                {plan?.options.map((o) => (
                  <label key={o.id} className={`option ${selected?.id === o.id ? "selected" : ""}`}>
                    <div className="option-top">
                      <span>
                        <input
                          type="radio"
                          name="repayment"
                          checked={selected?.id === o.id}
                          onChange={() => {
                            setChoice(o.id);
                            invalidate();
                          }}
                        />
                        {o.id === "target"
                          ? t("Đạt mục tiêu", "Reach the target")
                          : t("Trong khả năng hiện có", "Within available funds")}
                      </span>
                      <strong className="option-amount">
                        {amount(o.repayAtomic)} <small>{snapshot.debt.symbol}</small>
                      </strong>
                    </div>
                    <p>
                      {t("Tiền còn lại", "Remaining balance")}: {amount(o.walletAfterAtomic)}{" "}
                      {snapshot.debt.symbol} ·{" "}
                      {t("LTV kịch bản sau trả", "Scenario LTV after repayment")}:{" "}
                      {format(o.stressed.ltvPct)}%
                    </p>
                    <p>
                      <StatusBadge tone={o.meetsTarget ? "success" : "warning"}>
                        {o.meetsTarget
                          ? t("Đạt mục tiêu đã chọn", "Chosen target reached")
                          : t(
                              "Giảm một phần · chưa đạt mục tiêu",
                              "Partial improvement · target not reached",
                            )}
                      </StatusBadge>
                    </p>
                  </label>
                ))}
              </fieldset>
              {plan?.options.length === 0 && (
                <Notice
                  tone="warning"
                  title={t(
                    "Chưa có số tiền trả nợ trong giới hạn này",
                    "No repayment fits these limits",
                  )}
                >
                  {t(
                    "Kiểm tra ngân sách và khoản dự trữ, hoặc giữ nguyên khoản vay.",
                    "Review your budget and reserve, or leave the position unchanged.",
                  )}
                </Notice>
              )}
              <div className="actions-row">
                <button
                  className="button button-secondary"
                  disabled={!plan || explaining}
                  onClick={() => void explain()}
                >
                  {explaining
                    ? t("Đang giải thích…", "Explaining…")
                    : t("Giải thích kết quả", "Explain the results")}
                </button>
              </div>
              {explanation && explanation.contextKey === explanationKey && (
                <Notice
                  title={
                    explanation.source === "model"
                      ? t("Diễn giải từ AI", "AI explanation")
                      : t("Diễn giải từ dữ kiện", "Fact-based explanation")
                  }
                >
                  <div className="explanation-brief">
                    {(explanation.lines ?? [explanation.text]).map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                    {explanation.summary && <p className="small-note">{explanation.summary}</p>}
                    {explanation.caution && <p className="small-note">{explanation.caution}</p>}
                  </div>
                </Notice>
              )}
            </div>
          </div>
          {selected && (
            <section className="data-panel section-rail">
              <div className="data-panel-header">
                <h2>{t("Xem trước bước tiếp theo", "Preview your next step")}</h2>
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <table className="comparison-table">
                <caption className="sr-only">
                  {t("Trước và sau trả nợ", "Before and after repayment")}
                </caption>
                <thead>
                  <tr>
                    <th>{t("Chỉ số", "Metric")}</th>
                    <th>{t("Trước", "Before")}</th>
                    <th>{t("Dự kiến sau trả", "Projected after repayment")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t("Khoản nợ", "Debt")}</td>
                    <td>{amount(snapshot.debt.amountAtomic)}</td>
                    <td>
                      {amount(selected.debtAfterAtomic)} {snapshot.debt.symbol}
                    </td>
                  </tr>
                  <tr>
                    <td>{t("Token nợ còn trong ví", "Debt tokens in wallet")}</td>
                    <td>{amount(snapshot.walletDebtAtomic)}</td>
                    <td>
                      {amount(selected.walletAfterAtomic)} {snapshot.debt.symbol}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="small-note">
                {t(
                  "Các giá trị trên là dự kiến, chưa phải kết quả giao dịch. Phí SOL sẽ được kiểm tra khi chuẩn bị.",
                  "These are projections, not transaction results. SOL fees are checked during preparation.",
                )}
              </p>
              {source === "synthetic" ? (
                <Notice
                  title={t(
                    "Bản minh họa không thực hiện giao dịch",
                    "The example does not execute transactions",
                  )}
                >
                  {t(
                    "Chuyển sang ví Devnet để đọc một vị thế thật trước khi ký.",
                    "Switch to a Devnet wallet position before preparing a transaction.",
                  )}
                </Notice>
              ) : activePrepared ? (
                <>
                  <Notice
                    title={t(
                      "Đã mô phỏng, đang chờ bạn xác nhận",
                      "Simulated, awaiting your approval",
                    )}
                  >
                    {t("Phí mạng ước tính", "Estimated network fee")}:{" "}
                    {format(units(activePrepared.feeLamports, 9).toString(), 9)} SOL.{" "}
                    {t(
                      "Bản xem trước có thời hạn; ví vẫn là nơi xác nhận cuối cùng.",
                      "The preview expires; your wallet is the final approval step.",
                    )}
                  </Notice>
                  <p>
                    <strong>
                      {t("Số tiền sẽ ký", "Amount to sign")}:{" "}
                      {exactToken(
                        activePrepared.repayAtomic,
                        activePrepared.snapshot.debt.decimals,
                        locale,
                      )}{" "}
                      {activePrepared.snapshot.debt.symbol}
                    </strong>
                  </p>
                  <PreviewExpiry expiresAt={activePrepared.expiresAt} />
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => {
                      setPrepared(null);
                    }}
                  >
                    {t("Chuẩn bị lại", "Prepare again")}
                  </button>
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => void sign()}
                  >
                    {phase === "awaiting_signature"
                      ? t("Đang chờ ví…", "Waiting for wallet…")
                      : t("Xác nhận trong ví", "Confirm in wallet")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <button
                  className="button button-primary"
                  disabled={
                    busy ||
                    !selected ||
                    !wallet ||
                    snapshot.warnings.includes("STALE_DATA") ||
                    shownRecords.some((record) =>
                      [
                        "submitted",
                        "confirmation_unknown",
                        "confirmed",
                        "verification_pending",
                      ].includes(record.phase),
                    )
                  }
                  onClick={() => void prepare()}
                >
                  {phase === "preparing"
                    ? t("Đang kiểm tra giao dịch…", "Checking transaction…")
                    : t("Chuẩn bị giao dịch", "Prepare transaction")}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </section>
          )}
        </section>
      )}
      {shownRecords.length === 0 && (
        <section className="data-panel section-rail" id="activity">
          <p className="eyebrow">{t("04 / HOẠT ĐỘNG", "04 / ACTIVITY")}</p>
          <h2>{t("Chưa có giao dịch.", "No transactions yet.")}</h2>
          <p>
            {t(
              "Giao dịch đã ký sẽ xuất hiện tại đây để theo dõi và kiểm tra lại.",
              "Signed transactions will appear here for tracking and verification.",
            )}
          </p>
        </section>
      )}
      {shownRecords.length > 0 && (
        <section className="section-rail" id="activity">
          <p className="eyebrow">04 / {t("HOẠT ĐỘNG DEVNET", "DEVNET ACTIVITY")}</p>
          <h2>{t("Theo dõi đến khi có kết quả.", "Follow through to the outcome.")}</h2>
          {shownRecords.map((record) => (
            <div className="transaction-row" key={record.signature}>
              <StatusBadge
                tone={
                  record.phase === "verified"
                    ? "success"
                    : record.phase === "failed"
                      ? "danger"
                      : "warning"
                }
              >
                {phaseText(record.phase)}
              </StatusBadge>
              <p className="small-note">
                <code>{record.signature}</code>
              </p>
              <div className="actions-row">
                <a
                  className="text-link"
                  href={`https://explorer.solana.com/tx/${encodeURIComponent(record.signature)}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Solana Explorer
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void checkRecord(record)}
                >
                  {t("Kiểm tra kết quả", "Check result")}
                </button>
              </div>
            </div>
          ))}
          {verification && (
            <p className="small-note">
              {verification.startsWith("REPAYMENT_CONFIRMED")
                ? t(
                    "Đã xác minh giao dịch trả nợ trên chain. Làm mới để xem vị thế hiện tại.",
                    "The repayment transaction was verified on-chain. Refresh to view the current position.",
                  )
                : t(
                    "Cần tiếp tục kiểm tra trạng thái trên chain.",
                    "Further on-chain verification is needed.",
                  )}
            </p>
          )}
        </section>
      )}
    </>
  );
}
