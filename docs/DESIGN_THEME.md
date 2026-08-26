# 🎨 FQuiz — Chuẩn Thiết kế Giao diện & Độ tương phản (Theme & Accessibility Spec)

> 📌 **Tài liệu gốc đầy đủ**: Xem chi tiết tại [`DESIGN_THEME.md`](../DESIGN_THEME.md) ở thư mục gốc của dự án.

---

## Tóm tắt Hệ thống Design Tokens & Accessibility

Tài liệu [`DESIGN_THEME.md`](../DESIGN_THEME.md) định nghĩa hợp đồng thiết kế giao diện (**Theme Contract**) và các tiêu chuẩn kiểm soát chất lượng màu sắc, độ tương phản của FQuiz:

### 1. Kiến trúc Design Tokens 3-Tier
1. **Tier 1 (Primitives)**: Các biến CSS Variables HSL cơ bản (`--background`, `--foreground`, `--primary`, `--muted`...).
2. **Tier 2 (Semantic Tokens)**: Định nghĩa ngữ nghĩa của bề mặt (Surface Elevation: `Background` $\le$ `Card` $\le$ `Popover`) và các trạng thái Status Triads (Success, Warning, Destructive, Info).
3. **Tier 3 (Domain-Specific Tokens)**: Các token chuyên biệt cho phòng thi trắc nghiệm (`--quiz-correct`, `--quiz-incorrect`, `--quiz-selected`, `--quiz-timer`, `--quiz-streak`).

---

### 2. 4 Giao diện Chủ đề (Theme Palettes)

Toàn bộ 4 themes đều đạt tiêu chuẩn tiếp cận **WCAG 2.2 AA** (Tỷ lệ tương phản văn bản tối thiểu 4.5:1, thực tế đạt $\ge$ 12.5:1):

| Chủ đề (Theme) | Lớp CSS (Class) | Đặc trưng màu sắc | Tỷ lệ tương phản WCAG |
|---|---|---|---|
| ☀️ **Light Theme** | `.theme-light` / root | Nền sáng thanh lịch, text đậm tương phản cao | **14.2:1** |
| 🌙 **Dark Theme** | `.theme-dark` / `.dark` | Nền tối bảo vệ mắt, điểm nhấn xanh neon tinh tế | **13.8:1** |
| 🌿 **Green Theme** | `.theme-green` | Tông màu ngọc lục bảo tươi mát, tạo cảm giác học tập thoải mái | **12.5:1** |
| 🌸 **Pink Theme** | `.theme-pink` | Tông màu hồng pastel năng động, trẻ trung | **14.5:1** |

---

### 3. Cổng Kiểm định Chất lượng Giao diện 3 Cấp (3-Tier Quality Gates)
- **Gate 1 (Source Linting)**: Cấm hoàn toàn mã màu hex cố định (`#fff`, `#000`) và các class nền cứng (`bg-white`, `bg-gray-100`) trong JSX/TSX.
- **Gate 2 (Elevation Verification)**: Kiểm tra trật tự độ sáng bề mặt đảm bảo các thẻ và modal luôn nổi bật trên nền chính.
- **Gate 3 (WCAG Contrast Assertion)**: Tự động đo lường tỷ lệ tương phản giữa text và background bằng thuật toán tiêu chuẩn W3C qua lệnh `node .agents/scripts/verify.js --strict`.

---

👉 Để xem chi tiết bảng giá trị HSL và các hướng dẫn styling components, vui lòng tham khảo [`DESIGN_THEME.md`](../DESIGN_THEME.md).
