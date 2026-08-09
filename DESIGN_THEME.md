# 🎨 FQuiz — Design Theme Contract, Visual Role Architecture & WCAG 2.2 Specification

Tài liệu này đóng vai trò là **Bản vẽ Kiến trúc Hợp đồng Thiết kế (Design Token Contract)** quy định chuẩn hóa hệ thống 3 Theme Modes (`.light`, `.dark`, `.green`), kiến trúc **6-Layer Visual Role Architecture**, hệ thống **8 Functional Color Families**, mẫu giao diện **Accent Rail Pattern**, ma trận 4-Tier Quality Gate, Accessibility Contract và quy tắc Anti-Rainbow Policy (Tỷ lệ 70-20-10) của hệ thống FQuiz.

---

## 🏛️ 1. Nguyên Tắc Thiết Kế Cốt Lõi (Visual Role & Functional Identity Principles)

1. **Visual Role & Functional Encoding (Mã Hóa Thị Giác Chức Năng)**: Màu sắc không xuất hiện để trang trí ngẫu nhiên, mà là **Mã hóa Thông tin Cognitive (Cognitive Information Encoding)**. Mỗi họ màu đại diện cho một loại hoạt động học tập:
   - 🔵 **Primary / Learning / Navigation (Electric Study Blue `#60A5FA`)**: Brand CTA, vị trí điều hướng chính, bài thi trắc nghiệm
   - 🔮 **Discovery (Indigo `#818CF8`)**: Lộ trình khám phá, gợi ý AI
   - 🟣 **Memory / Flashcard (Violet `#A78BFA`)**: Ghi nhớ từ vựng, lặp lại ngắt quãng (FSRS)
   - 🔷 **Progress (Cyan `#22D3EE`)**: Tiến độ hoàn thành, trạng thái đang học
   - 📙 **Focus / Review / Pinned (Amber `#FBBF24`)**: Từ khóa quan trọng, ghim môn học, bookmark câu hỏi
   - 🟢 **Success / Achievement / Mastered ONLY (Emerald `#34D399`)**: Trạng thái thành công, điểm thi tuyệt đối, đếm streak 100%
   - 🌹 **Community (Rose `#FB7185`)**: Diễn đàn thảo luận, trao đổi bài học
   - ⚙️ **Classroom (Teal `#2DD4BF`)**: Lớp học của tôi, quản lý giảng dạy
2. **Emerald Green Retreat (Quy Tắc Rút Lùi Của Màu Xanh Lá)**: Trong Dark Theme, Emerald Green (`#34D399`) **TUYỆT ĐỐI KHÔNG** được dùng cho nút Primary, Navigation chính, Icon mặc định, Tiêu đề hay Thẻ thông thường. Emerald chỉ xuất hiện khi học viên **đạt kết quả thành công / thành thạo (Success/Mastered/Streak)** để giữ giá trị thưởng thị giác cao nhất.
3. **Accent Rail Pattern (`▌ Accent Rail`)**: Không tô nguyên card thành màu đậm. Card giữ nền trung tính (`surface-card`), bề mặt nổi bật dùng một thanh chỉ thị màu dọc (`▌ Accent Rail` kích thước 4px) ở cạnh trái để định hình visual identity mà vẫn giữ giao diện tối giản.
4. **Surface Zoning (Phân Vùng Bề Mặt Midnight Navy)**: Trang Dashboard & Explore được phân vùng bề mặt Midnight Navy rõ ràng theo visual weight:
   - `Navigation Surface` $\rightarrow$ `Hero / Identity Surface` $\rightarrow$ `Learning Surface` $\rightarrow$ `Discovery Surface` $\rightarrow$ `Community Surface` $\rightarrow$ `Activity Surface`.
5. **Anti-Rainbow Policy (Tỷ Lệ 70 - 20 - 10 Rule)**:
   - **70–80%**: Nền & bề mặt trung tính Midnight Navy (`surface-page #070B14`, `surface-card #101827`, `border-subtle #1B2A3E`).
   - **15–20%**: Functional Accents (`Accent Rail`, Icon, Indicator, Badge subtle fill).
   - **5–10%**: Study Blue Primary CTA / Interactive States (`#60A5FA`).

---

## 🌗 2. Hệ Thống 3 Theme Modes & 3 Môi Trường Thị Giác Độc Lập

Cả 3 Theme Modes sở hữu cùng cấu trúc Semantic Token, nhưng được re-map Brand & Palette riêng biệt để tạo **3 Môi Trường Thị Giác Hoàn Toàn Khác Nhau**:

| Mode Name | Class Trigger | Triết lý & Nền tổng thể | Primary Brand & Personality |
|---|---|---|---|
| **Light Theme** | `.light` (default) | **Clean Academic** (Nền `#F8FAFC`, Chữ `#0F172A`) | **Oceanic Royal Blue (`#2563EB`)**: Trong trẻo, học thuật, tương phản cao |
| **Dark Theme** | `.dark` | **Midnight Study** (Nền Midnight Navy `#070B14`, Chữ Soft White `#F3F6FA`) | **Electric Study Blue (`#60A5FA`)**: Tập trung ban đêm, Midnight Navy & Indigo |
| **Green Theme** | `.green` | **Vintage Study** (Nền Giấy Be `#ECE8DF`, Chữ Deep Forest `#153020`) | **Deep Forest Green (`#2D5A47`)**: Ấm áp, thư thái, cảm giác đọc sách cổ điển |

---

## 📐 3. Kiến Trúc 8 Functional Color Families & Token Triads

Mỗi Functional Color Family sở hữu đầy đủ bộ 5 Tokens Triad (Dark Theme Spec):

```
accent-{family}           ──> Icon / Primary Text Accent
accent-{family}-subtle    ──> Nền Accent Rail / Seamless Subtle Tint (3-8% opacity)
accent-{family}-bg        ──> Nền Badge / Button Accent Fill (12-18% opacity)
accent-{family}-fg        ──> Chữ / Icon hiển thị trên Badge
accent-{family}-border    ──> Đường viền Accent
```

### Danh Mục 8 Families (Dark Theme Baseline Spec):
1. **`accent-primary / learning`** (Study Blue: `#60A5FA` | subtle `#10223B` | bg `#10223B` | fg `#BFDBFE` | border `#315987`)
2. **`accent-memory`** (Violet: `#A78BFA` | subtle `#1C1832` | bg `#1C1832` | fg `#C4B5FD` | border `#4B4075`)
3. **`accent-progress`** (Cyan: `#22D3EE` | subtle `#0C202B` | bg `#0C202B` | fg `#67E8F9` | border `#1D5263`)
4. **`accent-discovery`** (Indigo: `#818CF8` | subtle `#151A36` | bg `#151A36` | fg `#A5B4FC` | border `#3D477D`)
5. **`accent-focus`** (Amber: `#FBBF24` | subtle `#241C0A` | bg `#241C0A` | fg `#FDE68A` | border `#5C4614`)
6. **`accent-community`** (Rose: `#FB7185` | subtle `#29151D` | bg `#29151D` | fg `#FDA4AF` | border `#632D3A`)
7. **`accent-achievement / success`** (Emerald: `#34D399` | subtle `#0B2119` | bg `#0B2119` | fg `#6EE7B7` | border `#1C5A40`)
8. **`accent-classroom`** (Teal: `#2DD4BF` | subtle `#0D201E` | bg `#0D201E` | fg `#5EEAD4` | border `#1B4D46`)

---

## 🏛️ 4. Midnight Navy Surface System

```
surface-page           ──> #070B14 (Background Midnight Navy)
 ├── surface-base      ──> #0A1020 (Nền khu vực)
 ├── surface-card      ──> #101827 (Thẻ tiêu chuẩn)
 ├── surface-card-muted    ──> #0D1524 (Thẻ phụ)
 ├── surface-card-elevated ──> #172238 (Thẻ nổi bật)
 ├── surface-card-accent   ──> #111E34 (Thẻ có điểm nhấn Study Blue)
 ├── surface-inset     ──> #080F1C (Input fill / Khu vực nhúng)
 └── surface-overlay   ──> #19243A (Modal / Popover / Dropdown)
```

---

## 🖼️ 5. Midnight Navy Border System

- **`border-subtle`**: `#1B2A3E` — Phân tách danh sách siêu nhẹ.
- **`border-default`**: `#25354E` — Viền Card tiêu chuẩn.
- **`border-strong`**: `#344665` — Viền Card nổi bật.
- **`border-emphasis`**: `#45587C` — Viền trọng tâm.
- **`border-accent`**: `#60A5FA` — Viền màu thương hiệu Electric Study Blue.

---

## 📝 6. Sidebar & Navigation Color Hierarchy (Dark Theme)

- **Default State**: Text `#A8B4C5`, Icon `#718096`.
- **Hover State**: Background `#111D30`, Text `#D7E2F0`, Icon `#60A5FA`.
- **Active State**: Background `#10223B`, Border `#315987`, Text `#BFDBFE`, Icon `#60A5FA` (Electric Study Blue).

---

*Hợp đồng Kiến trúc Hợp đồng Thiết kế được cập nhật tự động bởi Antigravity System Architecture.*
