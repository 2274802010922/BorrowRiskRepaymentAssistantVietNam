# picachu — light terminal

Nguồn: SkillBridge của người dùng. Quy tắc dưới đây áp dụng riêng cho picachu.

Tên hiển thị viết thường `picachu`; logo pixel do người dùng cung cấp tại `public/brand/picachu-logo.jpg`. Giữ nguyên ảnh, nền và tỉ lệ; không dùng biểu tượng p. cũ. Logo dùng chung trong header, drawer, footer, favicon, Open Graph và banner README. Nút “Kết nối ví” dùng Phantom trong MVP. Landing dẫn tới minh họa hoặc thiết lập Devnet; workspace có điều hướng bước và đường dẫn setup. Trang `/setup` dùng bốn bước: kiểm tra, thế chấp, vay thử, sẵn sàng. Phần giải thích gồm tối đa ba dòng dữ kiện và một nhận xét AI ngắn; số token bỏ số 0 thừa, giữ đơn vị và độ chính xác.

## Visual tokens

Canvas `#F7F6F1`; surface `#FFFFFF`; ink `#091426`; body `#354256`; muted `#526174`; divider `#D6DBE1`; primary lime `#B7F34D` với chữ ink; link/focus blue `#2456E6`.

Be Vietnam Pro tự host qua package cho body/headings. Monospace chỉ cho nhãn ngắn, địa chỉ và dữ liệu kỹ thuật. Không dark theme, parallax hoặc animation trang trí. Chuyển trạng thái màu ngắn và có reduced-motion.

## Khung và điều hướng

- Landing: giá trị → ví dụ ghi nhãn → quy trình → ranh giới → CTA.
- Header: logo trái; tài khoản và ngôn ngữ phải.
- Workspace: sidebar người vay gồm Khoản vay, Hướng dẫn; Lab ở mục nâng cao.
- Quy trình khoản vay, kịch bản và kế hoạch nằm trên một workspace liên tục trong MVP, giữ input khi đối chiếu trước/sau. Hoạt động của phiên ở cuối workspace. Tách route chi tiết sau nếu kiểm thử người dùng cần.
- Mobile dùng native dialog drawer; Escape, focus trap và trả focus về nút mở.

## Component và trạng thái

Brand, AppHeader, WorkspaceShell, LanguageSwitcher, PageHeading, StatusBadge, Notice, ContentSkeleton; form field và bảng so sánh dùng class chung.

Loading/empty/error/stale/partial/submitted/unknown/confirmed/verified có chữ giải thích. Thiếu số liệu không được thay bằng zero. Mọi fixture có nhãn synthetic rõ, không tạo transaction từ fixture. Mỗi màn hình có một hành động chính.

## Chất lượng

Kiểm VI/EN tại 375/768/1024/1440 px; không overflow, không cắt nhãn hoặc che focus. Text contrast tối thiểu 4,5:1; trạng thái không dựa riêng vào màu. Controls hướng tới 44px, labels thật và lỗi đặt gần input. Theme và cấu trúc dùng nhất quán; không mang workaround của SkillBridge sang chỉ để giống hình.
