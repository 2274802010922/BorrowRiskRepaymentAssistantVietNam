# Chẩn đoán runtime Vercel — 30/09

Sau redeploy, health xác nhận đủ cấu hình và journal/AI configured. POST portfolio/read và demo/check vẫn 503 SERVICE_UNAVAILABLE. Chrome extension đã kết nối, đọc được Logs của deployment HKuAe5FCd7T1G7v4x45PhdGXxQVw: chỉ có kind Error, chưa có nguyên nhân gốc. RPC cấu hình kiểm bằng DOM: khớp chính xác endpoint Devnet công khai, không có assignment prefix hoặc dấu ngoặc. Không đọc các secret khác.

API đã cấu hình chạy trên Next production local trả demo/check 200 với public wallet của chủ dự án. Đây là kiểm tra đọc dữ liệu, không ký/gửi. Không kết luận nguyên nhân Vercel từ thành công local.

Bổ sung log nội bộ an toàn: fixed category, mã lỗi cause chain, numeric HTTP/SDK code, basename và dòng code; không raw message, full path, URL, header, body hoặc response provider. Mã lỗi module bị loader bọc vẫn nhận diện từ cause. Response public chỉ có error code/requestId.

Trước đây bundle check chỉ import SDK. Bản mới còn gọi POST đã biên dịch từ bộ traced files với cấu hình public + fetch offline: cần tới được genesis guard và trả DEVNET_UNAVAILABLE. Nó không gọi RPC thật hoặc tạo giao dịch. Cổng này kiểm đường lazy import có cấu hình, không suy rằng market hoặc Vercel live đã hoạt động.

UI portfolio không gọi lỗi đọc ví là không có khoản vay. Chờ đọc diagnostics mới sau deploy để xác định nguyên nhân và xử lý, không đổi RPC hoặc protocol theo phỏng đoán.

## Nguyên nhân được khoanh vùng và bản sửa

Diagnostics live ở checkpoint `5e5e6e9`, request `9bcf66be-9b03-4eb8-8356-1d7aac525fa8`: category `module_load`, frame `turbopack_runtime.js:704:15`, chunk `root-of-the-server__202x3q5._.js:1:107`. Đối chiếu chunk cùng tên trên build local: vị trí này tải external SDK `@kamino-finance/klend-sdk-c73fa4196c003b37`. Alias nằm trong `.next/node_modules` và trỏ sang SDK thật. Loader bọc lỗi bằng message nhưng không giữ cause; vì thế code lỗi module trước đó bị mất.

Quyết định: build production bằng `next build --webpack`, giữ phiên bản Next/SDK, serverExternalPackages và tham số protocol. [Next.js hỗ trợ lựa chọn Webpack](https://nextjs.org/docs/app/api-reference/turbopack). Build mới dùng tên package nguyên bản; gate bundle từ chối hashed SDK aliases thay vì tái tạo symlink rồi suy rằng Vercel cũng resolve được.

Local bản Webpack: `npm run verify` PASS, 71 unit tests + 29 browser tests, format/lint/types/build. Bundle probe SDK + configured compiled POST tới genesis guard PASS. Cần kiểm lại trên Vercel sau deploy trước khi kết luận lỗi live đã hết; không coi thành công local là phép vay/trả thật.
