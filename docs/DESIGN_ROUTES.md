# 🗺️ FQuiz — Sơ đồ Điều hướng & Định tuyến (Page Router Architecture Index)

Hệ thống FQuiz được tổ chức theo kiến trúc **Pure Symmetrical Turborepo Monorepo** với 2 ứng dụng độc lập, phân tách hoàn toàn domain và mã nguồn:

---

## 1. Ứng dụng Web Học viên & Giáo viên (`apps/web` — Port 3000 / `https://fquiz-web.vercel.app`)

| Route Group | Đường dẫn | Đối tượng | Mô tả |
|---|---|---|---|
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/restore-account` | Khách | Quy trình đăng nhập, đăng ký và khôi phục tài khoản |
| `(student)` | `/dashboard`, `/my-quizzes`, `/history`, `/history/[id]/[sessionId]`, `/community`, `/profile`, `/settings`, `/student/classrooms` | Học viên | Không gian học tập cá nhân, lớp học và cộng đồng |
| `(teacher)` | `/teacher/classrooms`, `/teacher/classrooms/[id]`, `/teacher/quizzes`, `/teacher/quizzes/new` | Giáo viên | Quản lý lớp học, phân công bài tập và theo dõi điểm |
| `quiz/` | `/quiz/[id]`, `/quiz/[id]/mode`, `/quiz/[id]/session/[sessionId]`, `/quiz/[id]/session/[sessionId]/flashcard`, `/quiz/[id]/session/[sessionId]/mobile`, `/quiz/[id]/session/[sessionId]/flashcard/mobile`, `/quiz/[id]/result/[sessionId]` | Chung | Phòng thi trắc nghiệm đa thiết bị (Desktop, Mobile, Flashcard) |
| Public | `/`, `/explore`, `/courses/[code]`, `/privacy`, `/terms`, `/maintenance` | Công khai | Trang chủ, duyệt đề thi công khai, điều khoản, trang bảo trì |

> 🛡️ **Middleware Web (`apps/web/proxy.ts`)**: Mọi request tới `/admin` hoặc `/admin/*` trên Web tự động được redirect sang Cổng Quản trị độc lập (`NEXT_PUBLIC_ADMIN_URL`). Mọi request tới `/api/admin/*` trả về `404 Not Found`.

---

## 2. Cổng Quản trị Hệ thống (`apps/admin` — Port 3001 / `https://fquiz-admin.vercel.app`)

| Phân hệ | Đường dẫn | Quyền hạn | Mô tả |
|---|---|---|---|
| **Xác thực** | `/login` | Admin / Dev | Đăng nhập bảng điều khiển quản trị |
| **Tổng quan** | `/` (Dashboard) | Admin / Dev | Chỉ số tổng quan hệ thống, phân tích bài thi |
| **Đề thi** | `/quizzes`, `/quizzes/new`, `/quizzes/[id]/edit` | Admin / Dev | Quản lý, tạo mới và chỉnh sửa đề thi chuẩn với Question Bank Sync |
| **Người dùng** | `/users` | Admin / Dev | Quản lý tài khoản, phân quyền, khóa tài khoản (Ban), reset mật khẩu |
| **Danh mục** | `/categories` | Admin / Dev | Quản lý danh mục môn học hệ thống |
| **Ngân hàng câu hỏi** | `/question-bank` | Admin / Dev | Phân tích mâu thuẫn câu hỏi, migration và đồng bộ ngân hàng |
| **Cài đặt** | `/settings` | Admin / Dev | Cấu hình tham số hệ thống, LLM API keys, maintenance mode |
| **Hộp thư góp ý** | `/feedback` | Admin / Dev | Tiếp nhận, phản hồi và giải quyết ý kiến đóng góp |

> 🛡️ **Middleware Admin (`apps/admin/proxy.ts`)**: Áp dụng Zero-Trust Proxy, chặn toàn bộ non-admin requests và chuyển hướng về `/login`.
