# Kiểm tra sau khi ký Phantom — 30/09

Owner báo xác nhận nhưng không thấy thay đổi. Đọc UI thấy TRANSACTION_CHANGED; preview vẫn có, chưa vào submit/recovery. API check mới vẫn stage deposit, collateral/debt 0 và balance 2998111626 lamports. Không coi đây là giao dịch đã gửi hoặc chờ chain.

Baseline browser tests mới: chữ ký trả lại trên message nguyên trạng được submit qua API mock, message sửa blockhash bị chặn. Chưa có signed payload từ lần Phantom thật để biết phần nào thay đổi; không kết luận tài khoản, blockhash hay priority fee theo suy đoán.

Unsigned preview thật có compute-unit limit 1.000.000, chưa có unit-price instruction. [Phantom mô tả điều kiện áp dụng priority fees](https://docs.phantom.com/developer-powertools/solana-priority-fees), nhưng đây không chứng minh ví đã sửa phí trong lần ký này. Không tăng phí, thay mạng hoặc bỏ kiểm byte để ép giao dịch qua.

Thêm signingSnapshot copy độc lập, verifyWalletResult dùng chung cho demo/repay/portfolio: yêu cầu wallet và exact message bytes không đổi. Log local console chỉ ghi fixed context, booleans, changed-field names và byte lengths; không message/transaction/signature/address/binding. Phân biệt WALLET_ACCOUNT_CHANGED với TRANSACTION_CHANGED; computeBudgetOnly giúp nhận diện sửa instruction phí khi các phần khác giữ nguyên.

Setup bỏ preview đã bị thay đổi, kiểm expiry lần nữa sau lúc chờ ví để không lưu/gửi một chữ ký từ preview hết hạn. Backend vẫn kiểm HMAC/message hash/Ed25519 như trước, không nới lỏng guard. Các case chữ ký đúng, account switch, blockhash edit và fee edit đều cần pass/fail đúng.

Cần owner ký lại một preview mới sau deploy để capture wallet_signing_guard nếu còn lỗi. Không yêu cầu private key và không tự ký thay owner. Mocks không đóng live acceptance.
