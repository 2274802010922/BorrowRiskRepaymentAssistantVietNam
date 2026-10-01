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
            t("2. Chọn dư địa giá", "2. Choose a price buffer"),
            t(
              "Chọn kịch bản SOL giảm 10%, 20%, 30% hoặc tùy chỉnh. Dư địa mặc định 5% nghĩa là sau kịch bản, giá còn có thể giảm thêm khoảng 5% trước ngưỡng thanh lý theo dữ liệu hiện tại. Đây là mục tiêu, không phải bảo đảm an toàn.",
              "Choose a 10%, 20%, 30% or custom SOL drop. The default 5% buffer means another approximately 5% price drop after the scenario before the liquidation threshold under current data. This is a goal, not a safety guarantee.",
            ),
          ],
          [
            t("3. Ngân sách và dự trữ", "3. Budget and reserve"),
            t(
              "Ngân sách là mức tối đa, không phải số phải dùng hết. Khoản muốn giữ lại là USDC trong ví. picachu tính tổng tối thiểu cần trả cho các khoản đã chọn; thiếu tiền thì báo cần thêm. SOL trả phí được kiểm riêng.",
              "Your budget is a maximum, not an amount to spend in full. The reserve is USDC to keep in your wallet. picachu calculates the minimum total needed for your selected loans and shows any shortfall. SOL fees are checked separately.",
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
              "MVP hỗ trợ tối đa ba khoản vay cùng ví và cặp SOL/USDC trên Kamino Devnet. Bạn ký từng bước trả nợ. Phân bổ theo tổn thất thanh lý đang tắt trong lúc chờ kiểm chứng model; không tự đổi token hoặc tự ký.",
              "The MVP supports up to three loans from one wallet and SOL/USDC pair on Kamino Devnet. You sign each repayment step. Loss-based allocation is disabled pending model verification; swapping and signing are not automatic.",
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
      <Link href="/portfolio" className="button button-primary">
        {t("Lập phương án trả nợ", "Plan repayment")}
      </Link>
    </WorkspaceShell>
  );
}
