# Kiểm tra biến môi trường trước demo

Cập nhật bước Kamino: đã có [bộ địa chỉ và bằng chứng simulation deposit](../archive/investigations/devnet-oracle-validation.md). Cần dùng bản code có adapter chuẩn hóa Pyth trước khi điền các địa chỉ này; chưa coi simulation là giao dịch đã gửi.

Đối chiếu bản đang chạy ngày 29/09/2026: giao diện hoạt động; `executionConfigured=false`; thiếu ba biến Kamino ở runtime; `aiConfigured=true` nhưng `aiSharedBudgetConfigured=false`. Giá trị bị che trong ảnh dashboard không chứng minh một biến đã được điền đúng. Biến Sensitive có thể không cho xem lại giá trị dù đã có.

| Biến                       | Cách điền / kiểm tra                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| NEXT_PUBLIC_SOLANA_CLUSTER | `devnet`. Không dùng mainnet.                                                                                            |
| SOLANA_RPC_URL             | Endpoint Solana Devnet; ví dụ `https://api.devnet.solana.com`. Cần kiểm kết nối thực tế; có thể bị rate limit.           |
| KAMINO_MARKET_ID           | Market Devnet đã xác minh; không dùng địa chỉ bất kỳ chỉ để health chuyển true.                                          |
| KAMINO_COLLATERAL_RESERVE  | Reserve SOL/wSOL thuộc đúng market.                                                                                      |
| KAMINO_DEBT_RESERVE        | Reserve token classic SPL 6 decimals thuộc đúng market.                                                                  |
| PLAN_BINDING_SECRET        | Ít nhất 32 ký tự ngẫu nhiên, server-only; giữ ổn định khi còn giao dịch pending. Health hiện không báo thiếu/sai độ dài. |
| AI_ENABLED                 | `true` để thử provider sau khi có quota store; `false` dùng template.                                                    |
| AI_MODEL                   | Model ID đầy đủ trên OpenRouter hỗ trợ structured outputs.                                                               |
| OPENROUTER_API_KEY         | Key OpenRouter, server-only, Sensitive. Có key không chứng minh provider gọi thành công.                                 |
| RATE_LIMIT_REDIS_URL       | URL REST HTTPS của Redis tương thích Upstash; không dùng chuỗi kết nối `redis://`/`rediss://`.                           |
| RATE_LIMIT_REDIS_TOKEN     | REST token đọc/ghi của cùng database; không dùng read-only token vì limiter cần INCR/EXPIRE. Server-only, Sensitive.     |

Hai biến Redis được bổ sung trong đợt sửa Web3 để giới hạn lượt gọi trên nhiều Vercel Function. Thiếu chúng không làm UI/planner hỏng; AI trên Vercel chủ động dùng template. Lấy REST URL/token tại dashboard database Upstash, đặt vào hai tên env mà ứng dụng dùng ở trên. Không gửi token vào chat/Git.

Sau khi cập nhật biến, chọn đúng Production/Preview và redeploy. Health chỉ xác nhận có cấu hình đúng hình thức; `marketVerified=false` không tự đổi chỉ vì đủ env. Bước setup mới kiểm RPC, program, market, oracle và simulation.

Nhãn “Needs Attention” trên dashboard cần mở chi tiết mới xác định được nguyên nhân. Chỉ từ ảnh không kết luận secret bị sai; có thể cần xem khuyến nghị Sensitive. Không tự xóa/đổi secret đang dùng nếu chưa xử lý các giao dịch pending.

Nguồn: [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables), [Sensitive variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
