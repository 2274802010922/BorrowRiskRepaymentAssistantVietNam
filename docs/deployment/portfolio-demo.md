# Demo phương án trả nhiều khoản vay

1. Deploy commit mới trên main. Vercel vẫn dùng Next.js/root hiện tại. `/api/health` có `portfolioPlanStoreConfigured=true` khi hai biến Redis có mặt; đây không phải kiểm tra kết nối Redis. Không cần thêm tên biến mới.
2. Ba biến Kamino phải có giá trị Devnet đã probe/simulation; xem [kiểm chứng oracle](../testing/devnet-oracle-validation.md). Health thiếu cấu hình không cho vay/trả thật. Giữ `PLAN_BINDING_SECRET` ổn định, server-only. Không gửi secret/API key vào chat hoặc GitHub.
3. Mở `/portfolio` không ví: ví dụ A/B/C có nợ 65/55/45 USDC, thế chấp mỗi khoản 1 SOL × 100 USD, threshold 80%, factor 1. Shock 30%, buffer 5%, ngân sách 30, reserve 20, số dư 80. Cần trả 11,8 + 1,8 + 0 = 13,6 USDC, còn 66,4. Đây là synthetic, không phải profile live 0,1 SOL.
4. Kết nối Phantom ở Devnet. `/setup` → chọn Danh mục A → kiểm tra → thế chấp 0,1 SOL → ký → đọc lại → vay profile từ giá thật → ký → xác minh. Lặp với B (202), C (203). Tổng thế chấp 0,3 SOL; giữ thêm ít nhất 0,05 SOL cho phí/rent. Preview hiển thị phí và tổng SOL debit của từng transaction, chưa cam kết tổng phí của sáu giao dịch.
5. Profile A/B/C nhắm adjusted LTV 65/55/45%. Không tự tăng số vay, chuyển market hay thay profile nếu simulation/cap không cho phép. A chia sẻ slot 201 với phiên cũ: nếu đã có marker thì không vay lại; có thể dùng khoản đang có hoặc thử B/C, không xóa marker giả reset.
6. `/portfolio` → chọn các vị thế → reserve/ngân sách/shock → xem tổng và từng khoản. Đủ ngân sách mới chuẩn bị. Xem amount/fee/expiry → ký một lần → đợi verified → đọc lại → chuẩn bị bước sau. Giá/lãi thay đổi có thể yêu cầu phương án mới; các receipt trước vẫn giữ.
7. Thử reload sau gửi: nhật ký sẽ khôi phục. Unknown chặn bước sau; dùng Kiểm tra kết quả. Không ký lại vì chưa thấy Explorer ngay.
8. Ghi signature, position, nợ trước-sau và URL/commit. Kiểm cả reserve và trường hợp từ chối ký. Unit/browser mocks không thay vòng vay/trả thật.

Allocator đang tắt vì chưa hoàn tất liquidation parity. Thiếu ngân sách chỉ báo cần thêm, chưa có đề xuất partial hoặc claim giảm chi phí thanh lý.
