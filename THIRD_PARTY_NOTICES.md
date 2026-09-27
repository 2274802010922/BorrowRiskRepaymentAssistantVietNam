# Nguồn và phạm vi kế thừa

## SkillBridge Vietnam — nguồn tham chiếu của người dùng

- Repo: https://github.com/2274802010922/SkillBridge-Vietnam
- Local revision đã đọc: `44b08fca15de7391a1ee38ead1917bbb09a4e272`.
- Tham khảo `docs/design/system.md`, layout/header/sidebar, feedback và styles.
- Kế thừa visual tokens, bố cục và nguyên tắc trạng thái. Component được tách lại cho BorrowRisk; không chuyển API, roles, wallet session, thương hiệu hoặc CSS legacy patches.
- Repo nguồn giữ nguyên, kể cả các file untracked có sẵn của người dùng.

## Dependency chính

- Kamino SDK: https://github.com/Kamino-Finance/klend-sdk, metadata MIT. Dùng như dependency; không trình bày SDK thành code tự viết.
- Solana web3.js / Kit: dependency giao tiếp chain và transaction.
- Next.js, React, Tailwind CSS: framework và style tooling.
- Be Vietnam Pro: font được đóng gói qua Fontsource; giữ các license files đi kèm dependency.
- Lucide: icons từ package, không sao chép logo các protocol.

Các repo Folio, DeRisk, Positions Monitor, Autopilot Lite và Varuna đã được nghiên cứu. Chưa chép module của các repo đó vào code hiện tại. Nếu tái sử dụng sau này, bổ sung commit/file/license và thay đổi cụ thể.
