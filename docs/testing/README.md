# Kiểm tra và phạm vi bằng chứng

Ngày 27/09/2026, `npm run verify` PASS trên Node 24.16.0/Windows: 20 unit tests, 17 Chromium tests, format/lint/typecheck và production build. Browser tests gồm VI/EN × 375/768/1024/1440px, form validation, locale persistence, drawer focus/Escape, fixture không ký, Phantom vắng mặt và axe trên 4 route. Không có live provider trong các test này.

Ảnh minh họa: [mobile](../evidence/workspace-vi-375.png), [desktop](../evidence/workspace-vi-1440.png). Đây là dữ liệu synthetic, không phải bằng chứng giao dịch.

- `npm test`: core, validation, preview binding và template explanation; không gọi dịch vụ bên ngoài.
- `npm run typecheck`, `npm run lint`, `npm run format:check`: static checks.
- `npm run build`: production build Next.js.
- `npm run test:e2e`: Chromium, VI/EN, bốn viewport, drawer/keyboard, form, trạng thái fixture và axe.
- `npm run check:devnet`: genesis/program executable; không thực thi khoản vay.
- `node scripts/checks/discover-devnet.mjs`: đọc reserve theo schema SDK; không chứng minh có thể vay hoặc trả nợ.

Live repayment, Phantom thật và AI provider thật là các nghiệm thu riêng. Bộ test offline không chứng minh chúng hoạt động. Không trình bày screenshot UI synthetic thành traction, chain proof hoặc live AI evidence.

`npm audit` hiện có cảnh báo transitive từ SDK Solana/Kamino. Bản này chưa được thẩm định cho tài sản mainnet. Ghi riêng kết quả audit và thay đổi dependency, không dùng `audit fix --force` mà không kiểm tương thích.
