# Kiểm tra tổ chức repository — 01/10/2026

Trạng thái: kiểm tra local PASS; CI/Production và Release đang chờ checkpoint push.

- 92 file chuyển bằng git mv; nguồn app/frontend/backend/core/solana/shared dưới src.
- Kiến trúc gốc SHA256 d913c2f341f4800a6d0c9a714b5474824a9dcd440f17adac215cf7054236b670, byte-for-byte preserved.
- Format/lint/typecheck, 87 unit tests, production build đủ22 route và 32 browser tests PASS, gồm VI/EN375/768/1024/1440 và axe.
- Strict CJS traced bundle:2504 file, SDK_IMPORT_OK, configured route đi tới DEVNET_UNAVAILABLE trong offline RPC probe; không generic import fail.
- Toàn bộ liên kết Markdown/docs/asset đã kiểm; số lượng được xuất bằng scripts/check-readme.mjs và cổng này được thêm vào CI.
- About/homepage/topics đã cập nhật qua GitHub CLI. Social preview file đã tạo; Chrome/CDP timeout khi mở upload, chưa áp dụng setting. Không đổi quyền, visibility hoặc branch protection.
- Video MP4/ZIP chuẩn bị phân phối qua Release v0.1.0-demo; không commit file dựng hoặc thư mục work.
- Không ký hoặc gửi giao dịch trong đợt decor này.
