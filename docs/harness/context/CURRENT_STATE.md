# Trạng thái hiện tại — 03/10/2026

## Hai video VI/EN — đã nhận link, đang xuất bản GitHub

- Dựng mới end-to-end: VI3:37, EN4:02;1080p, giọng nam, phụ đề và10 chapter. Files trong Downloads/picachu-demo-2026-10-03; raw/work bị ignore. [Nghiệm thu](../../testing/bilingual-demo-2026-10-03.md).
- Decode/loudness/subtitle bounds PASS, contact sheets/scene frames đã xem; lời đọc đối chiếu timing và ASR, không claim human listening. API footage draft200/rules và allocation200/ready; không ký hoặc gửi transaction mới.
- Người dùng đã gửi [bản Việt](https://www.youtube.com/watch?v=Dk57TInsyYM) và [bản Anh](https://www.youtube.com/watch?v=VzjOFclnBBg); cả hai phát được. Video cũ đã được owner xóa theo thông báo YouTube. Đang publish Releasev0.4.0 và dọn video cũ trên GitHub, giữ slide/proof.
- Guide đã đồng bộ allocator finite-grid/one-event và cảnh báo partial. Local158 unit, build25 route,45 browser với2 workers PASS;8 workers ban đầu gặp6 timeout khi cold import, không đổi assertions để bỏ lỗi. Notes slide dùng hai URL mới,12 ảnh render khớp bản trước.

## Allocator — triển khai được duyệt 02/10

- Đã chốt03/10:143c8a7 CI37068551907/Vercel PASS. Releasev0.3.0-allocator public, bốn asset public-download/SHA256 PASS; About cập nhật. Plan v1 đã tick theo evidence. Chưa kiểm PowerPoint native hoặc quay popup, không claim source build match/mainnet/cascade.

- Checkpoint9fc07ff đã push main, Quality37066106588/Vercel success; live allocator available. Vòng API signer riêng verified0,780982 USDC/fee6000, số dư16,620792 >reserve1. [Nghiệm thu](../../testing/allocation-acceptance.md).
- Deck/PDF12 trang cập nhật allocator và đã render kiểm; clip68,2s caption VI từ Vercel synthetic +receipt thật của vòng riêng, không popup signing. Artifacts đang đóng gói Releasev0.3.0-allocator. Không thêm env Vercel; Social preview permission vẫn chưa có câu trả lời.

- 03/10:25 vector khớp executable Devnet trong LiteSVM; source build match chưa có. Core finite-grid/baselines và quote server đã có; CLI đọc live3 khoản và tính plan trong budget1 USDC (compute225ms, một sample).
- UI/API/journal partial đã triển khai, explicit acceptance/review, frozen receipts và block legacy bypass. Các test mục tiêu đang pass; còn full browser/responsive/bundle, deploy và vòng partial Devnet thật trước nghiệm thu. [Cổng](../../testing/allocation-acceptance.md).

- Người dùng yêu cầu hoàn thành end-to-end theo [plan allocator](../plans/active/loss-allocator-v1.md). Bắt đầu từ fingerprint/context và harness đối chứng executable; chưa bật allocator hoặc đánh dấu model verified.
- Đã đồng bộ main tới 1ed1b2d, giữ chỉnh sửa tiêu đề slide của người dùng. LiteSVM Node không có native Windows package; Ubuntu-22.04 WSL có sẵn, đang chuẩn bị harness riêng ngoài bundle Vercel.

## Sprint chung kết — 02/10

- Người dùng duyệt workflow sản phẩm → demo → slide → ngữ cảnh/evidence → commit tiếng Việt/push main → README/Release. Không interviews/outreach. [Plan active](../plans/active/final-demo-day.md).
- UI main có shared funds/reserve warning, preset Devnet explicit, stable position labels, no-zero recommendation khi thiếu budget, paid receipts và fresh balance. Landing đồng nhất13,6/còn66,4.
- AI main: goals/draft tạo draft cần review; portfolio/explain giữ facts từ core và summary ngắn, fallback; không gửi wallet-looking strings/key text vào provider và không ký.
- Local109 unit/34 browser +build24 route/check/strict bundle PASS. Demo/deck đang render/kiểm; chưa claim đã publish bản cuối. [Validation](../../testing/final-demo-day.md).
- Allocator vẫn tắt; không thêm program chưa test để lấy điểm. Các giới hạn và evidence lịch sử bên dưới vẫn áp dụng.
- Product checkpoint19c156a đã CI36985875186/Vercel PASS; public goals/draft trả200 ready đúng goal, source rules được ghi rõ. Privacy projection mới chỉ gửi matched clauses, local110 unit/check PASS; browser34 tại product checkpoint.
- Deck12 slide editable, PDF12 trang,2 link,5 native tables và render đã kiểm; notes/Q&A ở docs/judging/presentation. Clip76,52s thao tác Vercel synthetic +Explorer receipt lịch sử, không signing footage. Đang publish Release v0.2.0-final-demo và kiểm download.
- Browser Chrome đã đọc menu upload nhưng setFiles bị chặn vì extension chưa có Allow access to file URLs. Đã hỏi user lựa chọn quyền; chưa coi elapsed time là approval và chưa đổi setting.
  -10086dc CI36991760883/Vercel PASS;110 unit/34 browser, Release v0.2.0-final-demo public. Bốn artifact download SHA256 PASS. Repo/notes/preview đã cập nhật, không interviews. Bộ sản phẩm/demo/slide xong trong phạm vi đã ghi; không claim signing footage hoặc allocator verified.

## Sản phẩm

- Luồng chính /portfolio: một ví, tối đa ba khoản SOL/USDC Kamino Devnet, goal buffer từ giá sau shock, shared balance, budget/reserve, preview review và receipt tuần tự Redis.
- Ba deposit/ba borrow/hai repay thật verified qua API/test signer; tổng 2,406756 USDC, còn 17,401774/reserve1. Giá/lãi đổi sau test; fresh check cần thêm 0,007041. Không tự gửi thêm. [Evidence](../../testing/live-devnet-cycle.md).
- Owner báo test Phantom thủ công ổn ngày 01/10; [nguồn và phạm vi](../../testing/manual-acceptance-2026-10-01.md). AI owner xác nhận live. Không gọi owner report là agent-recorded popup proof.
- Allocator chưa bật, liquidation protocol parity còn mở. Không claim doanh thu/pilot hoặc hoàn thành model từ mock.

## Tổ chức repository

- Mã ứng dụng chuyển vào src/{app,frontend,backend,core,solana,shared}; public và config giữ root. Import tests/scripts và alias cập nhật; không đổi nghiệp vụ.
- Docs có product/demo/judging, evidence/devnet, assets/screenshots và archive. Kiến trúc gốc giữ nguyên nội dung ở docs/archive/original-architecture.md.
- README VI/EN lấy /portfolio làm ví dụ chính. Video01/10 đã được thay bằng hai bản VI/EN ngày03/10; metadata cũ giữ ở archive, binary phân phối Release, không chép nguyên thư mục work vào Git.
- Local đợt này PASS: 87 unit +32 browser, format/lint/types, build22 route, strict bundle2504 file, 44 Markdown/181 links. Commits4c6ba4a +3bd06ff đã push main; Quality36843794539 và Vercel Production PASS. Release v0.1.0-demo public prerelease, các asset tải được và SHA256 khớp. Public API portfolio/read200 đủ3 vị thế, không ký/gửi. Social preview file sẵn nhưng browser upload đang timeout; không claim setting đã áp dụng. Chi tiết ở [validation](../../evidence/validation/repository-reorganization.md). [Plan](../plans/active/repository-presentation.md).

Baseline 360e17f:87 unit +32 browser, check/build/CI và strict bundle PASS. [Lịch sử trước đợt này](../../archive/context/current-state-2026-10-01.md).
