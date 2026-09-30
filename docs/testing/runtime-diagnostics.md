# Chẩn đoán runtime Vercel — 30/09

Sau redeploy, health xác nhận đủ cấu hình và journal/AI configured. POST portfolio/read và demo/check vẫn 503 SERVICE_UNAVAILABLE. Chrome extension đã kết nối, đọc được Logs của deployment HKuAe5FCd7T1G7v4x45PhdGXxQVw: chỉ có kind Error, chưa có nguyên nhân gốc. RPC cấu hình kiểm bằng DOM: khớp chính xác endpoint Devnet công khai, không có assignment prefix hoặc dấu ngoặc. Không đọc các secret khác.

API đã cấu hình chạy trên Next production local trả demo/check 200 với public wallet của chủ dự án. Đây là kiểm tra đọc dữ liệu, không ký/gửi. Không kết luận nguyên nhân Vercel từ thành công local.

Bổ sung log nội bộ an toàn: fixed category, mã lỗi cause chain, numeric HTTP/SDK code, basename và dòng code; không raw message, full path, URL, header, body hoặc response provider. Mã lỗi module bị loader bọc vẫn nhận diện từ cause. Response public chỉ có error code/requestId.

Trước đây bundle check chỉ import SDK. Bản mới còn gọi POST đã biên dịch từ bộ traced files với cấu hình public + fetch offline: cần tới được genesis guard và trả DEVNET_UNAVAILABLE. Nó không gọi RPC thật hoặc tạo giao dịch. Cổng này kiểm đường lazy import có cấu hình, không suy rằng market hoặc Vercel live đã hoạt động.

UI portfolio không gọi lỗi đọc ví là không có khoản vay. Chờ đọc diagnostics mới sau deploy để xác định nguyên nhân và xử lý, không đổi RPC hoặc protocol theo phỏng đoán.
