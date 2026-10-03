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

## License của đóng góp

Mã nguồn Picachu thuộc phạm vi [Apache-2.0](LICENSE); xem [NOTICE](NOTICE) và [phạm vi/ngoại lệ](docs/legal/README.md). Theo điều khoản contributions của Apache-2.0, đóng góp có chủ đích để đưa vào phần mềm dùng cùng điều khoản, trừ thỏa thuận riêng được chấp thuận. Bạn giữ bản quyền đóng góp của mình, không phải chuyển giao quyền sở hữu.

Chỉ đóng góp nội dung bạn có quyền cấp phép. Khai báo nguồn, revision, file và license của nội dung bên thứ ba trong [notices](THIRD_PARTY_NOTICES.md); không đổi MIT/OFL/ISC/BSL thành Apache-2.0 bằng một header. Không đưa logo hoặc media bên thứ ba vào phạm vi phần mềm nếu chưa có quyền phù hợp.
