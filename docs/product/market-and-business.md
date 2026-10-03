# Người dùng, thị trường và giả thuyết kinh doanh

## Người dùng đầu tiên

Người đã có khoản vay SOL/USDC trên Kamino, có ngân sách trả nợ giới hạn và cần giữ USDC cho nhu cầu khác. Tình huống: giá SOL biến động, phải quyết định trả bao nhiêu cho từng khoản thay vì chỉ nhìn health của từng vị thế. MVP giới hạn một ví/tối đa ba khoản trên Devnet; không phải ứng dụng cho vay tín chấp hoặc người chưa dùng DeFi.

Luồng hiện tại: chọn khoản → đặt budget/reserve/kịch bản → xem tiền cần trả → nếu thiếu thì so sánh phân bổ → xem lại → ký từng bước → xác minh và đọc dữ liệu mới. Phần được kiểm là thuật toán và luồng; chưa có khảo sát về tần suất nhu cầu hoặc willingness-to-pay.

## Bối cảnh thị trường có nguồn

[Báo cáo rủi ro tháng7/2026 trên Kamino Forum](https://gov.kamino.finance/t/kamino-lend-monthly-risk-insights-july-2026/888) ghi nhận debt khoảng0,91 tỷ USD, repay volume0,38 tỷ USD và610 liquidation events trong tháng. Đây là số lịch sử của toàn protocol, không phải quy mô khách hàng Picachu hoặc TAM doanh thu. Số liệu cho thấy hoạt động vay/trả và rủi ro có tồn tại; không chứng minh người dùng muốn mua Picachu.

## Giải pháp hiện có

| Nguồn được đọc03/10/2026                                                                                | Trọng tâm được mô tả                                                   | Hướng tập trung của Picachu                                                                    |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [OneKey/Kamino borrow](https://help.onekey.so/en/articles/13434810-how-to-borrow-cryptos-in-onekey-app) | Vay/trả và theo dõi health trong trải nghiệm ví                        | Goal/budget/reserve chung, phân bổ nhiều khoản và kết quả từng bước                            |
| [Kamino Positions Monitor](https://github.com/csacanam/kamino-positions-monitor)                        | Báo cáo health, kịch bản SOL, số repay/deposit để đạt target, Telegram | Giao diện ra quyết định với budget giới hạn, cost baselines và execution/journal               |
| [DeFi Saver](https://defisaver.com/)                                                                    | Quản lý vị thế, leverage/repay và automation nhiều protocol            | MVP Kamino Solana Devnet, người dùng ký chủ động, mô hình có đối chứng và budget/reserve chung |

Bảng dựa trên tài liệu công khai, không audit toàn bộ đối thủ. Không dùng ô trống như chứng minh một đối thủ không có chức năng, không claim Picachu là sản phẩm đầu tiên hoặc không có đối thủ. VI/EN hỗ trợ tiếp cận; bằng chứng khác biệt nằm ở workflow và kết quả tái tạo được.

## Giả thuyết buyer/revenue được chọn

**Buyer ưu tiên để kiểm chứng: đội xây ví hoặc dApp lending muốn tích hợp công cụ lập phương án trả nợ.** Borrower là người dùng cuối; ví/dApp có thể trả cho hosted API, cập nhật model theo protocol và hỗ trợ tích hợp. Giá trị cần chứng minh: cùng input cho kết quả có nguồn, phát hiện thay đổi/version không hỗ trợ và nối được preview/receipt vào flow của họ.

Giả thuyết doanh thu: gói API theo usage hoặc subscription tích hợp; chưa chọn giá, chưa có API thương mại/billing, hợp đồng, pilot hoặc doanh thu. Không cần thu phí prototype để trình bày giả thuyết. Apache-2.0 cho code cho phép người khác tự host; lý do trả cho dịch vụ phải là vận hành/cập nhật/hỗ trợ thực tế, không dựa vào độc quyền code.

## GTM và tiêu chí ra quyết định — kế hoạch, chưa triển khai

1. **Nhóm thử đầu:** trang demo hai ngôn ngữ, luồng Devnet và mẫu request để đội phát triển tự đánh giá; không thực hiện outreach/phỏng vấn trong sprint này.
2. **Sau chung kết:** sandbox tích hợp cho nhóm tự nguyện, kiểm mức hiểu reserve/partial, quote-review và receipt recovery. Không coi wallet connect hoặc video views là khách hàng trả tiền.
3. **Chỉ mở beta/monetization sau kiểm chứng:** nhu cầu lặp lại, bên mua chấp nhận tích hợp và kết quả vận hành đáng tin cậy. Các mốc10/100/1.000 người dùng là mục tiêu phân phối tương lai, không phải traction hoặc cam kết đạt.

Metric cần đo: tỷ lệ hoàn tất goal → review, khả năng giải thích partial so với đạt toàn mục tiêu, verified execution/recovery trong supported scope, nhu cầu tích hợp lặp lại và willingness-to-pay. Chưa có các số liệu này. Không thay market research bằng số lượng unit test hoặc volume protocol.
