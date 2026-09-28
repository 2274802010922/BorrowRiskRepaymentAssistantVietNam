# Kiểm tra Vercel ngày 28/09/2026

URL người dùng cung cấp: https://picachu-iota.vercel.app/

- Code release: `1102222` đã push main; [Quality CI](https://github.com/2274802010922/picachu__/actions/runs/36405776821) PASS (34 unit tests, 21 browser tests và production build).
- Trình duyệt xác nhận landing mới: picachu, nút “Kết nối ví”, CTA tạo khoản vay Devnet.
- Workspace hiển thị “Khoản vay trong tầm nhìn.”, điều hướng bước, dữ liệu minh họa.
- Kích hoạt giải thích trên bản live: “Trả 100 USDC, còn 50 USDC trong ví.”; tỷ lệ nợ sau trả 62,5%; thiếu 20 USDC để đạt 60%. Số không còn phần 0 thập phân thừa.
- Lượt thử dùng giải thích mẫu, không xuất hiện nhãn “Diễn giải từ AI”. Không suy rằng OpenRouter hoạt động chỉ vì đủ env.
- `/setup` tải được và hiển thị bốn bước cùng yêu cầu kết nối ví.
- `GET /api/health`: `app=picachu`, `cluster=devnet`, `executionConfigured=false`, `aiConfigured=true`.

Chưa ký bằng ví; chưa tạo khoản vay hoặc trả nợ thật. Execution cần cấu hình market/reserves và secret hợp lệ; oracle của market đã probe trước đó invalid. Không thay dữ liệu mẫu thành proof Devnet.
