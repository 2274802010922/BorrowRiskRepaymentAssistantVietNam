# Kiểm tra và phạm vi nghiệm thu

Baseline allocator03/10: **158 unit +45 browser**, build25 routes, strict bundle và CI/Vercel PASS; [nghiệm thu](allocation-acceptance.md). Sprint hiện tại thêm regression BN và evidence tái tạo; kết quả cuối ghi trong [nghiệm thu hồ sơ](final-repo-polish-2026-10-03.md). Checkpoint87/32 ngày01/10 là [lịch sử reorganization](../evidence/validation/repository-reorganization.md), không phải số hiện hành.

| Cổng                     | Lệnh / bằng chứng                                |
| ------------------------ | ------------------------------------------------ |
| Offline core và guards   | `npm test`                                       |
| Format, lint, TypeScript | `npm run check`                                  |
| Production + E2E/a11y    | `npm run verify`                                 |
| Strict CJS traced bundle | `node scripts/checks/server-bundle.mjs`          |
| Liên kết docs và asset   | `node scripts/check-readme.mjs`                  |
| Devnet thật              | [Ba vị thế +hai repay](live-devnet-cycle.md)     |
| Thao tác Phantom         | [Báo cáo owner](manual-acceptance-2026-10-01.md) |

Browser tests dùng mocked wallet cho chữ ký/pending, VI/EN375/768/1024/1440 và axe; không thay live proof. Allocator có search/core tests,25 executable VM cases và một partial receipt riêng. [Ví dụ/benchmark](../evidence/allocation/README.md) là synthetic compute, không phải số tiết kiệm đã đo trên người dùng.

[Evidence index](../evidence/README.md) · [Lịch sử điều tra](../archive/README.md) · [Dependency triage hiện tại](dependency-review-2026-10-03.md). Không gọi CI/test parity là security audit hoặc mainnet readiness.
