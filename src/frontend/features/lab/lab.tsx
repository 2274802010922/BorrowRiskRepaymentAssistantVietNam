"use client";
import { useState } from "react";
import { WorkspaceShell } from "../../components/layout/shell";
import {
  ContentSkeleton,
  Notice,
  PageHeading,
  StatusBadge,
} from "../../components/feedback/states";
import { useLanguage } from "../../i18n/provider";
import {
  scenarioIds,
  scenarioTones,
  type ScenarioId,
} from "../../../../tests/fixtures/ui-scenarios";
const descriptions: Record<ScenarioId, [string, string, string, string]> = {
  ready: [
    "Dữ liệu sẵn sàng",
    "Data ready",
    "Có thể xem và mô phỏng. Đây vẫn là dữ liệu minh họa.",
    "You may explore scenarios. This is still illustrative data.",
  ],
  loading: [
    "Đang tải",
    "Loading",
    "Chờ đọc dữ liệu; chưa có kết quả.",
    "Waiting for data; no result is available yet.",
  ],
  empty: [
    "Chưa có khoản vay",
    "No position",
    "Đã đọc thành công nhưng không tìm thấy khoản vay được hỗ trợ.",
    "The read succeeded, but no supported position was found.",
  ],
  error: [
    "Không đọc được dữ liệu",
    "Read failed",
    "RPC lỗi không có nghĩa là ví không có khoản vay. Hãy thử lại.",
    "An RPC error does not mean the wallet has no positions. Try again.",
  ],
  stale: [
    "Dữ liệu đã cũ",
    "Stale data",
    "Làm mới trước khi chuẩn bị giao dịch. Không ký từ số liệu cũ.",
    "Refresh before preparing a transaction. Stale data cannot authorize signing.",
  ],
  insufficient: [
    "Chưa đủ để đạt mục tiêu",
    "Target not funded",
    "Có thể có phương án trả một phần; cần ghi rõ mục tiêu chưa đạt.",
    "A partial repayment may be possible; the unmet target must remain clear.",
  ],
  awaiting_signature: [
    "Đang chờ xác nhận ví",
    "Awaiting wallet approval",
    "Chưa gửi giao dịch. Người dùng có thể từ chối.",
    "Nothing has been submitted. The user may reject the request.",
  ],
  rejected: [
    "Chưa nhận được chữ ký",
    "No signature received",
    "Ứng dụng chưa gửi giao dịch. Có thể xem lại phương án.",
    "The app has not submitted a transaction. Review the plan if needed.",
  ],
  submitted: [
    "Đã gửi giao dịch",
    "Transaction submitted",
    "Có signature chưa có nghĩa khoản nợ đã giảm. Tiếp tục kiểm tra.",
    "A signature does not prove debt reduction. Continue checking.",
  ],
  confirmation_unknown: [
    "Chưa rõ kết quả",
    "Confirmation unknown",
    "Kiểm tra signature hiện có. Không tự động ký giao dịch mới.",
    "Check the existing signature. Do not automatically sign a new transaction.",
  ],
  confirmed: [
    "Đã xác nhận trên chain",
    "Confirmed on chain",
    "Còn bước đọc lại và đối chiếu khoản vay.",
    "The position still needs to be re-read and verified.",
  ],
  verified: [
    "Đã đối chiếu kết quả",
    "Outcome verified",
    "Trạng thái này chỉ dùng sau xác nhận và kiểm tra dữ kiện trước/sau. Ở đây là fixture UI.",
    "This state requires confirmation and before/after checks. Here it is a UI fixture.",
  ],
};
export function Lab() {
  const [state, setState] = useState<ScenarioId>("ready"),
    { t } = useLanguage();
  const d = descriptions[state];
  return (
    <WorkspaceShell>
      <PageHeading
        index="UI / QA"
        title={t("Phòng kiểm thử trạng thái", "UI state laboratory")}
        description={t(
          "Kiểm tra thông điệp, bố cục và khả năng truy cập bằng dữ liệu cố định. Trang này không tạo giao dịch.",
          "Review messages, layout, and accessibility using fixed fixtures. This page does not create transactions.",
        )}
      />
      <Notice
        tone="warning"
        title={t("Toàn bộ trạng thái dưới đây là minh họa", "All states below are illustrative")}
      >
        {t(
          "Không dùng ảnh chụp lab làm bằng chứng Devnet hoặc bằng chứng AI live.",
          "Lab screenshots are not Devnet or live AI evidence.",
        )}
      </Notice>
      <label className="form-field" htmlFor="lab-state">
        <span>{t("Tình huống cần kiểm tra", "Scenario to inspect")}</span>
        <select
          id="lab-state"
          className="lab-select"
          value={state}
          onChange={(e) => setState(e.target.value as ScenarioId)}
        >
          {scenarioIds.map((id) => (
            <option key={id} value={id}>
              {t(descriptions[id][0], descriptions[id][1])}
            </option>
          ))}
        </select>
      </label>
      <StatusBadge tone={scenarioTones[state]}>{t(d[0], d[1])}</StatusBadge>
      {state === "loading" ? (
        <ContentSkeleton />
      ) : (
        <Notice tone={scenarioTones[state]} title={t(d[0], d[1])}>
          {t(d[2], d[3])}
        </Notice>
      )}
      <button className="button button-primary" disabled>
        {t("Ký giao dịch — không khả dụng trong lab", "Sign transaction — unavailable in the lab")}
      </button>
      <p className="small-note">
        {t(
          "Kiểm tra ở 375, 768, 1024 và 1440 px; cả VI và EN; dùng bàn phím và chế độ giảm chuyển động.",
          "Check at 375, 768, 1024 and 1440 px; in VI and EN; with keyboard navigation and reduced motion.",
        )}
      </p>
    </WorkspaceShell>
  );
}
