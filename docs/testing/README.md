# Kiểm tra và phạm vi nghiệm thu

Checkpoint 360e17f: **87 unit tests +32 browser tests**, format/lint/types/build, strict deployment bundle và [Quality CI](https://github.com/2274802010922/picachu__/actions/runs/36765109243) PASS. Kết quả chuyển thư mục ngày 01/10 ghi ở [reorganization](../evidence/validation/repository-reorganization.md).

| Cổng                     | Lệnh / bằng chứng                                |
| ------------------------ | ------------------------------------------------ |
| Offline core và guards   | `npm test`                                       |
| Format, lint, TypeScript | `npm run check`                                  |
| Production + E2E/a11y    | `npm run verify`                                 |
| Strict CJS traced bundle | `node scripts/checks/server-bundle.mjs`          |
| Liên kết docs và asset   | `node scripts/check-readme.mjs`                  |
| Devnet thật              | [Ba vị thế +hai repay](live-devnet-cycle.md)     |
| Thao tác Phantom         | [Báo cáo owner](manual-acceptance-2026-10-01.md) |

Browser tests dùng mocked wallet cho các case chữ ký/pending, VI/EN bốn viewport 375/768/1024/1440 và axe. Chúng không thay chứng minh live. Allocator search chỉ có cost vectors trừu tượng, chưa thể công bố loss Kamino.

[Evidence index](../evidence/README.md) · [Lịch sử điều tra](../archive/README.md). Audit transitive tại checkpoint trước còn21 cảnh báo; không dùng audit fix force hoặc nâng dependency trong đợt dọn cấu trúc này.
