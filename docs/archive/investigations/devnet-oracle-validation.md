# Kiểm chứng oracle và simulation Devnet — 29/09/2026

## Nguyên nhân SDK báo invalid

SDK Kamino 11.0.1 tại `utils/oracle.ts` chia price theo exponent nhưng giữ confidence ở đơn vị số nguyên rồi so sánh. Pyth dùng cùng exponent cho cả hai.

Đã đối chiếu account Pyth Receiver trên Devnet: owner đúng `rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ`, verification=Full. Ví dụ SOL price raw 11940134390, confidence raw 1790711, exponent -8: giá 119,4013439 USD và confidence 0,01790711 USD. Confidence khoảng 0,015%, dưới ngưỡng 2%; so sánh lẫn đơn vị của SDK trả false.

Adapter mới chỉ áp dụng chuẩn hóa cho reserve chỉ cấu hình Pyth. Vẫn kiểm owner, Full verification, giá dương, confidence dưới 2%, TWAP khi được bật. Không sửa node_modules, không bỏ kiểm tra oracle hoặc gán valid cho mọi nguồn.

Nguồn: [Pyth fixed-point representation](https://docs.pyth.network/price-feeds/core/best-practices), [Kamino SDK oracle implementation](https://github.com/Kamino-Finance/klend-sdk/blob/master/src/utils/oracle.ts).

## Tuổi giá

Giới hạn được đọc riêng từ cấu hình từng reserve, tối đa một ngày; không áp ngưỡng 60 giây chung cho SOL và USDC. Cặp kiểm thử có giới hạn SOL=120 giây, USDC=86400 giây. Đây là cấu hình on-chain của market Devnet. Giá quá giới hạn vẫn bị chặn; giá cũ hơn 5 phút nhưng còn trong giới hạn được cảnh báo rõ cùng timestamp trong setup/workspace. Không gọi dữ liệu đó là realtime.

## Bộ địa chỉ đã kiểm tra

```dotenv
KAMINO_MARKET_ID=9VaMhQPqEjQSByvZfjYFP6iiJLZFKzXTE5MNK9bDg1dr
KAMINO_COLLATERAL_RESERVE=5jKCbPgqtJXbWfwi5zERhSmK16jrGuXdkicYekk1maVF
KAMINO_DEBT_RESERVE=6DndsViDZXLSsQoq9JxCFijdr91Q3uAXoRsHRqjvxFE6
```

SOL mint: `So11111111111111111111111111111111111111112`; debt mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`. Các địa chỉ reserve không phải mint.

Với public wallet do người dùng cung cấp, đã kiểm trạng thái deposit, số dư đủ và **simulation deposit 0,1 SOL PASS**, phí mạng dự kiến 5000 lamports. Không ký hoặc gửi giao dịch. Borrow/repay/withdraw chưa được nghiệm thu thật; simulation bước vay cần chạy sau khi người dùng ký deposit và vị thế được ghi trên chain.

Lệnh tái hiện chỉ đọc/simulate:

```sh
npx tsx scripts/checks/simulate-demo.ts <public-wallet> 9VaMhQPqEjQSByvZfjYFP6iiJLZFKzXTE5MNK9bDg1dr 5jKCbPgqtJXbWfwi5zERhSmK16jrGuXdkicYekk1maVF 6DndsViDZXLSsQoq9JxCFijdr91Q3uAXoRsHRqjvxFE6
```

Script dùng secret tạm trong process để tạo preview phục vụ probe; không in secret/token/transaction và không thay secret Vercel. Cần chạy lại kiểm tra tại thời điểm demo vì giá, thanh khoản và cấu hình market có thể đổi.
