# Bàn giao

Đợt hardening Web3 ngày 29/09/2026: đọc `docs/testing/web3-hardening.md` trước khi làm tiếp. Live cần kiểm lỗi API sau deploy, đăng nhập Vercel để đọc log gốc, cấu hình market thực sự hoạt động và Redis quota nếu bật OpenRouter. Không làm mất pending records hoặc coi receipt đã verified là giao dịch chưa gửi chỉ vì hiện tại không đọc được oracle.

Logo hiện hành là ảnh pixel do chủ dự án cung cấp tại `public/brand/picachu-logo.jpg`; favicon `app/icon.jpg` dùng cùng ảnh. Không khôi phục biểu tượng p. cũ. UI và README dùng chung nhận diện; banner PNG tái tạo bằng `scripts/readme-assets.mjs`. Ảnh Social preview mới có trong repo, setting GitHub vẫn cần người dùng tải lên khi đăng nhập.

README VI/EN đã tổ chức lại: giới thiệu → ảnh sản phẩm → ví dụ → demo → hai track → bằng chứng → kiến trúc → quick start. Giữ nội dung hai bản đồng bộ, asset ở `docs/assets/readme/`; hướng dẫn tái tạo ở README của thư mục đó. Không thêm badge license khi chủ repo chưa chọn giấy phép.

Release picachu: `/setup` tạo vị thế qua Phantom với hai lần ký, `npm run check:demo -- <public-wallet>` chỉ đọc. Ba biến Kamino vẫn phải cấu hình đúng trước; không dùng danh sách discovery làm proof. Market vừa probe có oracle invalid; live deposit/borrow/repay chưa nghiệm thu. Mã trạng thái, pending và marker chống vay trùng đã triển khai. Đọc `docs/deployment/demo-setup.md` trước khi kiểm thử thật.

AI provider hiện là OpenRouter, không phải OpenAI trực tiếp. Cấu hình Vercel theo `.env.example`; `AI_MODEL` là ID OpenRouter hỗ trợ structured outputs. Test provider dùng mock, live API vẫn chờ người dùng cấu hình.

Checkpoint MVP đã qua `npm run verify`: 20 unit tests, 17 browser tests, format/lint/types và production build. Không cần làm lại bootstrap. Repo chứa code end-to-end; live acceptance còn mở, không được suy từ test fixture.

Vercel đã live tại https://picachu-iota.vercel.app/; UI picachu và giải thích gọn đã kiểm. Health báo aiConfigured=true nhưng lượt thử vẫn dùng template; executionConfigured=false. Chưa có bộ market/reserve hoạt động, dedicated RPC hoặc repay signature được nghiệm thu. Bắt đầu từ [checklist](../../deployment/manual-acceptance.md), dùng đúng branch/commit đã push.

Khi có kết quả live: ghi URL/commit, market/reserve đã xác minh, signature + số nợ trước/sau; sửa lỗi thực tế, chạy lại kiểm thử liên quan, cập nhật CURRENT_STATE và commit/push checkpoint. Giữ bản kiến trúc root nguyên trạng và không merge main khi chưa có yêu cầu.

Giới hạn: một cặp Kamino; tạo vị thế demo qua setup có người dùng ký; không swap/rút thế chấp hoặc tự ký; classic SPL debt 6 decimals. AI tắt mặc định, cần rate/billing controls trước khi bật. Public RPC đã timeout; không lặp vô hạn probe hoặc thay bằng mainnet. Audit transitive còn 21 cảnh báo ở checkpoint trước.
