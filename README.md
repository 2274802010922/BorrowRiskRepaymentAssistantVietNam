# BorrowRisk Vietnam

Hiểu khoản vay, thử kịch bản và tự quyết định trả nợ trong giới hạn của bạn.

**Đang phát triển MVP · Solana Devnet · người dùng tự ký · không giữ private key.**

Ứng dụng web Next.js dành cho người đã có khoản vay: xem vị thế, mô phỏng giá giảm, đặt ngân sách và dự trữ, so sánh phương án trước/sau rồi xác nhận qua Phantom.

## Trạng thái phải đọc trước

- UI minh họa, core tính toán và production build đã qua kiểm tra tự động; xem [phạm vi bằng chứng](docs/testing/README.md).
- Có code đọc/prepare/submit/status qua SDK Kamino, nhưng **chưa có luồng repay live được nghiệm thu**.
- Chưa deploy Vercel; người dùng sẽ deploy và kiểm thử thủ công theo [checklist](docs/deployment/manual-acceptance.md).
- AI mặc định dùng template. Adapter OpenAI chỉ được bật khi có cấu hình; **chưa kiểm chứng lượt gọi AI thật**.
- Không dùng ảnh fixture làm bằng chứng chain. Không gọi simulation, signature hoặc HTTP 200 là “nợ đã giảm”.

## Chạy tại máy

Node theo `.nvmrc`, npm theo `packageManager`:

```sh
npm ci
npm run dev
```

Mở `http://localhost:3000`. Chế độ minh họa không cần ví hoặc API key.

```sh
npx playwright install chromium
npm run verify
npm run check:devnet
```

Lệnh cuối chỉ kiểm RPC/genesis/program, **không** chứng minh repay hoạt động. Các cấu hình trong `.env.example` cần được xác nhận trước khi bật thực thi; không dùng địa chỉ mainnet cho Devnet.

## Bản đồ repo

| Thư mục     | Trách nhiệm                                   |
| ----------- | --------------------------------------------- |
| `app/`      | Next.js routes và API handlers                |
| `frontend/` | UI light-terminal, ngôn ngữ, ví và feedback   |
| `core/`     | Toán học và validation độc lập với mạng/AI    |
| `backend/`  | API orchestration, binding preview, diễn giải |
| `solana/`   | Network guard, Kamino adapter, giao dịch      |
| `shared/`   | Data contracts                                |
| `tests/`    | Unit, browser/a11y và fixtures có nhãn        |
| `scripts/`  | Kiểm tra và hỗ trợ tái hiện                   |
| `docs/`     | Kiến trúc, ngữ cảnh, thiết kế và bằng chứng   |

[Tài liệu](docs/README.md) · [Trạng thái hiện tại](docs/harness/context/CURRENT_STATE.md) · [Đối chiếu kiến trúc](docs/architecture/README.md) · [Design system](docs/design/system.md) · [Nguồn kế thừa](THIRD_PARTY_NOTICES.md)
