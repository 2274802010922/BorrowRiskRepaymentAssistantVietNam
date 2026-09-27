# Quy trình phát triển

Một người cùng Codex; một đầu việc chính tại một thời điểm.

1. Đọc AGENTS, CURRENT_STATE, HANDOFF và plan active.
2. Chọn phạm vi và điều kiện nghiệm thu; ghi rõ dữ liệu synthetic/recorded/live.
3. Thực hiện một lát cắt nhỏ, thêm kiểm tra cho hành vi thay đổi.
4. Chạy kiểm tra phù hợp. `npm run verify` trước khi tuyên bố bản có thể review/deploy.
5. Cập nhật ngữ cảnh, bằng chứng và giới hạn.
6. Commit/push checkpoint lên nhánh làm việc; mở PR. Merge main theo yêu cầu người dùng.

Checkpoint đang làm ghi WIP/blocked/unverified rõ ràng. Số lượng test không phải độ chính xác ngoài thực tế. Không commit `.env`, keypair, private key, raw payload chứa thông tin nhạy cảm hoặc endpoint có token.

Lịch sử không sửa để tạo cảm giác tiến độ giả. Code kế thừa phải ghi nguồn và notices.
