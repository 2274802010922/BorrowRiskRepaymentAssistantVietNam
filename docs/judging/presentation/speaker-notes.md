# Lời thuyết trình

## Bản khoảng5 phút

1. **Mở đầu,20s.** Picachu giúp người đã có khoản vay tính số cần trả theo mục tiêu và giữ tiền dự trữ. Tôi phát triển một mình với Codex hỗ trợ. Demo dùng Kamino Devnet.
2. **Bài toán,25s.** Khi giá giảm, người vay phải quyết định số trả trong lúc vẫn cần giữ USDC. Một chỉ số health không trả lời trực tiếp số tiền cần chi cho toàn bộ khoản đã chọn. Đây là đối tượng mục tiêu, chưa phải kết quả khảo sát.
3. **Luồng,20s.** Chọn các khoản, đặt ngân sách/dự trữ/kịch bản, xem tổng và từng khoản. UI ghi rõ nguồn minh họa và Devnet.
4. **Ví dụ,30s.** Với giả định trên slide, A cần11,8, B1,8, C0. Tổng13,6, còn66,4. Không cần chi hết ngân sách30. Giả định giá token nợ cố định, chưa tính lãi mới và phí.
5. **Demo,60s.** Mở planner, đổi budget10 để thấy shortfall. Tạo draft và xem lại trước apply. Đối chiếu receipt trong đoạn cuối hoặc dùng proof lịch sử. Video không quay ký Phantom; nói rõ source trước khi chiếu.
6. **Ranh giới thực thi,25s.** Quote mới cần review. Server kiểm message/chữ ký/expiry; chờ receipt verified trước bước sau. Unknown giữ tiến độ để kiểm, không gửi lại mù.
7. **Kiến trúc,25s.** Core dùng atomic/Decimal, API/Redis quản lý preview/journal, ví giữ khóa. Kamino thực thi contract. Chúng tôi tích hợp protocol, không nhận công xây Kamino.
8. **AI,20s.** AI hỗ trợ đọc goal và nhận xét ngắn. Chỉ các mệnh đề mục tiêu được gửi đến provider. Giá trị phải khớp explicit input; source rules/template có nhãn. AI không chọn allocation hoặc ký.
9. **Khác biệt,20s.** Các giải pháp hiện có đã có health/scenario/repay. Picachu tập trung shared budget/reserve và thực thi từng bước. Khi thiếu tiền, allocator so chi phí một lượt theo cùng dữ liệu;25 vector đã khớp executable Devnet trong VM.
10. **Business,20s.** Giả thuyết là free planner rồi monitoring/API integration. Chưa có doanh thu, pilot hoặc willingness-to-pay được xác minh.
11. **Phạm vi,20s.** Có proof VM và receipt API test riêng. Bước tiếp là theo dõi và mở nhánh sau kiểm chứng. Giữ một ví, tối đa ba khoản/cặp SOL/USDC; không claim tối ưu global hay source build match.
12. **Kết,15s.** Mời giám khảo mở app và kiểm repo/receipt. Tổng script có thể rút bằng cách giữ demo và đưa chi tiết vào Q&A.

Thời lượng là phân bổ diễn tập, không cam kết đúng từng giây. Không chạy clip4:50 cùng toàn bộ speech trong slot5 phút.

## Bản khoảng3 phút

Giữ slides1–5 khoảng100s gồm đoạn thao tác ngắn; slide6–8 khoảng40s; slide9–12 khoảng40s. Nêu một quyết định kỹ thuật và một giới hạn, không đọc toàn bộ bảng. Nếu slot đổi, ưu tiên sản phẩm đang chạy và nguồn proof.

## Cách nhấn theo track

- Technical Build: dành thêm thời gian cho quote binding, Redis CAS, immutable receipts và ranh giới authority; dùng source/evidence để phản biện.
- Product & Business: nói rõ đối tượng, tình huống budget/reserve, khác biệt workflow và buyer hypothesis. Không đưa customer counts giả để lấp khoảng trống.

Các notes có citations sâu hơn trong PPTX. Không kể walkthrough synthetic thành live borrower data hoặc receipt cũ thành transaction vừa gửi.
