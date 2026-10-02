# Phân bổ tiền trả nợ

Giữ goal planner cho nhánh đã đạt/đủ tiền. Nhánh thiếu tiền dùng `core/allocation/plan.ts`, cost từ `core/liquidation/kamino-price-event.ts`, dữ liệu server từ simulation refresh accounts của chính Kamino. Một số dư USDC chung, một ngân sách/reserve chung, 1–3 khoản.

Objective: loss của một lượt thanh lý theo giá kịch bản + phí user repayment. Principal tự trả làm giảm cả tiền và nợ, không phải liquidation loss. Loss là book value collateral bị lấy trừ debt được xóa; protocol fee đã nằm trong phần bị lấy không cộng lại. Xét độc lập từng khoản trên snapshot đóng băng, không forecast xác suất/cascade hay cân bằng reserve.

Số học unsigned fixed-point 60 bits, BigInt intermediate và từng điểm rounding. [Đối chứng executable](../evidence/liquidation/README.md) ghi chính xác phạm vi và giới hạn. Runtime chặn cấu hình/branch ngoài hỗ trợ.

Candidate grid gồm 0, limit, các mốc goal/liquidation/bonus/close/small loan và hai phía atomic, baseline amounts và lưới phủ. Tối đa201 mức/khoản. Search prefix hiện có tìm tốt nhất **trong lưới**, tiebreak protected goal collateral, spend và transaction count. Baselines không trả/chia đều/risk-first dùng cùng budget, fees, model; amounts của baseline có trong grid. Không bắt buộc dùng hết tiền hoặc luôn thắng baseline.

## Quote và execution

`POST /api/portfolio/allocate` nhận source, goal và selection; nguồn Devnet cần wallet. Server tự đọc, kiểm phiên bản, tính cost và lưu quote90s. Không nhận cost/model-verified từ client. Synthetic chọn từ fixture cố định, không có token thực thi.

`POST /api/plans` với `mode: loss-allocation-v1`, quote token và `acceptedPartial: true` đọc/tính lại, giữ budget/reserve. Thay đổi quyết định yêu cầu review ở preview. Journal/binding có kind/mode riêng; legacy journal vẫn đọc được. Allocation binding không submit qua endpoint legacy để bỏ qua CAS lock.

Prepare chỉ tạo amount>0, fresh data/fee, quote version và review sticky. Các khoản đã có receipt được cố định, không trả lại; replan vẫn tính exposure của chúng trong full portfolio. Submit kiểm chữ ký/message/balance/reserve, current model context và expiry trước khóa/broadcast. Historical known signature phục hồi mà không dùng oracle hiện tại để phủ nhận receipt. Pending/unknown chặn bước tiếp.

Nếu dữ liệu mới không còn lợi ích, dừng có lý do và giữ receipts. Khi mọi bước đã verified, đọc lại goal độc lập. **Verified repayment không đồng nghĩa đạt mọi mục tiêu.** Reserve là kiểm off-chain/simulation/submit, không phải custom on-chain guard.

Phí SOL lấy từ RPC cho transaction cùng một signature và policy1m CU/1000 micro-lamports; chuẩn bị từng repay đối chiếu lại fee và cap50k. Reserve phí2m lamports cho remaining workflow, tách khỏi reserve USDC. Model version ở source; không có env boolean vượt cổng.
