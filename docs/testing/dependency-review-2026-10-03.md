# Rà dependency — 03/10/2026

Phạm vi: npm advisory/metadata, dependency tree và kiểm đường sử dụng trong source/bundle. Không phải pentest hoặc chứng nhận bảo mật. Cảnh báo npm có lan truyền qua nhiều package; số package entries không phải số exploit độc lập.

| Snapshot                  | Moderate | High | Critical | Tổng package entries |
| ------------------------- | -------: | ---: | -------: | -------------------: |
| Trước vá, toàn dependency |        9 |   17 |        0 |                   26 |
| Sau vá, toàn dependency   |        8 |   17 |        0 |                   25 |
| Sau vá, `--omit=dev`      |        8 |   12 |        0 |                   20 |

## Đã vá tương thích

`bn.js`5.2.2 → **5.2.5**, cùng major; lock diff chỉ đổi phiên bản gói này, không thêm/bỏ/nâng SDK hoặc Kit. [GHSA-378v-28hj-76wf](https://github.com/advisories/GHSA-378v-28hj-76wf) ghi lỗi `maskn(0)` làm hỏng state và gây infinite loop; bản vá nhánh5 bắt đầu5.2.3. Regression chạy trong process con có hard timeout, kiểm zero mask/toString/div hoàn tất. Full regression và strict traced SDK/route smoke vẫn bắt buộc trước release.

## Phân loại cảnh báo còn lại

| Nhóm                                 | Đường dependency/điểm sử dụng                                             | Xử lý hiện tại                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `braces`/micromatch/fast-glob/ESLint | ESLint dev tooling; app không nhận glob pattern từ request                | [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) chưa có patched version; giữ tooling, không downgrade Next theo audit-fix suggestion. Không coi trusted repo patterns là bằng chứng mọi use case an toàn.                                                                                                                               |
| `bigint-buffer`                      | Kamino/SPL → buffer-layout-utils; helper dùng blob widths8/16/24/32 bytes | [Native overflow](https://github.com/advisories/GHSA-3gc7-fjrx-p6mg) chưa có bản vá trong tree. Windows quan sát pure-JS fallback không chứng minh Linux/production không reach native. Cần kiểm deployment native binding và SDK replacement trước mainnet. Không suppress advisory.                                                                 |
| `toml`                               | Anchor workspace/config helpers qua Kamino SDK                            | Source app không có TOML upload/parser route hoặc gọi Anchor workspace. [Recursion](https://github.com/advisories/GHSA-82x6-q7mm-w9cf), [prototype pollution](https://github.com/advisories/GHSA-v5mp-jgw5-2x6j) vẫn nằm trong transitive tree; không ép TOML major mới khi chưa test SDK compatibility.                                              |
| `stream-json`, `uuid`                | web3.js → jayson; RPC response/client internals                           | [Nested JSON DoS](https://github.com/advisories/GHSA-528h-pc64-c93x), [UUID bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq). RPC là cấu hình server, không lấy URL từ request; app IDs dùng `node:crypto.randomUUID` hoặc Zod validation, không gọi uuid v3/v5/v6 buffer APIs. Chưa chứng minh mọi RPC/internal path không reach advisory. |
| SDK wrapper entries                  | Anchor/Kamino/Orca/Raydium/SPL nhận severity từ những dependency trên     | Không đếm như lỗ hổng code riêng của Picachu hoặc tuyên bố đã vá toàn SDK. Giữ SDK11.0.1 và source/program scope; cần migration riêng trước production.                                                                                                                                                                                               |

Không dùng `npm audit fix --force` hoặc đổi tên/version để làm mất cảnh báo. [Snapshot sau vá](../evidence/validation/dependency-review.json) lưu severity, package và advisory URL; chạy lại `npm audit --json` và `npm audit --omit=dev --json` để cập nhật. Không chặn CI hiện hành bằng một threshold không phù hợp rồi bỏ qua; CI xanh và runtime regression không thay security review.

## Ranh giới release

MVP phục vụ **Devnet**, không mainnet/custody/auto-sign. Phiên bản hiện tại vẫn có advisory chưa vá; không quảng bá audited/security-certified. Khác biệt BN phải qua tests/unit/e2e/build/traced bundle, model source hashes giữ nguyên. Việc không tìm thấy call trực tiếp trong `src/` không chứng minh toàn bộ dependency không thể khai thác.
