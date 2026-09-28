# Deploy và nghiệm thu thủ công

Người dùng nhận phần deploy Vercel và kiểm thử live sau checkpoint này. Các ô dưới đây chưa được nghiệm thu. Không cần ví/API key để dùng chế độ minh họa.

## 1. Deploy bản UI

- [ ] Import repository trong Vercel; chọn production branch `main` (người dùng yêu cầu đưa MVP lên main ngày 28/09/2026).
- [ ] Root directory là root repo; framework Next.js; Node 24; install `npm ci`; build `npm run build`.
- [ ] Đặt `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, `AI_ENABLED=false`. Không tự điền reserve/market từ mainnet.
- [ ] Deploy; ghi URL và commit SHA đang chạy. Mở `/api/health` để xem trạng thái cấu hình, không coi configured là integration đã hoạt động.
- [ ] Mở `/`, `/workspace`, `/guide`, `/lab`; thử VI/EN, mobile menu, reload và nhập số không hợp lệ. Không xuất hiện horizontal scroll hoặc nút bị che.
- [ ] Minh họa mặc định: 10 SOL × $100, nợ 600 USDC, ví 150, giữ lại 50, ngân sách 100; shock 20%, target 60%. Kết quả partial 100 USDC; LTV kịch bản sau trả 62.5%, chưa đạt 60%; thiếu 20 USDC để đạt mục tiêu.

## 2. Cấu hình Devnet thật

- [ ] Dùng ví Phantom thử nghiệm riêng, chọn Solana Devnet. Có thể dùng khoản vay phù hợp đã có, hoặc tạo qua `/setup` theo [hướng dẫn](demo-setup.md); market/reserves cần cấu hình và vượt kiểm tra trước.
- [ ] Chọn RPC Devnet ổn định, đặt `SOLANA_RPC_URL` ở server. Public RPC từng timeout trong lần kiểm tra này.
- [ ] Xác minh `KAMINO_MARKET_ID`, `KAMINO_COLLATERAL_RESERVE`, `KAMINO_DEBT_RESERVE` thuộc cùng market và còn hoạt động. MVP chỉ hỗ trợ một collateral SOL/wSOL, một debt token SPL cổ điển 6 decimals; oracle phải mới.
- [ ] Tạo `PLAN_BINDING_SECRET` ngẫu nhiên ít nhất 32 ký tự bằng password manager hoặc trình tạo secret; chỉ lưu Vercel server environment. Không dùng private key ví. Giữ ổn định để recovery vẫn xác minh được preview cũ.
- [ ] Redeploy sau khi cập nhật env. Chạy `npm run check:devnet` với cùng cấu hình để kiểm chain/program; lệnh này không chứng minh market hay repayment hoạt động.
- [ ] Kết nối ví, chọn dữ liệu Devnet, tải vị thế. Đối chiếu owner, mint, số dư, nợ, collateral, timestamp với protocol/RPC. Nếu unsupported, stale hoặc timeout thì dừng kiểm giao dịch và lưu lỗi; không đổi nhãn fixture thành live.

## 3. Repayment và recovery

- [ ] Chọn số trả nhỏ, giữ đủ token dự trữ và SOL phí; prepare phải simulation thành công trước khi hiện ký.
- [ ] Thử từ chối trong Phantom: không hiển thị thành công, cho chuẩn bị lại.
- [ ] Thử để preview hết hạn: phải chuẩn bị lại; không được gửi quote hết hạn.
- [ ] Ký đúng giao dịch Devnet, theo dõi submitted → confirmed/verification → verified. Chỉ gọi verified khi dữ liệu chain đáp ứng kiểm tra.
- [ ] Lưu Explorer link `?cluster=devnet`, transaction signature, thời điểm, số nợ trước/sau và token đã trừ. Che thông tin cá nhân khi chia sẻ.
- [ ] Reload khi pending; chọn kiểm tra lại. Không gửi thêm giao dịch trong khi giao dịch cũ chưa rõ trạng thái.
- [ ] Đổi ví khi pending; lịch sử hiển thị phải theo đúng ví. Mất RPC không được chuyển thành success hoặc không có khoản vay.
- [ ] Xác minh số token bị trừ đúng số đã duyệt, dự trữ còn đủ, nợ giảm. Đọc lại số liệu từ RPC sau confirmation; không chỉ nhìn toast.

## 4. AI tùy chọn

- [ ] Giữ template nếu không cần AI. Bản demo tính toán đầy đủ không phụ thuộc model.
- [ ] Nếu bật: cấu hình giới hạn truy cập/rate limit và chi phí trên nền tảng trước, thêm `OPENROUTER_API_KEY`, `AI_MODEL`, `AI_ENABLED=true` rồi redeploy. Endpoint hiện chưa có limiter phân tán trong ứng dụng.
- [ ] Thử lượt gọi thật và lỗi/timeout provider; phải fallback template. AI không được sửa số tiền, tự tạo giao dịch hoặc tuyên bố bảo đảm an toàn.

## Ghi nhận kết quả

Với mỗi bước, ghi ngày, commit, URL, PASS/FAIL, bằng chứng và lỗi đã che secret vào `docs/testing/`. Hiện chưa có deploy URL, Phantom acceptance hoặc signature repay thật. Dependency audit còn cảnh báo transitive (9 moderate, 12 high tại checkpoint); cần xử lý riêng trước khi mở rộng ra tài sản thật.
