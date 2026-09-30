# Phương án trả nợ có mục tiêu — 30/09/2026

Người dùng chốt: giữ picachu; UI light terminal đơn giản; 1–3 khoản vay cùng ví/cặp SOL–USDC trên Kamino Devnet; hai track UniHackFest. Một người cùng Codex, ưu tiên MVP hoàn chỉnh trước 2–3/10. Đã cho phép triển khai và commit/push main bằng tiếng Việt.

## Thứ tự và cổng nghiệm thu

1. Vòng vay/trả một vị thế thật: người dùng ký deposit, borrow, repay và giữ signature/nợ trước-sau. Simulation không thay bằng chứng này.
2. Mục tiêu dễ hiểu: reserve, ngân sách tối đa, shock và dư địa mặc định 5% từ giá đã giảm. Chỉ trả số tối thiểu để đạt mục tiêu.
3. Danh mục tối đa ba vị thế: một số dư chung, chọn khoản vay, tổng số tiền; demo slots 201/202/203; ký tuần tự, nhật ký Redis, chặn unknown và phục hồi reload.
4. Mô hình một lần thanh lý: close factor, khoản vay nhỏ, bonus, fee, cap, cToken và rounding theo protocol. Chứng minh tương thích program/IDL, parity vectors và simulation/local validator trước khi công bố tổn thất.
5. Allocator: giảm tổng chi phí thanh lý + phí mạng, rồi ưu tiên giá trị thế chấp đạt mục tiêu, ít chi và ít chữ ký. Tìm trên lưới hữu hạn tối đa 201 mức/vị thế, không quảng bá tối ưu toàn cục. So với không làm gì/chia đều/worst-first trên cùng snapshot.
6. Ngân sách thiếu: shortfall rõ ràng; chỉ đề xuất partial sau khi bước 4 hoàn thành, người dùng phải chọn rõ trước khi ký. Không dùng max-min buffer thay objective đã chốt.
7. Đóng gói: VI/EN, 375/768/1024/1440px, a11y, core/failure/browser tests, README, walkthrough 3 phút, ngữ cảnh và main.

## Trạng thái thực thi

- Đã có code mục tiêu/danh mục, nhật ký kế hoạch, ký tuần tự, slot demo và bộ tìm kiếm độc lập.
- Bộ tìm kiếm được kiểm bằng các cost vector trừu tượng. Chưa có cost vector Kamino đã chứng minh parity; không đưa module này vào đường khuyến nghị.
- Quyết định fallback đã được người dùng chốt: nếu chưa kiểm chứng tổn thất, ẩn allocator; giữ mục tiêu trả nợ đã kiểm. Không bật bằng một env boolean để bỏ qua kiểm chứng.
- Nghiệm thu Phantom thật và model parity vẫn mở. Không đánh dấu hoàn thành toàn bộ kế hoạch từ unit/browser mocks.

## Phạm vi không thêm

Không custody, auto-sign, mainnet, swap, xác suất dự báo, thanh lý dây chuyền, nhiều protocol, marketing/traction giả. Giữ nguyên bản kiến trúc gốc và code AI người dùng đã xác nhận hoạt động.
