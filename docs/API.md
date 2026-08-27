# 🔌 FQuiz — Đặc tả Danh mục API (API Specification Index)

Tài liệu đặc tả toàn bộ danh mục **80+ API Route Handlers** của hệ thống FQuiz, bao gồm định dạng dữ liệu, cơ chế xác thực, phân quyền và mã lỗi chuẩn.

---

## 1. Quy chuẩn Chung (General Conventions)

### 1.1. Base URL & Versioning
- **Internal App API**: `/api/*` (được tối ưu hóa cho Frontend Next.js).
- **Public API v1**: `/api/v1/*` (dành cho tích hợp ngoài và các ứng dụng di động).

### 1.2. Authentication & Headers
- **Xác thực**: Qua HTTP-Only Cookie `auth-token` hoặc HTTP Header `Authorization: Bearer <token>`.
- **CSRF Protection**: Các mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) từ trình duyệt bắt buộc phải đính kèm Header:
  ```http
  x-csrf-token: <giá_trị_cookie_csrf-token>
  ```
- **Content-Type**: `application/json` (trừ upload file `multipart/form-data`).

### 1.3. Định dạng Phản hồi Chuẩn (Standard Response Envelope)

```typescript
// Phản hồi thành công
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

// Phản hồi lỗi
interface ErrorResponse {
  success: false;
  error: {
    code: string;       // Mã lỗi định danh (e.g. 'UNAUTHORIZED', 'NOT_FOUND', 'VALIDATION_ERROR')
    message: string;    // Thông điệp thân thiện với người dùng
    details?: unknown;  // Chi tiết lỗi validate từ Zod (nếu có)
  };
}
```

---

## 2. Danh mục API Theo Phân hệ (API Endpoints Catalog)

### 2.1. Xác thực & Tài khoản (`/api/auth/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản học viên mới, tạo mã xác thực OTP |
| `POST` | `/api/auth/login` | Public | Đăng nhập bằng email/username + mật khẩu, cấp phát JWT |
| `POST` | `/api/auth/logout` | Authenticated | Đăng xuất, thu hồi cookie `auth-token` |
| `GET` | `/api/auth/me` | Authenticated | Lấy thông tin tài khoản và quyền của người dùng hiện tại |
| `POST` | `/api/auth/forgot-password` | Public | Yêu cầu gửi mã OTP đặt lại mật khẩu qua email |
| `POST` | `/api/auth/reset-password` | Public | Đặt lại mật khẩu mới bằng mã OTP hợp lệ |
| `POST` | `/api/auth/restore-account` | Public | Khôi phục tài khoản đã yêu cầu xóa trong thời gian ân hạn (30 ngày) |
| `POST` | `/api/auth/google` | Public | Đăng nhập / Đăng ký qua tài khoản Google OAuth |

---

### 2.2. Phiên làm bài trắc nghiệm (`/api/sessions/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `POST` | `/api/sessions` | Public / Student | Khởi tạo phiên làm bài trắc nghiệm mới, snapshot câu hỏi |
| `GET` | `/api/sessions/[id]` | Public / Student | Lấy thông tin metadata và trạng thái phiên thi |
| `GET` | `/api/sessions/[id]/questions` | Public / Student | Tải danh sách toàn bộ câu hỏi đã snapshot trong cache phiên thi |
| `POST` | `/api/sessions/[id]/answer` | Public / Student | Nộp câu trả lời cho một câu hỏi (Server-side chấm điểm) |
| `POST` | `/api/sessions/[id]/submit` | Public / Student | Nộp toàn bộ bài thi, kết thúc phiên làm bài và tính điểm |
| `GET` | `/api/sessions/[id]/result` | Public / Student | Xem bảng tổng kết kết quả thi chi tiết và phân tích câu đúng/sai |
| `POST` | `/api/sessions/[id]/activity` | Public / Student | Ghi nhận sự kiện học viên pause, resume hoặc focus/blur tab |
| `POST` | `/api/sessions/mix` | Student | Khởi tạo phiên thi trộn từ nhiều bộ đề (Mix Quiz) |

---

### 2.3. Dành cho Học viên (`/api/student/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `GET` | `/api/student/dashboard` | Student | Lấy dữ liệu tổng quan: tiến độ, số bài thi đã làm, chuỗi streak |
| `GET` | `/api/student/quizzes` | Student | Danh sách các đề trắc nghiệm do học viên tự tạo |
| `POST` | `/api/student/save-quiz` | Student | Lưu đề thi công khai của người khác vào bộ sưu tập cá nhân |
| `GET` | `/api/student/categories` | Student | Danh sách danh mục được cá nhân hóa của học viên |
| `GET/POST` | `/api/student/pinned-categories` | Student | Quản lý các danh mục yêu thích được ghim lên đầu trang |
| `GET/POST` | `/api/student/pinned-questions` | Student | Ghim các câu hỏi khó để xem lại hoặc ôn tập riêng |
| `GET/POST` | `/api/student/pinned-quizzes` | Student | Ghim các đề thi quan trọng |
| `GET/PUT` | `/api/student/profile` | Student | Xem và cập nhật thông tin hồ sơ cá nhân |
| `GET/PUT` | `/api/student/settings` | Student | Cập nhật cấu hình giao diện, thông báo và chế độ thi mặc định |
| `GET` | `/api/student/classrooms` | Student | Danh sách các lớp học mà học viên đã tham gia |
| `POST` | `/api/student/classrooms/join` | Student | Tham gia vào một lớp học mới bằng mã mời (Classroom Code) |
| `DELETE` | `/api/student/account` | Student | Yêu cầu xóa vĩnh viễn tài khoản (đưa vào hàng đợi ân hạn 30 ngày) |

---

### 2.4. Dành cho Giáo viên (`/api/teacher/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `GET/POST` | `/api/teacher/classrooms` | Teacher / Admin | Danh sách và tạo mới lớp học do giáo viên quản lý |
| `GET/PUT/DELETE`| `/api/teacher/classrooms/[id]`| Teacher / Admin | Xem chi tiết, cập nhật thông tin hoặc lưu trữ (archive) lớp học |
| `GET` | `/api/teacher/classrooms/[id]/members` | Teacher / Admin | Danh sách học viên trong lớp, trạng thái và thống kê kết quả |
| `DELETE` | `/api/teacher/classrooms/[id]/members/[studentId]` | Teacher / Admin | Xóa học viên khỏi lớp học |
| `GET/POST` | `/api/teacher/assignments` | Teacher / Admin | Danh sách và giao bài tập trắc nghiệm mới cho lớp học |
| `GET/PUT/DELETE`| `/api/teacher/assignments/[id]`| Teacher / Admin | Quản lý hạn nộp, số lần thi tối đa và điểm qua của bài tập |
| `GET` | `/api/teacher/assignments/[id]/progress`| Teacher / Admin | Bảng theo dõi tiến độ nộp bài và phổ điểm của từng học sinh |

---

### 2.5. Cổng Quản trị Hệ thống (`apps/admin` — `/api/*`)

*Toàn bộ API Quản trị được triển khai độc lập tại workspace `apps/admin` (Cổng Quản trị `https://fquiz-admin.vercel.app`), cách ly hoàn toàn khỏi Web Học viên.*

| Method | Endpoint (`apps/admin`) | Quyền (Role) | Mô tả |
|---|---|---|---|
| `GET/POST` | `/api/users` | Admin / Dev | Quản lý danh sách người dùng, phân quyền, khóa tài khoản (Ban) |
| `GET/PUT/DELETE`| `/api/users/[id]` | Admin / Dev | Xem chi tiết, chỉnh sửa thông tin hoặc xóa tài khoản |
| `POST` | `/api/users/[id]/reset-password` | Admin / Dev | Reset mật khẩu người dùng |
| `GET/POST` | `/api/quizzes` | Admin / Dev | Quản lý và tạo mới tất cả bài thi trong toàn hệ thống |
| `GET/PUT/DELETE`| `/api/quizzes/[id]` | Admin / Dev | Lấy thông tin, cập nhật hoặc xóa đề thi |
| `GET` | `/api/quizzes/check-code` | Admin / Dev | Kiểm tra trùng lặp mã đề thi trước khi xuất bản |
| `GET/POST` | `/api/categories` | Admin / Dev | Quản lý danh mục chuẩn toàn hệ thống |
| `GET/PUT` | `/api/settings` | Admin / Dev | Cấu hình tham số toàn cục (Bảo trì, Rate Limits, LLM Provider) |
| `GET/PUT` | `/api/feedback` | Admin / Dev | Tiếp nhận và quản lý danh sách phản hồi từ người dùng |
| `POST` | `/api/feedback/[id]/reply` | Admin / Dev | Gửi email phản hồi trực tiếp cho người dùng |
| `GET/POST` | `/api/question-bank/*` | Admin / Dev | Migration, kiểm tra mâu thuẫn câu hỏi và đồng bộ ngân hàng |

---

### 2.6. Ngân hàng Câu hỏi & Import (`/api/question-bank/*`, `/api/import/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `GET` | `/api/question-bank/list` | Authenticated | Duyệt và tìm kiếm ngân hàng câu hỏi dùng chung |
| `POST` | `/api/question-bank/check` | Authenticated | Kiểm tra câu hỏi trùng lặp hoặc xung đột đáp án dựa trên SHA-256 hash |
| `POST` | `/api/question-bank/sync` | Authenticated | Đồng bộ danh sách câu hỏi từ đề thi vào Ngân hàng câu hỏi |
| `POST` | `/api/question-bank/sync-update` | Authenticated | Cập nhật câu hỏi và tự động đồng bộ sang tất cả đề thi đang tham chiếu |
| `GET` | `/api/question-bank/analytics` | Admin | Thống kê số lượng câu hỏi, tỷ lệ trùng lặp và xung đột đáp án |
| `POST` | `/api/import/quiz` | Authenticated | Phân tích và preview file tải lên (JSON/TXT) trước khi import thành đề thi |

---

### 2.7. Trí tuệ Nhân tạo (`/api/v1/ai/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/ai/generate` | Authenticated | Sinh nội dung học tập thông minh (11 prompt types) qua Gemini/OpenAI |
| `POST` | `/api/v1/ai/quiz-assistant` | Authenticated | Trợ lý học tập AI trong phòng thi: giải thích, phân tích câu hỏi |
| `GET` | `/api/v1/ai/history` | Authenticated | Lịch sử các nội dung đã sinh kèm token usage và telemetry |

---

### 2.8. Cộng đồng & Khám phá (`/api/community/*`, `/api/explore/*`, `/api/courses/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `GET/POST` | `/api/community/posts` | Student | Danh sách bài viết cộng đồng và đăng bài thảo luận mới |
| `GET/PUT/DELETE`| `/api/community/posts/[id]` | Student | Chi tiết bài viết, sửa hoặc xóa bài của chính mình |
| `POST` | `/api/community/posts/[id]/comments`| Student | Gửi bình luận vào bài viết |
| `POST` | `/api/community/posts/[id]/like` | Student | Thích hoặc bỏ thích bài viết |
| `GET` | `/api/explore/categories` | Public | Danh sách danh mục công khai cho trang khám phá |
| `GET` | `/api/courses/[code]` | Public | Lấy lộ trình và danh sách đề thi theo mã khóa học |

---

### 2.9. Tác vụ Định kỳ (`/api/jobs/*`)

| Method | Endpoint | Quyền (Role) | Mô tả |
|---|---|---|---|
| `POST` | `/api/jobs/cleanup-deleted-accounts` | Cron / Secret | Dọn dẹp vĩnh viễn các tài khoản đã quá hạn ân hạn xóa |

---

## 3. Bảng Mã Lỗi Chuẩn (Standard Error Codes)

| Mã lỗi | HTTP Status | Diễn giải |
|---|---|---|
| `UNAUTHORIZED` | 401 | Chưa đăng nhập hoặc token JWT không hợp lệ / đã hết hạn |
| `FORBIDDEN` | 403 | Không đủ quyền hạn để truy cập tài nguyên (Role không khớp) |
| `NOT_FOUND` | 404 | Tài nguyên không tồn tại trong hệ thống |
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không vượt qua kiểm tra Zod Schema |
| `CONFLICT` | 409 | Trùng lặp dữ liệu (e.g. Email đã tồn tại, Session đã completed) |
| `RATE_LIMIT_EXCEEDED`| 429 | Gửi quá nhiều yêu cầu trong khoảng thời gian quy định |
| `CSRF_ERROR` | 403 | Thiếu hoặc sai lệch giá trị token `x-csrf-token` |
| `MAINTENANCE_MODE` | 503 | Hệ thống đang trong chế độ bảo trì |
| `INTERNAL_SERVER_ERROR`| 500 | Lỗi xử lý nội bộ phía máy chủ |
