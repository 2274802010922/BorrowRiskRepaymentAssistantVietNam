# Nghiệm thu hai video demo — 03/10/2026

Trạng thái: **dựng và bàn giao local hoàn tất; người dùng đã gửi hai URL ngày03/10**. [VI](https://www.youtube.com/watch?v=Dk57TInsyYM)/[EN](https://www.youtube.com/watch?v=VzjOFclnBBg) phát được; đang hoàn tất xuất bản GitHub. Các kiểm tra dưới đây mô tả giai đoạn dựng local trước upload; checkpoint xuất bản được ghi riêng.

## Đầu ra

| Bản  | Thời lượng          | File                                 | Phụ đề                | Giọng                                    |
| ---- | ------------------- | ------------------------------------ | --------------------- | ---------------------------------------- |
| Việt | 216,933 giây (3:37) | picachu-demo-vi.mp4, 11.922.606 byte | 48 cue, gắn sẵn + SRT | vi-VN-NamMinhNeural, nam, +8%            |
| Anh  | 242,400 giây (4:02) | picachu-demo-en.mp4, 13.639.407 byte | 59 cue, gắn sẵn + SRT | en-US-AndrewMultilingualNeural, nam, +8% |

Cả hai: 1920×1080/H.264/yuv420p/30fps; AAC 48kHz; 10 chapter. File và SRT, poster, lời thoại, chapter, mô tả YouTube, manifest SHA256 được bàn giao trong thư mục `Downloads/picachu-demo-2026-10-03` trên máy người dùng. Bản dựng và raw capture nằm ở `work/bilingual-demo/`, bị Git ignore.

## Nguồn và phạm vi

- Quay mới giao diện Vercel theo VI/EN, từ landing đến chọn khoản vay, goal, sufficient result, draft, shortfall và allocator. Cảnh thao tác khoảng1,5×; kết quả giữ tốc độ đọc. Không nối các video cũ.
- Các scene lập phương án dùng synthetic example65/55/45, balance80, reserve20, budget30→10, shock30%, buffer5%. Tổng đủ mục tiêu13,6; partial9,000001, unspent0,999999, A chưa đạt buffer5%.
- Hai request goals/draft thật trả200, nguồn `rules`, đúng budget10/reserve20/shock30%/buffer5%. Nhãn quy tắc hiện trong footage; lời thoại mô tả AI là khả năng hỗ trợ, không gọi bản nháp này là kết quả AI.
- Hai request portfolio/allocate thật trả200, state ready, totalRepayAtomic9000001. Nội dung giữ finite grid, one-event và sự khác nhau giữa chi phí thấp nhất với đạt mọi mục tiêu.
- Scene execution là sơ đồ có nhãn tài liệu giải thích, không giả màn hình ứng dụng hoặc popup Phantom.
- Scene receipt đối chiếu [bằng chứng vòng API test riêng](../evidence/devnet/allocator-cycle-2026-10-03.json) và Solana Explorer Success/Finalized.0,780982 USDC/6000 lamports/balance16,620792 là số lịch sử. Không kết nối ví hoặc gửi giao dịch trong lúc ghi hình.
- Scene giới hạn ghi25 ca VM khớp executable, chưa có reproducible source-build match; không claim probability/cascade/global optimum/mainnet.

## Kiểm tra

- Decode toàn bộ cả video và audio với FFmpeg `-xerror`: PASS.
- Định dạng, thời lượng,10 chapters, audio language và subtitle bounds/nonoverlap/tối đa2 dòng: PASS.
- Loudness VI −16,21 LUFS/peak−1,38 dBTP; EN−16,29/−1,47. Không clipping.
- Word count/tokens khớp nguồn thuyết minh với provider timing cho20 scene; cache kiểm text/voice/rate fingerprint.
- Independent ASR cho20 scene đã thu để đối chiếu nội dung. ASR có sai tên riêng và bỏ một số đoạn; không dùng transcript ASR làm phụ đề hoặc oracle cho số tiền. Không tuyên bố đã có người nghe toàn bộ: model hiện không nhận được audio input.
- Đã xem contact sheet toàn timeline của hai bản, frame từng scene và frame sớm của draft/allocator. Source rules, phần review trước apply,9,000001 và cảnh báo partial hiển thị đúng; không thấy subtitle che UI/ra ngoài frame.
- ESLint bộ script JavaScript và Python compile: PASS. Chỉ thêm công cụ dựng/media/context; không đổi runtime ứng dụng nên không chạy lại toàn bộ kiểm thử sản phẩm.

## Còn chờ

1. Người dùng đã upload hai MP4 thủ công và gửi URL VI/EN; link/player đã kiểm. YouTube hiển thị3:36 (làm tròn xuống) và4:02, phù hợp duration file216,933/242,4s.
2. Đang hoàn tất README VI/EN/guide/judging/Release, cleanup và commit tiếng Việt/push main. Video YouTube cũ báo người tải lên đã xóa; không có hành động xóa của agent.

Card cuối trang guide đã được đồng bộ phạm vi allocator trong lượt xuất bản; footage gốc không sửa DOM. Notes PPTX12 slide thay link VI/EN;12 render khớp bản trước, package/layout/font/import PASS.
