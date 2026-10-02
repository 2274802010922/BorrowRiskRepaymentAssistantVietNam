# Lối đọc dành cho giám khảo

[Deck 12 slide, PDF, lời thuyết trình và Q&A](presentation/README.md).

[Dùng thử](https://picachu-iota.vercel.app/portfolio) · [Xem video trên YouTube](https://www.youtube.com/watch?v=Uw-04c9cROQ) · [Tài liệu demo](../demo/README.md) · [Evidence Devnet](../testing/live-devnet-cycle.md)

| Track                   | Điều có thể kiểm                                                                                            | Đường dẫn                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Best Product & Business | Vấn đề người vay, mục tiêu/reserve, luồng dễ hiểu, phạm vi và giả thuyết tiếp theo                          | [Sản phẩm](../product/README.md), [video](../demo/README.md), [UI](../assets/screenshots/README.md)                                                    |
| Best Technical Build    | Atomic/Decimal, shared balance, bounded quote review, simulation/binding, ký tuần tự và historical receipts | [Kiến trúc](../architecture/goal-portfolio.md), [core](../../src/core/), [giao dịch](../../src/solana/transactions/), [kiểm thử](../testing/README.md) |

## Kiểm chứng trong ba phút

1. Ví dụ minh họa: ba nợ 65/55/45, SOL 100 USD, collateral 1 SOL mỗi khoản, threshold 80%, factor 1; shock 30/buffer 5/budget 30/reserve 20.
2. Kết quả13,6 USDC, còn66,4; budget10 thì thiếu3,6. Chọn “Xem cách phân bổ tiền” để xem phương án một phần và bảng baseline. Dữ liệu minh họa không tạo giao dịch.
3. Đọc ba deposit/ba borrow/hai repay đã verified trên Devnet qua API triển khai và test signer riêng.
4. Đối chiếu [CI](https://github.com/2274802010922/picachu__/actions/workflows/quality.yml), unit/e2e tests và giới hạn trong tài liệu.

## Ranh giới claim

- Owner báo thao tác Phantom thủ công ổn ngày 01/10; đây là owner-reported acceptance, không phải video agent quay popup hoặc bộ receipt độc lập mới.
- AI đã được owner xác nhận gọi live; không dùng AI tạo số tiền hay điều khiển ký.
- Allocator v1 có25 vector khớp executable Devnet trong VM, phạm vi solvent/price-triggered/không e-mode. Source build match chưa có. [Evidence](../evidence/liquidation/README.md), [nghiệm thu](../testing/allocation-acceptance.md); không claim tối ưu toàn cục hoặc mọi cấu hình Kamino đều hỗ trợ.
- Không công bố doanh thu, người dùng trả tiền, pilot hoặc hiệu quả giảm thanh lý chưa đo.

Tài liệu này là bản đồ evidence của picachu, không tự gán điểm hoặc thay rubric của cuộc thi.
