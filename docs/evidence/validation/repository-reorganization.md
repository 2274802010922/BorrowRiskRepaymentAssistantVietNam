# Kiểm tra tổ chức repository — 01/10/2026

Trạng thái: tổ chức mã nguồn/tài liệu/README và Release PASS trên main. Social preview upload trong setting GitHub còn mở vì browser/CDP timeout.

- 92 file chuyển bằng git mv; nguồn app/frontend/backend/core/solana/shared dưới src.
- Kiến trúc gốc SHA256 d913c2f341f4800a6d0c9a714b5474824a9dcd440f17adac215cf7054236b670, byte-for-byte preserved.
- Format/lint/typecheck, 87 unit tests, production build đủ 22 route và 32 browser tests PASS, gồm VI/EN 375/768/1024/1440 và axe.
- Strict CJS traced bundle:2504 file, SDK_IMPORT_OK, configured route đi tới DEVNET_UNAVAILABLE trong offline RPC probe; không generic import fail.
- 44 Markdown files và 181 liên kết/asset tương đối PASS; cổng này được thêm vào CI.
- About/homepage/topics đã cập nhật qua GitHub CLI. Social preview file đã tạo; Chrome/CDP timeout khi mở upload, chưa áp dụng setting. Không đổi quyền, visibility hoặc branch protection.
- [Release v0.1.0-demo](https://github.com/2274802010922/picachu__/releases/tag/v0.1.0-demo) đã public dạng prerelease tại `3bd06ff`. MP4, ZIP và social-preview.png tải không cần auth, SHA256 khớp file local; không commit file dựng hoặc thư mục work.
- Không ký hoặc gửi giao dịch trong đợt decor này.

## Kiểm tra sau push

- Commit nguồn `4c6ba4a`, trình bày `3bd06ff`; [Quality CI 36843794539](https://github.com/2274802010922/picachu__/actions/runs/36843794539) PASS, Vercel Production success.
- Public health: app picachu, cluster devnet, executionConfigured true; allocator vẫn unavailable vì LIQUIDATION_PARITY_NOT_VERIFIED.
- Public POST portfolio/read trả200, đọc đủ ba vị thế ví test; chỉ đọc, không ký/gửi.
- GitHub UI hiển thị thư mục src/docs, README VI, các mục demo/evidence và link video. About/homepage/topics đã đối chiếu bằng CLI.
- Bản kiến trúc gốc có cùng Git blob ID trước/sau: `42a9a085c5c5ac2448516ad591203b4dfe4b3ce4`; hash byte làm việc lúc chuyển thư mục ghi ở trên. Line endings trong checkout có thể khác theo Git.

Không gọi ảnh social preview đã được áp dụng: hai tab Settings đều bị timeout ở Runtime.evaluate/Page.captureScreenshot, menu upload chưa sử dụng được. File đã có trong Release và docs/assets/readme; không bỏ qua bảo vệ hoặc đổi setting khác để thử.
