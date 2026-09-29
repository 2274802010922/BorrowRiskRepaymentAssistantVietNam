# Nguồn và phạm vi kế thừa

## Logo picachu

Ảnh `logo pixel picachu.jpg` do chủ dự án cung cấp ngày 28/09/2026, được giữ nguyên tại `public/brand/picachu-logo.jpg` và dùng làm nhận diện theo yêu cầu. Không ghi nhận đây là artwork do Codex sáng tác hoặc có giấy phép MIT.

## SkillBridge Vietnam — nguồn tham chiếu của người dùng

- Repo: https://github.com/2274802010922/SkillBridge-Vietnam
- Local revision đã đọc: `44b08fca15de7391a1ee38ead1917bbb09a4e272`.
- Tham khảo `docs/design/system.md`, layout/header/sidebar, feedback và styles.
- Kế thừa visual tokens, bố cục và nguyên tắc trạng thái. Component được tách lại cho BorrowRisk; không chuyển API, roles, wallet session, thương hiệu hoặc CSS legacy patches.
- Repo nguồn giữ nguyên, kể cả các file untracked có sẵn của người dùng.

## Dependency chính

Oracle adapter của picachu sửa cách chuẩn hóa price/confidence Pyth cho nguồn Pyth-only của SDK 11.0.1, giữ validation riêng và không sửa package trong node_modules. Tham chiếu nguồn/kiểm chứng ở `docs/testing/devnet-oracle-validation.md`.

- Kamino SDK: https://github.com/Kamino-Finance/klend-sdk, metadata MIT. Dùng như dependency; không trình bày SDK thành code tự viết.
- Solana web3.js / Kit: dependency giao tiếp chain và transaction.
- Next.js, React, Tailwind CSS: framework và style tooling.
- Be Vietnam Pro: font được đóng gói qua Fontsource; giữ các license files đi kèm dependency.
- Lucide: icons từ package, không sao chép logo các protocol.

Các repo Folio, DeRisk, Positions Monitor, Autopilot Lite và Varuna đã được nghiên cứu. Chưa chép module của các repo đó vào code hiện tại. Nếu tái sử dụng sau này, bổ sung commit/file/license và thay đổi cụ thể.
