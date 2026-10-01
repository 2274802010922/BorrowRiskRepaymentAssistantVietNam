# Sản phẩm và phạm vi

picachu giúp người đã có khoản vay tính số tiền cần trả để đạt mục tiêu trong một kịch bản giá, đồng thời giữ tiền dự trữ. Luồng chính là `/portfolio`: chọn khoản vay → đặt mục tiêu → xem phương án → tự ký → xác minh.

## MVP hiện hành

- Một ví, tối đa ba vị thế cùng cặp SOL/USDC trên Kamino Devnet.
- Ngân sách tối đa, reserve, mức giảm giá và dư địa mặc định 5% tính từ giá sau kịch bản.
- Trả phần cần thiết khi đủ ngân sách; thiếu ngân sách báo shortfall.
- Chuẩn bị/mô phỏng, preview có hạn, kiểm nội dung/chữ ký, gửi từng bước và biên nhận lịch sử.
- Giá/lãi đổi cần xem lại; giao dịch verified không bảo đảm mục tiêu vẫn đạt ở giá mới.
- VI/EN, kết nối ví Phantom, AI hỗ trợ diễn giải số liệu do core tạo.

## Ví dụ minh họa

Nợ65/55/45 USDC; mỗi khoản thế chấp1 SOL × 100 USD; threshold 80%, borrow factor 1, USDC 1 USD; số dư 80. Shock30%, buffer 5%, budget 30, reserve 20: trả11,8 +1,8 +0 =13,6 USDC, còn66,4. Giá token nợ cố định, không tính lãi phát sinh. Đây là synthetic, không phải vị thế trên chain.

## Hướng phát triển

1. Phỏng vấn người vay, kiểm khả năng hiểu mục tiêu/reserve và thao tác ví.
2. Xây liquidation reference model khớp phiên bản program/IDL, rounding, cap, bonus và fee.
3. Chỉ nối allocator vào API/UI sau protocol parity. Bộ tìm kiếm hiện có chỉ được kiểm bằng cost vectors trừu tượng.

Chưa xác minh doanh thu, willingness-to-pay hoặc pilot bên thứ ba. Không custody, mainnet, swap hoặc nhiều protocol trong MVP. `/workspace` giữ luồng đơn và recovery cũ; không còn là ví dụ chính của README.
