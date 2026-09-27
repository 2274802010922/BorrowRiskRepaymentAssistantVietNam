import type { Locale } from "../../shared/types";
const messages: Record<string, [string, string]> = {
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
  return (messages[code] ?? messages.SERVICE_UNAVAILABLE)[locale === "vi" ? 0 : 1];
}
export async function postApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.code ?? "SERVICE_UNAVAILABLE");
  return result as T;
}
