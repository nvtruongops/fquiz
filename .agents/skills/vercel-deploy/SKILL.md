---
name: vercel-deploy
description: Quy trình chuẩn và an toàn để deploy Monorepo FQuiz lên Vercel Production. Phân định tuyệt đối giữa Web Học viên (fquiz) và Cổng Admin (fquiz-admin), ngăn chặn triệt để deploy nhầm thư mục hoặc ghi đè sai project.
version: 2.0
priority: high
---

# Vercel Monorepo Deployment Skill (FQuiz)

## 📌 Tổng Quan Hệ Thống Monorepo

FQuiz là kiến trúc Next.js 16 Monorepo gồm **2 ứng dụng độc lập** được liên kết với 2 Vercel Projects riêng biệt trên cùng 1 GitHub Repository:

| Ứng dụng | Thư mục làm việc (`Cwd`) | Vercel Project | Project ID | Production URL |
|---|---|---|---|---|
| **Web Học viên & Giáo viên** | `d:\Code\fquiz` (Root) | `fquiz` | `prj_sg6yZhxUXYxH4wIDRnNZjQEpsOKO` | `https://fquiz-web.vercel.app` |
| **Cổng Quản Trị (Admin)** | `d:\Code\fquiz\apps\admin` | `fquiz-admin` | `prj_W1ylsbBg92Vjny82E58RNxZXTFTE` | `https://fquiz-admin.vercel.app` |

---

## 🛡️ Nguyên Tắc An Toàn Tuyệt Đối (Anti-Mistake Rules)

1. **KHÔNG BAO GIỜ deploy từ thư mục sai**:
   - Muốn deploy **Admin**: Bắt buộc `Cwd` phải là `d:\Code\fquiz\apps\admin`.
   - Muốn deploy **Web**: Bắt buộc `Cwd` phải là `d:\Code\fquiz` (Root).
2. **Luôn kiểm tra `.vercel/project.json`** trước khi kích hoạt lệnh deploy:
   - Trong `apps/admin/.vercel/project.json` phải có `"projectId": "prj_W1ylsbBg92Vjny82E58RNxZXTFTE"`.
   - Trong `d:\Code\fquiz\.vercel\project.json` phải có `"projectId": "prj_sg6yZhxUXYxH4wIDRnNZjQEpsOKO"`.
3. **Bắt buộc hoàn thành 4 bước Pre-Deployment Verification**:
   - Không bao giờ deploy khi code còn lỗi TypeScript, vi phạm linter hoặc chưa qua kiểm thử strict.

---

## 📋 1. Chuỗi Lệnh Kiểm Tra Trước Khi Deploy (Pre-Deployment)

Thực thi tuần tự 4 lệnh bắt buộc tại thư mục gốc (`d:\Code\fquiz`):

```bash
# 1. Linter kiểm tra mã nguồn toàn bộ Monorepo
npm run lint

# 2. TypeScript Type-Check 7 workspaces
npm run check-types

# 3. Unit & Integration Tests (66 suites, 430 tests)
npm test

# 4. AI Rule Engine Strict Mode (18 rules)
node .agents/scripts/verify.js --strict
```

---

### 🅰️ Triển Khai Web Học Viên & Giáo Viên (`fquiz-web`)

```bash
# Thực thi từ Monorepo Root (d:\Code\fquiz)
npx vercel --prod --yes --scope nvtruongops
```

> **Target Output**: `https://fquiz-web.vercel.app` (Deployment: `fquiz-web`, Root Directory: `apps/web`)

---

### 🅱️ Triển Khai Cổng Quản Trị Admin (`fquiz-admin`)

```bash
# Thực thi từ Monorepo Root (d:\Code\fquiz)
npx vercel --prod --yes --scope nvtruongops --project fquiz-admin
```

> **Target Output**: `https://fquiz-admin.vercel.app` (Deployment: `fquiz-admin`, Root Directory: `apps/admin`)

---

## 🔍 3. Checklist Xác Minh Sau Deploy (Post-Deployment Verification)

Thực hiện kiểm tra HTTP Status và giao diện trên các URL Production chính thức:

### 1. Web Portal (`https://fquiz-web.vercel.app`)
- [ ] `GET https://fquiz-web.vercel.app` → HTTP 200 OK (Trang chủ / Home Hero tải đầy đủ).
- [ ] `GET https://fquiz-web.vercel.app/explore` → HTTP 200 OK (Khám phá danh mục đề thi public).
- [ ] `GET https://fquiz-web.vercel.app/login` → HTTP 200 OK (Form đăng nhập, nút Google OAuth).
- [ ] `GET https://fquiz-web.vercel.app/community` → HTTP 200 OK (Diễn đàn chia sẻ kiến thức).

### 2. Admin Portal (`https://fquiz-admin.vercel.app`)
- [ ] `GET https://fquiz-admin.vercel.app/login` → HTTP 200 OK (Cổng đăng nhập quản trị độc lập).
- [ ] Đăng nhập tài khoản Quản trị viên trên `fquiz-web` → Xác nhận chuyển tiếp mượt sang `fquiz-admin`.
- [ ] Kiểm tra Zero-Trust Proxy (`apps/admin/proxy.ts`): Truy cập `/quizzes` khi chưa đăng nhập → Tự động redirect về `/login`.

---

## 🛠️ Xử Lý Sự Cố Khi Deploy (Troubleshooting)

- **Xem Logs Runtime**: `npx vercel logs <deployment-url>`
- **Kiểm tra thông tin build**: `npx vercel inspect <deployment-url>`
- **Đồng bộ lại liên kết project**:
  - Admin: `cd apps/admin && npx vercel link --project fquiz-admin --yes --scope nvtruongops`
  - Web: `cd d:\Code\fquiz && npx vercel link --project fquiz --yes --scope nvtruongops`
