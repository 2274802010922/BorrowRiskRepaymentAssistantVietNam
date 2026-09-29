# Vercel + Devnet

Từ đợt sửa Web3: để gọi OpenRouter trên Vercel, cấu hình thêm `RATE_LIMIT_REDIS_URL` và `RATE_LIMIT_REDIS_TOKEN` (Redis REST tương thích Upstash). Nếu chưa có, app dùng template, không phát sinh lượt gọi provider. Health trả `aiSharedBudgetConfigured`; xem [hạn mức và nghiệm thu](../testing/web3-hardening.md).

<img src="../../public/brand/picachu-logo.jpg" alt="Logo pixel picachu" width="72">

AI dùng OpenRouter theo yêu cầu ngày 28/09/2026. Đặt `OPENROUTER_API_KEY` server-only và `AI_MODEL` bằng model ID đầy đủ trên OpenRouter (`provider/model`). Chọn endpoint hỗ trợ structured outputs; request dùng `require_parameters: true`. Thiếu cấu hình, lỗi provider hoặc output không hợp lệ đều về template. Không cần `OPENAI_API_KEY`.

Tham chiếu: [OpenRouter quickstart](https://openrouter.ai/docs/quickstart), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs). Chưa kiểm chứng API key thật trong phiên này.

Framework Next.js, Node theo `.nvmrc`, install `npm ci`, build `npm run build`. Chưa có deployment đã nghiệm thu ở checkpoint đầu.

Thực hiện theo [checklist deploy và nghiệm thu](manual-acceptance.md). UI minh họa chạy độc lập; live integration cần cấu hình và bằng chứng riêng.

- `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`.
- `SOLANA_RPC_URL`: server-only, nên dùng endpoint Devnet ổn định.
- `KAMINO_MARKET_ID`, `KAMINO_COLLATERAL_RESERVE`, `KAMINO_DEBT_RESERVE`: chỉ bật khi đã chạy gate và lưu bằng chứng.
- `PLAN_BINDING_SECRET`: ít nhất 32 ký tự ngẫu nhiên, không phải khóa ví, không đưa vào Git.
- `AI_ENABLED=false` mặc định; muốn bật cần OPENROUTER_API_KEY, AI_MODEL và giới hạn truy cập/chi phí ở nền tảng. Không có cấu hình → template.

Mọi endpoint dữ liệu tài chính trả no-store. Server không giữ khóa ký của người vay. Cấu hình chưa đủ phải báo không khả dụng, không tự dùng mainnet hay giả lập một giao dịch thành công.

Sau deploy: chạy UI smoke, kiểm RPC từ môi trường Vercel, thử Phantom bằng ví Devnet riêng, kiểm simulation/repay/status và đối chiếu nợ. Đường `status` cần hoạt động qua reload, không phụ thuộc RAM của một Function.
