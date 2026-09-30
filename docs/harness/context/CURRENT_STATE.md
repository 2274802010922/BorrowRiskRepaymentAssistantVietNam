# Trạng thái hiện tại

## 30/09 — hướng mục tiêu và danh mục

- Owner đã thử ký nhưng UI chặn TRANSACTION_CHANGED trước submit; Devnet còn stage deposit/balance cũ, chưa có thế chấp. Thêm guard dùng chung + safe console diagnostics để phân biệt account/message changes và giữ exact bytes; setup bỏ preview mismatch, kiểm expiry sau khi ví trả về. Cần ký lại sau deploy để xác định phần thay đổi thực tế, không giả định priority fee là nguyên nhân. [Ghi chép](../../testing/wallet-signing-validation.md).

- Runtime sửa `3a16008` đã có CI + Vercel Production PASS. Domain chính portfolio/read và demo/check trả 200; ví owner chưa có vị thế. demo/prepare 0,1 SOL profile A simulation PASS, fee5000, total debit0,12353556 SOL; không ký/gửi. Cần owner ký bước deposit trên `/setup` trước khi kiểm borrow/repay. Chrome và env đã đủ cho bước này, không cần lấy lại log hoặc thêm key. [Bằng chứng](../../testing/runtime-diagnostics.md).

- Sau khi owner thêm giá trị và redeploy: live health executionConfigured=true, missing/invalid=[]; portfolio/read và demo/check vẫn 503 generic. Chrome extension đã kết nối; đã đọc Vercel Logs, không còn chờ owner gửi log. RPC URL khớp public Devnet, API configured trên Next production local trả 200. Đang bổ sung safe diagnostics + compiled configured bundle gate để xác định lỗi runtime, chưa kết luận RPC hoặc module là nguyên nhân. [Ghi chép](../../testing/runtime-diagnostics.md).
- Diagnostics live `5e5e6e9` khoanh lỗi module_load tại SDK external alias. Checkpoint thử Webpack `bb94959` làm lộ ERR_REQUIRE_ESM; alias không phải nguyên nhân gốc. Đã tái hiện bằng Node strict CJS: rpc-websockets 9.3.9 require UUID 14 ESM. Pin dependency dưới web3.js 1.98.4 về 9.3.8 / UUID 11, khôi phục Turbopack và bỏ cổng alias sai; bundle gate luôn dùng --no-experimental-require-module. STRICT_CJS_SDK_IMPORT_OK, đang kiểm full checks/deploy. Không đổi AI/config Kamino/SDK, không ký/gửi giao dịch.

- Người dùng yêu cầu build theo plan và commit/push main. Hướng hiện hành ở [goal-portfolio](../plans/active/goal-portfolio.md), thay phần mở rộng single-position của MVP cũ.
- `/portfolio`: UI ba bước VI/EN, tối đa ba vị thế, buffer 5% từ giá đã shock, số dư ví dùng một lần, trả mức tối thiểu khi đủ ngân sách. Thiếu ngân sách không khuyến nghị partial khi model chưa kiểm chứng.
- `/api/plans*`: snapshot mới từ server, HMAC ID, journal Redis CAS, khóa sau kiểm chữ ký, ký từng bước, receipt historical, dừng khi unknown/lỗi/số dư hoặc số tiền mục tiêu đổi. Legacy recovery còn nguyên.
- `/setup`: chọn phiên cũ hoặc profile A/B/C (201/202/203), mỗi profile 0,1 SOL, nominal adjusted LTV 65/55/45%. Chặn cap/thanh khoản/simulation; không reset marker cũ hoặc auto-sign.
- Cost-grid search đã có unit tests trừu tượng + so exhaustive small grid. Chưa có model liquidation Kamino được kiểm chứng, allocator không nối vào API/UI; health unavailable. Đây là phần chưa hoàn thành của hướng khác biệt.
- Live health ngày 30/09 vẫn thiếu ba biến Kamino, AI và Redis báo đã cấu hình. Đây là health bản deploy trước checkpoint mới, không xác nhận Redis journal runtime hoặc giao dịch thực tế.
- Chưa có chữ ký vay/trả/withdraw thật. Owner cần deploy và ký theo [walkthrough](../../deployment/portfolio-demo.md). Không đóng gate bằng mock hoặc simulation.
- Local verify PASS 67 unit tests, 28 browser tests, build/format/lint/types; traced SDK bundle import PASS, README 89 links/assets PASS. Profile B slot202 deposit simulation PASS (không ký/gửi). [Bằng chứng](../../testing/portfolio-validation.md).
- Checkpoint `ea0f963` đã push main, Quality CI PASS và Vercel Production success. Live health đã có portfolioPlanStoreConfigured=true + allocator unavailable, vẫn thiếu ba giá trị Kamino. Bổ sung sau checkpoint: recovery ghi known signature vào journal mà không broadcast lại; 68 unit tests và check PASS.

Các mục bên dưới là lịch sử, không thay trạng thái hiện hành.

- Người dùng xác nhận AI đã gọi thành công và yêu cầu chuyển sang Kamino; giữ nguyên code/cấu hình AI đang chạy, hủy các chỉnh sửa AI thử nghiệm chưa commit.
- 29/09: phát hiện SDK 11.0.1 so sánh price/confidence khác đơn vị. Adapter Pyth-only mới kiểm receiver owner + Full verification + confidence/TWAP; freshness theo từng reserve và cảnh báo giá quá 5 phút. [Bằng chứng](../../testing/devnet-oracle-validation.md).
- Đã simulation deposit 0,1 SOL PASS bằng public wallet người dùng cung cấp; chưa ký/gửi. Bộ market/reserve trong tài liệu có thể đưa vào Vercel sau khi bản sửa được deploy, rồi người dùng tự ký deposit trước khi kiểm bước borrow.
- Kiểm thử bản sửa oracle: format/lint/typecheck, 50 unit tests, production build và 25 browser tests PASS; không thay đổi AI so với main hiện hành.

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
