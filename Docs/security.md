# HỆ THỐNG BẢO MẬT VÀ QUÉT TỰ ĐỘNG

Tài liệu này tổng hợp các giải pháp bảo mật miễn phí được đề xuất để tích hợp vào dự án FQuiz nhằm đảm bảo an toàn tối đa cho mã nguồn và dữ liệu người dùng.

---

## PHÂN TÍCH VÀ ĐÁNH GIÁ CÔNG CỤ

### 1. Semgrep
- **Phân loại:** SAST (Static Application Security Testing)
- **Mức độ tin cậy:** Tối ưu
- **Lý do lựa chọn:** Vô đối về tốc độ xử lý. Bản CLI hoàn toàn miễn phí với hệ thống luật quét (rules) được cập nhật liên tục, sát với thực tế phát triển JavaScript và TypeScript hiện đại.

### 2. Snyk
- **Phân loại:** SCA (Software Composition Analysis)
- **Mức độ tin cậy:** Cao
- **Lý do lựa chọn:** Sở hữu cơ sở dữ liệu lỗ hổng bảo mật hàng đầu. Gói miễn phí hỗ trợ 200 lần quét mỗi tháng, cung cấp thông tin chi tiết về vị trí lỗi và phiên bản cần nâng cấp để khắc phục.

### 3. Gitleaks
- **Phân loại:** Secrets Scanning
- **Mức độ tin cậy:** Tối ưu
- **Lý do lựa chọn:** Giải pháp mã nguồn mở hoàn toàn miễn phí, hoạt động triệt để và sạch sẽ. Hiệu quả nhất khi được cấu hình làm pre-commit hook để ngăn chặn rò rỉ thông tin nhạy cảm lên GitHub.

### 4. ESLint Security Plugins
- **Phân loại:** Real-time Integration
- **Mức độ tin cậy:** Cao
- **Lý do lựa chọn:** Giải pháp thực dụng nhất, không tốn tài nguyên hệ thống và đưa ra cảnh báo ngay lập tức trong quá trình lập trình (Real-time).

---

## HƯỚNG DẪN TRIỂN KHAI NHANH

### 1. Quét mã nguồn với Semgrep
Dự án đã tích hợp file cấu hình `.semgrep.yml`.
- **Dùng CLI (nếu cài qua pip):** `semgrep scan --config auto`
- **Dùng Docker (Khuyên dùng cho Windows):**
  ```powershell
  docker run -e SEMGREP_APP_TOKEN=yourtoken --rm -v "${PWD}:/src" semgrep/semgrep semgrep ci
  ```


### 2. Kiểm soát dữ liệu nhạy cảm với Gitleaks
Dự án đã tích hợp file cấu hình `.gitleaks.toml`.
- Lệnh thực hiện: `gitleaks detect --verbose` để rà soát toàn bộ lịch sử commit.

### 3. Kiểm tra bảo mật thời gian thực với ESLint
Sử dụng các plugin chuyên dụng để phát hiện lỗi ngay khi gõ code.
- Cài đặt: `npm install --save-dev eslint-plugin-security eslint-plugin-sonarjs eslint-plugin-no-unsanitized`
- Cấu hình: Đã được cập nhật tự động trong file `.eslintrc.json`.

### 4. Quét lỗ hổng thư viện với Snyk
- Cài đặt CLI: `npm install -g snyk`
- Lệnh kiểm tra: `snyk test` để quét file `package.json`.
