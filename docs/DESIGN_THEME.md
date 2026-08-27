# 🎨 FQuiz — Chuẩn Thiết kế Giao diện & Độ tương phản (Theme & Accessibility Spec)

> **Phiên bản**: 2.0.0 (Pure Symmetrical Monorepo Architecture)  
> **Gói quản lý**: `@fquiz/ui` (`packages/ui`)  
> **Tiêu chuẩn**: WCAG 2.2 AA (Tương phản văn bản >= 4.5:1), GPU-Accelerated GSAP Animations.

---

## 1. Kiến Trúc Design Tokens 3-Tier (`@fquiz/ui`)

1. **Tier 1 (Primitives)**: Các biến CSS Variables HSL cơ bản (`--background`, `--foreground`, `--primary`, `--muted`...).
2. **Tier 2 (Semantic Tokens)**: Định nghĩa ngữ nghĩa của bề mặt (Surface Elevation: `Background` $\le$ `Card` $\le$ `Popover`) và các trạng thái Status Triads (Success, Warning, Destructive, Info).
3. **Tier 3 (Domain-Specific Tokens)**: Các token chuyên biệt cho phòng thi trắc nghiệm (`--quiz-correct`, `--quiz-incorrect`, `--quiz-selected`, `--quiz-timer`, `--quiz-streak`).

---

## 2. 4 Giao Diện Chủ Đề (Theme Palettes)

Toàn bộ 4 themes đều đạt tiêu chuẩn tiếp cận **WCAG 2.2 AA** (Tỷ lệ tương phản văn bản tối thiểu 4.5:1, thực tế đạt $\ge$ 12.5:1):

| Chủ đề (Theme) | Lớp CSS (Class) | Đặc trưng màu sắc | Tỷ lệ tương phản WCAG |
|---|---|---|---|
| ☀️ **Light Theme** | `.theme-light` / root | Nền sáng thanh lịch, text đậm tương phản cao | **14.2:1** |
| 🌙 **Dark Theme** | `.theme-dark` / `.dark` | Nền tối bảo vệ mắt, điểm nhấn xanh neon tinh tế | **13.8:1** |
| 🌿 **Green Theme** | `.theme-green` | Tông màu ngọc lục bảo tươi mát, tạo cảm giác học tập thoải mái | **12.5:1** |
| 🌸 **Pink Theme** | `.theme-pink` | Tông màu hồng pastel năng động, trẻ trung | **14.5:1** |

---

## 3. Cổng Kiểm Định Chất Lượng Giao Diện 3 Cấp (3-Tier Quality Gates)

Hệ thống governance tự động quét toàn bộ codebase qua `node .agents/scripts/verify.js --strict`:

- **Gate 1 (Source Linting)**: Cấm hoàn toàn mã màu hex cố định (`#fff`, `#000`) và các class nền cứng (`bg-white`, `bg-gray-100`) trong JSX/TSX. Tất cả phải sử dụng Semantic Tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`).
- **Gate 2 (Elevation Verification)**: Kiểm tra trật tự độ sáng bề mặt đảm bảo các thẻ và modal luôn nổi bật trên nền chính (`Background L` $\le$ `Card L`).
- **Gate 3 (WCAG Contrast Assertion)**: Tự động đo lường tỷ lệ tương phản giữa text và background bằng thuật toán tiêu chuẩn W3C.

---

## 4. Chuẩn Hoạt Ảnh GSAP Micro-Interactions

- **Tích hợp React 18**: Luôn sử dụng `@gsap/react` với hook `useGSAP()` kèm `scope: containerRef` để tự động unmount cleanup (`ctx.revert()`).
- **GPU Performance**: Chỉ animate các thuộc tính transform (`x`, `y`, `scale`, `rotation`, `autoAlpha`). Tuyệt đối không animate layout properties (`width`, `height`, `top`, `left`).
- **Khả năng tiếp cận**: Hỗ trợ người dùng nhạy cảm chuyển động qua `gsap.matchMedia()` với `(prefers-reduced-motion: reduce)`.
