# Tạo khoản vay thử bằng picachu

## Trạng thái

Luồng web đã triển khai; chưa có bằng chứng một lượt vay/trả thật qua Phantom. Kiểm tra đọc ngày 28/09/2026 tìm được 284 reserve nhưng cặp SOL/USDC được probe có oracle `valid: false`. Không dùng địa chỉ tìm thấy làm cấu hình đã nghiệm thu. Khi oracle cũ/không hợp lệ, ứng dụng chặn ký. Không tự đổi sang mainnet hoặc tạo dữ liệu giả để vượt kiểm tra.

## Chuẩn bị môi trường

Giữ các env từ `.env.example`. Cần RPC Devnet, `PLAN_BINDING_SECRET` server-only và bộ ba `KAMINO_MARKET_ID`, `KAMINO_COLLATERAL_RESERVE`, `KAMINO_DEBT_RESERVE` được kiểm tra. Trang setup dùng cặp do người vận hành cấu hình, không tự tạo market và không tự phát hiện/chọn địa chỉ cho production.

Kiểm tra chỉ đọc trên máy:

```sh
npm run check:demo -- <public-wallet-address>
```

Lệnh đọc `.env.local`, không in secret/RPC URL, không ký hoặc gửi giao dịch. Thiếu cấu hình báo `EXECUTION_NOT_CONFIGURED`; oracle không hợp lệ báo `STALE_DATA`. Có thể dùng `scripts/checks/discover-devnet.mjs` để khảo sát, nhưng kết quả khảo sát chưa phải proof tạo khoản vay.

## Quy trình trên web

1. Vào `/setup`, kết nối Phantom Devnet. Dùng faucet để nhận SOL thử nghiệm.
2. Bấm “Kiểm tra điều kiện”. Chỉ đi tiếp khi market/reserve hoạt động, không cần permission signer khác, oracle hợp lệ và còn mới, có thanh khoản.
3. Nhập 0,01–1 SOL thế chấp. Giữ ít nhất 0,05 SOL ngoài số thế chấp cho phí/tạo tài khoản. Xem trước → simulation → xác nhận trong ví.
4. Chờ xác minh thế chấp. Nhập số token vay trong giới hạn hiện tại: tối đa 10 token, không vượt thanh khoản; tỷ lệ nợ có điều chỉnh borrow factor tối đa 20% hoặc một nửa max LTV của cặp.
5. Xem trước rồi ký giao dịch vay riêng. Preview chỉ sống 60 giây; quá hạn cần chuẩn bị lại.
6. Bấm kiểm tra kết quả tới khi verified. “Mở khoản vay” dẫn sang workspace với đúng địa chỉ vị thế. Chọn “Đọc ví của tôi” để tải số liệu mới.
7. Thử trả một phần nhỏ, xác minh nợ giảm và lưu Explorer signatures cùng số dư trước/sau.

## Recovery và giới hạn

- Vị thế demo dùng Vanilla obligation id 201 theo wallet/market; chỉ có một collateral SOL và một debt token classic SPL 6 decimals.
- Tiến độ pending lưu theo ví trong localStorage trước submit. Nếu trình duyệt không lưu được, không submit. Reload rồi kết nối lại cùng ví để kiểm tra tiếp. Không xóa site data khi giao dịch chưa rõ kết quả.
- Gửi thế chấp tạo obligation trong cùng giao dịch; giao dịch khởi tạo trùng sẽ thất bại nguyên tử.
- Giao dịch vay tạo thêm một System account có seed xác định làm dấu “đã vay”. Tạo dấu và vay trong cùng giao dịch: gửi từ hai tab không thể cùng thành công. Dấu tiêu tốn rent được simulation và ví phản ánh. Sau khi trả hết, setup không vay lại trên cùng phiên; không có nút xóa dấu hoặc reset tự động.
- Marker và ràng buộc id 201 phục vụ demo, không phải sản phẩm quản lý mọi vị thế. Nếu dừng sau deposit hoặc đã trả hết nợ, trang setup có nút xem trước rút toàn bộ thế chấp; vẫn cần simulation và chữ ký riêng. Marker có tồn tại nhưng không có nợ chỉ được báo là phiên đóng/bị chặn, không coi là bằng chứng đã vay. Muốn một phiên demo mới sau khi đóng, dùng ví Devnet thử nghiệm khác; chưa có luồng tự reset marker.
- Nếu giao dịch SDK vượt 1232 byte hoặc cần signer bổ sung, chặn và báo rõ. Chưa có luồng tự tạo LUT/multi-transaction setup fallback; cần kiểm chứng trên market cụ thể.
- HTTP 200, simulation hoặc signature không phải proof thành công. Status kiểm hash message, confirmation và hiệu ứng token/SOL trong receipt lịch sử. Việc làm mới vị thế hiện tại là bước riêng, không đảo ngược một receipt đã xác minh chỉ vì oracle hiện tại lỗi hoặc người dùng đã thay đổi nợ sau đó.
- Xác minh vẫn phụ thuộc RPC/oracle hoạt động. Pending được giữ khi không đọc được trạng thái, không tự chuyển thành thành công.

## Bằng chứng cần bổ sung khi nghiệm thu live

Commit + URL deploy, market/reserve IDs, public wallet, signature deposit, signature borrow, signature repay, collateral/debt/token balance trước/sau và thử reload trong lúc pending. Không lưu key ví/API key/secret vào repo.
