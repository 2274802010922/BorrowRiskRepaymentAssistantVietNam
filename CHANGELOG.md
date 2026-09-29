# Changelog

## 2026-09-29 — sửa luồng Web3

- API lỗi có JSON/request ID; kiểm cấu hình trước khi tải SDK và kiểm bộ file đóng gói trên CI.
- Khôi phục ví đã tin cậy, menu ví, tự đọc vị thế và giữ ngân sách/dự trữ khi refresh.
- Chặn preview cũ, lưu recovery trước gửi, polling có backoff và xác minh bằng receipt lịch sử.
- Thêm rút thế chấp debt-free; marker đơn thuần không được xem là bằng chứng đã vay.
- Giới hạn request; AI trên Vercel dùng template khi thiếu quota store chung.

## 2026-09-28 — picachu

- Đổi UI sang picachu, giữ light terminal, thêm điều hướng quy trình và trang thiết lập demo.
- “Kết nối ví” dùng Phantom trong MVP; ký deposit/borrow Devnet riêng, khôi phục pending và xác minh.
- Giải thích ngắn từ dữ kiện, AI một nhận xét ngắn; định dạng số token gọn và đúng độ chính xác.
- Thêm test lỗi transaction/expiry/recovery và tài liệu giới hạn nghiệm thu Devnet.

## Unreleased

- Đối chiếu kiến trúc người dùng với MVP có cổng kiểm chứng.
- Thêm core tính toán bằng atomic units/Decimal, planner và các test ràng buộc.
- Thêm UI light terminal VI/EN kế thừa cấu trúc SkillBridge, không kế thừa nghiệp vụ.
- Thêm đường SDK/API cho khoản vay và repay; live verification còn mở.
- Thêm context, workflow, browser/a11y harness và CI.
