# Trạng thái hiện tại

- Checkpoint hardening `631d148` đã push main, CI và Vercel Production PASS. Hai API live demo/check và positions/read trả JSON 503 + requestId thay vì 500 rỗng.
- Runtime ngày 29/09: thiếu ba giá trị Kamino; secret không báo lỗi; AI có cấu hình nhưng Redis quota chưa cấu hình. Xem [checklist env](../../deployment/environment-checklist.md). Chưa nghiệm thu vay/trả/withdraw bằng Phantom thật.

- 29/09/2026 — checkpoint sửa Web3: API lazy-load SDK + lỗi JSON/requestId, readiness, Phantom reconnect/menu, lọc vị thế, preview bound inputs, recovery/polling, receipt lịch sử, rút thế chấp debt-free và quota AI. [Phạm vi](../../testing/web3-hardening.md).
- Kiểm tra local: format/lint/typecheck PASS; 43 unit tests, 25 browser tests, production build PASS; 2.501 file từ Next trace được chép sang temp độc lập và SDK import PASS. Mobile screenshot đã xem. Chờ kiểm API live sau push, chưa có chữ ký/vòng vay-trả thật.
- Vercel dashboard đã mở nhưng đang ở màn hình đăng nhập; người dùng được yêu cầu đăng nhập, chưa nhận thông báo hoàn tất. Không có quyền truy cập log runtime thực tế chỉ từ việc được cho phép thao tác.
- AI trên Vercel dùng template khi chưa có `RATE_LIMIT_REDIS_URL/TOKEN`; RPC limiter thiếu store chỉ là per-process. Chưa tự cấu hình market, Redis hoặc ký giao dịch.

- Logo dự án đã đổi sang ảnh pixel do người dùng cung cấp: `public/brand/picachu-logo.jpg`. Áp dụng UI, favicon, metadata chia sẻ, README VI/EN và banner social preview; không thay theme light terminal.
- Kiểm tra thay logo: file nguồn/public/favicon có SHA-256 giống nhau; format/lint/typecheck, 34 unit tests, production build, 21 browser tests PASS. 85 liên kết/asset README hợp lệ; screenshot mobile đã xem trực tiếp.

- README trình bày lại theo hành trình sản phẩm/giám khảo, VI mặc định + README.en.md. Asset banner light/dark, social preview và screenshot thật tại `docs/assets/readme/`; script tái tạo `scripts/readme-assets.mjs`.
- GitHub About/topics đã cập nhật cho picachu; license giữ trạng thái chưa được chủ dự án chọn. Phần bằng chứng README gắn checkpoint và không khẳng định live Devnet/AI đã hoàn tất.

- Vercel live: https://picachu-iota.vercel.app/ — đã kiểm landing/workspace/setup ngày 28/09/2026. Health: app=picachu, cluster=devnet, executionConfigured=false, aiConfigured=true. Giải thích trả số gọn; lượt thử hiển thị template, chưa xác minh provider AI live.
- Release code `1102222` đã push main, GitHub Actions Quality PASS. GitHub repo hiện là `2274802010922/picachu__`; remote local đã cập nhật, working tree sạch sau checkpoint.

- Release picachu ngày 28/09/2026: giữ light terminal, đổi thương hiệu/UI, nút “Kết nối ví” (Phantom), thêm `/setup` và `/api/demo`.
- Setup hai giao dịch deposit/borrow, simulation trước ký, binding riêng `picachu-demo-v1`, status đối chiếu on-chain và pending theo ví. Vanilla obligation id 201; marker System account chặn vay trùng nguyên tử.
- Giải thích gồm tối đa ba dòng do core tạo; AI tối đa 25 từ/180 ký tự. Bộ format bỏ số 0 thừa, không đổi số atomic dùng ký; kết quả cũ bị ẩn khi đổi đầu vào/ngôn ngữ.
- Kiểm tra release: 34 unit tests và 21 browser tests đã PASS, production build PASS; gồm 5 route axe và VI/EN ở 375/768/1024/1440px. Các test giao dịch dùng mock, không thay live acceptance.
- Devnet đọc mới: discovery 284 reserves, probe market `9VaMhQPqEjQSByvZfjYFP6iiJLZFKzXTE5MNK9bDg1dr` trả oracle SOL và USDC `valid: false`. Chưa cấu hình market mặc định hoặc gửi giao dịch. Trang setup chặn stale data.
- Tiếp tục từ [hướng dẫn setup](../../deployment/demo-setup.md). Người dùng đã yêu cầu commit/push release lên main.

- 28/09/2026: đổi AI provider sang OpenRouter (`OPENROUTER_API_KEY`, `AI_MODEL`); dùng Chat Completions + JSON schema và template fallback. Chưa có lượt gọi live được nghiệm thu.
- Kiểm tra đổi provider: 27 unit tests PASS, gồm request OpenRouter và fallback khi thiếu key, HTTP error, timeout, output bị cắt, sai schema hoặc chứa số do model tạo. Format/lint/typecheck PASS.

- Người dùng đã yêu cầu build end-to-end và commit/push theo checkpoint.
- Một người cùng Codex; ngày 28/09/2026 người dùng yêu cầu merge toàn bộ MVP từ `chore/workflow-ui-harness` lên `main` để deploy Vercel.
- Remote baseline: `2ce5c3c`; tài liệu kiến trúc gốc giữ nguyên.
- Đã triển khai landing/workspace/guide/lab VI/EN, planner, ví Phantom, adapter Kamino, pipeline prepare/simulate/sign/submit/status, template và AI tùy chọn.
- `npm run verify` PASS ngày 27/09/2026: format, lint, typecheck, 20 unit tests, production build, 17 Chromium tests (8 viewport/locale, 4 axe, 5 hành vi).
- UI được kiểm ở 375/768/1024/1440px; ảnh 375 và 1440 được xem trực tiếp. Bằng chứng UI là synthetic.
- Devnet discovery đọc được program/reserves; public RPC timeout khi kiểm market. Chưa có proof repay thật hoặc market/pair được nghiệm thu.
- Người dùng yêu cầu chốt code và commit/push; họ sẽ deploy Vercel và test thủ công theo `docs/deployment/manual-acceptance.md`.
- Chưa có AI API key trong môi trường; template phải hoạt động độc lập.
- Plan active: [MVP](../plans/active/mvp.md).
- Audit còn 21 cảnh báo transitive (9 moderate, 12 high); không dùng `audit fix --force`. AI chưa có limiter phân tán, mặc định tắt.

Không dùng tài liệu này để suy rằng một chức năng chưa kiểm đã hoạt động.
