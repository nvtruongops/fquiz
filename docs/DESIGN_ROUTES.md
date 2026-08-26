# 🗺️ FQuiz — Sơ đồ Điều hướng & Định tuyến (Page Router Architecture Index)

> 📌 **Tài liệu gốc đầy đủ**: Xem chi tiết tại [`DESIGN_ROUTES.md`](../DESIGN_ROUTES.md) ở thư mục gốc của dự án.

---

## Tóm tắt Hệ thống Định tuyến (Router Overview)

Tài liệu [`DESIGN_ROUTES.md`](../DESIGN_ROUTES.md) cung cấp bản đồ và trạng thái tuân thủ chuẩn của toàn bộ **49 Page Routes** trong hệ thống FQuiz:

### 1. Phân nhóm Route Groups

| Route Group | Đường dẫn | Đối tượng | Mô tả |
|---|---|---|---|
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/restore-account` | Khách | Quy trình đăng nhập, đăng ký và khôi phục tài khoản |
| `(student)` | `/dashboard`, `/my-quizzes`, `/history`, `/community`, `/profile`, `/settings`, `/student/classrooms` | Học viên | Không gian học tập cá nhân, lớp học và cộng đồng |
| `(teacher)` | `/teacher`, `/teacher/classrooms`, `/teacher/quizzes` | Giáo viên | Quản lý lớp học, phân công bài tập và theo dõi điểm |
| `(admin)` | `/admin/users`, `/admin/quizzes`, `/admin/categories`, `/admin/question-bank`, `/admin/settings`, `/admin/feedback` | Quản trị | Quản lý người dùng, ngân hàng câu hỏi, cài đặt hệ thống |
| `quiz/` | `/quiz/[id]`, `/quiz/[id]/mode`, `/quiz/[id]/session/[sessionId]`, `/quiz/[id]/result` | Chung | Phòng thi trắc nghiệm đa thiết bị (Desktop, Mobile, Flashcard) |
| Public | `/`, `/explore`, `/courses/[code]`, `/privacy`, `/terms`, `/maintenance` | Công khai | Trang chủ, duyệt đề thi công khai, điều khoản, trang bảo trì |

---

### 2. Cơ chế Điều phối Middleware (`proxy.ts`)
- **Tự động chuyển hướng thiết bị di động**: Nhận diện User-Agent để tối ưu giao diện màn hình cảm ứng khi thi.
- **Bảo vệ chế độ bảo trì (Maintenance Mode)**: Tự động chuyển hướng các trang người dùng về `/maintenance` khi quản trị viên kích hoạt.
- **Xác thực và phân quyền RBAC**: Ngăn chặn học sinh truy cập trang quản trị và giáo viên, đồng thời bảo vệ các trang yêu cầu đăng nhập.

---

👉 Để tra cứu chi tiết danh sách tất cả các route, bảng kiểm tra Theme Tokens và trạng thái bảo vệ, vui lòng tham khảo [`DESIGN_ROUTES.md`](../DESIGN_ROUTES.md).
