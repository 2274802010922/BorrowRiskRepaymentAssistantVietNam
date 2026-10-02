# Hoàn thiện allocator trả nợ nhiều khoản — đề xuất ngày 02/10/2026

Trạng thái: **đã nghiệm thu allocator v1 ngày03/10 trong phạm vi bên dưới**. Main9fc07ff/143c8a7 đã CI/Vercel PASS, có partial receipt thật và Releasev0.3.0-allocator public/download hashes PASS. [Nghiệm thu](../../../testing/allocation-acceptance.md). Phạm vi giữ picachu, Vercel + Kamino Solana Devnet, UI đơn giản, một người cùng Codex, chuẩn bị chung kết 10/10. Không mở thêm interviews/outreach trong đợt này.

## 1. Kết quả sản phẩm cần đạt

Khi không đủ tiền để đạt mục tiêu cho mọi khoản vay, picachu đề xuất trả khoản nào, bao nhiêu và vì sao, theo cùng kịch bản giá người dùng đã chọn. Người dùng xem phương án, chấp nhận đây là cải thiện một phần, rồi ký từng giao dịch. Sau mỗi giao dịch, hệ thống xác minh biên nhận và đọc lại dữ liệu.

Tên người dùng nhìn thấy: **“Phân bổ tiền trả nợ”**. Allocator là tên kỹ thuật trong tài liệu.

Giữ hai hành vi hiện có: đã đạt mục tiêu thì không trả thêm; đủ tiền thì trả tối thiểu để đạt mọi mục tiêu. Chỉ xét allocator ở nhánh thiếu ngân sách, sau khi mô hình đã được kiểm chứng cho đúng chương trình và loại vị thế.

Không bắt buộc dùng hết ngân sách. Nếu giảm tổn thất trong kịch bản không bù phí, hoặc các khoản chưa bị thanh lý trong kịch bản nhưng thiếu dư địa mục tiêu, kết quả có thể là “Chưa có phương án trả một phần có lợi theo mô hình này”. Không biến kết quả đó thành “mọi mục tiêu đã đạt”.

## 2. Tận dụng và sửa những gì đang có

| Hiện có                            | Cách dùng trong đợt mới                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core/allocation/search.ts`    | Giữ bộ tìm kiếm hữu hạn; bổ sung đầu vào, kiểm chứng tie-break và giới hạn. Hiện chỉ chứng minh trên cost vector trừu tượng.                           |
| `src/core/repayment/portfolio.ts`  | Giữ nhánh đủ tiền/đã đạt mục tiêu; tách orchestrator cho nhánh thiếu tiền.                                                                             |
| `src/solana/adapters/kamino.ts`    | Bổ sung ngữ cảnh nguyên bản của market/reserve/obligation và dấu vân tay chương trình; snapshot giao diện hiện tại chưa đủ để tính thanh lý chính xác. |
| `src/backend/services/plans.ts`    | Tái sử dụng Redis, CAS, khóa ví, pending và receipt; thêm loại kế hoạch, quote và revision cho allocator.                                              |
| `src/solana/transactions/repay.ts` | Tách policy xác thực khỏi dựng transaction. Hàm hiện tại chỉ cho số tiền có trong option của planner cũ, nên không nhận mọi số tiền allocator chọn.    |
| `/portfolio`, giải thích AI, VI/EN | Mở rộng kết quả ngay trong luồng hiện hành; AI chỉ diễn giải dữ kiện, không tính cost hoặc chọn khoản vay.                                             |

Nguồn trạng thái và quyết định hiện hành: [kiến trúc goal portfolio](../../../architecture/goal-portfolio.md), [plan gốc](../active/goal-portfolio.md), [nghiệm thu sprint chung kết](../../../testing/final-demo-day.md).

## 3. Phạm vi và quy tắc quyết định

- Một ví, 1–3 khoản được người dùng chọn, cùng market và cặp collateral SOL/wSOL–debt USDC cổ điển 6 decimals. Một khoản có một collateral và tối đa một debt.
- V1 hỗ trợ thanh lý do vượt ngưỡng giá ở vị thế thông thường, không e-mode; mở thêm nhánh chỉ khi đã có parity riêng. Forced deleveraging, obligation orders, debt maturity/fixed term, token mở rộng hoặc cấu hình không hỗ trợ phải có lý do rõ.
- Dùng giá oracle của debt đang đọc, không mặc định USDC bằng đúng 1 USD. Shock áp dụng nhất quán cho cùng SOL; giá debt giữ nguyên trong kịch bản này.
- Mô hình xét **một lượt thanh lý tối đa cho mỗi khoản**, cùng snapshot và giá sau shock; giả định liquidator đủ vốn, tài nguyên reserve đáp ứng các điều kiện đã kiểm. Không dự đoán xác suất hay thanh lý dây chuyền. Các khoản được đánh giá độc lập trên trạng thái đóng băng; đây không phải mô phỏng cân bằng thị trường hay chuỗi liquidation dùng chung reserve.
- Khoản ở vùng bad debt/insolvency hoặc nhánh không biểu diễn được phải trả `unavailable` cho allocator cho đến khi có mô hình và parity tương ứng; không gán loss bằng 0 hoặc âm để tiếp tục tối ưu.

Tiền có thể dùng, tính bằng atomic USDC:

```text
spendable = min(budget, max(walletBalance - reserve, 0))
sum(repay) <= spendable
walletBalanceAfter >= reserve
```

Phí mạng chi bằng SOL: phải đủ cho các bước còn lại và giữ mức dự phòng phí. Không trừ phí SOL vào ngân sách USDC như cùng một token; quy đổi USD chỉ để so sánh cost.

Mục tiêu thứ nhất giữ đúng plan đã chốt:

```text
minimize sum(lossAfterOneLiquidation + repaymentNetworkFeeUsd)
```

Loss đo suy giảm tài sản ròng do lượt thanh lý: giá trị collateral bị lấy khỏi nghĩa vụ trừ giá trị debt được xóa, cộng khoản người vay thực sự chịu nếu chưa nằm trong phần collateral đó. Không cộng principal người dùng tự trả, không cộng toàn bộ giá giảm, không cộng lại protocol fee đã nằm trong collateral bị lấy. Phải đối chiếu các dòng tiền riêng trước khi chốt công thức.

Tie-break theo thứ tự: cost thấp hơn → tổng giá trị collateral của khoản đạt dư địa mục tiêu cao hơn → dùng ít USDC hơn → ít giao dịch hơn → thứ tự địa chỉ/số tiền cố định. “Đạt mục tiêu” và “chưa bị thanh lý tại giá kịch bản” là hai chỉ số khác nhau.

## 4. Các giai đoạn triển khai và cổng nghiệm thu

### G0 — Khóa hợp đồng sản phẩm và dữ liệu

Việc cần làm:

1. Khóa supported scope ở mục 3; lập danh sách mọi nhánh cần chặn, cùng mã lý do và VI/EN copy.
2. Định nghĩa kiểu dữ liệu có đơn vị: debt atomic, fractional debt, collateral cToken, underlying SOL, USD, bps, lamports, slot/timestamp.
3. Tách trạng thái kết quả: `already_met`, `achievable`, `partial_available`, `no_beneficial_allocation`, `unavailable`. Đây là tên đề xuất, không phải schema hiện đã triển khai.
4. Định nghĩa rõ `goalSatisfied`, `liquidationEligibleAtShock`, `remainingGoalShortfall`, `estimatedLossUsd`, `feeLamports` và lý do cho mỗi khoản.
5. Khóa giới hạn tuổi snapshot/oracle/quote và policy khi dữ liệu đổi, cùng kế hoạch fallback giữ planner đang hoạt động.

Cổng xong: bộ ví dụ hành vi đã thống nhất, loại kết quả không thể bị hiểu nhầm thành bảo đảm an toàn hoặc thành công giao dịch.

### G1 — Nhận diện chương trình và đọc đủ dữ liệu

Việc cần làm:

1. Đọc và ghi Devnet genesis, program ID/loader, ProgramData/upgrade slot nếu có, hash executable, SDK đang pin, IDL/hash layout và địa chỉ market/reserve.
2. Ghi source commit tham chiếu; chỉ gọi source là khớp deployment khi có chứng minh build/provenance. IDL đọc được không chứng minh thuật toán khớp. Nếu source không ánh xạ được, dùng executable đang chạy làm đối chứng hành vi và ghi rõ giới hạn nguồn.
3. Bổ sung context nội bộ giữ debt fraction, cumulative rates, cToken/exchange rate, các tham số thanh lý, trạng thái reserve/market, elevation group và các điều kiện hỗ trợ. Không tính loss từ token collateral đã floor và debt đã ceil trong snapshot giao diện.
4. Đọc wallet balance một lần; đọc account data với context slot và kiểm ownership/layout. `minContextSlot` là ràng buộc tối thiểu, không phải đảm bảo mọi request có cùng slot; gom batch hoặc xác minh độ nhất quán và refresh ở cùng Clock trong harness.
5. Kiểm owner/giá/tuổi/confidence/TWAP như hiện hành. Thiếu field hay cấu hình không hỗ trợ phải chặn nhánh allocator.
6. Tạo manifest phiên bản trong source, gắn model với executable và phạm vi tham số được kiểm. Mismatch/upgrade làm allocator unavailable cho đến khi kiểm lại.

Cổng xong: context đã giải mã, có dấu vân tay và phạm vi rõ; không bật model bằng biến môi trường `verified=true`.

### G2 — Mô hình một lượt thanh lý và đối chứng độc lập

Việc cần làm:

1. Lập bảng mapping các tham số/rules đang cần theo [logic thanh lý Kamino tham chiếu](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/programs/klend/src/state/liquidation_operations.rs): điều kiện thanh lý, close factor/cap, small-loan full liquidation, bonus và rounding. Không hardcode tỷ lệ dựa vào bài giới thiệu.
2. Phân biệt amount liquidator chuyển, debt thực sự settle và cToken bị lấy; đối chiếu đổi underlying và phí qua [lending operations](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/programs/klend/src/lending_market/lending_operations.rs) và [reserve exchange rate](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/programs/klend/src/state/reserve.rs).
3. Mô phỏng user repayment trước, refresh debt/collateral, áp dụng shock, rồi đánh giá lượt thanh lý. Lãi tại snapshot được giữ; lãi phát sinh sau snapshot được xử lý bằng refresh, không giả dự báo.
4. Viết arithmetic tương thích fractional/fixed-point và từng điểm floor/ceil của chương trình. Decimal dùng để hiển thị/định giá; không coi precision 60 của Decimal tự động giống fixed-point của protocol.
5. Tạo harness riêng, ưu tiên [LiteSVM](https://github.com/LiteSVM/litesvm) với executable đúng hash và account/Clock có kiểm soát. Chạy Linux CI nếu binding/native dependency không phù hợp Windows. Harness không vào bundle Vercel.
6. Kiểm một vòng repay → refresh → liquidate trên account clone; đối chiếu token, cToken, debt fraction và phí từ kết quả thực thi. Có thể dùng Rust reference cùng source đã pin để chẩn đoán intermediate; không lấy bản port TS thứ hai làm oracle độc lập.
7. Fixture giá stress chỉ tạo trong VM cục bộ; không sửa oracle công khai Devnet. RPC [simulateTransaction](https://solana.com/docs/rpc/http/simulatetransaction) kiểm transaction ở trạng thái hiện hành, không tự áp dụng giá giả định hay thay bằng chứng giao dịch thật.
8. Lưu golden vectors, input raw tối thiểu, expected output từ harness, executable/source hash, Clock, instructions và báo cáo diff. Kết quả trung gian/atomic phải khớp các trường đã định; không nới sai số tùy ý khi gặp lệch.
9. Kiểm giấy phép của source/binary tái sử dụng và ghi notices. Source Kamino tham chiếu có [BSL](https://github.com/Kamino-Finance/klend/blob/a08760976f51a3a58c4a0c6ea27b4a0e565bca79/LICENSE); giữ đối chứng ở harness và không chép source đó vào runtime Vercel trong đợt này. Mọi tái sử dụng phải theo phạm vi giấy phép thực tế.

Cổng xong: mọi branch trong supported scope có vector khớp executable; branch ngoài phạm vi bị chặn bằng test. Hash mới hoặc kết quả lệch làm cổng đóng. Nếu chưa qua, tiếp tục planner cũ và chỉ hiển thị allocator ở minh họa ghi nhãn.

### G3 — Sinh mức trả, phí và so sánh các cách phân bổ

Việc cần làm:

1. Sinh tối đa 201 mức trả/position, deterministic và không trùng amount. Mỗi mức không vượt debt, requirement mục tiêu hoặc spendable; không dùng sentinel trả hết có thể vượt ngân sách.
2. Luôn có mức 0, mức trả tối đa trong giới hạn, mức đạt mục tiêu nếu khả thi và các điểm chuyển branch/boundary cần thiết quanh ngưỡng thanh lý, small loan, cap/rounding. Kiểm hai phía bằng atomic unit; không giả định loss luôn giảm đều khi trả thêm.
3. Thêm lưới thô để phủ phần còn lại, ưu tiên giữ critical points khi chạm giới hạn. Nếu critical points không thể phủ trong giới hạn thì trả lý do giới hạn, không âm thầm xóa điểm quan trọng.
4. Tính trước ba baseline: không trả, chia đều theo quy tắc deterministic, ưu tiên khoản có dư địa sau shock thấp nhất rồi trả đến mức mục tiêu. Tiền dư được phân phối trong giới hạn debt/goal; giữ cùng budget/reserve/fees/model/snapshot.
5. Đưa amount của các baseline vào candidate grid trước tìm kiếm để việc so sánh không thiên lệch do baseline nằm ngoài lưới. Không làm xấu baseline khi trim.
6. Ước tính phí cho transaction shape theo từng khoản; lấy fee/priority từ policy hiện hành. Không gọi RPC cho từng candidate. Per-position fee phải độc lập/cộng được để dùng search hiện tại; nếu có phí setup dùng chung hoặc ràng buộc chéo thì đổi scoring hoặc chặn scope đó.
7. Mức trả 0 có phí 0. Không làm tròn USD về hai chữ số trước so sánh. Khi lợi ích nhỏ hơn độ bất định của phí/giá, không quảng bá mức tiết kiệm chắc chắn; hiển thị ước tính hoặc giữ không trả.
8. Giữ search prefix hiện có; với ba khoản, khoảng 201×201 cặp và lookup vị thế cuối, không dựng toàn bộ 201³ tổ hợp. Có thể refine cục bộ quanh kết quả trong một số vòng cố định, nhưng vẫn chỉ công bố tốt nhất trong tập đã xét.
9. Báo số tiền chưa dùng, kích thước grid và model/algorithm version trong phần kỹ thuật. Không giả định ngân sách phải được dùng hết hoặc nghiệm trên lưới là tối ưu liên tục toàn cục.

Cổng xong: trên grid đã kiểm, cost không cao hơn các baseline được đưa vào; đúng với exhaustive oracle của small grids cả objective lẫn tie-break. Có case bằng nhau/no-benefit, không yêu cầu luôn thắng baseline.

### G4 — API và quote do server xác thực

Luồng đề xuất:

```text
wallet + selected positions + goal
  → server đọc và kiểm context
  → manifest/model gate
  → cost grid + baselines + search
  → quote có version/hash/expiry
  → người dùng review
  → tạo journal kế hoạch
```

Việc cần làm:

1. Thêm `POST /api/portfolio/allocate` cho quote; request chỉ nhận wallet, position IDs và goal. Không nhận loss, fee, snapshot hoặc `model.verified` từ client như nguồn đáng tin.
2. Quote trả kết quả và lý do mỗi khoản, before/after loss theo kịch bản, fees, số tiền giữ lại/chưa dùng, mục tiêu còn thiếu và bảng baseline.
3. Quote gắn snapshot/config/program/model/grid/fee-policy hash, revision và expiry. Lưu server-side bằng Redis hoặc seal đúng phần cần ràng buộc; quote không ký/gửi hoặc khóa ví.
4. Thêm plan mode `goal-v1` / `loss-allocation-v1` và kind/version mới phù hợp cho binding/journal; journal cũ vẫn đọc theo schema cũ. Client phải chấp nhận rõ partial plan và đúng quote revision.
5. Trước tạo plan, đọc lại và tính lại. Quote đổi thì trả bản mới cần review, không tạo kế hoạch từ số cũ. Giới hạn ban đầu budget/reserve/positions/goal không được mở rộng tự động.
6. Dùng discriminated result schema cho available/no-benefit/unavailable; không dùng loss 0 thay cho lỗi hay dữ liệu thiếu.
7. Giới hạn 3 khoản, 201 candidates/khoản, request rate, thời gian tính và response size. Timeout không tạo transaction/journal đã chấp nhận.
8. Health hiển thị trạng thái manifest/model, không suy ra mọi portfolio đều hỗ trợ. Context không hợp lệ có lý do riêng.

Cổng xong: client sửa amount/model/hash, đổi ví hoặc gửi fixture đều không thể tạo giao dịch allocator.

### G5 — Ký, trả nợ và phục hồi

Việc cần làm:

1. Tách phần dựng repay transaction chung khỏi policy. Goal mode dùng validator hiện có; allocation mode chỉ chấp nhận quyết định server đã xác thực, gắn đúng journal/revision/position/amount. Không mở endpoint cho arbitrary amount chỉ để vượt lỗi planner cũ.
2. Giữ toàn bộ kiểm message, chữ ký, expiry, fee, wallet balance, reserve, simulation và Devnet genesis. Binding mới phải chứa mode và liên hệ với quote/revision.
3. Chỉ tạo bước có amount > 0. Số dư USDC chia sẻ một lần; kiểm đủ SOL cho toàn bộ các bước dự kiến và refresh phí trước mỗi lần ký.
4. Ký tuần tự, chỉ sang bước tiếp khi receipt đã verified; submitted/unknown không phải success. Không tự ký, không retry gửi mù khi chưa rõ signature cũ.
5. Sau mỗi receipt, cố định các bước đã thực hiện và số tiền thực tế đã trả. Đọc lại các khoản chưa thực hiện với ngân sách còn lại; nếu lượng tiền hoặc quyết định đổi, phát quote/revision mới và yêu cầu review lại. Không tự trả thêm khoản đã hoàn tất để đuổi biến động giá.
6. Nếu số dư ngoài luồng đổi, program/config ngoài manifest, quote quá hạn hoặc allocation mới không còn có lợi, dừng hoặc yêu cầu lập lại. Không nới reserve để tiếp tục.
7. Giữ CAS wallet lock và pending trước broadcast như hiện hành; bổ sung test hai tab, duplicate submit, rejection, reload và journal TTL. Receipt cũ bất biến, khóa được giải phóng đúng lúc.
8. Kết quả tách `execution verified` khỏi `goals met`. Sau partial plan, báo khoản còn chưa đạt mục tiêu và số cần thêm từ snapshot mới.

Cổng xong: một vòng partial repayment Devnet có trước/sau/signature/receipt khớp, không vượt budget/reserve. Test fault cases không gửi trùng, không tự mở rộng kế hoạch.

### G6 — UI dễ hiểu, giải thích và khả năng truy cập

Giữ `/portfolio` và ba bước hiện có. Giữ light terminal, logo, typography và các tokens trong [design system](../../../design/system.md).

Sau kết quả thiếu ngân sách, hiển thị một hành động **“Xem cách phân bổ tiền”** khi model/context hỗ trợ. Không bắt người dùng chọn thuật toán hoặc học liquidation bonus.

Bố cục kết quả:

- Tóm tắt: tiền có thể dùng, tiền giữ lại, số tiền cần thêm để đạt mọi mục tiêu.
- Bảng tối đa ba dòng: khoản vay → trả bao nhiêu → dư địa sau kịch bản → đạt/chưa đạt mục tiêu.
- Một câu lý do rõ cho khoản được ưu tiên; ba dòng dữ kiện và tối đa một nhận xét AI ngắn.
- “So sánh cách trả” mở rộng: không trả/chia đều/ưu tiên rủi ro/phương án đề xuất; cùng một mô hình, giá và phí.
- “Chi tiết tính toán” mở rộng: một lượt thanh lý, nguồn/giờ đọc, phiên bản, phí và giới hạn lưới.
- Xác nhận partial rõ trước ký; CTA **“Xem trước và trả theo phương án”**.

Phân biệt unavailable/loading/stale/no-benefit/changed/awaiting-signature/unknown/verified. Khoản amount 0 dùng “Chưa phân bổ” hoặc “Không cần trả”, không trình bày thành một bước ký 0. Không có nhãn “an toàn tuyệt đối”. Giá stress và loss luôn có nhãn ước tính theo kịch bản.

AI lấy số từ core/quote và không được đổi phân bổ. Khi provider lỗi, giải thích template vẫn đủ lý do. Không gửi wallet/raw accounts cho provider. Giữ tiền như “50 USDC”, không “50.00000 USDC”; chỉ dùng precision lớn khi cần tránh làm sai atomic amount.

Cổng xong: VI/EN tại 375/768/1024/1440 px, không tràn ngang, có keyboard focus, labels, loading/error sát thao tác, không chỉ dựa vào màu. Quyết định UI dựa design system hiện hành và nguyên tắc chung của skill UI/UX; hai lượt search cho progressive disclosure không trả mẫu phù hợp nên không áp dụng kết quả đó như một pattern đã kiểm.

### G7 — Bằng chứng, tài liệu và phát hành

Việc cần làm:

1. Tạo case đủ tiền, thiếu tiền có khác biệt, no-benefit, model unsupported và giá/dữ liệu đổi. Không chọn số đẹp rồi trình bày như giao dịch thật.
2. Dùng ba vị thế Devnet và đọc dữ liệu mới; tính shortfall để chọn budget thiếu thực sự. Fixture cố định dùng cho so sánh ổn định, có nhãn; Devnet thực thi chứng minh trả nợ và receipt, không giả là kiểm một cú shock thật.
3. Lưu manifest/parity report, baseline comparison, performance, signatures và trước/sau token/debt/reserve. Phân biệt VM proof, synthetic illustration, public RPC simulation và Devnet receipt.
4. Quay ngắn một vòng xem phân bổ → review → ký → receipt. Nếu không quay được popup, ghi đúng phạm vi; không dùng receipt cũ làm bằng chứng vòng mới.
5. Cập nhật README VI/EN, architecture, demo guide, slide về khác biệt kỹ thuật, speaker notes/Q&A và giới hạn. Chỉ ghi con số chênh lệch tiết kiệm khi có case tái chạy được; không claim luôn thắng hoặc đạt an toàn cho mọi khoản.
6. Cập nhật `CURRENT_STATE.md`, `HANDOFF.md` theo từng cổng. Khi được duyệt triển khai/phát hành, commit tiếng Việt/push main theo workflow đã chốt; kiểm CI/Vercel và link artifact cuối.

Cổng xong: người khác chạy lại được evidence; giao diện/live/repo/slide cùng một phạm vi hỗ trợ và phiên bản.

## 5. Cấu trúc file đề xuất

Đường dẫn dưới đây là dự kiến; ưu tiên module nhỏ, không copy cả SDK hay đưa VM vào application runtime.

```text
src/
  core/liquidation/
    types.ts                # đơn vị, input/output, branch unsupported
    fixed-point.ts          # arithmetic/rounding protocol
    kamino-price-event.ts   # một lượt, repayment → shock → liquidation
  core/allocation/
    search.ts               # bộ tìm kiếm hiện có
    candidates.ts           # critical points + finite grid
    baselines.ts            # cùng ràng buộc và model
    plan.ts                 # objective, reasons, no-benefit
  shared/allocation.ts      # result/quote discriminated schemas
  solana/adapters/kamino-liquidation.ts
  backend/services/allocation.ts
  backend/services/liquidation-readiness.ts
  app/api/portfolio/allocate/route.ts
  frontend/features/portfolio/allocation-result.tsx
  frontend/features/portfolio/allocation-comparison.tsx
scripts/liquidation-parity/
  capture-devnet-context.ts
  run-vm-cases.*
  compare-vectors.ts
tests/
  fixtures/liquidation/     # vectors nhỏ, nguồn và hash
  unit/liquidation.test.ts
  unit/allocation-candidates.test.ts
  unit/allocation.test.ts   # mở rộng hiện có
  unit/allocation-plans.test.ts
  e2e/allocation.spec.ts
docs/
  architecture/liquidation-model.md
  evidence/liquidation/{manifest.json,parity-report.json,README.md}
  evidence/validation/allocator.json
  testing/allocation-acceptance.md
```

Các file còn sửa: `shared/portfolio.ts`, `core/repayment/portfolio.ts`, `backend/services/plans.ts`, `solana/transactions/repay.ts`, portfolio workspace, messages VI/EN và health. Binary/account dump lớn đặt ở work hoặc artifact có hash và hướng dẫn lấy, không đẩy tất cả vào Git hay traced bundle.

## 6. Ma trận kiểm thử bắt buộc

| Nhóm        | Cases                                                                                                                                                 | Bằng chứng đạt                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Context     | Sai chain/program/hash/layout; thiếu params; stale oracle; reserve disabled; unsupported group/order/term                                             | Không có quote thực thi; reason đúng                                                           |
| Liquidation | Healthy; đúng ngưỡng và hai phía; fractional debt; close-factor/cap; small loan; bonus; dust/cToken rounding; near-insolvency hoặc bị chặn đúng scope | Đối chiếu executable cho mọi branch hỗ trợ; không dùng model tự tính expected                  |
| Grid/search | 1/2/3 khoản; budget/reserve 0 hoặc vượt balance; duplicates; >201; missing zero; invalid cost; tie-break; no-benefit; baseline; leftover              | Exhaustive nhỏ độc lập, deterministic; không vượt tiền/debt                                    |
| Thuộc tính  | Budget tăng trên cùng grid không làm cost tốt nhất tệ hơn; no-action luôn khả thi; order input không đổi kết quả                                      | Property tests có seed lưu lại; không áp dụng monotonicity mù cho grid đổi theo budget         |
| API         | Client sửa amount/model/snapshot; quote hết hạn; đổi wallet; replay revision; fixture execution; Redis lỗi                                            | Fail closed, không khóa/gửi trước chữ ký hợp lệ                                                |
| Execution   | Hai tab; signature rejection; fee thiếu; simulation lỗi; quote đổi; partial success rồi step fail; unknown; reload/TTL                                | Không double-send; receipts bất biến; reserve/budget được kiểm lại                             |
| UI          | VI/EN, responsive, no-benefit, model unavailable, review changed, unknown, verified partial                                                           | Browser/a11y pass; goal và execution không nhập nhằng                                          |
| Hiệu năng   | 3×201 candidates, cold/warm route, cache hit/miss, RPC lỗi                                                                                            | Đo riêng core/RPC/total; core mục tiêu ≤1s trên runtime đã ghi, không claim p95 từ vài request |

Khi build: chạy check/build/browser/strict server bundle và cổng parity. Test VM có job riêng được yêu cầu khi thay model/params/parser; golden offline chạy trong CI thường. Không tăng số test để thay bằng chứng protocol. Chỉ benchmark lại khi đổi engine hoặc còn vấn đề đo được.

## 7. Kế hoạch trước chung kết

Mốc dưới đây là dự kiến với ngày hiện tại 02/10, không phải cam kết thời lượng. G2 phụ thuộc khả năng chạy đúng executable/CPI trong VM và là rủi ro thời gian chính.

| Mốc      | Việc ưu tiên                      | Đầu ra                                                       |
| -------- | --------------------------------- | ------------------------------------------------------------ |
| 02/10    | G0–G1, spike tải/chạy executable  | Supported scope + manifest nháp + một case đối chứng         |
| 03–04/10 | G2                                | Model và parity matrix; quyết định có đủ căn cứ nối vào live |
| 05/10    | G3–G4                             | Candidate/baseline/search và server quote                    |
| 06/10    | G5                                | Partial plan ký tuần tự + recovery tests                     |
| 07/10    | G6 + vòng Devnet                  | UI đơn giản, receipts thật, regression                       |
| 08/10    | G7                                | Demo/slides/README/evidence/CI/deploy                        |
| 09/10    | Đóng phạm vi, chạy thử trình diễn | Bản ổn định và fallback đang hoạt động                       |

Nếu đến hết 04/10 parity chưa đạt, công bố checkpoint đó và giới hạn đã biết; giữ live goal planner, không bật allocator bằng flag để kịp thi. Tiếp tục việc tạo đối chứng nếu còn thời gian, nhưng không đổi chương trình vay hoặc thêm guard program trong sprint này để mở rộng scope.

## 8. Định nghĩa hoàn thành allocator v1

- [x] Có supported scope, executable fingerprint và manifest model cụ thể.
- [x] Mô hình tạo cost từ account/protocol data; parity độc lập khớp các branch trong scope runtime.
- [x] Search + critical points + baselines tái chạy được, giới hạn lưới và giả định một lượt ghi rõ.
- [x] Server tính và bind quote; client/LLM không thể tự khai model verified hay sửa amount.
- [x] Partial execution có review và một vòng Devnet verified, kèm fault/recovery tests.
- [x] Goal state tách khỏi transaction state; reserve/budget/fees được giữ đúng.
- [x] UI VI/EN đơn giản, responsive/a11y, số ngắn và giải thích rõ.
- [x] README/slides/video/evidence đồng nhất; CI/build/bundle và Vercel pass.

Môi trường: dự kiến dùng nguyên RPC/Kamino IDs, binding secret, Redis và OpenRouter hiện có. Phiên bản model là manifest trong source, không là env bypass. Harness có toolchain riêng ở máy/CI; không cần thêm private key hay model flag vào Vercel chỉ để bật tính năng.
