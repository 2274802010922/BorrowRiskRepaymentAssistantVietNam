# Kiểm chứng checkpoint danh mục

30/09 local: `npm run verify` PASS với 67 unit tests và 28 browser tests, format/lint/types/build, bao gồm recovery portfolio sau reload. `server-bundle.mjs` chép 2.501 traced files vào temp độc lập và SDK_IMPORT_OK. README checker PASS 89 links/assets; screenshot desktop portfolio đã xem trực tiếp.

Benchmark search abstract 3 × 201 candidates, 5 lần: 189/170/166/163/160 ms, p95 mẫu khoảng 189 ms trên máy local. Không bao gồm RPC hoặc tính model loss, không phải performance claim production.

Probe mới ngày 30/09, ví owner public: slot 202 `6GF42T5yCrr6YeV3pwFcX94da3VzgbsMcAHTFfzHaLzh`, profile B nominal55%, oracle đã qua adapter và deposit 0,1 SOL simulation PASS, fee 5.000 lamports. `signed=false`, `submitted=false`; không nghiệm thu borrow/repay. Probe SDK gốc riêng vẫn báo oracle valid=false do bug đơn vị đã ghi ở checkpoint trước; kết quả simulation dùng adapter đã sửa, không hạ cổng xác thực.

Các lớp kiểm khác nhau, không suy từ lớp này sang lớp khác:

- Core mục tiêu: shared balance, exact rounding, zero/debt-free, thiếu ngân sách, reserve lớn hơn balance, thứ tự vị thế, mint/identity khác nhau. Ví dụ 13,6 USDC là synthetic.
- Journal: in-memory Redis command contract, mocked Kamino RPC/transaction primitives; hoàn thành hai bước cần thiết, receipt bắt buộc, khóa giữa hai plan, wallet movement, token mismatch, cancellation. Không phải kiểm Redis REST live.
- Search: cost vectors trừu tượng, một–ba vị thế, so exhaustive enumeration trên small grid. Chỉ xác nhận tối ưu trong tập candidates, chưa xác nhận liquidation cost.
- Browser: production Next build, UI VI/EN bốn viewport, goal budget error và thiếu ngân sách, single selection, axe. Wallet tests hiện có dùng mock.
- Live: health Vercel trước release vẫn thiếu ba biến Kamino. Chưa có signature hoặc vòng vay-trả ba vị thế thực tế; dùng walkthrough để bổ sung.

Không dùng số test làm bằng chứng độ chính xác của một model chưa tồn tại. Bằng chứng protocol còn cần: mapping phiên bản program/IDL, close factor, small loan full liquidation, collateral cap, bonus/fee và atomic rounding; không thay oracle Devnet công khai để ép test.
