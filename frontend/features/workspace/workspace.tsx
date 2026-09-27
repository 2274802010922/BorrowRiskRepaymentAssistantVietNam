"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Buffer } from "buffer";
import bs58 from "bs58";
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
  try {
    const records: ExecutionRecord[] = JSON.parse(readRecords());
    window.localStorage.setItem(
      recordKey,
      JSON.stringify(
        [record, ...records.filter((r) => r.signature !== record.signature)].slice(0, 20),
      ),
    );
    window.dispatchEvent(new Event(recordKey));
  } catch {
    /* The current transaction remains in component state if storage is disabled. */
  }
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
  const [source, setSource] = useState<"synthetic" | "devnet">("synthetic");
  const [snapshot, setSnapshot] = useState<PositionSnapshot | null>(exampleSnapshot());
  const [positions, setPositions] = useState<PositionSnapshot[]>([]);
  const [loading, setLoading] = useState(false),
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
      source: "template" | "model";
    } | null>(null),
    [explaining, setExplaining] = useState(false);
  const stored = useSyncExternalStore(subscribe, readRecords, () => "[]");
  const records = useMemo(() => {
    try {
      const rows: ExecutionRecord[] = JSON.parse(stored);
      return Array.isArray(rows)
        ? rows.filter((r) => r.wallet === wallet && typeof r.signature === "string").slice(0, 10)
        : [];
    } catch {
      return [];
    }
  }, [stored, wallet]);
  const shownRecords = currentRecord
    ? [currentRecord, ...records.filter((r) => r.signature !== currentRecord.signature)]
    : records;
  const format = (value: string, decimals = 2) =>
    new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
      maximumFractionDigits: decimals,
    }).format(Number(value));
  const amount = (value: string) =>
    format(units(value, snapshot?.debt.decimals ?? 6).toString(), 6);
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
  const invalidate = () => {
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
    setSnapshot(null);
    setPositions([]);
    setSource("devnet");
    try {
      const result = await postApi<{ positions: PositionSnapshot[] }>("/api/positions/read", {
        wallet,
      });
      setPositions(result.positions);
      setSnapshot(result.positions[0] ?? null);
      if (result.positions[0]) {
        const s = result.positions[0];
        setBudget(units(s.walletDebtAtomic, s.debt.decimals).toFixed(6));
        setReserve("0");
        setTarget(String(Math.min(60, Math.floor(s.liquidationThresholdBps / 100) - 5)));
      }
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
    try {
      const p = await postApi<Prepared>("/api/repayments/prepare", {
        wallet,
        position: snapshot.position,
        protocol: snapshot.protocol,
        constraints,
        repayAtomic: selected.repayAtomic,
      });
      setPrepared(p);
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
      if (result.snapshot) setSnapshot(result.snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    const p = prepared,
      provider = w.provider();
    if (!p || !provider || !wallet || !snapshot || !constraints || busy) return;
    setBusy(true);
    setPhase("awaiting_signature");
    setError(null);
    let record: ExecutionRecord | null = null;
    try {
      if (Date.now() >= p.expiresAt) throw new Error("PREVIEW_EXPIRED");
      const { VersionedTransaction } = await import("@solana/web3.js");
      const tx = VersionedTransaction.deserialize(Buffer.from(p.transaction, "base64"));
      const before = tx.message.serialize();
      const signed = await provider.signTransaction(tx);
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
      saveRecord(record);
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
          e instanceof Error && ["PREVIEW_EXPIRED", "TRANSACTION_CHANGED"].includes(e.message)
            ? e.message
            : "WALLET_REJECTED",
        );
      else {
        setCurrentRecord(record);
        saveRecord(record);
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
      setExplanation(await postApi("/api/explanations", { snapshot, constraints, locale }));
    } catch {
      setExplanation({
        source: "template",
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
        title={t("Một khoản vay. Một bước rõ ràng.", "One position. A clearer next step.")}
        description={t(
          "Xem tác động của biến động giá và phương án phù hợp với số tiền bạn muốn giữ lại.",
          "Explore price changes and repayment options that respect the balance you want to keep.",
        )}
        action={<StatusBadge tone="info">Solana Devnet</StatusBadge>}
      />
      <div className="toolbar">
        <div className="segmented" aria-label={t("Nguồn dữ liệu", "Data source")}>
          <button
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
          <button aria-pressed={source === "devnet"} onClick={() => void load()}>
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
      {loading ? (
        <ContentSkeleton />
      ) : snapshot && displayed ? (
        <>
          {positions.length > 1 && (
            <label className="form-field">
              <span>{t("Chọn khoản vay", "Choose a position")}</span>
              <select
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
          <section className="data-panel" aria-label={t("Vị thế hiện tại", "Current position")}>
            <div className="data-panel-header">
              <h2>
                {snapshot.collateral.symbol} / {snapshot.debt.symbol}
              </h2>
              <StatusBadge>
                {source === "synthetic"
                  ? t("Vị thế giả định", "Example position")
                  : snapshot.protocol === "kamino"
                    ? "Kamino · Devnet"
                    : t("Pool thử nghiệm BorrowRisk", "BorrowRisk test pool")}
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
              {explanation && (
                <Notice
                  title={
                    explanation.source === "model"
                      ? t("Diễn giải từ AI", "AI explanation")
                      : t("Diễn giải từ dữ kiện", "Fact-based explanation")
                  }
                >
                  {explanation.text}
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
              ) : prepared ? (
                <>
                  <Notice
                    title={t(
                      "Đã mô phỏng, đang chờ bạn xác nhận",
                      "Simulated, awaiting your approval",
                    )}
                  >
                    {t("Phí mạng ước tính", "Estimated network fee")}:{" "}
                    {format(units(prepared.feeLamports, 9).toString(), 9)} SOL.{" "}
                    {t(
                      "Bản xem trước có thời hạn; ví vẫn là nơi xác nhận cuối cùng.",
                      "The preview expires; your wallet is the final approval step.",
                    )}
                  </Notice>
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => void sign()}
                  >
                    {phase === "awaiting_signature"
                      ? t("Đang chờ Phantom…", "Waiting for Phantom…")
                      : t("Xác nhận trong Phantom", "Confirm in Phantom")}
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
              {verification === "DEBT_REDUCED"
                ? t(
                    "Đã đọc lại và đối chiếu khoản nợ giảm.",
                    "The reduced debt was re-read and verified.",
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
