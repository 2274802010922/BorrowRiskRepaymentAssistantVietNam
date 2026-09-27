# Hướng dẫn review

Checkpoint MVP có demo offline và bộ test tự động; chưa phải submission có bằng chứng live đầy đủ. Dự án chuẩn bị cho cả Best Product & Business và Best Technical Build. Bảng dưới là bản đồ bằng chứng của repo, không tự gán điểm hoặc thay thế rubric chính thức.

| Track              | Nội dung có thể review                                                     | Bằng chứng                                              | Còn thiếu                                                         |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Product & Business | Luồng tiếng Việt: hiểu rủi ro → thử giá giảm → giữ dự trữ → chọn phương án | Landing, workspace, guide; ảnh UI trong `docs/evidence` | Phỏng vấn người vay, willingness-to-pay, pilot và kết quả đo được |
| Technical Build    | Planner số nguyên/Decimal, protocol guard, simulation và binding giao dịch | `core/`, `solana/`, `backend/`, unit tests và CI        | Giao dịch Devnet thật, Phantom recovery và deploy acceptance      |

## Walkthrough 3 phút

1. 30 giây: mô tả người đã có khoản vay và cần quyết định trả bao nhiêu mà vẫn còn tiền dự trữ.
2. 60 giây: mở workspace dữ liệu minh họa; tăng shock lên 20%, ngân sách 100 và dự trữ 50; giải thích vì sao chỉ cải thiện một phần, thiếu 20 để đạt target.
3. 30 giây: sửa ngân sách/dự trữ, xem kết quả và giải thích deterministic; không quảng bá template là live AI.
4. 45 giây: trình bày các bước chuẩn bị/simulation/ký/xác minh trong code. Chỉ demo giao dịch thật khi đã có bằng chứng nghiệm thu.
5. 15 giây: chỉ ra kiểm thử và kế hoạch xác thực nhu cầu người dùng; không dùng số khách hàng/doanh thu chưa có.

6. Chạy website và thử dữ liệu minh họa không cần ví.
7. Kiểm thay đổi shock, budget, reserve và target; phân biệt partial improvement.
8. Xem `/lab` để đối chiếu các trạng thái error/stale/pending/verified.
9. Đọc core tests để kiểm đơn vị, rounding và ràng buộc.
10. Chỉ dùng proof Devnet có signature và trạng thái trước/sau khi gate được hoàn thành.

Hai bảng chấm sẽ liên kết các claim tới code và evidence. Chưa có bằng chứng nhu cầu trả tiền hoặc pilot bên thứ ba. Chưa xác nhận AI live. Các phần này phải được bổ sung trung thực trước khi dự thi.
