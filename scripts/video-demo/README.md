# Dựng video demo VI/EN

Bộ dựng riêng cho video picachu, không thay đổi ứng dụng, ví hoặc deployment. Video dùng giọng nam NamMinh/Andrew, audio nhanh nhẹ 8%, hình thao tác khoảng 1,5× và phụ đề theo timing audio. Các card giải thích có nhãn rõ, không giả màn hình ứng dụng hoặc popup Phantom.

## Đầu vào

- `docs/demo/script.json`: kịch bản, ngôn ngữ, source label và receipt.
- `docs/evidence/devnet/allocator-cycle-2026-10-03.json`: bằng chứng lịch sử đã xác minh.
- `public/brand/picachu-logo.jpg`: logo dự án.
- Bản Vercel hiện hành; source minh họa trong ứng dụng, không wallet mock.

Work directory là `work/bilingual-demo/`, bị Git ignore. Trước khi chạy, sao chép kịch bản vào `work/bilingual-demo/script.json`. Audio, footage, MP4 và các báo cáo giữ ở đó, không đưa binary vào Git.

## Công cụ

Node/Playwright từ dependency của repo; Python 3.11; FFmpeg/FFprobe; `edge-tts==7.2.8`. Kiểm ASR tùy chọn dùng `SpeechRecognition==3.14.3` và dependency scoped tại `work/bilingual-demo/python-libs/`. ASR chỉ gửi audio thuyết minh sản phẩm; không gửi dữ liệu ví hoặc bí mật.

Chạy từ root repository, theo thứ tự:

```text
python scripts/video-demo/narrate.py
node scripts/video-demo/cards.mjs
node scripts/video-demo/capture.mjs vi
node scripts/video-demo/capture.mjs en
python scripts/video-demo/render.py vi
python scripts/video-demo/render.py en
python scripts/video-demo/audio-qa.py
python scripts/video-demo/validate.py vi en
```

Narration cache kiểm fingerprint text/voice/rate. Capture lưu API responses, source và thời gian từng cảnh. Render xuất MP4, SRT, poster, script, chapter list và timeline. Validation decode toàn bộ video/audio, kiểm định dạng, phụ đề không chồng/ra ngoài thời lượng, âm lượng và frame cho kiểm hình.

Provider word timing và ASR hỗ trợ kiểm lời đọc; không thay thế việc nghe bởi người thật. Không tuyên bố đã nghe toàn bộ nếu công cụ không cung cấp audio input. Khung ảnh và contact sheet phải được kiểm trước bàn giao.

## Bàn giao và xuất bản

Người dùng đã upload thủ công và gửi hai URL ngày03/10; [trang demo](../../docs/demo/README.md) chọn link đúng ngôn ngữ. `prepare-publication.py` chỉ chọn public assets/metadata và lưu metadata cũ. MP4 phân phối qua Release, không vào Git. Không chạy lại signer, gửi transaction hoặc upload YouTube bằng bộ dựng này.
