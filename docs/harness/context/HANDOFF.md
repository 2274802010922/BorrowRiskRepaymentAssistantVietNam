# Bàn giao

Checkpoint MVP đã qua `npm run verify`: 20 unit tests, 17 browser tests, format/lint/types và production build. Không cần làm lại bootstrap. Repo chứa code end-to-end; live acceptance còn mở, không được suy từ test fixture.

Người dùng nhận phần deploy/test thủ công. Bắt đầu từ [checklist](../../deployment/manual-acceptance.md), dùng đúng branch/commit đã push. Chưa có Vercel project, AI key, dedicated Devnet RPC hoặc repay signature được nghiệm thu trong phiên này.

Khi có kết quả live: ghi URL/commit, market/reserve đã xác minh, signature + số nợ trước/sau; sửa lỗi thực tế, chạy lại kiểm thử liên quan, cập nhật CURRENT_STATE và commit/push checkpoint. Giữ bản kiến trúc root nguyên trạng và không merge main khi chưa có yêu cầu.

Giới hạn: một vị thế Kamino được chọn từ ví; không tự mở khoản vay, không swap; classic SPL debt 6 decimals; AI tắt mặc định, cần rate/billing controls trước khi bật. Public RPC đã timeout; không lặp vô hạn probe hoặc thay bằng mainnet. Audit transitive còn 21 cảnh báo.
