import type { Locale } from "../../shared/types";
const messages: Record<string, [string, string]> = {
  ALLOCATION_REVIEW_REQUIRED: [
    "Xem phân bổ và xác nhận chấp nhận trả một phần trước khi tiếp tục.",
    "Review the allocation and accept partial repayment before continuing.",
  ],
  ALLOCATION_PLAN_REQUIRED: [
    "Giao dịch này phải gửi qua nhật ký phương án phân bổ.",
    "This transaction must be submitted through its allocation plan journal.",
  ],
  ALLOCATION_NO_LONGER_BENEFICIAL: [
    "Dữ liệu mới không còn đề xuất bước trả một phần này. Kế hoạch dừng; các biên nhận đã xác minh vẫn được giữ.",
    "Fresh data no longer supports this partial repayment. The plan stops; verified receipts are retained.",
  ],
  ALLOCATION_NOT_NEEDED: [
    "Mục tiêu hiện tại đã đạt hoặc đủ ngân sách. Dùng phương án mục tiêu thông thường.",
    "The goal is already met or affordable. Use the regular goal plan.",
  ],
  UNSUPPORTED_INSOLVENCY: [
    "Kịch bản đưa một khoản vào vùng gần mất khả năng trả nợ, ngoài phạm vi mô hình hiện tại. Điều chỉnh kịch bản; chưa tạo giao dịch.",
    "The scenario puts a loan near insolvency, outside the current model scope. Review the scenario; no transaction was prepared.",
  ],
  UNSUPPORTED_LIQUIDATION_CONTEXT: [
    "Loại vị thế hoặc tham số Kamino này chưa thuộc phạm vi đã kiểm chứng. Bạn vẫn có thể dùng planner mục tiêu.",
    "This position or Kamino configuration is outside the verified model scope. The goal planner remains available.",
  ],
  UNSUPPORTED_LIQUIDATION_DUST: [
    "Khoản vay quá nhỏ để mô hình biểu diễn chính xác mức làm tròn này. Chưa đề xuất giao dịch phân bổ.",
    "The loan is too small for this rounding case in the model. No allocation transaction is proposed.",
  ],
  UNSUPPORTED_LIQUIDATION_LIQUIDITY: [
    "Thanh khoản reserve không đáp ứng giả định mô hình hiện tại. Chưa đề xuất phân bổ.",
    "Reserve liquidity does not meet the model assumptions. No allocation is proposed.",
  ],
  LIQUIDATION_PROGRAM_CHANGED: [
    "Phiên bản Kamino đã đổi so với bản đối chứng. Phân bổ được tạm chặn để kiểm chứng lại.",
    "Kamino changed since the reference verification. Allocation is disabled until reverified.",
  ],
  LIQUIDATION_PARITY_NOT_VERIFIED: [
    "Mô hình thanh lý chưa qua đối chứng cho bản triển khai này.",
    "The liquidation model has not passed reference verification for this deployment.",
  ],
  WALLET_ACCOUNT_CHANGED: [
    "Tài khoản ví đã đổi trong lúc ký. Chưa gửi giao dịch; kết nối lại đúng ví rồi chuẩn bị bản mới.",
    "The wallet account changed while signing. Nothing was sent; reconnect the intended wallet and prepare a fresh preview.",
  ],
  DEMO_PROFILE_UNAVAILABLE: [
    "Market, thanh khoản hoặc giá hiện tại không cho phép profile demo này. Không tăng mức vay hay đổi market tự động; hãy kiểm tra lại.",
    "The current market, liquidity or prices do not support this demo profile. Borrow amounts and markets will not be changed automatically.",
  ],
  PLAN_CHANGED: [
    "Giá, lãi, số dư hoặc tiến độ đã thay đổi. Kiểm tra kết quả và lập phương án mới trước khi ký.",
    "Prices, interest, balance or progress changed. Check the result and create a new plan before signing.",
  ],
  PLAN_PENDING: [
    "Có bước trả nợ đang chờ xác minh. Kiểm tra kết quả, chưa gửi bước khác.",
    "A repayment is awaiting verification. Check its result before sending another step.",
  ],
  PLAN_EXPIRED: [
    "Phương án đã hết hạn. Lập phương án mới sau khi kiểm tra các giao dịch đang chờ.",
    "The plan expired. Create a new plan after checking pending transactions.",
  ],
  PLAN_COMPLETE: [
    "Không còn bước trả nợ trong phương án này.",
    "There are no remaining repayments in this plan.",
  ],
  PLAN_NOT_ACHIEVABLE: [
    "Phương án hiện tại không cần trả thêm hoặc chưa đủ ngân sách. Làm mới và xem lại mục tiêu.",
    "The current goal is already met or the budget is insufficient. Refresh and review.",
  ],
  PLAN_STORE_NOT_CONFIGURED: [
    "Cần cấu hình hai biến Redis để lưu tiến độ trả nhiều khoản vay.",
    "Configure both Redis variables to persist multi-loan repayment progress.",
  ],
  PLAN_STORE_UNAVAILABLE: [
    "Chưa truy cập được nhật ký kế hoạch. Dừng gửi và kiểm tra lại kết quả sau.",
    "The plan journal is unavailable. Stop sending and check results later.",
  ],
  ORACLE_INVALID: [
    "Nguồn giá chưa vượt qua kiểm tra xác thực, độ tin cậy hoặc TWAP. Chưa tạo giao dịch.",
    "The price feed failed verification, confidence or TWAP checks. No transaction was prepared.",
  ],
  DEMO_WITHDRAW_BLOCKED: [
    "Chỉ rút được thế chấp khi vị thế không còn nợ. Làm mới và kiểm tra khoản vay trước.",
    "Collateral can only be withdrawn when the position has no debt. Refresh and review the loan first.",
  ],
  RATE_LIMIT_UNAVAILABLE: [
    "Chưa kiểm tra được hạn mức dịch vụ. Thử lại sau.",
    "Service budget could not be checked. Try again later.",
  ],
  WALLET_CONNECTION_FAILED: [
    "Chưa kết nối được Phantom. Mở ví, kiểm tra yêu cầu đang chờ rồi thử lại.",
    "Could not connect to Phantom. Open the wallet, review pending requests and retry.",
  ],
  WALLET_REQUEST_PENDING: [
    "Phantom đang có yêu cầu chờ xác nhận. Mở ví để xử lý.",
    "Phantom has a pending request. Open your wallet to review it.",
  ],
  STORAGE_UNAVAILABLE: [
    "Không lưu được tiến độ; giao dịch chưa gửi. Cho phép lưu trữ trang hoặc dùng trình duyệt khác.",
    "Progress could not be saved; no transaction was sent. Enable site storage or use another browser.",
  ],
  PREVIEW_CHANGED: [
    "Dữ liệu đã thay đổi. Xem lại phương án và chuẩn bị giao dịch mới.",
    "Inputs changed. Review the plan and prepare a new transaction.",
  ],
  MARKET_NOT_FOUND: [
    "Không tìm thấy market đã cấu hình. Người vận hành cần kiểm tra địa chỉ Devnet.",
    "Configured market was not found. The operator must verify its Devnet address.",
  ],
  RESERVE_NOT_FOUND: [
    "Không tìm thấy reserve đã cấu hình. Đây không phải ví không có khoản vay.",
    "A configured reserve was not found. This does not mean the wallet has no positions.",
  ],
  SERVER_DEPENDENCY_ERROR: [
    "Backend thiếu hoặc không tải được thư viện. Gửi mã yêu cầu cho người vận hành để kiểm tra log.",
    "The backend could not load a dependency. Share the request ID with the operator to inspect logs.",
  ],
  RATE_LIMITED: [
    "Đã đạt giới hạn yêu cầu. Chờ một phút rồi thử lại.",
    "Request limit reached. Wait a minute and try again.",
  ],
  TOO_MANY_POSITIONS: [
    "Có quá nhiều vị thế cho lần đọc này. Mở một vị thế bằng đường dẫn cụ thể.",
    "Too many positions for this read. Open a specific position link.",
  ],
  SIGNATURE_REJECTED: [
    "Chưa ký giao dịch. Bạn có thể xem lại và thử lại.",
    "The transaction was not signed. Review it and try again.",
  ],
  DEMO_MARKET_UNAVAILABLE: [
    "Market chưa cho phép vay hoặc không đủ thanh khoản. Cần kiểm tra cấu hình Devnet trước khi tiếp tục.",
    "The market cannot lend or lacks liquidity. Check the Devnet configuration before continuing.",
  ],
  DEMO_ALREADY_EXISTS: [
    "Vị thế đã thay đổi hoặc bước này đã hoàn thành. Hãy kiểm tra lại tiến độ.",
    "The position changed or this step is already complete. Check progress again.",
  ],
  DEMO_TRANSACTION_TOO_LARGE: [
    "Giao dịch vượt giới hạn kích thước. Market này cần cấu hình lookup table trước khi demo.",
    "The transaction exceeds the size limit. This market needs lookup table configuration before the demo.",
  ],
  DEMO_STORAGE_REQUIRED: [
    "Trình duyệt không lưu được tiến độ. Cho phép lưu trữ trang rồi thử lại; giao dịch chưa được gửi.",
    "The browser cannot save progress. Enable site storage and retry; the transaction has not been sent.",
  ],
  WALLET_MISSING: [
    "Chưa tìm thấy Phantom. Mở trang bằng trình duyệt có Phantom, hoặc tiếp tục dùng bản minh họa.",
    "Phantom was not found. Open this page in a Phantom-enabled browser or explore the example.",
  ],
  WALLET_REJECTED: [
    "Bạn đã hủy kết nối ví. Chưa có giao dịch nào được yêu cầu.",
    "Wallet connection was cancelled. No transaction was requested.",
  ],
  WALLET_DISCONNECT_FAILED: [
    "Chưa ngắt kết nối được. Hãy thử lại trong ví.",
    "Disconnection failed. Try again in your wallet.",
  ],
  DEVNET_UNAVAILABLE: [
    "Chưa xác minh được kết nối Solana Devnet. Thử lại sau; thao tác ký đang bị khóa.",
    "Solana Devnet could not be verified. Try again later; signing is blocked.",
  ],
  SERVICE_UNAVAILABLE: [
    "Chưa đọc được dữ liệu. Đây không phải kết quả không có khoản vay.",
    "Data could not be read. This does not mean there are no positions.",
  ],
  INVALID_INPUT: [
    "Kiểm tra lại dữ liệu nhập và số chữ số thập phân.",
    "Check your inputs and decimal precision.",
  ],
  NO_SUPPORTED_POSITION: [
    "Ví này chưa có vị thế được hỗ trợ trong môi trường thử nghiệm.",
    "This wallet has no supported position in the test environment.",
  ],
  EXECUTION_NOT_CONFIGURED: [
    "Luồng thực thi chưa được cấu hình trên bản triển khai này. Bạn vẫn có thể thử các phương án minh họa.",
    "Execution is not configured on this deployment. You can still explore illustrative plans.",
  ],
  STALE_DATA: [
    "Dữ liệu hoặc giá đã cũ. Làm mới khoản vay trước khi chuẩn bị giao dịch.",
    "Position data or prices are stale. Refresh before preparing a transaction.",
  ],
  INVALID_PREVIEW: [
    "Bản xem trước không còn hợp lệ. Hãy chuẩn bị lại giao dịch.",
    "This preview is no longer valid. Prepare the transaction again.",
  ],
  PREVIEW_EXPIRED: [
    "Bản xem trước đã hết hạn. Dữ liệu cần được kiểm tra lại trước khi ký.",
    "The preview expired. Refresh and prepare again before signing.",
  ],
  SIMULATION_FAILED: [
    "Mô phỏng giao dịch chưa thành công. Chưa yêu cầu ví ký.",
    "Transaction simulation failed. No signature was requested.",
  ],
  INSUFFICIENT_FUNDS: [
    "Số dư không đủ hoặc khoản dự trữ sẽ bị vi phạm.",
    "Insufficient balance or the reserve requirement would be violated.",
  ],
  INSUFFICIENT_SOL: [
    "Bạn cần thêm SOL Devnet để trả phí giao dịch.",
    "You need more Devnet SOL for transaction fees.",
  ],
  TRANSACTION_CHANGED: [
    "Nội dung giao dịch khác bản đã xem. Giao dịch chưa được gửi.",
    "The transaction differs from the preview. It has not been sent.",
  ],
  UNSUPPORTED_POSITION: [
    "Vị thế này nằm ngoài phạm vi hỗ trợ của MVP. Không tạo phương án thực thi.",
    "This position is outside the MVP's supported scope. Execution is unavailable.",
  ],
  TARGET_AT_LIQUIDATION_THRESHOLD: [
    "Mục tiêu LTV phải thấp hơn ngưỡng thanh lý của vị thế.",
    "The LTV target must be below the position's liquidation threshold.",
  ],
};
export function errorMessage(code: string, locale: Locale) {
  const [name, requestId] = code.split("|");
  return (
    (messages[name] ?? messages.SERVICE_UNAVAILABLE)[locale === "vi" ? 0 : 1] +
    (requestId ? (locale === "vi" ? " Mã yêu cầu: " : " Request ID: ") + requestId : "")
  );
}
export async function postApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(
      path === "/api/demo" || path.startsWith("/api/plans") || path === "/api/portfolio/read"
        ? 65_000
        : 35_000,
    ),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result)
    throw new Error(
      (result?.error?.code ?? "SERVICE_UNAVAILABLE") +
        (result?.error?.requestId ? "|" + result.error.requestId : ""),
    );
  return result as T;
}
