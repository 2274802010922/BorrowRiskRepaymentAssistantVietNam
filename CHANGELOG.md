# Changelog

## 2026-10-03 — hồ sơ chung kết và dependency review

- README VI/EN làm rõ3 điểm mạnh, bảng baseline tái tạo, tự xây/tích hợp và buyer API/GTM hypothesis có nguồn; đồng bộ cổng product/testing/deployment/evidence/rubric.
- Vá BN5.2.5 cùng major, thêm regression maskn(0); giữ SDK và ghi triage25 advisories còn lại, không claim audited.
- Synthetic allocation không load SDK Devnet không cần thiết; kiểm response trước state UI trong E2E.
- Thêm benchmark compute30 mẫu cho1–3 khoản synthetic; đồng bộ slides/notes/baseline/market hypothesis, giữ video và receipt lịch sử.

## 2026-10-03 — cấp phép mã nguồn Apache-2.0

- Thêm LICENSE chính thức, NOTICE với chủ bản quyền GitHub2274802010922 và phạm vi cấp phép.
- Đồng bộ license metadata trong package/lockfile, README VI/EN và hướng dẫn đóng góp.
- Phân biệt mã nguồn, dependency/font/icon, logo/media và nguồn hợp đồng Kamino BSL; giữ các notices gốc, không đổi runtime hoặc artwork.

## 2026-10-03 — hai video hoàn chỉnh Việt/Anh

- Hai video quay mới, giọng nam,1080p và phụ đề theo ngôn ngữ; VI3:37/EN4:02, từ mục tiêu đến allocator và biên nhận Devnet lịch sử có nhãn.
- README VI/EN, cổng demo/giám khảo, notes slide và tài liệu đã dùng hai link YouTube owner cung cấp. Metadata cũ được lưu trữ; MP4 phân phối qua Release.
- Đồng bộ hướng dẫn UI với allocator đã kiểm chứng: finite grid/one-event, chặn cấu hình không hỗ trợ, partial không đồng nghĩa đạt mọi mục tiêu.

## 2026-10-02 — sản phẩm, demo và slide chung kết

- Main portfolio có goal draft cần apply, giải thích từ core và AI comment/fallback, shared funds và preset Devnet explicit.
- Sửa thiếu budget, tên khoản ổn định, kết quả receipt/fresh balance và landing cùng ví dụ13,6/còn66,4.
- Public source/notes/Q&A/preview cho deck12 slide và clip live76,5s, binary phân phối Release. Clip không có signing footage, receipt là lịch sử.
- Không phỏng vấn/outreach, không bật allocator chưa parity hoặc claim đã có guard program.

## 2026-10-01 — xem demo trực tiếp trên YouTube

- Đổi nút và poster trong README VI/EN, trang demo và lối đọc giám khảo sang link YouTube owner cung cấp.
- Giữ MP4/ZIP trong Release như bản tải xuống tùy chọn; cập nhật ngữ cảnh để giữ thống nhất đường xem video.

## 2026-10-01 — tổ chức repository và đóng gói demo

- Gom mã nguồn vào `src/`, giữ config/public ở root; cập nhật import, mock, alias và đường dẫn tài liệu.
- Gom screenshot, evidence Devnet và lịch sử; bảo toàn nội dung kiến trúc gốc ở archive.
- README VI/EN tập trung goal portfolio, banner mới, poster/video có giọng đọc và phụ đề, lối đọc hai track.
- Video MP4/ZIP phân phối qua Release, không commit file dựng hoặc key test; kiểm liên kết docs được đưa vào CI.
- Checkpoint trước `360e17f` đã có 87 unit/32 browser, CI/Production PASS; vòng test thật verified ba deposit/ba borrow/hai repay. Owner báo test thủ công ổn, nguồn này được ghi riêng.

## 2026-09-30 — phương án trả nợ có mục tiêu

- Thêm `/portfolio` ba bước VI/EN, mục tiêu dư địa 5% sau shock, tối đa ba vị thế và một số dư chung; tính số tiền tối thiểu bằng Decimal/atomic.
- Thêm API plans, journal Redis CAS, ký tuần tự, kiểm receipt và recovery backup; chặn unknown, số dư thay đổi và khoản mục tiêu cần lập lại.
- Demo A/B/C slots 201/202/203 với nominal adjusted LTV 65/55/45%, mỗi khoản 0,1 SOL; kiểm cap và simulation trước ký.
- Cost-grid search có unit tests và brute-force cross-check. Allocator/loss estimate vẫn tắt vì chưa có Kamino parity; chưa nghiệm thu vòng vay/trả thật.
- Cập nhật hướng dẫn, README VI/EN, ảnh thật, kiến trúc và ngữ cảnh; local 67 unit + 28 browser tests PASS.
- Sửa recovery khi chữ ký đã có trên chain: ghi vào journal mà không gửi lại; thêm unit case nâng tổng lên 68. Checkpoint chính CI và Vercel Production đã qua, live vẫn thiếu giá trị Kamino.

## 2026-09-29 — kiểm chứng bước gửi thế chấp Devnet

- Chuẩn hóa price/confidence cùng đơn vị cho nguồn Pyth-only của SDK Kamino 11.0.1; giữ kiểm owner, Full verification và TWAP.
- Freshness theo cấu hình từng reserve, cảnh báo nguồn giá cũ hơn 5 phút và hiển thị timestamp.
- Simulation deposit 0,1 SOL PASS bằng ví demo người dùng; chưa ký/gửi giao dịch. Bổ sung bộ địa chỉ cấu hình và script tái hiện.

## 2026-09-29 — sửa luồng Web3

- API lỗi có JSON/request ID; kiểm cấu hình trước khi tải SDK và kiểm bộ file đóng gói trên CI.
- Khôi phục ví đã tin cậy, menu ví, tự đọc vị thế và giữ ngân sách/dự trữ khi refresh.
- Chặn preview cũ, lưu recovery trước gửi, polling có backoff và xác minh bằng receipt lịch sử.
- Thêm rút thế chấp debt-free; marker đơn thuần không được xem là bằng chứng đã vay.
- Giới hạn request; AI trên Vercel dùng template khi thiếu quota store chung.

## 2026-09-28 — picachu

- Đổi UI sang picachu, giữ light terminal, thêm điều hướng quy trình và trang thiết lập demo.
- “Kết nối ví” dùng Phantom trong MVP; ký deposit/borrow Devnet riêng, khôi phục pending và xác minh.
- Giải thích ngắn từ dữ kiện, AI một nhận xét ngắn; định dạng số token gọn và đúng độ chính xác.
- Thêm test lỗi transaction/expiry/recovery và tài liệu giới hạn nghiệm thu Devnet.

## Unreleased

- Đối chiếu kiến trúc người dùng với MVP có cổng kiểm chứng.
- Thêm core tính toán bằng atomic units/Decimal, planner và các test ràng buộc.
- Thêm UI light terminal VI/EN kế thừa cấu trúc SkillBridge, không kế thừa nghiệp vụ.
- Thêm đường SDK/API cho khoản vay và repay; live verification còn mở.
- Thêm context, workflow, browser/a11y harness và CI.
