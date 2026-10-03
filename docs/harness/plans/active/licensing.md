# Cấp phép Picachu — 03/10/2026

Người dùng đã chọn và cho phép thêm Apache-2.0. Phạm vi: LICENSE nguyên văn chính thức, NOTICE dùng định danh GitHub2274802010922, README VI/EN/badge, package và root lock metadata, notices bên thứ ba và ngoại lệ asset. Không đổi runtime, artwork, dependency versions, tag cũ hoặc gói media cũ.

## Nghiệm thu

- LICENSE khớp bản Apache Software Foundation; không chỉnh nội dung license để chèn điều kiện riêng.
- Package và root lock cùng SPDX Apache-2.0; mọi dependency/engine/version/private flag giữ nguyên.
- Copyright trong NOTICE không đoán tên pháp lý, không gán artwork bên thứ ba cho owner hoặc Codex.
- Logo/media không thuộc grant phần mềm. Font/icon giữ OFL/ISC/MIT và nguyên bản notices. Nguồn Kamino Rust BSL không bị gắn MIT/Apache của SDK hoặc root project.
- Rà nguồn model/source references ở mức repo; không tuyên bố clean-room hoặc chứng nhận pháp lý toàn bộ code bằng parity test.
- Kiểm format, links, metadata và bản sao license. Commit tiếng Việt/push main, kiểm GitHub nhận Apache-2.0 và CI/deploy.

Trạng thái: triển khai và kiểm local hoàn tất. [Kết quả](../../../legal/validation.json): LICENSE canonical, notices font/icon, package/root lock metadata và tài sản không đổi PASS. Format và relative links PASS. Cần xác nhận GitHub license detection/CI ở HEAD sau push; không yêu cầu deploy/test ví thủ công. Product/demo đã nghiệm thu; không chạy ký ví hoặc dựng lại media cho thay đổi license.
