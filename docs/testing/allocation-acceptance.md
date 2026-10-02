# Nghiệm thu allocator — 03/10/2026

## Đã có bằng chứng

- 25 vector executable Devnet trong local VM khớp exact; [report](../evidence/liquidation/parity-report.json). Không claim source build match hoặc public liquidation thật.
- Đọc live ba khoản ví test qua adapter canonical refresh; quote ngân sách1 USDC, reserve1, shock45%, buffer5%; compute225ms trên máy Windows Node24.16.0 tại lần ghi nhận. Đây là một sample, không SLA/p95. Dữ liệu/tham số theo thời điểm đọc, không cố định con số này như số dư hiện tại.
- Core baseline/determinism/no-benefit/frozen positions; quote tamper/expiry; journal partial review, wallet change, immutable receipts; allocation cannot bypass legacy submit.
- UI minh họa, unsupported state, explicit partial acceptance và changed-review đã qua các test trình duyệt mục tiêu. Provider trong test ví là mock, không proof Phantom.

## Cổng còn cần đóng trước chốt release

- Full check/build/browser/strict bundle và VI/EN375/768/1024/1440.
- API Vercel quote tạo/prepare/submit/status với signer Devnet riêng, budget/reserve/fee caps và before-after/receipts.
- README/demo/slide và artifact ghi đúng nguồn; CI/deploy và link public xác nhận.

Không gọi các cổng còn mở là đã xong. [Plan active](../harness/plans/active/loss-allocator-v1.md).
