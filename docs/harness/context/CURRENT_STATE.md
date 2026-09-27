# Trạng thái hiện tại

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
