# Bằng chứng phân bổ và benchmark

Chạy từ root: `npx tsx scripts/checks/allocation-evidence.ts`. Script dựng lại [demo-comparison.json](demo-comparison.json) từ core, kiểm kết quả và ghi [benchmark.json](benchmark.json). Không dùng ví/RPC hoặc gửi transaction.

Ví dụ cố định65/55/45, collateral1SOL mỗi khoản/giá100, balance80, budget10/reserve20/shock30%/buffer5%. Risk-first dùng10USDC, cost0,0006USD, goals1/3. Đề xuất dùng9,000001USDC, cùng cost/goals, giữ0,999999 ngân sách chưa dùng. Equal split đạt2/3 goals nhưng cost khoảng0,131USD. Đây là đánh đổi theo objective loss một lượt +fee; principal trả nợ không phải loss, không claim tối ưu global hoặc mọi goal đã đạt.

Benchmark tách khỏi ví dụ:1–3 vị thế synthetic đều nợ65USDC để stress các khoản;3 warmup,30 samples/case, ghi candidate counts và p50/p95. Chỉ đo synchronous compute, không gồm import/cold start, RPC, HTTP, UI hoặc chain confirmations; không phải worst-case/SLA. Máy/platform/version/time ghi trong JSON. Kết quả không chứng minh mainnet readiness hoặc lợi nhuận thực tế.

[25 ca executable VM](../liquidation/README.md) kiểm model riêng; [partial repayment Devnet](../../testing/allocation-acceptance.md) kiểm execution riêng. Ba loại evidence không thay thế nhau.
