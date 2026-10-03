# Nguồn và phạm vi kế thừa

Phần đóng góp Picachu thuộc quyền cấp phép của owner dùng [Apache-2.0](LICENSE), chủ bản quyền ghi trong [NOTICE](NOTICE). [Phạm vi](docs/legal/README.md) và [ngoại lệ tài sản](docs/legal/ASSETS.md) phân biệt mã nguồn, upstream và artwork. Không cấp lại giấy phép của dependency hoặc quyền thuộc bên thứ ba.

## Đối chiếu liquidation Kamino

Nguồn logic đã đọc: [liquidation_operations.rs](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/programs/klend/src/state/liquidation_operations.rs), revision `a08760976f51a3a58c4a0c6ea27b4a0e565bca79`; [LICENSE](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/LICENSE) là Business Source License 1.1. Repo không vendoring hợp đồng Rust hoặc executable đối chứng vào Git/runtime Vercel. Mô hình TypeScript price-event nghiên cứu quy tắc upstream và đối chiếu VM; không gọi đây là clean-room hoặc kết luận pháp lý về quyền cấp phép. Apache-2.0 chỉ áp dụng cho đóng góp mà owner có quyền cấp phép, không cấp lại quyền cho upstream protected expression. Goal planner và cost-grid search do Picachu triển khai; parity kỹ thuật không thay thế rà soát quyền/licensing. Không gán MIT của SDK cho source contract hoặc logo.

## Logo picachu

Ảnh `logo pixel picachu.jpg` do chủ dự án cung cấp ngày 28/09/2026, được giữ nguyên tại `public/brand/picachu-logo.jpg` và dùng làm nhận diện theo yêu cầu. Artwork chưa có chứng cứ quyền cấp phép trong repo; không ghi nhận là artwork do Codex sáng tác hoặc có giấy phép MIT/Apache-2.0. Logo và media chứa logo nằm ngoài license mã nguồn; xem [ASSETS](docs/legal/ASSETS.md).

## SkillBridge Vietnam — nguồn tham chiếu của người dùng

- Repo: https://github.com/2274802010922/SkillBridge-Vietnam
- Local revision đã đọc: `44b08fca15de7391a1ee38ead1917bbb09a4e272`.
- Tham khảo `docs/design/system.md`, layout/header/sidebar, feedback và styles.
- Kế thừa visual tokens, bố cục và nguyên tắc trạng thái. Component được tách lại cho BorrowRisk; không chuyển API, roles, wallet session, thương hiệu hoặc CSS legacy patches.
- Repo nguồn giữ nguyên, kể cả các file untracked có sẵn của người dùng.

## Dependency chính

Allocator dùng LiteSVM1.5.0 (Apache-2.0) trong harness riêng để thực thi executable Kamino Devnet. Source tham chiếu Kamino Lending tại commit `a08760976f51a3a58c4a0c6ea27b4a0e565bca79` có BSL1.1: https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/LICENSE. Bytecode/source đối chứng chỉ ở work cho kiểm thử không production; không vendoring Rust source hoặc bytecode vào runtime Vercel/Git. Không tuyên bố source build match. Mô hình số học của picachu và bằng chứng độc lập được mô tả ở [đối chứng](docs/evidence/liquidation/README.md).

Oracle adapter của picachu sửa cách chuẩn hóa price/confidence Pyth cho nguồn Pyth-only của SDK 11.0.1, giữ validation riêng và không sửa package trong node_modules. Tham chiếu nguồn/kiểm chứng ở `docs/testing/devnet-oracle-validation.md`.

- Kamino SDK: https://github.com/Kamino-Finance/klend-sdk, metadata MIT. Dùng như dependency; không trình bày SDK thành code tự viết.
- Solana web3.js / Kit: dependency giao tiếp chain và transaction.
- Next.js, React, Tailwind CSS: framework và style tooling.
- Be Vietnam Pro5.3.0: font từ Fontsource, **OFL-1.1**; giữ [license gốc](docs/legal/third-party/BeVietnamPro-OFL.txt).
- Lucide1.48.0: **ISC**, phần icon Feather được liệt kê giữ **MIT** của Cole Bemis; giữ [toàn bộ license/notice gốc](docs/legal/third-party/Lucide-LICENSE.txt), không gắn Apache-2.0 cho icon hoặc logo protocol.

Các repo Folio, DeRisk, Positions Monitor, Autopilot Lite và Varuna đã được nghiên cứu. Chưa chép module của các repo đó vào code hiện tại. Nếu tái sử dụng sau này, bổ sung commit/file/license và thay đổi cụ thể.
