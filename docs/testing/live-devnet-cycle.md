# Vòng demo Devnet — 30/09

Owner đã cho phép tự test/xác nhận giao dịch thử trên Devnet. Không lưu thông tin mở khóa ví vào repo, env hoặc log. Không thực hiện trên mainnet.

## Thế chấp đã nghiệm thu

Vị thế slot201 `BLTZxEYz32BNieH7SKEkxgSgN9LmzRMrnf7wb5jwe1nJ` có collateral100000000 atomic =0,1 SOL, debt0. Signature deposit `4FrX7XgLuYr4htxkP8FpumBUAbQjGapk6ymqTBnhews9DmzNUNTBw3W4VKyiv7PmyMkYanm5oSCtLzpHymQ5XQis`, slot505941999, finalized, err=null. Balance từ2,998111626 thành2,874575066 SOL; debit0,12353656 khớp quote mới gồm fee6000 lamports/rent. UI chuyển sang borrow và verified.

## Lỗi quote vay khi giá đổi

Số gợi ý readonly là cap tại check. Price đổi trước prepare có thể làm cap mới thấp hơn và equality check cũ báo INVALID_INPUT. Sửa profile prepare lấy min(cap đã hiển thị, profile cap mới), không tăng principal, vẫn review/simulate/bind số cuối trước ký.

Sau khi ký, không sửa số đã ký và không so lại equality với nominal profile từ oracle đã đổi; kiểm fresh conservative protocol cap (98% maxLTV có borrow factor), liquidity và trần demo100USDC, rồi preflight protocol trước broadcast. Có price freshness/binding/signature/marker như trước. Manual input ngoài profile vẫn strict tại prepare.

Đang nghiệm thu borrow/repay, chưa đánh dấu các phần đó thành công từ deposit hoặc mocks.

## Ví và runner tự động

Owner cấp5 SOL Devnet cho ví test `3kHRwxR1vgCiyNRLozyQU3NWEv3hR54Cc5rsvreyFmRo`. Key test chỉ nằm trong thư mục work/private bị gitignore; không dùng thông tin unlock Phantom trong runner. Công cụ Chrome không truy cập được popup Phantom, nên test API với signer Devnet riêng để giảm thao tác của owner.

`scripts/checks/automated-devnet-cycle.ts --wallet-file=PATH` mặc định chỉ đọc; thêm `--execute-devnet` mới ký/gửi. Kiểm genesis+health Devnet, payer/signer/program, fee cap, principal cap, giữ pending trước submit và bounded receipt polling. Unknown dừng không resubmit; expired phải được chain/status chứng minh rồi mới archive và tạo quote mới. Report public không chứa token/binding/transaction/key.

Lần đầu SDK signed simulation PASS nhưng API submit trả503 generic ở web3 HTTP transport. Signature `45YAayfbGDFKtX4P9sCMZQFiudyMoPkFv8i4kixk6CGQDQR5H6ZckFtbZVXuTnKf8NwC9t2WBbqoWpsJ42JdHTQH` đã kiểm phase expired; không coi là submitted hoặc confirmed. Đang thêm HTTP status từ error prefix vào safe diagnostics để xác định lỗi relay RPC. Chưa có receipt tạo vị thế cho ví test này.
