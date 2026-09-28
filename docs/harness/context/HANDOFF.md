# Bàn giao

Release picachu: `/setup` tạo vị thế qua Phantom với hai lần ký, `npm run check:demo -- <public-wallet>` chỉ đọc. Ba biến Kamino vẫn phải cấu hình đúng trước; không dùng danh sách discovery làm proof. Market vừa probe có oracle invalid; live deposit/borrow/repay chưa nghiệm thu. Mã trạng thái, pending và marker chống vay trùng đã triển khai. Đọc `docs/deployment/demo-setup.md` trước khi kiểm thử thật.

AI provider hiện là OpenRouter, không phải OpenAI trực tiếp. Cấu hình Vercel theo `.env.example`; `AI_MODEL` là ID OpenRouter hỗ trợ structured outputs. Test provider dùng mock, live API vẫn chờ người dùng cấu hình.

Checkpoint MVP đã qua `npm run verify`: 20 unit tests, 17 browser tests, format/lint/types và production build. Không cần làm lại bootstrap. Repo chứa code end-to-end; live acceptance còn mở, không được suy từ test fixture.

Vercel đã live tại https://picachu-iota.vercel.app/; UI picachu và giải thích gọn đã kiểm. Health báo aiConfigured=true nhưng lượt thử vẫn dùng template; executionConfigured=false. Chưa có bộ market/reserve hoạt động, dedicated RPC hoặc repay signature được nghiệm thu. Bắt đầu từ [checklist](../../deployment/manual-acceptance.md), dùng đúng branch/commit đã push.

Khi có kết quả live: ghi URL/commit, market/reserve đã xác minh, signature + số nợ trước/sau; sửa lỗi thực tế, chạy lại kiểm thử liên quan, cập nhật CURRENT_STATE và commit/push checkpoint. Giữ bản kiến trúc root nguyên trạng và không merge main khi chưa có yêu cầu.

Giới hạn: một cặp Kamino; tạo vị thế demo qua setup có người dùng ký; không swap/rút thế chấp hoặc tự ký; classic SPL debt 6 decimals. AI tắt mặc định, cần rate/billing controls trước khi bật. Public RPC đã timeout; không lặp vô hạn probe hoặc thay bằng mainnet. Audit transitive còn 21 cảnh báo ở checkpoint trước.
