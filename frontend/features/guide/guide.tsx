"use client";
import Link from "next/link";
import { WorkspaceShell } from "../../components/layout/shell";
import { Notice, PageHeading } from "../../components/feedback/states";
import { useLanguage } from "../../i18n/provider";
export function Guide() {
  const { t } = useLanguage();
  return (
    <WorkspaceShell>
      <PageHeading
        index={t("HƯỚNG DẪN / 01", "GUIDE / 01")}
        title={t("Hiểu trước khi thao tác.", "Understand before acting.")}
        description={t(
          "Bắt đầu bằng bản minh họa. Sau đó thử ví và vị thế trên Solana Devnet.",
          "Start with the example, then explore a wallet position on Solana Devnet.",
        )}
      />
      <Notice title={t("Đây là môi trường thử nghiệm", "This is a test environment")}>
        {t(
          "Token Devnet không có giá trị tiền thật. Kịch bản giá là giả định, không phải dự báo hay bảo đảm tránh thanh lý.",
          "Devnet tokens have no real monetary value. Price scenarios are assumptions, not forecasts or guarantees against liquidation.",
        )}
      </Notice>
      <div className="guide-list">
        {[
          [
            t("Bắt đầu với khoản vay thử", "Start with a test loan"),
            t(
              "Mở Thiết lập demo, kết nối ví và kiểm tra điều kiện. Gửi SOL thế chấp trước, sau đó ký vay token. Nếu market hoặc giá chưa sẵn sàng, picachu sẽ giải thích lý do và khóa thao tác ký.",
              "Open Demo setup, connect your wallet and check readiness. Deposit SOL first, then sign a token borrow. If the market or prices are unavailable, picachu explains why and blocks signing.",
            ),
          ],
          [
            t("1. Đọc đúng nguồn dữ liệu", "1. Check the data source"),
            t(
              "Dữ liệu minh họa giúp khám phá giao diện. Dữ liệu Devnet được đọc từ mạng thử nghiệm. Không thể ký giao dịch từ bản minh họa.",
              "Illustrative data helps you explore the interface. Devnet data comes from the test network. Illustrative plans cannot be signed.",
            ),
          ],
          [
            t("2. LTV và hệ số sức khỏe", "2. LTV and health factor"),
            t(
              "LTV mô tả nợ so với giá trị thế chấp theo tham số giao thức. Ngưỡng thanh lý và borrow factor phải được đọc từ vị thế. Một con số sức khỏe không bao quát mọi rủi ro.",
              "LTV describes debt relative to collateral under protocol parameters. Liquidation thresholds and borrow factors come from the position. A health metric does not cover every risk.",
            ),
          ],
          [
            t("3. Ngân sách và dự trữ", "3. Budget and reserve"),
            t(
              "Ngân sách là mức tối đa bạn muốn dùng. Dự trữ là lượng token nợ muốn giữ lại trong ví. SOL trả phí được kiểm tra riêng. Trả một phần có thể giảm rủi ro mà chưa đạt mục tiêu.",
              "Budget is the maximum you want to spend. Reserve is the debt-token balance you want to keep. SOL fees are checked separately. A partial repayment may improve a position without meeting your target.",
            ),
          ],
          [
            t("4. Phân biệt các bước giao dịch", "4. Understand transaction stages"),
            t(
              "Đã gửi chưa có nghĩa đã thành công. Ứng dụng phải chờ xác nhận và đọc lại vị thế. Khi trạng thái chưa rõ, kiểm tra signature hiện có trước khi thử một giao dịch mới.",
              "Submitted does not mean successful. The app must wait for confirmation and read the position again. When status is unknown, check the existing signature before attempting a new transaction.",
            ),
          ],
          [
            t("5. Giới hạn của bản MVP", "5. MVP boundaries"),
            t(
              "MVP hỗ trợ một cặp tài sản được cấu hình và repay trực tiếp. Không tự đổi token, không tự ký và không quản lý toàn bộ danh mục. Tên protocol và nguồn giá được hiển thị để bạn kiểm tra.",
              "The MVP supports one configured asset pair and direct repayment. It does not automatically swap, sign, or manage an entire portfolio. Protocol and price sources are shown for inspection.",
            ),
          ],
        ].map(([title, body]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="actions-row">
        <Link href="/setup" className="button button-secondary">
          {t("Thiết lập demo Devnet", "Set up Devnet demo")}
        </Link>
      </div>
      <Link href="/workspace" className="button button-primary">
        {t("Mở không gian khoản vay", "Open workspace")}
      </Link>
    </WorkspaceShell>
  );
}
