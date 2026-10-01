# Chẩn đoán runtime Vercel — 30/09

Sau redeploy, health xác nhận đủ cấu hình và journal/AI configured. POST portfolio/read và demo/check vẫn 503 SERVICE_UNAVAILABLE. Chrome extension đã kết nối, đọc được Logs của deployment HKuAe5FCd7T1G7v4x45PhdGXxQVw: chỉ có kind Error, chưa có nguyên nhân gốc. RPC cấu hình kiểm bằng DOM: khớp chính xác endpoint Devnet công khai, không có assignment prefix hoặc dấu ngoặc. Không đọc các secret khác.

API đã cấu hình chạy trên Next production local trả demo/check 200 với public wallet của chủ dự án. Đây là kiểm tra đọc dữ liệu, không ký/gửi. Không kết luận nguyên nhân Vercel từ thành công local.

Bổ sung log nội bộ an toàn: fixed category, mã lỗi cause chain, numeric HTTP/SDK code, basename và dòng code; không raw message, full path, URL, header, body hoặc response provider. Mã lỗi module bị loader bọc vẫn nhận diện từ cause. Response public chỉ có error code/requestId.

Trước đây bundle check chỉ import SDK. Bản mới còn gọi POST đã biên dịch từ bộ traced files với cấu hình public + fetch offline: cần tới được genesis guard và trả DEVNET_UNAVAILABLE. Nó không gọi RPC thật hoặc tạo giao dịch. Cổng này kiểm đường lazy import có cấu hình, không suy rằng market hoặc Vercel live đã hoạt động.

UI portfolio không gọi lỗi đọc ví là không có khoản vay. Chờ đọc diagnostics mới sau deploy để xác định nguyên nhân và xử lý, không đổi RPC hoặc protocol theo phỏng đoán.

## Nguyên nhân được khoanh vùng và bản sửa

Diagnostics live ở checkpoint `5e5e6e9`, request `9bcf66be-9b03-4eb8-8356-1d7aac525fa8`: category `module_load`, frame `turbopack_runtime.js:704:15`, chunk `root-of-the-server__202x3q5._.js:1:107`. Đối chiếu chunk cùng tên trên build local: vị trí này tải external SDK `@kamino-finance/klend-sdk-c73fa4196c003b37`. Alias nằm trong `.next/node_modules` và trỏ sang SDK thật. Loader bọc lỗi bằng message nhưng không giữ cause; vì thế code lỗi module trước đó bị mất.

Checkpoint `bb94959` thử Webpack để thấy lỗi gốc không bị loader bọc. [Next.js hỗ trợ lựa chọn Webpack](https://nextjs.org/docs/app/api-reference/turbopack). Live sau đó vẫn lỗi nhưng đã ghi rõ `ERR_REQUIRE_ESM`. Vì vậy alias của Turbopack chỉ là vị trí bọc lỗi, chưa phải nguyên nhân gây lỗi; không giữ cổng từ chối alias như bằng chứng packaging sai.

Local bản Webpack: `npm run verify` PASS, 71 unit tests + 29 browser tests, format/lint/types/build. Bundle probe SDK + configured compiled POST tới genesis guard PASS. Cần kiểm lại trên Vercel sau deploy trước khi kết luận lỗi live đã hết; không coi thành công local là phép vay/trả thật.

## Nguyên nhân gốc: dependency CJS gọi UUID ESM

Tái hiện chính xác bằng `node --no-experimental-require-module`: `@kamino-finance/klend-sdk` → web3.js 1.98.4 → rpc-websockets 9.3.9 gọi `require('uuid')`, nhưng UUID 14.0.2 chỉ cung cấp ESM. Node 24 local mặc định hỗ trợ require ESM nên bài kiểm cũ không phát hiện điều kiện mà loader Vercel gặp.

Sửa có phạm vi: override rpc-websockets dưới web3.js 1.98.4 sang 9.3.8 (vẫn thuộc range ^9.0.2 của web3.js), dùng UUID 11.1.1 có export CommonJS. Giữ Next/SDK/Kit và công thức tài chính. Khôi phục Turbopack production vì compiler không phải nguyên nhân gốc. Gate bundle luôn chạy với `--no-experimental-require-module` để không dựa vào cơ chế interop của Node local.

Sau npm install, STRICT_CJS_SDK_IMPORT_OK. Audit giữ nguyên 21 transitive warnings (9 moderate/12 high); không audit fix --force. Chờ full checks và API live sau deploy; đây chưa phải bằng chứng vay/trả thật.

## Nghiệm thu runtime bản sửa 3a16008

[Quality CI PASS](https://github.com/2274802010922/picachu__/actions/runs/36708586217), 71 unit + 29 browser tests và strict-CJS compiled bundle probe. Vercel Production deployment `6758193289` success. Trên domain chính: portfolio/read trả 200 và positions=[] cho ví owner; demo/check profile A trả 200, stage deposit, số dư 2.998111626 SOL Devnet. Đây là ví chưa có vị thế, không phải lỗi đọc bị chuyển thành trống.

demo/prepare profile A, 0,1 SOL trả 200: simulation PASS, fee 5000 lamports, tổng SOL debit 123535560 lamports (bao gồm tài khoản/rent), position `BLTZxEYz32BNieH7SKEkxgSgN9LmzRMrnf7wb5jwe1nJ`. Không ghi token binding hoặc transaction vào tài liệu/log. signed=false, submitted=false. Cần owner ký deposit rồi mới nghiệm thu borrow và repay; chưa đóng live transaction gate.
