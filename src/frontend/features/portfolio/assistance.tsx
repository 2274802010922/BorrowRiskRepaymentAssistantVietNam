"use client";
import { useState } from "react";
import { useLanguage } from "../../i18n/provider";
import { postApi, errorMessage } from "../../lib/errors";
import { Notice } from "../../components/feedback/states";
import { exactToken } from "../../../shared/format";
import type { RepaymentGoal, PortfolioSnapshot } from "../../../shared/portfolio";

export function GoalDraft({
  locked,
  onApply,
}: {
  locked: boolean;
  onApply: (goal: RepaymentGoal) => void;
}) {
  const { t, locale } = useLanguage(),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    status: string;
    goal?: RepaymentGoal;
    source: string;
    defaultBuffer?: boolean;
  } | null>(null);
  const amount = (v: string) => exactToken(v, 6, locale);
  async function read() {
    setBusy(true);
    setError(null);
    setDraft(null);
    try {
      setDraft(await postApi("/api/goals/draft", { text, locale }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="goal-section">
      <summary>{t("Nhập mục tiêu bằng câu ngắn", "Describe your goal")}</summary>
      <label>
        {t("Mục tiêu của bạn", "Your goal")}
        <textarea
          value={text}
          maxLength={300}
          disabled={locked || busy}
          onChange={(e) => {
            setText(e.target.value);
            setDraft(null);
            setError(null);
          }}
          placeholder={t(
            "Trả tối đa 10 USDC, giữ 1 USDC, nếu SOL giảm 30%",
            "Repay up to 10 USDC, keep 1 USDC, if SOL falls 30%",
          )}
        />
      </label>
      <p className="muted">
        {t(
          "Chỉ nhập số tiền và kịch bản. Không nhập địa chỉ ví, khóa hoặc mật khẩu.",
          "Enter amounts and scenario only. Do not enter wallet addresses, keys or passwords.",
        )}
      </p>
      <button
        className="button secondary"
        disabled={locked || busy || !text.trim()}
        onClick={() => void read()}
      >
        {busy ? t("Đang đọc…", "Reading…") : t("Tạo bản nháp", "Create draft")}
      </button>
      {error && (
        <Notice tone="danger" title={t("Chưa đọc được mục tiêu", "Could not read goal")}>
          {errorMessage(error, locale)}
        </Notice>
      )}
      {draft?.status === "needs_clarification" && (
        <Notice title={t("Cần viết rõ hơn", "Please clarify")}>
          {t(
            "Nêu bằng chữ số: trả tối đa bao nhiêu USDC, giữ bao nhiêu USDC và SOL giảm bao nhiêu %. Bạn cũng có thể dùng form bên trên.",
            "Specify digits for the USDC budget, USDC reserve and SOL drop percentage. You can also use the form above.",
          )}
        </Notice>
      )}
      {draft?.goal && (
        <Notice title={t("Xem lại bản nháp trước khi áp dụng", "Review the draft before applying")}>
          <p>
            {t("Trả tối đa", "Budget")}: {amount(draft.goal.budgetAtomic)} USDC · {t("Giữ", "Keep")}
            : {amount(draft.goal.reserveAtomic)} USDC
          </p>
          <p>
            SOL −{draft.goal.shockBps / 100}% · {t("Dư địa", "Buffer")}:{" "}
            {draft.goal.bufferBps / 100}%{draft.defaultBuffer ? t(" (mặc định)", " (default)") : ""}
          </p>
          <p className="muted">
            {draft.source === "model"
              ? t(
                  "AI hỗ trợ đọc mục tiêu. Core kiểm tra giá trị.",
                  "AI assisted extraction. The core validates values.",
                )
              : t("Đọc theo quy tắc cố định.", "Extracted using fixed rules.")}
          </p>
          <button
            className="button"
            disabled={locked}
            onClick={() => {
              onApply(draft.goal!);
              setDraft(null);
            }}
          >
            {t("Áp dụng mục tiêu này", "Apply this goal")}
          </button>
        </Notice>
      )}
    </details>
  );
}
export function PortfolioExplanation({
  portfolio,
  goal,
}: {
  portfolio: PortfolioSnapshot;
  goal: RepaymentGoal;
}) {
  const { t, locale } = useLanguage(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [result, setResult] = useState<{
      lines: string[];
      summary?: string;
      caution: string;
      source: string;
    } | null>(null);
  async function read() {
    setBusy(true);
    setError(null);
    try {
      setResult(await postApi("/api/portfolio/explain", { portfolio, goal, locale }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="goal-explanation">
      <button className="button secondary" disabled={busy} onClick={() => void read()}>
        {busy
          ? t("Đang giải thích…", "Explaining…")
          : t("Giải thích phương án", "Explain this plan")}
      </button>
      {error && (
        <Notice title={t("Chưa giải thích được", "Explanation unavailable")}>
          {errorMessage(error, locale)}
        </Notice>
      )}
      {result && (
        <Notice
          title={
            result.source === "model"
              ? t("Dữ kiện và nhận xét AI", "Facts and AI comment")
              : t("Giải thích từ dữ kiện", "Explanation from facts")
          }
        >
          {result.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {result.summary && <p>{result.summary}</p>}
          <p className="muted">{result.caution}</p>
        </Notice>
      )}
    </div>
  );
}
