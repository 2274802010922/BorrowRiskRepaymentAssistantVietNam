> Lịch sử trước đợt tổ chức repo ngày 01/10/2026. Không dùng các trạng thái cũ làm kết luận hiện tại.

# Vòng demo Devnet — 30/09

## Cập nhật 01/10 — tạo khoản vay đã xác minh

### Trả nợ đã xác minh sau deploy `7d398c0`

Runner hoàn thành kế hoạch với hai bước cần trả, status cuối `verified`; không tạo giao dịch cho khoản đã đủ dư địa. B trả 0,602589 USDC ([receipt](https://explorer.solana.com/tx/5YkipLcKg9iSxZKp5T5RGd3m9sXL8aW4dTN6VufaZegnah6biR1iQyajvJtvVw85v2ZHDiVw1VHPbkTwfZTQ6s7p?cluster=devnet)); A trả 1,804167 USDC ([receipt](https://explorer.solana.com/tx/bPmKs9uF853gHDbFNYdJ26u269K2nwJQ8RQqysiqaDqMFGZRv2CEKd4LDce9kV5zJ61ztvKy3QQGfFDUtAKyVFp?cluster=devnet)). Tổng 2,406756 USDC, ví còn 17,401774 USDC, reserve tối thiểu 1 USDC được giữ. Bước thứ hai có quote đổi và runner kiểm/review giới hạn gốc trước ký. [Report](../../evidence/devnet/devnet-repayments.json).

Lần đọc riêng sau receipt lúc `2026-09-30T17:12:27Z` (01/10 giờ Việt Nam) có dư địa A4,9285%, B4,9600%, C14,4355% do giá/lãi đổi tiếp. Cần thêm 0,007041 USDC để đạt đúng 5% tại snapshot đó; không gửi thêm giao dịch tự động. [Snapshot sau trả](../../evidence/devnet/devnet-goal-after.json). UI bổ sung kiểm mục tiêu bằng dữ liệu mới sau phase verified, phân biệt receipt thành công với mục tiêu ở giá hiện tại.

Quality CI [36749375123](https://github.com/2274802010922/picachu__/actions/runs/36749375123) và Vercel Production của `7d398c0` PASS. Public API/journal/receipt đã nghiệm thu bằng test signer, không suy ra popup Phantom đầy đủ. Allocator/model parity vẫn mở.

Sau bản retry `bacb45c`, runner xác minh cả ba deposit 0,1 SOL và ba borrow: A 7,805461 USDC, B 6,601894 USDC, C 5,401175 USDC. Sáu signature/position/fee có trong [report công khai](../../evidence/devnet/devnet-created-three-positions.json). Không chứa key, binding token hoặc raw transaction. Đây là test signer riêng qua API triển khai thật, không phải kiểm popup Phantom.

Bước trả nợ đầu tiên dừng PLAN_CHANGED trước ký vì giá/lãi đổi số atomic giữa create và prepare. Refresh mới chỉ thay các bước chưa gửi, giữ receipt cũ và kiểm tổng không vượt budget/reserve. UI hiển thị tổng mới, cần checkbox review trước ký; submit kiểm reviewAccepted khi quote đổi. Repeated prepare không xóa yêu cầu review. Số dư ví đổi hoặc bước đã đạt mục tiêu cần lập lại; không tự replay khoản đã trả. Biên nhận xác minh giao dịch không bảo đảm mục tiêu vẫn đạt khi giá tiếp tục đổi.

Local: 87 unit tests, 31 browser tests toàn bộ + 5 portfolio tests có review mới, check/build PASS. Chưa có receipt trả nợ tại checkpoint này.

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

Diagnostics mới xác nhận RPC_HTTP_429 từ web3 transport ở submit (request35e31714-cd11-45f8-87ea-4dbaf98d47cb). Signed transaction mô phỏng sigVerify=true trên public RPC từ máy PASS. Bổ sung retry chỉ cho429, tối đa4 attempts/delays1,5–3–6s trong deadline15s, giữ nguyên payload/chữ ký; không retry arbitrary network failures. Kit giữ serialization của transport chuẩn, retry typed statusCode429. Connection tái dùng theo URL để bớt constructor/genesis requests; genesis guard vẫn gọi.

Local verify: 84 unit tests +31 browser tests, build/check PASS; thêm case Kit retry kiểm riêng PASS. Chờ nghiệm thu relay sau deploy, chưa kết luận dedicated RPC không còn cần.
