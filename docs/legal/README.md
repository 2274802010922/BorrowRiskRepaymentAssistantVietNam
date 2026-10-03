# License và phạm vi áp dụng

Chủ dự án chọn **Apache License 2.0** ngày03/10/2026. Tên chủ bản quyền dùng tài khoản GitHub **2274802010922**; không suy đoán tên pháp lý hoặc ghi Codex là chủ bản quyền.

[LICENSE](../../LICENSE) giữ nguyên văn bản tiếng Anh chính thức. [NOTICE](../../NOTICE) ghi chủ bản quyền và chỉ dẫn về nguồn kế thừa. Văn bản tiếng Anh của LICENSE là điều khoản có thẩm quyền; phần giải thích này không sửa các điều khoản đó.

## Mã nguồn và tài liệu

Apache-2.0 áp dụng cho phần đóng góp thuộc quyền cấp phép của chủ dự án trong mã nguồn Picachu (`src/`, `tests/`, `scripts/`), cấu hình và tài liệu dạng văn bản, trừ thành phần có thông báo license riêng hoặc ngoại lệ được liệt kê bên dưới. Người nhận có thể dùng, sửa và phân phối theo các điều kiện Apache-2.0. License không chuyển quyền sở hữu cho người nhận.

Dependency, font, icon, upstream source và tài liệu bên thứ ba giữ license của tác giả tương ứng. Thông báo gốc đi kèm vẫn phải được giữ khi áp dụng. License của Picachu không cấp lại quyền cho phần tác giả khác sở hữu; không coi một SPDX identifier trong metadata là chứng minh quyền sở hữu toàn bộ repository.

## Ngoại lệ cho tài sản hình ảnh và media

Logo do owner cung cấp chưa có chứng cứ quyền cấp phép artwork trong repo. Logo, ảnh chụp hoặc đồ họa có logo, bản dựng slide/PDF và video demo **không được cấp Apache-2.0 theo license mã nguồn này**. Xem [bản đồ tài sản](ASSETS.md) trước khi tái sử dụng. Việc loại khỏi phạm vi không chứng minh quyền dùng artwork hoặc tự tạo giấy phép của bên thứ ba.

Font và icon dùng giấy phép riêng; bản sao thông báo font/icon ở `third-party/` được giữ nguyên, không gắn lại Apache-2.0 cho nội dung đó. Nếu muốn công bố media dưới giấy phép khác, phải xác minh quyền của từng thành phần trước.

## Nguồn Kamino

SDK npm `@kamino-finance/klend-sdk@11.0.1` khai báo MIT. Hợp đồng Rust Kamino Lending đã tham chiếu tại revision `a08760976f51a3a58c4a0c6ea27b4a0e565bca79` dùng **BSL-1.1**, không phải MIT hay Apache-2.0. Hai nguồn này không được gộp nhầm.

Repo không vendoring hợp đồng Rust hoặc bytecode đối chứng vào mã nguồn Git/runtime Vercel. Mô hình TypeScript hiện mô phỏng tập quy tắc price-event, có nghiên cứu nguồn Rust và đối chiếu executable trong VM; đây không phải chứng nhận clean-room hoặc kết luận pháp lý về mọi thành phần. Root LICENSE chỉ cấp quyền đối với đóng góp Picachu mà chủ dự án có quyền cấp phép, không cấp lại quyền cho biểu đạt được bảo hộ của upstream.

Nếu chuyển hoặc sao chép upstream code trong tương lai, phải giữ license/notices gốc và kiểm điều kiện trước khi đưa vào phần Apache-2.0. Kết quả parity kỹ thuật không thay thế việc xác minh quyền cấp phép. [Nguồn và phạm vi kế thừa](../../THIRD_PARTY_NOTICES.md).

## Đóng góp

Đóng góp có chủ đích để đưa vào phần mềm Picachu được xử lý theo điều khoản contributions của Apache-2.0, trừ thỏa thuận riêng hoặc thông báo khác được chấp thuận. Contributor phải có quyền đóng góp và khai báo nguồn/license của nội dung bên thứ ba. Không yêu cầu chuyển giao bản quyền.

Không sửa lịch sử Git, tag hoặc các gói Release đã công bố chỉ để thêm license. LICENSE/NOTICE hiện có trong nhánh mặc định từ commit cấp phép; các bản đóng gói sau phải mang theo các thông báo áp dụng.

Nguồn điều khoản: [Apache Software Foundation](https://www.apache.org/licenses/LICENSE-2.0). [License và notices bên thứ ba](../../THIRD_PARTY_NOTICES.md).

[Kiểm tra file và metadata](validation.json) đối chiếu văn bản license/notices, metadata package/lock và tài sản không đổi. Đây là kiểm tra kỹ thuật của thay đổi cấp phép, không phải chứng nhận pháp lý về quyền sở hữu toàn bộ code.

## English scope summary

Apache-2.0 covers repository-maintained software and textual documentation only to the extent of the copyright holder's licensing rights. Third-party code, fonts, icons and upstream works keep their own terms. The supplied logo, artwork-bearing assets in `docs/assets/`, and released video/slide media are excluded from this software grant; their presence is not evidence of permission to relicense or reuse third-party artwork.

The Kamino SDK's declared MIT license does not cover the BSL-1.1 upstream lending contract. The TypeScript model studied protocol source and was checked against an executable; technical parity is not a clean-room certification or legal clearance. LICENSE/NOTICE do not relicense third-party protected expression. Contributor ownership is retained; no copyright assignment is requested.
