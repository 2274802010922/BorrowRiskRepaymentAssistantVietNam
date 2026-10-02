# Đối chứng mô hình thanh lý

Ngày capture 02/10/2026. [Báo cáo](parity-report.json) và [golden vectors](../../../tests/fixtures/liquidation/vectors.json).

- Executable được đọc trực tiếp từ Kamino Devnet, hash `5f3b2634e5a3d787baf5a119e4c400a9512723787b79d289b7c17e509bbce4c5`, upgrade slot `491561420`.
- 25 ca chạy executable đó trong LiteSVM 1.5.0, với account clone và Clock có kiểm soát. Không gửi liquidation hoặc sửa oracle trên Devnet công khai.
- Đối chiếu exact: nợ fractional sau user repayment, giá trị collateral/debt, debt settle, cToken bị lấy, liquidator payment, underlying được redeem, protocol fee; loss tính từ debit/credit thực thi.
- Ca gồm healthy, hai phía ngưỡng, nhiều mức repayment, close-factor và full close theo insolvency threshold còn solvent, small loan, max-per-event cap, exchange rate không bằng 1, fee và collateral nhỏ; threshold 75% live và 80% minh họa.
- Source Rust `a08760976f51a3a58c4a0c6ea27b4a0e565bca79` chỉ là tham chiếu. **Không có reproducible build chứng minh source đó trùng executable**; `sourceBuildMatched: false`. Đối chứng dùng bytecode đang chạy, không thay bằng bản port thứ hai.

Phạm vi runtime chặt hơn tập fixture: đúng market/pair đang dùng, debt borrow factor 100%, không e-mode, không orders/fixed term/deleveraging đang kích hoạt, không insolvency >=99% hay dust chưa biểu diễn. Unsupported không trở thành loss 0. Mọi quote kiểm ProgramData/owner/upgrade slot; cold connection kiểm toàn bộ hash. Upgrade làm cổng đóng.

## Tái chạy

```powershell
node node_modules/tsx/dist/cli.mjs scripts/liquidation-parity/capture-devnet-context.ts
wsl -d Ubuntu-22.04 -- bash scripts/liquidation-parity/bootstrap-linux.sh
wsl -d Ubuntu-22.04 -- bash scripts/liquidation-parity/run-vm.sh --matrix
node node_modules/tsx/dist/cli.mjs scripts/liquidation-parity/compare-probe.ts --matrix
```

Trong WSL dùng đường dẫn Linux tới script nếu cwd không ánh xạ tự động. Linux CI có thể gọi `bash` trực tiếp. VM/native dependencies và bytecode nằm ở `work/liquidation-vm`, không vào Git hoặc Next/Vercel bundle. Golden vectors và metadata nhỏ vào Git. Capture mới không tự cho phép model mới: hash/params khác phải đối chứng và review manifest trước khi phát hành.

Harness tắt sigverify để clone khoản vay công khai mà không có key của owner. Đây là proof **số học và hiệu ứng protocol**, không phải proof ví Phantom hay hệ thống xác thực của picachu; phần đó có kiểm thử chữ ký riêng và receipts Devnet.
