# Mục tiêu và danh mục

Frontend `/portfolio` → portfolio/read → core mục tiêu → plans → prepare/simulate → ví ký → submit → receipt verified → đọc lại → chuẩn bị bước tiếp theo.

`PortfolioSnapshot` chỉ chứa 1–3 vị thế khác nhau, cùng ví/nguồn/protocol/market/mint nợ và số dư. Adapter đọc số dư SOL/ATA một lần, chia sẻ giữa các snapshot. Không cộng số dư ba lần. Giá nợ giữ cố định trong shock SOL.

Đặt `C` là giá trị thế chấp hiện tại, `s` shock, `m` dư địa từ giá đã giảm, `theta` ngưỡng thanh lý, `f` borrow factor:

`D_target_USD = theta × C × (1-s) × (1-m) / f`.

Chuyển sang token bằng giá nợ, floor số atomic nợ được giữ lại, rồi lấy nợ hiện tại trừ mức đó. Vì vậy số tiền trả được làm tròn lên, không giảm dư địa do làm tròn xuống. Nợ bằng 0 dùng nhãn hết nợ, không biểu diễn infinity.

Tiền khả dụng = `min(ngân sách, max(số dư - reserve, 0))`. Nếu tổng cần trả đủ ngân sách, chỉ trả tổng cần thiết; nếu thiếu, báo shortfall và không tạo kế hoạch thực thi một phần khi model thanh lý chưa kiểm chứng.

## Nhật ký thực thi

HMAC token chứa ID ngẫu nhiên + wallet, đặt trong body, không URL/log. Redis REST dùng lại hai biến quota, lưu snapshot mục tiêu, các bước, revision, cursor và receipts. Tạo plan không khóa ví. Prepare chỉ có tác dụng sau khi đọc lại dữ liệu và kiểm số dư/nhu cầu. Kế hoạch hết hạn 15 phút, preview 90 giây.

Submit kiểm chữ ký Ed25519, message, số dư và reserve trước khi gọi hook khóa. Lua CAS khóa wallet + ghi pending một cách nguyên tử; hai plan không cùng broadcast qua luồng portfolio. Không phát sinh khóa chỉ từ người khác biết public wallet. Khoản vay đơn cũ có recovery riêng; khóa này không khóa ví ở protocol hay ứng dụng khác.

Status đối chiếu receipt lịch sử, ghi cursor bằng CAS và không dựa vào giá oracle hiện tại để phủ nhận giao dịch đã thực hiện. Unknown/confirmed chưa khớp hiệu ứng token không cho bước sau. Failed/expired dừng kế hoạch. Prepare đọc lại và cập nhật các bước chưa thực hiện trong ngân sách/reserve gốc; số tiền đổi yêu cầu review trước ký và submit. Yêu cầu review không bị xóa bởi prepare lặp lại. Số dư ví đổi bất ngờ, quote vượt giới hạn hoặc bước không còn cần trả thì chặn để lập lại. Không sửa receipt cũ hoặc tự replay giao dịch.

Sau khi tất cả bước verified, frontend đọc một snapshot mới để kiểm mục tiêu riêng. Có thể cần trả thêm vì giá/lãi tiếp tục đổi; UI hiển thị số cần thêm và yêu cầu lập phương án mới. Lỗi đọc không được trình bày thành mục tiêu đã đạt.

Nhật ký Redis giữ 24 giờ; frontend giữ token kế hoạch và signature/binding trước gửi. Không lưu signed transaction hoặc key của ví. Người vận hành cần giữ Redis hoạt động và dùng receipt recovery riêng nếu journal hết TTL. Reserve chỉ là kiểm tra snapshot, không cam kết các ứng dụng khác không chi số dư.

## Mô hình tổn thất và allocator

Tổn thất dự kiến = collateral bị lấy đi − khoản nợ được xóa + phí người vay chịu chưa tính trùng. Không cộng principal trả nợ hay toàn bộ giá giảm vào liquidation loss. Một shock cố định, một lần thanh lý, liquidator đủ vốn; không xác suất/cascade/slippage dự đoán.

Nguồn tham chiếu: [Kamino liquidation_operations.rs](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/programs/klend/src/state/liquidation_operations.rs), commit `a08760976f51a3a58c4a0c6ea27b4a0e565bca79`. Ngày03/10 đã có25 vector đối chứng executable Devnet trong VM; chưa có source build match. Không chép source BSL vào runtime. [Đối chứng và phạm vi](../evidence/liquidation/README.md).

`core/allocation/search.ts` là bộ tìm kiếm cost grid độc lập. Tiền atomic + Decimal; 1–3 vị thế, tối đa201 candidates/vị thế, prefix-best cho vị thế thứ ba. Tiebreak: cost, protected collateral, spend, transaction count, deterministic address/amount. `portfolio/allocate` lấy cost từ mô hình đã đối chứng và giữ cổng program/config. Search tests chứng minh trong lưới, VM tests chứng minh hiệu ứng các branch được hỗ trợ. Không có env vượt cổng model. [Kiến trúc allocator](liquidation-model.md).
