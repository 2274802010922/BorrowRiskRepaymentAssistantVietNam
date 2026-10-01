# Video demo picachu

Giọng tổng hợp tiếng Việt: vi-VN-HoaiMyNeural. Cảnh dựng từ ảnh giao diện thật từ bản deploy; ví dụ giả định và evidence Devnet ghi nhãn riêng. Không phải video quay liên tục hoặc quay popup Phantom.

## 01. Trả bao nhiêu, giữ lại bao nhiêu?

Picachu là công cụ giúp người đã có khoản vay lập phương án trả nợ có mục tiêu. Người vay không chỉ cần biết tỷ lệ nợ, mà còn muốn biết phải trả bao nhiêu và giữ lại bao nhiêu tiền. Video này đi từ ví dụ dễ kiểm tra đến bằng chứng giao dịch thật trên Solana Devnet.

Nguồn cảnh: 01-landing.png. Nhãn: Giao diện thật · bản triển khai công khai

## 02. Một ví, tối đa ba khoản

Trước hết, mở trang phương án trả nợ mà không cần kết nối ví. Ví dụ có ba khoản nợ lần lượt là sáu mươi lăm, năm mươi lăm và bốn mươi lăm USDC. Mỗi khoản thế chấp một SOL với giá giả định một trăm đô la. Nhãn minh họa luôn hiện rõ để không nhầm với khoản vay thật.

Nguồn cảnh: 02-portfolio.png. Nhãn: Dữ liệu minh họa · không phải số dư ví thật

## 03. Ngân sách và tiền cần giữ lại

Số dư chung trong ví dụ là tám mươi USDC. Người dùng muốn giữ lại hai mươi và chi tối đa ba mươi để trả nợ. Ứng dụng tính số dư ví một lần cho toàn bộ danh mục, tránh cộng trùng tiền giữa các khoản. Ngân sách là giới hạn chi, không phải số tiền bắt buộc phải trả hết.

Nguồn cảnh: 03-budget.png. Nhãn: Các giá trị giả định trong ví dụ

## 04. Giảm 30%, còn dư địa 5%

Tiếp theo chọn tình huống giá SOL giảm ba mươi phần trăm. Mục tiêu là sau mức giảm đó, các khoản đã chọn còn chịu được mức giảm thêm năm phần trăm trước ngưỡng thanh lý. Trong ví dụ này, ngưỡng thanh lý là tám mươi phần trăm và hệ số vay bằng một. Đây là phép tính có giả định, không phải dự báo thị trường.

Nguồn cảnh: 07-result.png. Nhãn: Kịch bản không phải dự báo giá

## 05. Chỉ trả phần cần để đạt mục tiêu

Kết quả là trả mười một phẩy tám USDC cho khoản thứ nhất, một phẩy tám cho khoản thứ hai, và không trả thêm cho khoản thứ ba. Tổng cần trả là mười ba phẩy sáu, thấp hơn ngân sách ba mươi. Ví còn sáu mươi sáu phẩy bốn USDC. Khoản đã đủ dư địa không tạo giao dịch trả nợ dư thừa.

Nguồn cảnh: 07-result.png. Nhãn: Tổng trả 13,6 USDC · còn 66,4 USDC

## 06. Biết rõ số tiền còn thiếu

Khi hạ ngân sách xuống mười USDC, trang báo thiếu ba phẩy sáu để đạt mục tiêu. Ứng dụng không gọi một phương án trả thiếu là đã an toàn. Mô hình phân bổ theo tổn thất thanh lý hiện chưa được kiểm chứng tương thích protocol, nên phần khuyến nghị đó vẫn tắt. Người dùng có thể đổi mục tiêu hoặc điều chỉnh ngân sách.

Nguồn cảnh: 08-shortfall-result.png. Nhãn: Allocator tổn thất vẫn tắt chờ kiểm chứng protocol

## 07. Có thể lập kế hoạch cho từng khoản

Người dùng cũng có thể bỏ chọn các khoản không muốn đưa vào phương án. Khi chỉ chọn khoản thứ nhất, tổng cần trả trong ví dụ còn mười một phẩy tám USDC. Thiết kế ba bước giúp việc chọn khoản, đặt mục tiêu và đọc kết quả đi theo một trình tự rõ ràng. Giao diện có tiếng Việt và tiếng Anh.

Nguồn cảnh: 10-single.png. Nhãn: Người dùng chủ động chọn phạm vi

## 08. Tạo khoản vay bằng token thử nghiệm

Để thử với khoản vay thật trên mạng thử nghiệm, mở trang thiết lập demo và kết nối ví Phantom ở Devnet. Ba profile A, B và C dùng mỗi khoản không phẩy một SOL thế chấp. Trước khi cho ký, server kiểm mạng, market, oracle, thanh khoản và mô phỏng giao dịch. Người dùng ký riêng bước thế chấp và bước vay.

Nguồn cảnh: 06-setup.png. Nhãn: Devnet · token không có giá trị tiền thật

## 09. Xem trước rồi ký. Không giao khóa cho app.

Khi trả nợ, server tạo giao dịch chưa ký với số tiền, phí và hạn dùng rõ ràng. Nếu giá hoặc lãi làm phương án thay đổi, người dùng phải xem lại trước khi ký. Ví giữ khóa bí mật; server kiểm chữ ký và nội dung đã được ràng buộc. Sơ đồ này giải thích luồng xử lý, không giả lập một cửa sổ xác nhận ví thật.

Nguồn cảnh: Đồ họa giải thích. Nhãn: Sơ đồ luồng · không phải cảnh quay popup ví

## 10. Xác minh xong mới sang bước tiếp

Với nhiều khoản vay, các giao dịch được thực hiện tuần tự. Nhật ký Redis lưu bước hiện tại và các biên nhận đã xác minh, đồng thời kiểm soát kế hoạch gửi cùng ví. Chỉ khi bước trước được xác minh mới mở bước sau. Nếu trạng thái chưa rõ, ứng dụng chặn bước tiếp và cho kiểm tra kết quả, thay vì tự gửi lại.

Nguồn cảnh: Đồ họa giải thích. Nhãn: Giao dịch đã gửi chưa đồng nghĩa đã thành công

## 11. Giao dịch thật trên Solana Devnet

Phần bằng chứng được kiểm bằng ví test riêng qua API Vercel đang triển khai. Ba lần thế chấp và ba khoản vay đã được xác minh. Kế hoạch sau đó hoàn thành hai bước trả nợ cần thiết. Biên nhận đang hiển thị trên Solana Explorer có trạng thái thành công và đã hoàn tất xác nhận. Các signature đầy đủ nằm trong tài liệu repo.

Nguồn cảnh: 09-receipt.png. Nhãn: Test signer riêng qua API triển khai · không quay popup Phantom

## 12. Trả 2,406756 USDC. Ví còn 17,401774.

Trong vòng test đó, khoản B trả không phẩy sáu không hai năm tám chín USDC; khoản A trả một phẩy tám không bốn một sáu bảy. Tổng trả hai phẩy bốn không sáu bảy năm sáu, và ví còn mười bảy phẩy bốn không một bảy bảy bốn USDC. Số dư vẫn cao hơn mức dự trữ một USDC đã chọn.

Nguồn cảnh: 09-receipt.png. Nhãn: Số liệu của vòng test 01/10/2026 · không phải giá trị hiện tại

## 13. Biên nhận thành công khác mục tiêu hiện tại

Giá và lãi tiếp tục thay đổi sau khi giao dịch hoàn tất. Lần đọc riêng sau vòng test cần thêm khoảng không phẩy không không bảy không bốn một USDC để đạt đúng dư địa năm phần trăm ở giá mới. Vì vậy, trang kết quả kiểm lại mục tiêu bằng dữ liệu mới. Biên nhận thành công không được trình bày thành bảo đảm tránh thanh lý.

Nguồn cảnh: Đồ họa giải thích. Nhãn: Snapshot lịch sử · không tự gửi giao dịch bổ sung

## 14. Phép tính kiểm được. Giải thích dễ đọc.

Phép tính dùng số nguyên atomic và Decimal; trí tuệ nhân tạo chỉ hỗ trợ diễn giải, không quyết định số tiền hay ký giao dịch. Checkpoint này có tám mươi bảy kiểm thử đơn vị và ba mươi hai kiểm thử trình duyệt đã đạt, cùng CI và bản deploy. Bước phát triển tiếp là kiểm chứng mô hình tổn thất trước khi mở allocator và phỏng vấn người vay để kiểm tra nhu cầu.

Nguồn cảnh: Đồ họa giải thích. Nhãn: Main: 360e17f · allocator chờ protocol parity

## 15. Mục tiêu rõ ràng. Quyết định vẫn ở bạn.

Picachu hướng tới việc biến một bảng số liệu khoản vay thành một phương án trả nợ dễ hiểu và kiểm chứng được. Hiện sản phẩm giới hạn ở một ví, tối đa ba vị thế cùng cặp SOL và USDC trên Kamino Devnet. Chưa có tuyên bố doanh thu hay khách hàng trả tiền. Mời giám khảo mở bản demo và đối chiếu biên nhận, mã nguồn cùng phạm vi kiểm thử trong repo.

Nguồn cảnh: 01-landing.png. Nhãn: Chưa công bố doanh thu hoặc pilot chưa xác minh

## Đường kiểm chứng

- Demo: https://picachu-iota.vercel.app/portfolio
- Code: https://github.com/2274802010922/picachu__
- Evidence: https://github.com/2274802010922/picachu__/blob/main/docs/testing/live-devnet-cycle.md
- Cẩm nang tham khảo: https://unihackfest.vn/vi/learn/
