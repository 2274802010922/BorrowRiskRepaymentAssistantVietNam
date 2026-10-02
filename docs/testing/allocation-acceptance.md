# Nghiệm thu allocator — 03/10/2026

## Đã có bằng chứng

- 25 vector executable Devnet trong local VM khớp exact; [report](../evidence/liquidation/parity-report.json). Không claim source build match hoặc public liquidation thật.
- Đọc live ba khoản ví test qua adapter canonical refresh; quote ngân sách1 USDC, reserve1, shock45%, buffer5%; compute225ms trên máy Windows Node24.16.0 tại lần ghi nhận. Đây là một sample, không SLA/p95. Dữ liệu/tham số theo thời điểm đọc, không cố định con số này như số dư hiện tại.
- Core baseline/determinism/no-benefit/frozen positions; quote tamper/expiry; journal partial review, wallet change, immutable receipts; allocation cannot bypass legacy submit.
- UI minh họa, unsupported state, explicit partial acceptance và changed-review đã qua các test trình duyệt mục tiêu. Provider trong test ví là mock, không proof Phantom.

## Vercel và vòng Devnet thật — 03/10 giờ Việt Nam

- Checkpoint `9fc07ff` đã Quality37066106588/Vercel success. Health allocator available/modelVerified true; quote vẫn kiểm scope/program mỗi request.
- Ví test riêng đã ký một bước partial qua API/journal Vercel, không popup Phantom. Budget tối đa1 USDC, reserve1, shock45%, buffer5%. Quote/preview đổi amount được review lại.
- Trả0,780982 USDC vào khoản `8PpZyrJaWYNyYduWyihN4Hf6vQWppzwVgfHvyGgrqx4K`, fee quote6000 lamports. Signature [2HL9xJn…](https://explorer.solana.com/tx/2HL9xJn4h59Z5gUxfDmJDUVedVpbjQYpKx8MWrTcZu3T5sWUbto1K5boayZz2L1PTjrfon39kLb8MXw4znYUosPB?cluster=devnet).
- Journal verified, cursor1; USDC17,401774 xuống16,620792, debit chính xác780982 atomic. Nợ khoản đó5,403781 xuống4,622799 USDC. Các số là lịch sử thời điểm vòng test, không số dư hiện tại hay đo tổn thất thanh lý thực tế.
- Full local:158 unit,45 browser, build25 routes; strict traced demo/allocator bundles2504/2505 PASS. VI/EN375/768/1024/1440 không overflow và ảnh đã xem. [Report](../evidence/devnet/allocator-cycle-2026-10-03.json).

## Cổng còn cần đóng trước chốt release

- README/demo/slide và artifact ghi đúng nguồn; CI/deploy và link public xác nhận.

Không gọi các cổng còn mở là đã xong. [Plan active](../harness/plans/active/loss-allocator-v1.md).
