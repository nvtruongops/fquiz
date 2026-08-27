---
name: vercel-deploy
description: Quy trình chuẩn và an toàn để deploy Monorepo FQuiz lên Vercel Production. Phân định tuyệt đối giữa Web Học viên (fquiz) và Cổng Admin (fquiz-admin), ngăn chặn triệt để deploy nhầm thư mục hoặc ghi đè sai project.
---

# Vercel Monorepo Deployment Skill (FQuiz)

## 📌 Tổng Quan Hệ Thống Monorepo

FQuiz là kiến trúc Next.js 16 Monorepo gồm **2 ứng dụng độc lập** được liên kết với 2 Vercel Projects riêng biệt:

| Ứng dụng | Thư mục làm việc (`Cwd`) | Vercel Project | Project ID | Production URL |
|---|---|---|---|---|
| **Web Học viên & Giáo viên** | `.` (Thư mục gốc repo) | `fquiz` | `prj_sg6yZhxUXYxH4wIDRnNZjQEpsOKO` | `https://fquiz-web.vercel.app` |
| **Cổng Quản Trị (Admin)** | `apps/admin` | `fquiz-admin` | `prj_W1ylsbBg92Vjny82E58RNxZXTFTE` | `https://fquiz-admin.vercel.app` |

---

## 🛡️ Nguyên Tắc An Toàn Tuyệt Đối (Anti-Mistake Rules)

1. **KHÔNG BAO GIỜ deploy từ thư mục sai**:
   - Muốn deploy **Admin**: Bắt buộc `Cwd` phải là `d:\Code\fquiz\apps\admin`.
   - Muốn deploy **Web**: Bắt buộc `Cwd` phải là `d:\Code\fquiz` (Root).
2. **Luôn kiểm tra `.vercel/project.json`** trước khi kích hoạt lệnh deploy:
   - Trong `apps/admin/.vercel/project.json` phải có `"projectId": "prj_W1ylsbBg92Vjny82E58RNxZXTFTE"`.
   - Trong `d:\Code\fquiz\.vercel\project.json` phải có `"projectId": "prj_sg6yZhxUXYxH4wIDRnNZjQEpsOKO"`.
3. **Bắt buộc kiểm tra Build & Lints trước khi Deploy**:
   - Không deploy khi code còn lỗi TypeScript hoặc chưa qua kiểm thử strict.

---

## 🚀 Quy Trình Triển Khai Chi Tiết

### 1. Triển Khai Cổng Quản Trị Admin (`fquiz-admin`)

```bash
# Bước 1: Di chuyển hoặc đặt Cwd tại thư mục apps/admin
# Cwd: d:\Code\fquiz\apps\admin

# Bước 2: Kiểm tra biên dịch nội bộ
npm run build

# Bước 3: Deploy lên Vercel Production
npx vercel --prod --yes
```

> **Target Output**: `https://fquiz-admin.vercel.app` (23 routes compiled)

### 2. Triển Khai Web Học Viên & Giáo Viên (`fquiz`)

```bash
# Bước 1: Đặt Cwd tại thư mục gốc
# Cwd: d:\Code\fquiz

# Bước 2: Kiểm tra rule engine & build
node .agents/scripts/verify.js --strict
npm run build

# Bước 3: Deploy lên Vercel Production
npx vercel --prod --yes
```

> **Target Output**: `https://fquiz-web.vercel.app` (53 routes compiled)

---

## 🔍 Checklist Xác Minh Sau Deploy (Post-Deployment Verification)

1. **Admin Portal (`https://fquiz-admin.vercel.app`)**:
   - [ ] Truy cập `/quizzes`: Danh sách đề thi chỉ hiển thị đề thi hệ thống/admin.
   - [ ] Truy cập `/quizzes/new`: Form tạo đề thi không chứa ví dụ cụ thể, ô nhập số câu không có nút tăng giảm.
   - [ ] Truy cập `/question-bank`: Các tab Thống kê, Migration, Conflicts tải mượt qua `next/dynamic`.
2. **Web Portal (`https://fquiz-web.vercel.app`)**:
   - [ ] Truy cập `/explore`: Khám phá các bộ đề public.
   - [ ] Truy cập `/login` / `/dashboard`: Đăng nhập học viên và làm bài thi.
