# Asset trình bày repository

<img src="../../../public/brand/picachu-logo.jpg" alt="Logo pixel picachu" width="72">

- `hero-light.svg`, `hero-dark.svg`: bố cục banner chứa logo pixel do người dùng cung cấp; màu theo design system. Bản PNG dùng trong README để hiển thị ảnh nhúng ổn định trên GitHub. Banner dùng tiếng Anh cho cả hai bản README.
- `social-preview.png`: 1280 × 640 px, sẵn sàng tải lên GitHub Settings → General → Social preview.
- `product-*.png`, `explanation-*.png`, `setup-*.png`: screenshot trực tiếp từ app với giao diện VI/EN. Product và explanation dùng fixture có nhãn; không phải proof chain.
- `portfolio-*.png`: giao diện mục tiêu ba khoản vay, synthetic và VI/EN; README chính dùng ảnh này từ checkpoint 30/09.
- `mobile-preview.png`: screenshot viewport 375 × 812, tiếng Việt.

Tái tạo sau khi UI thay đổi:

```sh
npm run build
npm run start -- --port 3100
# Chạy ở terminal khác:
node scripts/readme-assets.mjs
```

Script cần Chromium của Playwright. Nó tạo lại asset trong thư mục này; không sửa dữ liệu giao dịch. Kiểm ảnh bằng mắt trước khi commit. Không dùng screenshot có private key, API key, secret hoặc dữ liệu cá nhân.

README dùng CI badge động; số test trong phần bằng chứng gắn checkpoint cụ thể để không tự nhận số cũ là kết quả mới. Các tài liệu kỹ thuật hiện bằng tiếng Việt; README.en.md nêu rõ phạm vi bản dịch.

Kiểm liên kết và kích thước ảnh: `node scripts/check-readme.mjs`. About và topics đã cập nhật qua GitHub CLI. Social preview là setting riêng của GitHub; file đã tạo nhưng cần phiên đăng nhập trình duyệt để tải lên, không tự coi file có trong repo là setting đã áp dụng.
