# Hai video demo hoàn chỉnh — bàn giao local ngày 03/10/2026

Checkpoint: **hoàn tất**. VI3:37 và EN4:02 đã dựng/kiểm/bàn giao; người dùng upload và gửi hai URL, đã đồng bộ README/docs/notes và xuất bản Releasev0.4.0. Sourceade1309 Quality37089595585/Vercel PASS. [Nghiệm thu](../../../testing/bilingual-demo-2026-10-03.md) · [Evidence xuất bản và cleanup](../../../evidence/validation/bilingual-video-publication.json).

Trạng thái: **đã duyệt dựng end-to-end ngày03/10**. Chỉ bàn giao hai video hoàn chỉnh trước; người dùng tự upload YouTube và gửi hai URL, sau đó mới cập nhật GitHub và xử lý video cũ. Muốn vừa chi tiết vừa ngắn, cảnh thao tác khoảng1,5×; giọng đọc nam cho cả VI/EN. Không tự upload/quản lý YouTube trong lượt này.

## Đầu ra

| Bản  | UI và đồ họa chữ | Giọng đọc        | Phụ đề                    |
| ---- | ---------------- | ---------------- | ------------------------- |
| Việt | Tiếng Việt       | Nam tiếng Việt   | Tiếng Việt, kèm SRT riêng |
| Anh  | Tiếng Anh        | Nam tiếng Anh Mỹ | Tiếng Anh, kèm SRT riêng  |

Mỗi bản mục tiêu3:30–4:00, dự kiến3:45. Cùng các luận điểm, dữ kiện và một luồng demo, nhưng lời thoại/cảnh quay bản địa hóa; không ép duration bằng cách kéo dài im lặng. Hai video tự đủ nội dung để giám khảo xem riêng. Không dùng đoạn demo tiếng Việt làm phần thao tác chính của bản Anh.

Files: `picachu-demo-vi.mp4`, `picachu-demo-en.mp4`, hai SRT, hai kịch bản, hai poster và chapter list, validation reports. MP4 1920×1080/H.264/AAC, phụ đề có sẵn trên hình; khi đăng YouTube thêm subtitle track tương ứng. Một Release mới làm đầu vào public, hai YouTube URL là đường xem chính.

## Cách vừa chi tiết vừa ngắn

- Cảnh điền form/điều hướng khoảng1,5×. Cắt phần chờ dài, giữ một nhịp loading để không biến video thành benchmark tốc độ xử lý.
- Kết quả, amount, reserve, xác nhận và receipt giữ nhịp đọc được. Thao tác khớp lời thoại, mỗi cảnh giải thích một quyết định.
- Giọng nhanh nhẹ khoảng1,1×, tinh chỉnh sau nghe mẫu. Audio duy trì cao độ tự nhiên; không nhân tốc độ toàn bộ video khiến giọng cũng chạy1,5×.
- Phụ đề canh theo audio cuối sau chỉnh tốc độ, không theo timestamp raw recording. Tối đa hai dòng, cue đủ thời gian đọc.
- Một mạch kể chuyện xuyên suốt, chuyển cảnh nhẹ, cùng logo/light terminal. Không ráp hai video cũ vào nhau hay xen các card lặp lại nội dung.

## Kịch bản chung dự kiến

| Thời gian   | Câu hỏi người xem được giải đáp | Nội dung/cảnh                                                                                                                                          |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 00:00–00:15 | Picachu giải quyết gì?          | Quyết định trả nợ trong ngân sách, giữ tiền cần dùng. Brand/logo chuẩn.                                                                                |
| 00:15–00:35 | Dữ liệu và khoản vay ở đâu?     | Một ví, tối đa ba khoản SOL/USDC. Nhãn nguồn và số dư chung.                                                                                           |
| 00:35–01:05 | Đủ ngân sách thì làm gì?        | Chọn reserve20, budget30, shock30%, buffer5%. Ví dụ cần13,6, còn66,4.                                                                                  |
| 01:05–01:55 | Khi chỉ có10 USDC?              | Thiếu3,6; xem allocator, khoản nào trả, khoản chưa đạt mục tiêu, tiền chưa dùng và baseline.                                                           |
| 01:55–02:20 | AI giúp ở đâu?                  | Nhập mục tiêu bằng câu ngắn, xem draft và chủ động áp dụng. Core xác định số tiền.                                                                     |
| 02:20–03:10 | Thực thi và đối chiếu thế nào?  | Preview/review, người dùng giữ quyền ký, journal/receipt và fresh goal check. Dùng receipt thật của vòng API signer đã kiểm, ghi đúng nguồn/thời điểm. |
| 03:10–03:30 | Căn cứ và giới hạn?             | 25 ca executable VM, một lượt thanh lý, finite grid, unsupported gate. Không gọi partial là đạt mọi mục tiêu.                                          |
| 03:30–03:45 | Giám khảo thử ở đâu?            | App/repo, CTA và hai nguồn video mới.                                                                                                                  |

Đây là storyboard, không cam kết từng giây. Có thể chuyển AI trước phần allocator nếu việc áp dụng draft giúp câu chuyện tự nhiên hơn, nhưng không đổi số liệu giữa các cảnh.

## Nguồn chứng minh

- Minh họa: source fixture đang có trong app, ba khoản65/55/45, một SOL mỗi khoản ở100 USD, threshold80%, factor1, balance80. Nhãn synthetic luôn rõ.
- Execution: [vòng partial](../../../testing/allocation-acceptance.md), ký qua API test signer riêng, trả0,780982 USDC, fee6000lamports, balance lịch sử16,620792 >reserve1. Receipt này không phải transaction vừa được gửi lúc ghi hình.
- Model: [25 vector](../../../evidence/liquidation/README.md) khớp executable đang phục vụ Devnet trong VM, chưa có source build match. Hỗ trợ runtime solvent/price-triggered/không e-mode.
- Không dựng popup Phantom giả hoặc giấu wallet mock dưới nhãn real. Video hoàn chỉnh có thể giải thích chuỗi ký và đọc receipt thật dù không có popup footage. Không chạy lại execute runner chỉ để đuổi giá hoặc lấy số đẹp.

## Giọng đọc và ngôn ngữ

Đã kiểm metadata provider hiện có: `vi-VN-NamMinhNeural`, `en-US-AndrewMultilingualNeural`, `en-US-GuyNeural` đều Male. Dự kiến NamMinh cho VI, Andrew cho EN. Chọn sau nghe mẫu đọc tên picachu/Kamino/Solana, USDC và số thập phân.

Tiếng Anh viết lại cho tự nhiên, không dịch từng chữ. Tiếng Việt tránh thuật ngữ quá nhiều. Các đoạn quay app đặt đúng ngôn ngữ; chỉ tên riêng, ký hiệu token và địa chỉ là ngoại lệ. Narration có thể nói “khoảng0,78 USDC” khi màn hình/receipt hiển thị0,780982; phụ đề giữ cùng ý và ghi rõ ước lượng nếu rút gọn.

Không lấy giọng nữ video cũ rồi chỉnh cao độ thành nam. Không clone giọng một người thật.

## Thứ tự thực hiện sau khi duyệt

1. Khóa kịch bản VI và bản Anh tương đương, source labels, thuật ngữ và số tiền; nghe thử giọng nam.
2. Ghi cảnh thực tế trên bản Vercel hiện hành ở cả VI/EN, giữ cùng chuỗi mục tiêu. Quay đủ before/after và loading, dùng footage gốc để kiểm nguồn.
3. Tạo narration từng chương để sửa dễ, rồi phối thành một video liền mạch mỗi ngôn ngữ. Chỉnh tốc độ hình riêng; căn subtitle với audio cuối.
4. Xem/nghe toàn bộ cả hai bản. Kiểm tiếng/ảnh/subtitle, số liệu/đơn vị, tên gọi, mức âm thanh và rõ ràng trên màn hình nhỏ. Decode toàn file, kiểm cue không chồng/ra ngoài thời lượng.
5. Xuất hai MP4, SRT, poster và metadata. Đăng bản mới lên GitHub và đúng kênh YouTube của owner; kiểm stream/link và ngôn ngữ.
6. Cập nhật README VI/EN, demo guide, judging/presentation links, source UI nếu có CTA video và checkpoint. Các ngôn ngữ dẫn tới video phù hợp, có link chuyển sang bản còn lại.
7. Sau khi hai bản mới xem được, gỡ video cũ khỏi GitHub Releases và YouTube. Commit tiếng Việt/push main theo workflow, kiểm CI/deploy/doc links.

## Phạm vi gỡ video cũ

- GitHub: MP4 video cũ trong v0.1.0-demo, v0.2.0-final-demo và v0.3.0-allocator. Xử lý cả video-only ZIP hoặc ZIP có MP4; nếu gói còn slide/PDF/evidence cần giữ thì xuất gói mới chỉ chứa những mục đó, không xóa cả Release.
- YouTube: video Picachu cũ `Uw-04c9cROQ` và clip Picachu cũ khác nếu đã đăng. Không đụng video dự án khác trong kênh.
- Đề xuất mặc định: chuyển video YouTube cũ sang **Riêng tư** và bỏ đường dẫn công khai, giữ bản lưu có thể phục hồi. Xóa vĩnh viễn là lựa chọn riêng nếu người dùng yêu cầu rõ.
- Chỉ xử lý sau khi hai bản mới đã kiểm và public/unlisted link hoạt động. Xác minh quyền quản lý đúng kênh trước upload/gỡ; chưa có phiên đăng nhập/quyền phù hợp thì không tuyên bố đã xử lý YouTube.
- Giữ proof JSON, transaction/evidence, CI history và slide. Dọn poster/subtitle/script cũ khỏi đường đọc hiện hành khi không còn dùng; lưu phần lịch sử cần đối chiếu có nhãn thay thế. Không viết lại lịch sử Git để gỡ binary vốn đã nằm trong Release.

## Tiêu chí hoàn thành

- Hai video riêng, xem một bản vẫn hiểu đầy đủ sản phẩm hiện tại và allocator.
- Bản Việt: UI/narration/subtitle Việt; bản Anh: UI/narration/subtitle Anh. Giọng đọc nam cả hai.
- Nhịp ngắn, dễ hiểu; tăng tốc có chọn lọc, kết quả/xác nhận đọc được.
- Phụ đề/giọng/số liệu thống nhất; nguồn synthetic/VM/API receipt tách rõ.
- Hai link xem mới hoạt động, README/docs nhất quán, artifacts/checkpoints lên main.
- Video cũ không còn ở đường xem công khai trong phạm vi đã xác minh; slide và proof giữ được.

Điều kiện upload thủ công đã đáp ứng. Hai URL phát được;7 asset mới tải anonymous/SHA256 PASS. Sáu asset video/gói mixed cũ đã gỡ; giữ slide/PDF/proof và hai ZIP slide-only thay thế. YouTube cũ báo owner đã xóa, không có hành động xóa của agent. Không cần dựng lại, test signing hoặc đổi env để chốt việc này.
