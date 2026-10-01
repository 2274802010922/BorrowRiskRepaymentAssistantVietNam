# Vòng vay và trả nợ thật trên Devnet

Ngày 01/10/2026 giờ Việt Nam. Nguồn: API Vercel + test signer riêng, không dùng key/password Phantom của owner. Mạng Devnet, token không có giá trị tiền thật.

## Kết quả đã đối chiếu

| Hoạt động        | Kết quả                                                       |
| ---------------- | ------------------------------------------------------------- |
| Tạo vị thế       | Ba deposit 0,1 SOL và ba borrow đã verified                   |
| Vay A/B/C        | 7,805461 /6,601894 /5,401175 USDC                             |
| Trả nợ           | B 0,602589 và A 1,804167 USDC; không trả thêm cho C           |
| Tổng đã trả      | 2,406756 USDC                                                 |
| Ví sau trả       | 17,401774 USDC; cao hơn reserve 1 USDC                        |
| Nhật ký kế hoạch | Status verified; bước2 có quote mới và đã review giới hạn gốc |

- [Receipt B](https://explorer.solana.com/tx/5YkipLcKg9iSxZKp5T5RGd3m9sXL8aW4dTN6VufaZegnah6biR1iQyajvJtvVw85v2ZHDiVw1VHPbkTwfZTQ6s7p?cluster=devnet)
- [Receipt A](https://explorer.solana.com/tx/bPmKs9uF853gHDbFNYdJ26u269K2nwJQ8RQqysiqaDqMFGZRv2CEKd4LDce9kV5zJ61ztvKy3QQGfFDUtAKyVFp?cluster=devnet)
- [Report tạo vị thế](../evidence/devnet/devnet-created-three-positions.json) · [report trả nợ](../evidence/devnet/devnet-repayments.json)

Checkpoint giao dịch: 7d398c0. CI [36749375123](https://github.com/2274802010922/picachu__/actions/runs/36749375123) và Production PASS; checkpoint UI kiểm mục tiêu sau trả:360e17f.

## Đọc lại mục tiêu

Snapshot sau receipt lúc 2026-09-30T17:12:27Z có dư địa A 4,9285%, B 4,9600%, C 14,4355%; cần thêm 0,007041 USDC để đạt 5% theo giá/lãi mới. Không tự gửi tiếp. [Snapshot](../evidence/devnet/devnet-goal-after.json).

Biên nhận lịch sử chứng minh giao dịch, không bảo đảm mục tiêu giữ nguyên sau đó. UI đọc lại dữ liệu riêng sau verified, báo chưa xác nhận nếu đọc lỗi. [Nghiệm thu owner](manual-acceptance-2026-10-01.md) là nguồn riêng.

## Giới hạn

Không mainnet, không quay popup Phantom trong video, chưa liquidation parity/allocator. Pending unknown không gửi lại; receipt đã verified không replay. Lịch sử deposit owner, oracle, priority fee, quote race và RPC429 nằm trong [archive](../archive/investigations/live-devnet-history.md).
