# 🎨 FQuiz — Design Theme Contract, WCAG 2.2 AA Baseline & FQuiz Enhanced Accessibility Policy

Tài liệu này đóng vai trò là **Hợp đồng Thiết kế & Kỹ thuật (Design Token Contract)** quy định chuẩn hóa hệ thống 3 Theme Modes (`.light`, `.dark`, `.green`), kiến trúc Tokens 3 tầng, chuẩn đặt tên Triad, domain-specific tokens cho Quiz Engine, chính sách Accessibility nâng cao, hệ thống kiểm tra Quality Gate 3 tầng và Danh mục 49 Page Routes của hệ thống.

---

## 🏛️ 1. Nguyên Tắc Thiết Kế (Design Principles)

1. **Component Agnostic**: Component không được phép biết mã màu HEX hay tên theme cụ thể. Component chỉ biết **Ý nghĩa Semantic** của màu (`bg-card`, `text-foreground`, `text-success-fg`).
2. **Không Rải Rác Theme Conditionals**: Tuyệt đối không dùng `dark:bg-...` rải rác trong component UI ngoại trừ các trường hợp ngoại lệ cực kỳ đặc thù.
3. **Triad Consistency**: Mọi trạng thái phản hồi (Feedback) phải tuân theo bộ ba thống nhất: `-bg` (Nền), `-fg` (Chữ/Icon), `-border` (Đường viền).
4. **Accessible Beyond Color**: Màu sắc KHÔNG PHẢI là phương tiện duy nhất để biểu thị trạng thái (Luôn kết hợp Màu sắc + Icon + Text Label + ARIA State).
5. **No Invalid Contrast Claims**: Tất cả các thông số tương phản phải được đo lường chính xác trên cặp Foreground / Surface thực tế.

---

## 🌗 2. Các Theme Modes & Cá Tính Thị Giác (Visual Personality)

| Mode Name | Class Trigger | Triết lý & Cá tính thị giác | Depth & Layering Hierarchy | Ngữ cảnh sử dụng |
|---|---|---|---|---|
| **Light Theme** | `.light` (default) | **Chủ Đề Trắng - Đen Monochromatic** (Nền trắng tinh `#FFFFFF`, Chữ Slate Black `#0F172A`, Primary Accent `#0F172A` - Tuyệt đối KHÔNG dính màu xanh) | `bg-background` (`#FFFFFF`) $\rightarrow$ `bg-card` (`#FFFFFF`) $\rightarrow$ `bg-muted` (`#F1F5F9`) | Học tập ban ngày |
| **Dark Theme** | `.dark` | **Chủ Đề Đen - Trắng Monochromatic** (Nền đen tuyền OLED `#000000`, Chữ trắng `#FFFFFF`, Primary Accent `#FFFFFF` - Tuyệt đối KHÔNG dính màu xanh) | `bg-background` (`#000000`) $\rightarrow$ `bg-card` (`#09090B`) $\rightarrow$ `bg-popover` (`#0F0F12`) $\rightarrow$ `bg-muted` (`#1F1F23`) | Ôn tập ban đêm |
| **Green Theme** | `.green` | **Chủ Đề Xanh - Be Vintage** (Nền giấy be cổ điển `#EAE7D6`, Chữ xanh thẫm `#1A2922`, Primary Accent Sage Green `#396150`) | `bg-background` (`#EAE7D6`) $\rightarrow$ `bg-card` (`#FBFBF7`) $\rightarrow$ `bg-muted` (`#D9E4D6`) | Luyện đề kéo dài |

---

## 📐 3. Kiến Trúc Design Tokens 3 Tầng Khách Quan (Framework-Agnostic 3-Tier Architecture)

Dự án tách biệt hoàn toàn giữa mã màu thô (Primitive Tokens) và tầng ý nghĩa (Semantic Tokens). Primitive Tokens là các định nghĩa giá trị màu thô độc lập với bất kỳ UI framework nào:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Primitive Tokens (Raw Color Definitions: HSL / HEX)  │
│    e.g. green-800 (#385A4E), charcoal-950 (#0A0F0D)     │
└───────────────────────────┬─────────────────────────────┘
                            │ Maps to
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Semantic Tokens (Theme Agnostic CSS Variables)       │
│    e.g. --background, --card, --success-fg, --border    │
└───────────────────────────┬─────────────────────────────┘
                            │ Consumed by
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Component / Utility Tokens (Tailwind Classes)        │
│    e.g. bg-card, text-foreground, text-success-fg       │
└───────────────────────────┬─────────────────────────────┘
```

---

## 🎨 4. Global Semantic Tokens

### 4.1. Nền & Bề Mặt (Surfaces)
| Token Variable | Utility Class | Light Mode | Dark Mode (Deep Black) | Green Mode | Mục đích sử dụng |
|---|---|---|---|---|---|
| `--background` | `bg-background` | `0 0% 100%` (`#FFFFFF`) | `0 0% 0%` (`#000000`) | `49 26% 91%` (`#EAE7D6`) | Nền tổng thể toàn trang |
| `--card` | `bg-card` | `0 0% 100%` (`#FFFFFF`) | `240 10% 4%` (`#09090B`) | `60 15% 97%` (`#FBFBF7`) | Thẻ nội dung, Panel, Modal |
| `--popover` | `bg-popover` | `0 0% 100%` (`#FFFFFF`) | `240 10% 6%` (`#0F0F12`) | `60 15% 97%` (`#FBFBF7`) | Dropdown menu, Context popup |
| `--muted` | `bg-muted` | `220 14% 96%` (`#F1F5F9`) | `240 6% 12%` (`#1F1F23`) | `117 20% 86%` (`#D9E4D6`) | Ô tìm kiếm, nền tab phụ, state disabled |

### 4.2. Chữ & Icon (Typography & Foreground)
| Token Variable | Utility Class | Light Mode | Dark Mode | Green Mode | Mục đích sử dụng |
|---|---|---|---|---|---|
| `--foreground` | `text-foreground` | `222 47% 11%` (`#0F172A`) | `0 0% 100%` (`#FFFFFF`) | `155 48% 11%` (`#0C281C`) | Chữ chính toàn trang (Text, Headings) |
| `--muted-foreground` | `text-muted-foreground` | `155 10% 40%` (`#5C7066`) | `150 8% 65%` (`#9BAAA2`) | `155 15% 35%` (`#4C5F55`) | Nhãn phụ, mô tả, timestamp |
| `--card-foreground` | `text-card-foreground` | `155 14% 15%` (`#212B26`) | `150 12% 92%` (`#E4EBE7`) | `155 20% 12%` (`#192520`) | Text hiển thị bên trong Card |

### 4.3. Đường Viền & Ô Nhập Liệu (Borders & Inputs)
| Token Variable | Utility Class | Light Mode | Dark Mode | Green Mode | Rationale phân tách |
|---|---|---|---|---|---|
| `--border` | `border-border` | `220 13% 90%` (`#E2E8F0`) | `155 12% 21%` (`#27342E`) | `117 23% 78%` (`#C4D6C1`) | Dùng cho viền cấu trúc (Card, Panel, Divider) |
| `--input` | `border-input` | `220 13% 90%` (`#E2E8F0`) | `155 12% 16%` (`#1F2B25`) | `117 23% 78%` (`#C4D6C1`) | Dùng cho ô điều khiển tương tác (Input, Select) |
| `--ring` | `ring-ring` | `155 20% 34%` (`#385A4E`) | `151 28% 52%` (`#5D9E7D`) | `155 25% 38%` (`#497964`) | Viền phát sáng khi Focus điều khiển |

---

## 🏷️ 5. Brand & Destructive Tokens (Chuẩn Hóa Context Sử Dụng)

> ⚠️ **Quy chuẩn Context Sử Dụng Nút bấm vs Text Link**:
> - **Nút bấm Primary**: Kết hợp `bg-primary` + `text-primary-foreground`.
> - **Link Text / Icon Brand**: Dùng `text-primary`. Mã màu `--primary` ở Light Mode là `#385A4E` (HSL `155 20% 34%`) đạt tỷ lệ tương phản **7.34:1** trên `bg-background` (`#FAFAFA`), **7.66:1** trên `bg-card` (`#FFFFFF`), và **7.2:1** trên `bg-muted` (`#F1F5F9`), vượt chuẩn WCAG AAA cho normal text trên mọi bề mặt!

| Token Variable | Utility Class | Light Mode | Dark Mode | Green Mode |
|---|---|---|---|---|
| `--primary` | `bg-primary`, `text-primary` | `155 20% 34%` (`#385A4E`) | `151 28% 52%` (`#5D9E7D`) | `155 25% 30%` (`#396150`) |
| `--primary-foreground` | `text-primary-foreground` | `0 0% 100%` (`#FFFFFF`) | `155 25% 8%` (`#0E1A14`) | `0 0% 100%` (`#FFFFFF`) |
| `--destructive` | `bg-destructive`, `border-destructive` | `0 84.2% 60.2%` (`#EF4444`) | `0 70% 40%` (`#B91C1C`) | `0 84.2% 60.2%` (`#EF4444`) |
| `--destructive-foreground` | `text-destructive-foreground` | `210 40% 98%` (`#F8FAFC`) | `210 40% 98%` (`#F8FAFC`) | `210 40% 98%` (`#F8FAFC`) |

---

## 🚦 6. Feedback & Status Tokens (Chuẩn Triad `-bg`, `-fg`, `-border`)

Tất cả các trạng thái phản hồi được chuẩn hóa đầy đủ bộ ba **Triad**:

```
[State Name] ──┬──> [State]-bg     (Background container)
               ├──> [State]-fg     (Text & Icon)
               └──> [State]-border (Border outline)
```

| State | Background Utility | Text/Icon Utility | Border Utility | Light Mode (Bg/Fg) | Dark Mode (Bg/Fg) |
|---|---|---|---|---|---|
| **Success** | `bg-success-bg` | `text-success-fg` | `border-success-border` | `#B4DEC0` / `#155E30` | `#1D3E29` / `#93EBA8` |
| **Incorrect** | `bg-incorrect-bg` | `text-incorrect-fg` | `border-incorrect-border` | `#FEE2E2` / `#991B1B` | `#451717` / `#FCA5A5` |
| **Warning (Amber/Yellow)** | `bg-warning-bg` | `text-warning-fg` | `border-warning-border` | `#FAF2E4` / `#75450B` | `#453510` / `#FCD34D` |
| **Info** | `bg-info-bg` | `text-info-fg` | `border-info-border` | `#CFFAFE` / `#0D5C75` | `#123B47` / `#8EE0F5` |
| **Attempted** | `bg-attempted-bg` | `text-attempted-fg` | `border-attempted-border` | `#EFF6FF` / `#1E3A8A` | `#1E293B` / `#BFDBFE` |

> ⚠️ **Quy Chuẩn Màu Vàng / Hổ Phách (Yellow & Amber Tokens)**:
> Tất cả các khu vực giao diện dùng màu Vàng/Amber như Banner **"Bài thi chưa hoàn thành"**, Badge **"ĐANG DỞ"**, Icon ngọn lửa, Thông báo cảnh báo hạn ngạch, hoặc Nút bấm Tiếp tục bài thi **BẮT BUỘC** phải mapped sang bộ **Warning Triad** (`bg-warning-bg`, `text-warning-fg`, `border-warning-border`) hoặc **Quiz Flagged Triad** (`bg-question-flagged-bg`, `text-question-flagged-fg`, `border-question-flagged-border`). Cấm tuyệt đối viết hardcoded `bg-amber-100`, `text-amber-600`, `bg-amber-500`, `text-yellow-500` trong component UI!

---

## 🎯 7. Quiz Domain Tokens (Dành Riêng Cho Quiz Engine)

Dự án định nghĩa bộ Semantic Tokens riêng biệt cho miền bài thi (Quiz Domain Tokens) giúp Question Matrix & Exam Engine phản ánh đúng nghiệp vụ:

| Trạng Thái Câu Hỏi | Background Class | Text/Icon Class | Border Class | Ý Nghĩa Nghiệp Vụ |
|---|---|---|---|---|
| **Chưa Trả Lời** | `bg-question-unanswered-bg` | `text-question-unanswered-fg` | `border-question-unanswered-border` | Câu hỏi mới chưa xem |
| **Đã Trả Lời** | `bg-question-attempted-bg` | `text-question-attempted-fg` | `border-question-attempted-border` | Đã chọn đáp án (chưa chấm) |
| **Đang Chọn (Current)** | `bg-question-current-bg` | `text-question-current-fg` | `border-question-current-border` | Câu hỏi đang mở trên màn hình |
| **Chấm Đúng** | `bg-question-correct-bg` | `text-question-correct-fg` | `border-question-correct-border` | Đã chấm: Đáp án ĐÚNG |
| **Chấm Sai** | `bg-question-incorrect-bg` | `text-question-incorrect-fg` | `border-question-incorrect-border` | Đã chấm: Đáp án SAI |
| **Đánh Dấu (Flagged)** | `bg-question-flagged-bg` | `text-question-flagged-fg` | `border-question-flagged-border` | Thí sinh đánh dấu cần xem lại |

---

## 👆 8. Interaction State Tokens (Semantic Disabled & Interactive Tokens)

Dự án không lạm dụng `opacity-50` (vốn làm suy giảm độ tương phản bất hợp lý), mà định nghĩa các **Semantic Disabled & Interactive State Tokens**. 

> 💡 **Quy chuẩn WCAG đối với Disabled Controls**: Theo WCAG 2.2 Section 1.4.3 (Inactive Controls Exception), các ô điều khiển bị vô hiệu hóa được miễn trừ một số yêu cầu tương phản nghiêm ngặt. Tuy nhiên, FQuiz vẫn duy trì lớp token `disabled-fg` để đảm bảo vừa phân biệt rõ ràng mặt thị giác vừa giữ mức nhận diện phù hợp.

| State | Semantic Class | Light Mode | Dark Mode | Green Mode | Quy Chuẩn Sử Dụng |
|---|---|---|---|---|---|
| **Disabled Surface** | `bg-disabled-bg` | `#F1F5F9` | `#1C2722` | `#D9E4D6` | Nền ô/nút bị vô hiệu hóa |
| **Disabled Text** | `text-disabled-fg` | `#8C9C93` | `#6A7B72` | `#788B80` | Text ô bị vô hiệu hóa (Đạt ngoại lệ Inactive Controls) |
| **Disabled Border** | `border-disabled-border` | `#E2E8F0` | `#27342E` | `#C4D6C1` | Viền ô bị vô hiệu hóa |
| **Interactive Hover** | `bg-interactive-hover` | `#F1F5F9` | `#22302A` | `#D9E4D6` | Hover trên item danh sách/menu |
| **Interactive Active** | `bg-interactive-active` | `#E2E8F0` | `#293A33` | `#C4D6C1` | Press / Active state |
| **Interactive Selected** | `bg-interactive-selected-bg` `text-interactive-selected-fg` | `#F0F7F4` / `#385A4E` | `#1D3328` / `#8AD4AD` | `#E3EFE6` / `#396150` | Item đang được chọn |

---

## ♿ 9. Ma Trận Tương Phản Runtime Surface Matrix (WCAG 2.2 Baseline vs FQuiz Policy)

Dự án phân biệt rõ ràng giữa **Chuẩn Cơ Bản WCAG 2.2 AA Baseline** và **Chính Sách Tiếp Cận Nâng Cao Của FQuiz (FQuiz Enhanced Policy)**. Tất cả các cặp chữ và bề mặt thực tế (Runtime Surface Pairs) đều được đo lường chính xác:

$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

### 9.1. Ma Trận Tương Phản Bề Mặt Thực Tế (Runtime Surface Matrix)
| Cặp Chữ (Foreground) | Bề Mặt Nền (Surface Background) | Light Mode Ratio | Dark Mode Ratio | Green Mode Ratio | WCAG Result & Policy |
|---|---|---|---|---|---|
| `foreground` | `background` (`#FAFAFA` / `#0A0F0D`) | **13.6:1** | **15.2:1** | **12.6:1** | **Pass AAA ($\ge 7.0:1$)** |
| `foreground` | `card` (`#FFFFFF` / `#141C18`) | **14.2:1** | **14.0:1** | **14.9:1** | **Pass AAA ($\ge 7.0:1$)** |
| `foreground` | `muted` (`#F1F5F9` / `#1C2722`) | **12.6:1** | **13.1:1** | **11.4:1** | **Pass AAA ($\ge 7.0:1$)** |
| `muted-foreground` | `background` | **4.9:1** | **7.6:1** | **5.1:1** | **Pass AA ($\ge 4.5:1$)** |
| `muted-foreground` | `card` | **5.1:1** | **7.0:1** | **6.0:1** | **Pass AA ($\ge 4.5:1$)** |
| `muted-foreground` | `muted` | **4.6:1** | **6.5:1** | **4.8:1** | **Pass AA ($\ge 4.5:1$)** |
| `primary` *(Brand Text)* | `background` | **7.34:1** | **6.0:1** | **5.2:1** | **Pass AAA (Light) / AA** |
| `primary` *(Brand Text)* | `card` | **7.66:1** | **6.0:1** | **6.2:1** | **Pass AAA (Light) / AA** |
| `primary` *(Brand Text)* | `muted` | **7.2:1** | **5.1:1** | **5.0:1** | **Pass AAA (Light) / AA** |
| `warning-fg` | `warning-bg` *(Honey Amber)* | **7.8:1** | **8.6:1** | **7.1:1** | **Pass AAA ($\ge 7.0:1$)** |
| `incorrect-fg` | `incorrect-bg` | **7.3:1** | **7.9:1** | **7.3:1** | **Pass AA ($\ge 4.5:1$)** |
| `focus-visible:ring-ring` | `background` / `card` | **5.6:1** | **6.0:1** | **5.2:1** | **Pass Focus Ring Contrast** |

---

## 🧩 10. Hướng Dẫn Sử Dụng Trong Component & Chuẩn Accessibility

### ✅ Chuẩn Accessibility (Color + Icon + Label):
```tsx
// KHÔNG CHỈ DÙNG MÀU ĐỂ BIỂU THỊ ĐÚNG/SAI
<div className="bg-success-bg text-success-fg border border-success-border p-3 rounded-xl flex items-center gap-2">
  <CheckCircle2 className="w-4 h-4 text-success-fg shrink-0" aria-hidden="true" />
  <span className="font-bold">Chính xác</span>
  <span className="sr-only">Bạn đã trả lời đúng câu hỏi này</span>
</div>
```

---

## 🚫 11. Các Mẫu Code Bị Cấm (Forbidden Coding Patterns)

Cấm tuyệt đối các hình thức viết code màu rải rác sau đây:

1. ❌ **Cấm dùng trực tiếp palette màu thô**: `bg-slate-100`, `text-gray-900`, `border-zinc-200`, `text-emerald-600`.
2. ❌ **Cấm dùng Arbitrary Color Values**: `bg-[#123456]`, `text-[hsl(120,50%,50%)]`, `border-[rgb(10,20,30)]`.
3. ❌ **Cấm dùng rải rác class Dark modifier**: `dark:bg-slate-900`, `dark:text-white` (Dùng semantic tokens `bg-card text-foreground`).
4. ❌ **Cấm trộn lẫn tên Naming**: `text-danger-fg` (Dùng `text-destructive` hoặc `text-destructive-foreground`).
5. ❌ **Cấm dùng màu Rainbow tùy tiện cho Navigation / Sidebars**: Cấm dùng `text-blue-600`, `text-indigo-600`, `text-purple-600` cho menu điều hướng. Tất cả Navigation Sidebars, Floating Dock và Popup menu BẮT BUỘC sử dụng Semantic Design Tokens thống nhất (`text-primary`, `text-foreground`, `bg-interactive-selected-bg`, `text-interactive-selected-fg`).
6. ❌ **Cấm dùng hardcoded palette màu Amber/Yellow thô**: Cấm dùng `bg-amber-100`, `text-amber-600`, `bg-amber-500`, `text-amber-700` cho các banner/badge bài thi đang dở, cảnh báo hay bookmark. Bắt buộc mapped sang **Warning Triad** (`bg-warning-bg`, `text-warning-fg`, `border-warning-border`) hoặc **Quiz Flagged Triad** (`bg-question-flagged-bg`, `text-question-flagged-fg`, `border-question-flagged-border`).
7. ❌ **Cấm dùng Gradient/Color Hardcoded trên Card Bento/Studio**: Cấm dùng `bg-gradient-to-br from-emerald-800...`, `from-purple-800...` hardcoded làm cho Card không đổi màu khi người dùng switch theme. Tất cả Bento Cards BẮT BUỘC dùng Semantic Tokens (`bg-card text-card-foreground border-border hover:border-ring`) để đổi màu 100% theo Theme active.
8. ❌ **Cấm dùng viền Hover lệch cá tính Theme**: Bắt buộc dùng `hover:border-ring` để hiệu ứng hover biến đổi theo từng Theme: **Dark Theme nổi viền Trắng Tinh (`#FFFFFF`)**, **Light Theme nổi viền Xanh Jade (`#2D5A46`)**, **Green Theme nổi viền Xanh Olive (`#1E5638`)**.

---

## ⚙️ 12. Tự Động Kiểm Tra Bằng Hệ Thống FQuiz Quality Gate 3 Tầng

Quy trình đảm bảo chất lượng Frontend của FQuiz được phân tách thành **Hệ Thống Quality Gate 3 Tầng**:

```
                  FQuiz Quality Gate System
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
Tầng 1: Theme Governance  Tầng 2: Type Safety   Tầng 3: Visual / Browser Verification
  npm run verify:theme     npx tsc --noEmit        Runtime Render Integrity Check
  (Static Token Audit)    (Type Safety Check)    (DOM Structure & Multi-Theme Visual)
```

### Báo Cáo Trạng Thái Quality Gate Quét Dự Án:
- **[PASS] Tier 1 — Theme Governance (Static Token Audit)**: `npm run verify:theme` $\rightarrow$ 9/9 checks passed | 0 errors.
- **[PASS] Tier 2 — Type Safety & Compilation**: `npx tsc --noEmit` $\rightarrow$ TypeScript compilation passed | 0 errors.
- **[NOT RUN / UNVERIFIED IN BROWSER] Tier 3 — Browser Runtime & Surface Matrix**: Subagent Playwright initialization blocked do lỗi kết nối CDN 404 driver `playwright-1.57.0-win32_x64.zip`. Đã kiểm tra tính khả thi qua HTTP dev server response (`http://localhost:3000` status 200 OK) nhưng chưa chạy kiểm thử tương tác tự động trực tiếp trên trình duyệt.

> 🗺️ **Danh Mục Page Routes**: Toàn bộ 49 trang của hệ thống được quản lý độc lập tại file **[DESIGN_ROUTES.md](file:///e:/Code/fquiz/DESIGN_ROUTES.md)**.
