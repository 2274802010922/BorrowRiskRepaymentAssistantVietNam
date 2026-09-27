# Vercel + Devnet

Framework Next.js, Node theo `.nvmrc`, install `npm ci`, build `npm run build`. Chưa có deployment đã nghiệm thu ở checkpoint đầu.

Thực hiện theo [checklist deploy và nghiệm thu](manual-acceptance.md). UI minh họa chạy độc lập; live integration cần cấu hình và bằng chứng riêng.

- `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`.
- `SOLANA_RPC_URL`: server-only, nên dùng endpoint Devnet ổn định.
- `KAMINO_MARKET_ID`, `KAMINO_COLLATERAL_RESERVE`, `KAMINO_DEBT_RESERVE`: chỉ bật khi đã chạy gate và lưu bằng chứng.
- `PLAN_BINDING_SECRET`: ít nhất 32 ký tự ngẫu nhiên, không phải khóa ví, không đưa vào Git.
- `AI_ENABLED=false` mặc định; muốn bật cần OPENAI_API_KEY, AI_MODEL và giới hạn truy cập/chi phí ở nền tảng. Không có cấu hình → template.

Mọi endpoint dữ liệu tài chính trả no-store. Server không giữ khóa ký của người vay. Cấu hình chưa đủ phải báo không khả dụng, không tự dùng mainnet hay giả lập một giao dịch thành công.

Sau deploy: chạy UI smoke, kiểm RPC từ môi trường Vercel, thử Phantom bằng ví Devnet riêng, kiểm simulation/repay/status và đối chiếu nợ. Đường `status` cần hoạt động qua reload, không phụ thuộc RAM của một Function.
