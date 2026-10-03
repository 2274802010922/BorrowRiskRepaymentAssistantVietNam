# Bàn giao

## 03/10 — hoàn thiện hồ sơ, đang nghiệm thu

[Plan active](../plans/active/final-repo-polish.md), user duyệt toàn review. README/docs/evidence/market-GTM và rubric map cập nhật. BN5.2.5 patch-only, advisory25 full/20 prod còn lại triage; SDK versions giữ. Benchmark compute30 samples/case, không RPC/API SLA. SDK import chỉ nhánh Devnet; E2E kiểm response200/ready. Local159 unit/build25/45 browser/strict2504/links PASS, lần cuối không retry; lần trước1 cold-import timeout được ghi trong report. Finalizer12 slide/5 native tables/PDF PASS;9/10 đã xem,10 ảnh còn lại byte-identical, model hash không đổi. Cần sourceCI/Vercel → Releasev0.4.1/public digest → checkpoint. Không ký, dựng lại video/outreach. [Nghiệm thu](../../testing/final-repo-polish-2026-10-03.md).

## 03/10 — cấp phép đã được người dùng duyệt

Apache-2.0 cho mã nguồn thuộc quyền owner, LICENSE canonical ASF, NOTICE với GitHub2274802010922, package/root lock metadata và README VI/EN. [Plan](../plans/active/licensing.md) · [Scope](../../legal/README.md) · [Local validation PASS](../../legal/validation.json). Logo/media ngoài phần mềm; dependencies giữ terms gốc, font/icon notices nguyên bản. Model có nghiên cứu nguồn Rust BSL và đối chiếu VM, không claim clean-room/legal clearance. Implementation/local checks đã xong, không đổi runtime/dependency versions/artwork. Xác nhận GitHub license detection và CI của HEAD khi xem trạng thái xuất bản; không mở lại signing/video/allocator.

## 03/10 — hai video đã xuất bản, nghiệm thu xong

Hai video hoàn chỉnh đã dựng và kiểm: VI216,933s, EN242,4s; male voice, captions,1080p. Delivery `C:\Users\haban\Downloads\picachu-demo-2026-10-03` gồm MP4/SRT/poster/script/chapter/YouTube metadata/QA/manifest. [Nghiệm thu](../../testing/bilingual-demo-2026-10-03.md), [plan](../plans/active/bilingual-complete-demo.md).

Người dùng đã upload và gửi [VI](https://www.youtube.com/watch?v=Dk57TInsyYM)/[EN](https://www.youtube.com/watch?v=VzjOFclnBBg). Hai bản phát được; video cũ báo owner đã xóa. Releasev0.4.0 public với7 asset anonymous/SHA256 PASS. Sáu asset MP4/mixed ZIP cũ đã gỡ, giữ slide/PDF/proof và xuất hai gói slide không video. [Evidence](../../evidence/validation/bilingual-video-publication.json). Không ký mới; receipt lịch sử ghi rõ; không claim nghe audio trực tiếp.

README/demo/judging và notes dùng link mới; guide đã đồng bộ finite-grid/one-event. Local158 unit/build25 route và45 browser với2 workers PASS;8 workers ban đầu có6 cold-start timeout. Deck finalizer PASS,12 ảnh khớp bản trước. Sourceade1309 đã push main, Quality37089595585/Vercel success, guide VI/EN live đã kiểm. Checkpoint này ghi toàn bộ nghiệm thu xuất bản; kiểm CI của HEAD khi cần xác nhận trạng thái mới nhất. Không tự dựng lại, publish hoặc ký thêm trong heartbeat nếu không có yêu cầu mới.

## Checkpoint sản phẩm trước lượt video

Đã hoàn tất allocator v1 ngày03/10:143c8a7 CI37068551907/Vercel PASS, Releasev0.3.0-allocator public và bốn asset SHA256 PASS. Khi tiếp tục không chạy lại execute để đuổi giá; dùng evidence và active plan completed. Phiên bản/config đổi làm gate đóng đúng chủ đích, cần parity mới trước mở phạm vi. Không thay đổi quyền Social preview đang chờ trả lời.

Allocator03/10:9fc07ff main/CI/Vercel PASS;158 unit/45 browser, bundle allocator2505. Một partial repayment thật0,780982 USDC đã verified qua API test signer; không chạy execute runner thêm để đuổi giá. Evidence trong docs/testing/allocation-acceptance.md. Deck12/clip68,2 đã kiểm; hoàn tất publishv0.3.0-allocator/public hashes rồi chốt docs. Phạm vi solvent/no e-mode/one-event/finite-grid; source build match chưa có.

02/10: người dùng đã duyệt hoàn thành allocator end-to-end theo [plan active](../plans/active/loss-allocator-v1.md). Hướng dẫn giữ allocator tắt bên dưới là checkpoint cũ; cổng protocol parity vẫn bắt buộc. Bắt đầu fingerprint/VM proof trên WSL có sẵn, tiếp tục core/API/journal/UI và evidence. Không thay đổi quyền file URLs đang chờ riêng cho Social preview.

03/10 checkpoint:25 VM vectors exact, hash5f3b..., live read-only context/plan225ms. API/UI/journal đã có; chưa push hoặc có partial receipt mới. Tiếp tục full QA/responsive/bundle → publish main/CI/Vercel → vòng partial test signer với cap1 USDC → evidence/README/slide. Giữ test port riêng `PICACHU_TEST_PORT=3102` vì3100 là server build cũ, không dùng kết quả hydrate lỗi của server đó để đánh giá code mới.

Đợt mới được user duyệt ngày02/10: [final-demo-day](../plans/active/final-demo-day.md). Sản phẩm mới local109 unit/34 browser/check/build PASS; giữ allocator tắt. Đang dựng deck12 slide bằng bundled artifact-tool và clip live. Files private trong work/presentation; chỉ source/notes/poster vào Git và binary chọn lọc lên Release. Không interviews. Xem [validation](../../testing/final-demo-day.md), cập nhật sau live CI/deploy/publish, không dừng ở draft.

Product19c156a CI/Vercel PASS; privacy projection mới local110 unit/check PASS. Deck/PDF/clip đã xuất và xem, source/preview/notes/Q&A đã chọn cho repo; Release v0.2.0-final-demo đang chuẩn bị. Clip là thao tác synthetic +historical receipt, không quay ký và không gửi tx mới. Chrome upload bị quyền file URLs; pending lựa chọn user, không tự bật. Hoàn tất publish/download/CI checkpoint trước khi chốt.

Checkpoint10086dc đã CI/Vercel PASS và Release v0.2.0-final-demo public; bốn public download SHA256 khớp. Các gates sản phẩm/demo/deck/repo đã hoàn thành theo source labels. Khi tiếp tục, chỉ xử lý social upload nếu user trả lời approval; không tự mở lại interviews, allocator hoặc wallet test để đuổi biến động giá. Không coi clip như đã quay ký ví.

Đọc [CURRENT_STATE](CURRENT_STATE.md) và [plan repo](../plans/active/repository-presentation.md). Mã nguồn nằm dưới src/, docs là cổng đọc; không phục hồi bản root cũ chỉ để khớp liên kết lịch sử.

Đường xem chính là hai YouTube VI/EN ở đầu tài liệu; chọn đúng ngôn ngữ. Release là lựa chọn offline. Video01/10 đã bị owner xóa, không phục hồi vào README.

User đã cho phép end-to-end và commit/push main bằng tiếng Việt. Đợt này gồm tổ chức file, README, Release demo và About/social preview. Phải kiểm format/lint/types/unit/build/e2e, toàn bộ liên kết docs và strict server bundle trước chốt; kết quả/live deploy ghi trong validation.

Đợt repo đã push4c6ba4a/3bd06ff; local87/32, CI/Vercel PASS, Release public và download SHA256 PASS, API read200 đủ3 vị thế. Chỉ social preview setting chưa áp dụng: Chrome/CDP timeout cả tab mới nên không thể upload. File trong docs/assets/readme và Release; không yêu cầu key hay đổi bảo vệ để thử. Không cần chạy lại financial acceptance chỉ vì đổi đường dẫn/tài liệu. [Nghiệm thu](../../evidence/validation/repository-reorganization.md).

Không chạy lại runner execute để bù biến động giá. Giữ pending/recovery, Devnet genesis, binding/signature và pin rpc-websockets9.3.8; không đổi AI owner đã xác nhận. Allocator chỉ nối sau protocol parity, theo [goal plan](../plans/active/goal-portfolio.md).

Ví test/key riêng trong work/private bị ignore. Video nguồn và file dựng trong work/demo-video; chỉ MP4/ZIP công khai được chọn mới upload Release, SRT/script/poster vào docs. Không dùng mật khẩu ví hoặc copy cả work.

[Bàn giao lịch sử](../../archive/context/handoff-2026-10-01.md) không phải trạng thái hiện hành.
