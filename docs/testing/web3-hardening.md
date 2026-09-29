# Sửa luồng Web3 — 29/09/2026

## Những thay đổi

- API kiểm cấu hình trước khi tải SDK, import SDK trong try/catch để lỗi module được trả JSON. Mọi lỗi API có request ID; log chỉ ghi loại/mã lỗi, không ghi body, khóa, địa chỉ ví hoặc RPC URL.
- Health phân biệt cấu hình hợp lệ về hình thức với market đã kiểm chứng (marketVerified không tự chuyển true). UI có thông báo readiness.
- Phantom chỉ tự khôi phục khi trước đó người dùng đã kết nối và ví còn tin cậy website. Có menu địa chỉ/copy/Explorer/disconnect, phân biệt từ chối và lỗi kết nối.
- Kết nối xong tự đọc vị thế. Refresh không thay ngân sách, dự trữ hoặc mục tiêu. Lọc account theo owner/market và cặp reserve trước khi yêu cầu SDK tính stats, tránh vị thế không được hỗ trợ làm hỏng cả danh sách.
- Preview gắn wallet/source/snapshot/constraints/amount, loại response hết hiệu lực; khóa đầu vào lúc chuẩn bị/ký. Hiển thị số tiền sắp ký và thời hạn. Có đường chuẩn bị lại.
- Repay lưu recovery trước submit và dừng nếu không lưu được; không cắt bỏ các record pending. Auto polling có backoff và giới hạn, sau đó vẫn có kiểm tra thủ công.
- Submit kiểm signature đã tồn tại trước expiry/balance checks để retry không gửi trùng hoặc báo lỗi do số dư đã thay đổi sau giao dịch cũ.
- Status dựa vào receipt lịch sử và message binding; cập nhật vị thế hiện tại tách riêng. Một receipt hợp lệ không bị giữ pending do oracle hiện tại lỗi.
- Setup có rút toàn bộ thế chấp khi debt-free, với simulation/chữ ký riêng. Marker hiện diện không đủ để nói đã vay; phiên đóng cần ví demo khác nếu muốn bắt đầu mới.
- Simulation setup trả thay đổi số dư SOL để người dùng review cùng phí mạng.

## Hạn mức dịch vụ

`RATE_LIMIT_REDIS_URL` và `RATE_LIMIT_REDIS_TOKEN` cấu hình dịch vụ Redis REST tương thích Upstash. Không cần cài thêm package. Lua áp dụng nguyên tử ngân sách toàn ứng dụng: AI 10 yêu cầu/phút và 300/ngày; RPC API 120/phút và 10.000/ngày. Đây là quota request, không phải giới hạn USD; vẫn cần đặt giới hạn chi phí API key bên OpenRouter.

Khi thiếu store chung: RPC/local dùng limiter tốt nhất có thể trong từng process (không phải quota phân tán). **Trên Vercel, AI không gọi provider và dùng template cho đến khi có quota store chung**. Khi store cấu hình nhưng lỗi, không bỏ qua limiter. Không tự tạo tài khoản Redis hoặc đổi cấu hình Vercel khi chưa có phiên đăng nhập.

## Kiểm chứng

Ngày 29/09/2026: format/lint/typecheck PASS; 43 unit tests, 25 Chromium tests và production build PASS. Probe import SDK từ 2.501 file trace độc lập PASS trên Windows. CI chạy probe tương tự trên Linux.

- Unit: readiness, request quá lớn/sai JSON, preview context, lỗi lưu recovery, quota AI, receipt lịch sử khi preview hết hạn/oracle lỗi.
- Browser: API trả JSON 503 thay 500 rỗng khi thiếu cấu hình, kết nối→đọc ví, refresh giữ dữ liệu nhập, reconnect, menu ví, khóa input/loại preview cũ, nhánh rút thế chấp debt-free.
- `scripts/checks/server-bundle.mjs` sao chép đúng file trong Next trace sang thư mục temp độc lập rồi thử import SDK. Không để dependency có sẵn trong repo che lỗi đóng gói.
- Bộ test ví/RPC vẫn có mock. Chưa có private key hoặc chữ ký Phantom thật; chưa có market được cấu hình và nghiệm thu. Không coi các test này là bằng chứng một vòng vay/trả live.

## Ranh giới chưa hoàn tất

- Cần market/reserve/oracle hợp lệ trước khi có demo vay/trả thật.
- Cần đăng nhập Vercel để xem lỗi runtime gốc; API trả lỗi có cấu trúc giúp chẩn đoán lần tiếp theo nhưng không tự chứng minh nguyên nhân 500 cũ.
- Chưa reset obligation id 201 tự động hoặc xử lý lookup table mới cho giao dịch vượt 1232 byte. UI báo chặn và không yêu cầu ký nếu simulation/setup không phù hợp.
- Khôi phục qua thiết bị khác/xóa site data chưa được hỗ trợ; lịch sử local cần giữ tới khi giao dịch kết thúc.
