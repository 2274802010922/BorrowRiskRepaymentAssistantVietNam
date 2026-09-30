# Kiểm tra sau khi ký Phantom — 30/09

Owner báo xác nhận nhưng không thấy thay đổi. Đọc UI thấy TRANSACTION_CHANGED; preview vẫn có, chưa vào submit/recovery. API check mới vẫn stage deposit, collateral/debt 0 và balance 2998111626 lamports. Không coi đây là giao dịch đã gửi hoặc chờ chain.

Baseline browser tests mới: chữ ký trả lại trên message nguyên trạng được submit qua API mock, message sửa blockhash bị chặn. Chưa có signed payload từ lần Phantom thật để biết phần nào thay đổi; không kết luận tài khoản, blockhash hay priority fee theo suy đoán.

Unsigned preview thật có compute-unit limit 1.000.000, chưa có unit-price instruction. [Phantom mô tả điều kiện áp dụng priority fees](https://docs.phantom.com/developer-powertools/solana-priority-fees), nhưng đây không chứng minh ví đã sửa phí trong lần ký này. Không tăng phí, thay mạng hoặc bỏ kiểm byte để ép giao dịch qua.

Thêm signingSnapshot copy độc lập, verifyWalletResult dùng chung cho demo/repay/portfolio: yêu cầu wallet và exact message bytes không đổi. Log local console chỉ ghi fixed context, booleans, changed-field names và byte lengths; không message/transaction/signature/address/binding. Phân biệt WALLET_ACCOUNT_CHANGED với TRANSACTION_CHANGED; computeBudgetOnly giúp nhận diện sửa instruction phí khi các phần khác giữ nguyên.

Setup bỏ preview đã bị thay đổi, kiểm expiry lần nữa sau lúc chờ ví để không lưu/gửi một chữ ký từ preview hết hạn. Backend vẫn kiểm HMAC/message hash/Ed25519 như trước, không nới lỏng guard. Các case chữ ký đúng, account switch, blockhash edit và fee edit đều cần pass/fail đúng.

Cần owner ký lại một preview mới sau deploy để capture wallet_signing_guard nếu còn lỗi. Không yêu cầu private key và không tự ký thay owner. Mocks không đóng live acceptance.

## Lần ký thật sau diagnostics

Chrome console đã ghi: walletMatches=true, messageMatches=false, changedFields=[instructions], computeBudgetOnly=true, message length873→885 (30/09 21:44 giờ VN). Tài khoản/blockhash/account keys/header/lookups và non-budget instructions đều giữ nguyên. Vì vậy đây là thay đổi Compute Budget ở ví, không phải lỗi API đọc market hoặc mất SOL; vẫn chặn trước gửi.

Sửa builder demo và repay: đưa ComputeUnitPrice 1000 micro-lamports vào trước compile/simulation/HMAC, giữ SDK CU limit (thêm limit1m nếu chưa có), bỏ giá cũ trùng để mỗi loại có một instruction. Với limit1m, priority fee1000 lamports cộng base5000; phí mới được RPC getFeeForMessage tính và hiển thị trước ký. Mức6000 vẫn dưới cap50000. Không chấp nhận payload ví sửa; exact bytes + Ed25519/binding vẫn bắt buộc. Cần owner ký preview mới sau deploy để xác nhận Phantom giữ message này.

Local: 77 unit tests, 31 browser tests và build/check PASS. Chưa đóng live acceptance chỉ từ test builder.
