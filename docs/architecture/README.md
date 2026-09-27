# Kiến trúc được chọn

Đối chiếu ngày 27/09/2026: bản của người dùng và kế hoạch end-to-end thống nhất về app không giữ tiền, protocol adapter, core quyết định, người dùng tự ký và Vercel + Devnet.

| Phần         | Quyết định triển khai                                                    | Lý do                                                  |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Tài liệu gốc | Giữ nguyên ở root                                                        | Bảo toàn ý tưởng và lịch sử của người dùng             |
| Kiến trúc    | Next.js app; frontend, core, backend, solana tách trách nhiệm            | Nhẹ cho một người, core kiểm được offline              |
| Tính toán    | Atomic integer + Decimal; borrow factor và threshold là input            | Tránh number float và ngưỡng giả định cho mọi protocol |
| Planner      | Target + phương án tối đa trong ngân sách; partial không đồng nghĩa fail | Người dùng thấy rõ mục tiêu chưa đạt                   |
| UI           | Light terminal từ SkillBridge, VI/EN, drawer mobile                      | Theo yêu cầu đã thống nhất                             |
| Devnet       | Chạy cổng kỹ thuật trước khi công bố tích hợp Kamino                     | Program executable không chứng minh repay hoạt động    |
| Giao dịch    | Simulation → người dùng ký → gửi → xác nhận → đối chiếu                  | Không dùng sự kiện gửi làm bằng chứng nợ đã giảm       |
| AI           | Giải thích có cấu trúc + template fallback                               | Không để AI tạo số tiền hoặc quyết định giao dịch      |
| Mở rộng      | Swap, multi-protocol, automation sau direct repay                        | Giảm phụ thuộc của MVP                                 |

Các con số minh họa trong bản gốc được tính lại, không sao chép thành test oracle. Các trạng thái `synthetic`, `devnet`, `submitted`, `confirmed`, `verified` tách riêng.
