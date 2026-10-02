"use client";
import { useState } from "react";
import { Notice } from "../../components/feedback/states";
import { useLanguage } from "../../i18n/provider";
import { postApi, errorMessage } from "../../lib/errors";
import { compactNumber, exactToken } from "../../../shared/format";
import type { AllocationQuote, AllocationPlan } from "../../../shared/allocation";
import type { RepaymentGoal } from "../../../shared/portfolio";

export function AllocationControls({
  wallet,
  positions,
  goal,
  quote,
  onQuote,
  disabled,
}: {
  wallet: string | null;
  positions: string[];
  goal: RepaymentGoal;
  quote: AllocationQuote | null;
  onQuote: (quote: AllocationQuote) => void;
  disabled: boolean;
}) {
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function calculate() {
    setLoading(true);
    setError(null);
    try {
      onQuote(
        await postApi<AllocationQuote>(
          "/api/portfolio/allocate",
          wallet
            ? { source: "devnet", wallet, positions, goal }
            : { source: "synthetic", positions, goal },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="allocation-controls">
      <button
        className="button secondary"
        disabled={disabled || loading}
        onClick={() => void calculate()}
      >
        {loading
          ? t("Đang tính cách phân bổ…", "Calculating allocation…")
          : quote
            ? t("Tính lại cách phân bổ", "Recalculate allocation")
            : t("Xem cách phân bổ tiền", "Explore repayment allocation")}
      </button>
      {loading && (
        <p role="status">
          {t(
            "Đang kiểm tra phiên bản Kamino, đọc dữ liệu và so sánh phương án. Chưa tạo giao dịch.",
            "Checking Kamino version, reading data and comparing allocations. No transaction is being prepared.",
          )}
        </p>
      )}
      {error && (
        <Notice tone="danger" title={t("Chưa tính được phân bổ", "Allocation unavailable")}>
          {errorMessage(error, locale)}
        </Notice>
      )}
      {quote?.state === "unavailable" && (
        <Notice
          tone="warning"
          title={t(
            "Chưa hỗ trợ phân bổ cho dữ liệu này",
            "Allocation is unavailable for this data",
          )}
        >
          {errorMessage(quote.reason, locale)}
        </Notice>
      )}
      {quote?.state === "ready" && quote.plan.state === "no_beneficial_allocation" && (
        <Notice
          title={t(
            "Chưa có phương án trả một phần có lợi",
            "No beneficial partial repayment found",
          )}
        >
          {t(
            "Trong mô hình một lượt thanh lý, trả thêm chưa giảm chi phí đủ bù phí. Dư địa mục tiêu có thể vẫn chưa đạt; bạn có thể điều chỉnh ngân sách hoặc kịch bản.",
            "In this one-event model, extra repayment does not reduce costs enough to offset fees. Your target buffer may remain unmet; you can review the budget or scenario.",
          )}
        </Notice>
      )}
    </div>
  );
}

export function AllocationDetails({ plan, active }: { plan: AllocationPlan; active: boolean }) {
  const { t, locale } = useLanguage();
  const money = (value: string) =>
    Number(value) > 0 && Number(value) < 0.01
      ? locale === "vi"
        ? "<0,01"
        : "<0.01"
      : compactNumber(value, locale, 2);
  const names = {
    none: t(
      active ? "Không trả thêm" : "Không trả",
      active ? "No further repayment" : "No repayment",
    ),
    equal: t("Chia đều", "Equal split"),
    risk_first: t("Ưu tiên rủi ro", "Risk first"),
    proposed: t("Phương án đề xuất", "Proposed allocation"),
  };
  return (
    <div className="allocation-details">
      <Notice title={t("Vì sao phân bổ như vậy?", "Why this allocation?")}>
        <p>
          {t(
            "Theo kịch bản một lượt thanh lý, tổn thất ước tính từ",
            "In the one-liquidation scenario, estimated loss changes from",
          )}{" "}
          {money(plan.lossBeforeUsd)} USD {t("xuống", "to")} {money(plan.lossAfterUsd)} USD.
        </p>
        <p>
          {t("Phí trả nợ ước tính", "Estimated repayment fees")}:{" "}
          {exactToken(plan.feeLamports, 9, locale)} SOL · {t("Tiền chưa dùng", "Unspent funds")}:{" "}
          {exactToken(plan.unspentAtomic, 6, locale)} USDC.
        </p>
        <p>
          {t(
            "Chọn các mức trả có chi phí thanh lý cộng phí thấp nhất trong tập đã xét; không cần dùng hết ngân sách.",
            "The chosen repayment levels minimize liquidation costs plus fees among the candidates considered; the budget need not be fully spent.",
          )}
        </p>
      </Notice>
      <details>
        <summary>{t("So sánh cách trả", "Compare repayment approaches")}</summary>
        <div className="allocation-comparison">
          <table>
            <caption>
              {t(
                "Cùng dữ liệu, ngân sách và mô hình một lượt",
                "Same data, budget and one-event model",
              )}
            </caption>
            <thead>
              <tr>
                <th>{t("Cách trả", "Approach")}</th>
                <th>{t("Tổn thất + phí", "Loss + fees")}</th>
                <th>{t("Đạt mục tiêu", "Goals met")}</th>
              </tr>
            </thead>
            <tbody>
              {plan.baselines.map((b) => (
                <tr key={b.id}>
                  <th scope="row">{names[b.id]}</th>
                  <td>{money(b.costUsd)} USD</td>
                  <td>
                    {b.goalsMet}/{plan.positionCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details>
        <summary>{t("Chi tiết tính toán", "Calculation details")}</summary>
        <p>
          {t(
            "Một lượt thanh lý cho mỗi khoản tại giá kịch bản, giả định liquidator đủ vốn và thanh khoản. Chưa mô phỏng thanh lý dây chuyền hoặc dự đoán xác suất. Tiền gốc tự trả không phải tổn thất thanh lý.",
            "One liquidation per position at the scenario price, assuming sufficient liquidator capital and liquidity. This does not model cascading events or probabilities. Repayment principal is not liquidation loss.",
          )}
        </p>
        <p>
          {t("Mô hình", "Model")}: {plan.model.version} ·{" "}
          {t("Mức trả xét mỗi khoản", "Candidates per loan")}:{" "}
          {plan.model.candidateCounts.join(" / ")}.{" "}
          {t(
            "Kết quả tốt nhất trong lưới hữu hạn, không phải cam kết tối ưu toàn cục.",
            "Best result in the finite grid, not a global optimality guarantee.",
          )}
        </p>
      </details>
    </div>
  );
}
