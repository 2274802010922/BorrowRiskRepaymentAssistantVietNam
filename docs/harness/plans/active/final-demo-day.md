# Sản phẩm, demo và slide — chung kết 10/10/2026

Người dùng duyệt triển khai end-to-end ngày02/10: tổng hợp plan, hoàn thiện sản phẩm/demo/slide, cập nhật ngữ cảnh theo checkpoint, commit tiếng Việt và push main, chỉnh README/Release/GitHub. Không phỏng vấn, khảo sát hoặc outreach trong sprint.

## Đầu ra

1. UI/VI/EN nhất quán ví dụ13,6/còn66,4; preset Devnet do người dùng chọn, số tiền khả dụng, trạng thái thiếu ngân sách và tên khoản ổn định, kết quả receipt/fresh snapshot rõ.
2. Mục tiêu tự nhiên tạo draft phải review; giải thích portfolio ngắn, fallback, không để AI tính tiền/ký hoặc invent values.
3. Demo thật/readiness và clip thao tác60–90s, walkthrough YouTube hiện hành giữ nguyên. Nguồn synthetic/live/API signer/popup được ghi đúng, không dựng verified giả.
4. Deck khoảng12 slide đủ problem/user/solution/demo/AI/Solana/architecture/competitors/business hypothesis/validation/roadmap/team/closing, PPTX editable, PDF, notes/Q&A.
5. Benchmark/evidence, CI/Vercel, README VI/EN, tài liệu và Release công khai.

## Cổng

Allocator chưa có matching program/IDL liquidation reference; giữ unavailable, không dùng flag để bật. Đợt này củng cố goal planner và execution đã nghiệm thu. Không thêm guard program chưa được test hoặc thay đổi protocol vì điểm số. Reserve vẫn được kiểm ở snapshot/simulation/submit, không claim on-chain guard của picachu đã có.

Gates: kiểm số/goal/parser/provider failure, wallet guards/pending/recovery, VI/EN375/768/1024/1440, build/strict bundle/docs links; slide package/finalizer/render; clip nguồn đúng; public artifact links; main commit/CI/deploy.

## Workflow

Làm sản phẩm → ghi evidence/checkpoint → demo → dựng deck theo hành vi đã hoàn thành → kiểm và publish → cập nhật CURRENT_STATE/HANDOFF. Dùng release asset cho binary, giữ source/notes/poster/docs trong repo. Không copy work/private hoặc credential.

Trạng thái: đang thực hiện. Baseline58d275f,87 unit/32 browser PASS. Chỉ đánh dấu từng cổng khi có kết quả thực tế.
