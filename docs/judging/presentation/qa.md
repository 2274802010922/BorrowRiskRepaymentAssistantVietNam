# Q&A

| Câu hỏi                               | Câu trả lời có thể bảo vệ                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vì sao không dùng Kamino/OneKey?      | Các giải pháp đó đã có borrow/repay/health. Picachu tập trung tính số cần trả trong shared budget/reserve và kiểm từng bước thực thi. Chưa tuyên bố độc quyền ý tưởng. |
| AI quyết định tiền không?             | Không. Core tính và kiểm số. AI extraction phải khớp explicit input và cần người dùng apply; summary không được tạo số hoặc ký.                                        |
| Các transaction mới trên video là gì? | Clip này chỉ thao tác synthetic và đọc receipt lịch sử. Vòng API Devnet trước có3 deposit/3 borrow/2 repay được ghi riêng. Không có popup signing footage.             |
| Mục tiêu5% có bảo đảm an toàn?        | Không. Đó là dư địa tính từ giá đã shock theo dữ liệu hiện tại, giá/lãi có thể tiếp tục đổi.                                                                           |
| Ai giữ private key?                   | Ví người dùng. API ứng dụng không giữ key. Operator test key riêng ở work/private bị ignore, không nằm trong browser hoặc repo public.                                 |
| Redis khóa ví được không?             | Chỉ kiểm soát hai plan của luồng portfolio, không khóa ví ở protocol hoặc các app khác. Fresh balances và receipt vẫn phải đọc lại.                                    |
| Unknown xử lý thế nào?                | Giữ signature/binding/cursor, chặn bước sau, kiểm receipt; không giả success hoặc gửi lại mù.                                                                          |
| Reserve có bảo vệ on-chain?           | Bản hiện tại kiểm snapshot/simulation/submit. Chưa có Picachu reserve guard program riêng nên không claim atomic on-chain guarantee.                                   |
| Allocator tối ưu global không?        | Chưa bật model. Search mechanics chỉ tìm trên finite grid; vectors abstract không chứng minh loss Kamino.                                                              |
| Có user/doanh thu chưa?               | Không có bằng chứng đó trong sprint. Buyer/revenue/GTM trên slide là hypothesis.                                                                                       |
| Test counts nói lên gì?               | Chứng minh các case được chạy trong scope offline/mocked/browser, không chứng minh model liquidation chưa tồn tại hoặc mainnet readiness.                              |
| Phí và chương trình tích hợp?         | Quote fee/simulation trước ký và receipt có số liệu thực. Dùng Kamino/SPL/ATA/oracle và versioned tx, không tự nhận là lending protocol mới.                           |
