# Trạng thái hiện tại — 01/10/2026

## Sản phẩm

- Luồng chính /portfolio: một ví, tối đa ba khoản SOL/USDC Kamino Devnet, goal buffer từ giá sau shock, shared balance, budget/reserve, preview review và receipt tuần tự Redis.
- Ba deposit/ba borrow/hai repay thật verified qua API/test signer; tổng 2,406756 USDC, còn 17,401774/reserve1. Giá/lãi đổi sau test; fresh check cần thêm 0,007041. Không tự gửi thêm. [Evidence](../../testing/live-devnet-cycle.md).
- Owner báo test Phantom thủ công ổn ngày 01/10; [nguồn và phạm vi](../../testing/manual-acceptance-2026-10-01.md). AI owner xác nhận live. Không gọi owner report là agent-recorded popup proof.
- Allocator chưa bật, liquidation protocol parity còn mở. Không claim doanh thu/pilot hoặc hoàn thành model từ mock.

## Tổ chức repository

- Mã ứng dụng chuyển vào src/{app,frontend,backend,core,solana,shared}; public và config giữ root. Import tests/scripts và alias cập nhật; không đổi nghiệp vụ.
- Docs có product/demo/judging, evidence/devnet, assets/screenshots và archive. Kiến trúc gốc giữ nguyên nội dung ở docs/archive/original-architecture.md.
- README VI/EN lấy /portfolio làm ví dụ chính, video qua Release v0.1.0-demo; media không được chép nguyên thư mục work vào Git.
- Local đợt này PASS: 87 unit +32 browser, format/lint/types, build22 route, strict bundle2504 file, 44 Markdown/181 links. Commits4c6ba4a +3bd06ff đã push main; Quality36843794539 và Vercel Production PASS. Release v0.1.0-demo public prerelease, các asset tải được và SHA256 khớp. Public API portfolio/read200 đủ3 vị thế, không ký/gửi. Social preview file sẵn nhưng browser upload đang timeout; không claim setting đã áp dụng. Chi tiết ở [validation](../../evidence/validation/repository-reorganization.md). [Plan](../plans/active/repository-presentation.md).

Baseline 360e17f:87 unit +32 browser, check/build/CI và strict bundle PASS. [Lịch sử trước đợt này](../../archive/context/current-state-2026-10-01.md).
