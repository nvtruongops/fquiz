# 🗺️ FQuiz — System Page Router Architecture & Compliance Index (`DESIGN_ROUTES.md`)

Tài liệu này đóng vai trò là **Bản vẽ Kiến trúc Đường dẫn & Phân quyền Trang (Page Router Index & Router Design Specification)** cho toàn bộ hệ thống FQuiz (Next.js 16 App Router), tích hợp **6-Layer Visual Role Theme Compliance Status** cho toàn bộ 49 Page Routes.

---

## 🏛️ 1. Tổng Quan Kiến Trúc Page Router

Hệ thống Next.js 16 App Router của FQuiz được phân chia thành **6 Route Groups** với các cấp độ bảo vệ (Route Protection & Middleware Proxy Governance):

```
app/
├── (auth)/        -> Authentication Surface (Public & Guest only)
├── (student)/     -> Student Experience Surface (JWT Authenticated)
├── (teacher)/     -> Teacher Portal Surface (Role: teacher | admin)
├── (admin)/       -> Admin Portal Surface (Role: admin)
├── quiz/          -> Core Quiz Engine Surface (Public / Session JWT)
└── (public)/      -> Public Surface (Landing, Explore, Courses, Policy)
```

---

## 📋 2. Danh Mục Chi Tiết 49 Page Routes & Trạng Thái Theme Compliance

Bảng dưới đây thống kê đầy đủ toàn bộ **49 trang (`page.tsx`)** trong hệ thống FQuiz kèm theo mô hình bảo vệ middleware và trạng thái **6-Layer Visual Role Theme Compliance**:

### 2.1. Public & Marketing Surface Routes (6 Routes)
| STT | Route URL | File Path | Guard Level | Mô Tả Chức Năng | Theme Status |
|---|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` | Public | Trang chủ Landing Page Hub | ✅ **6-LAYER_COMPLIANT** |
| 2 | `/explore` | `app/explore/page.tsx` | Public | Khám phá kho đề thi công khai | ✅ **6-LAYER_COMPLIANT** |
| 3 | `/courses/[code]` | `app/courses/[code]/page.tsx` | Public | Hub Môn học (HCM202, Mix & Pinned Tabs) | ✅ **6-LAYER_COMPLIANT** |
| 4 | `/terms` | `app/terms/page.tsx` | Public | Trang Điều khoản dịch vụ | ✅ **6-LAYER_COMPLIANT** |
| 5 | `/privacy` | `app/privacy/page.tsx` | Public | Trang Chính sách bảo mật | ✅ **6-LAYER_COMPLIANT** |
| 6 | `/maintenance` | `app/maintenance/page.tsx` | Public | Màn hình thông báo Bảo trì hệ thống | ✅ **6-LAYER_COMPLIANT** |

### 2.2. Authentication Routes (`(auth)`) (5 Routes)
| STT | Route URL | File Path | Guard Level | Mô Tả Chức Năng | Theme Status |
|---|---|---|---|---|---|
| 7 | `/login` | `app/(auth)/login/page.tsx` | Guest Only | Màn hình đăng nhập tài khoản | ✅ **6-LAYER_COMPLIANT** |
| 8 | `/register` | `app/(auth)/register/page.tsx` | Guest Only | Màn hình đăng ký tài khoản mới | ✅ **6-LAYER_COMPLIANT** |
| 9 | `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Guest Only | Yêu cầu khôi phục lại mật khẩu | ✅ **6-LAYER_COMPLIANT** |
| 10 | `/reset-password` | `app/(auth)/reset-password/page.tsx` | Guest Only | Nhập mật khẩu mới từ link email | ✅ **6-LAYER_COMPLIANT** |
| 11 | `/restore-account` | `app/(auth)/restore-account/page.tsx` | Guest Only | Khôi phục tài khoản bị khóa hoặc xóa | ✅ **6-LAYER_COMPLIANT** |

### 2.3. Student & Learning Experience Routes (`(student)`) (14 Routes)
| STT | Route URL | File Path | Guard Level | Mô Tả Chức Năng | Theme Status |
|---|---|---|---|---|---|
| 12 | `/dashboard` | `app/(student)/dashboard/page.tsx` | Student JWT | Bảng điều khiển học tập cá nhân | ✅ **6-LAYER_COMPLIANT** |
| 13 | `/my-quizzes` | `app/(student)/my-quizzes/page.tsx` | Student JWT | Khám phá & Quản lý Kho Đề Của Tôi | ✅ **6-LAYER_COMPLIANT** |
| 14 | `/create` | `app/(student)/create/page.tsx` | Student JWT | Trình tạo & Soạn thảo bài thi trắc nghiệm | ✅ **6-LAYER_COMPLIANT** |
| 15 | `/history` | `app/(student)/history/page.tsx` | Student JWT | Lịch sử ôn luyện & Danh sách lượt thi | ✅ **6-LAYER_COMPLIANT** |
| 16 | `/history/[id]/[sessionId]` | `app/(student)/history/[id]/[sessionId]/page.tsx` | Student JWT | Chi tiết lượt thi lịch sử quá khứ | ✅ **6-LAYER_COMPLIANT** |
| 17 | `/profile` | `app/(student)/profile/page.tsx` | Student JWT | Trang hồ sơ cá nhân & Thành tích | ✅ **6-LAYER_COMPLIANT** |
| 18 | `/settings` | `app/(student)/settings/page.tsx` | Student JWT | Cài đặt thông tin & Tùy chỉnh Theme | ✅ **6-LAYER_COMPLIANT** |
| 19 | `/flashcards` | `app/(student)/flashcards/page.tsx` | Student JWT | Thư viện thẻ ghi nhớ Flashcards | ✅ **6-LAYER_COMPLIANT** |
| 20 | `/roadmap` | `app/(student)/roadmap/page.tsx` | Student JWT | Lộ trình học tập & Mục tiêu môn học | ✅ **6-LAYER_COMPLIANT** |
| 21 | `/community` | `app/(student)/community/page.tsx` | Student JWT | Cộng đồng thảo luận & Hỏi đáp bài thi | ✅ **6-LAYER_COMPLIANT** |
| 22 | `/analytics` | `app/(student)/analytics/page.tsx` | Student JWT | Phân tích chi tiết điểm số & Điểm yếu | ✅ **6-LAYER_COMPLIANT** |
| 23 | `/student/classrooms` | `app/(student)/student/classrooms/page.tsx` | Student JWT | Lớp học của tôi (Góc học sinh) | ✅ **6-LAYER_COMPLIANT** |
| 24 | `/ai` | `app/(student)/ai/page.tsx` | Student JWT | Giao diện Trợ lý AI Học tập FQuiz | ✅ **6-LAYER_COMPLIANT** |
| 25 | `/ai/history` | `app/(student)/ai/history/page.tsx` | Student JWT | Lịch sử hội thoại & Đoạn chat AI | ✅ **6-LAYER_COMPLIANT** |

### 2.4. Core Quiz Engine Routes (`quiz/`) (7 Routes)
| STT | Route URL | File Path | Guard Level | Mô Tả Chức Năng | Theme Status |
|---|---|---|---|---|---|
| 26 | `/quiz/[id]` | `app/quiz/[id]/page.tsx` | Dynamic | Trang Chi tiết bộ đề & Lựa chọn bắt đầu | ✅ **6-LAYER_COMPLIANT** |
| 27 | `/quiz/[id]/mode` | `app/quiz/[id]/mode/page.tsx` | Dynamic | Chọn Chế độ thi (Luyện tập, Flashcard, Test) | ✅ **6-LAYER_COMPLIANT** |
| 28 | `/quiz/[id]/session/[sessionId]` | `app/quiz/[id]/session/[sessionId]/page.tsx` | Dynamic | Giao diện Động cơ thi Desktop | ✅ **6-LAYER_COMPLIANT** |
| 29 | `/quiz/[id]/session/[sessionId]/mobile` | `app/quiz/[id]/session/[sessionId]/mobile/page.tsx` | Dynamic | Giao diện Động cơ thi Mobile chuyên biệt | ✅ **6-LAYER_COMPLIANT** |
| 30 | `/quiz/[id]/session/[sessionId]/flashcard` | `app/quiz/[id]/session/[sessionId]/flashcard/page.tsx` | Dynamic | Giao diện Học Lật thẻ Flashcard Desktop | ✅ **6-LAYER_COMPLIANT** |
| 31 | `/quiz/[id]/session/[sessionId]/flashcard/mobile` | `app/quiz/[id]/session/[sessionId]/flashcard/mobile/page.tsx` | Dynamic | Giao diện Học Lật thẻ Flashcard Mobile | ✅ **6-LAYER_COMPLIANT** |
| 32 | `/quiz/[id]/result/[sessionId]` | `app/quiz/[id]/result/[sessionId]/page.tsx` | Dynamic | Trang Kết quả bài thi & Giải thích chi tiết | ✅ **6-LAYER_COMPLIANT** |

### 2.5. Teacher Management Routes (`(teacher)`) (4 Routes)
| STT | Route URL | File Path | Guard Level | Mô Tả Chức Năng | Theme Status |
|---|---|---|---|---|---|
| 33 | `/teacher/quizzes` | `app/(teacher)/teacher/quizzes/page.tsx` | Teacher / Admin | Danh sách Đề thi do Giáo viên quản lý | ✅ **6-LAYER_COMPLIANT** |
| 34 | `/teacher/quizzes/new` | `app/(teacher)/teacher/quizzes/new/page.tsx` | Teacher / Admin | Công cụ Tạo đề thi dành cho Giáo viên | ✅ **6-LAYER_COMPLIANT** |
| 35 | `/teacher/classrooms` | `app/(teacher)/teacher/classrooms/page.tsx` | Teacher / Admin | Quản lý Danh sách Lớp học | ✅ **6-LAYER_COMPLIANT** |
| 36 | `/teacher/classrooms/[id]` | `app/(teacher)/teacher/classrooms/[id]/page.tsx` | Teacher / Admin | Chi tiết Lớp học & Theo dõi điểm số sinh viên | ✅ **6-LAYER_COMPLIANT** |

### 2.6. Admin Portal Routes (`(admin)`) (12 Routes)
| STT | Route URL | File Path | Guard Level | Mô Tả Chức Năng | Theme Status |
|---|---|---|---|---|---|
| 37 | `/admin` | `app/(admin)/admin/page.tsx` | Admin Only | Bảng điều khiển Quản trị viên chính | ✅ **6-LAYER_COMPLIANT** |
| 38 | `/admin/users` | `app/(admin)/admin/users/page.tsx` | Admin Only | Quản lý Người dùng & Phân quyền Role | ✅ **6-LAYER_COMPLIANT** |
| 39 | `/admin/quizzes` | `app/(admin)/admin/quizzes/page.tsx` | Admin Only | Quản lý toàn bộ Ngân hàng Đề thi | ✅ **6-LAYER_COMPLIANT** |
| 40 | `/admin/quizzes/new` | `app/(admin)/admin/quizzes/new/page.tsx` | Admin Only | Tạo bài thi mới từ quyền Admin | ✅ **6-LAYER_COMPLIANT** |
| 41 | `/admin/quizzes/[id]/edit` | `app/(admin)/admin/quizzes/[id]/edit/page.tsx` | Admin Only | Sửa đề thi & Cập nhật đáp án Admin | ✅ **6-LAYER_COMPLIANT** |
| 42 | `/admin/categories` | `app/(admin)/admin/categories/page.tsx` | Admin Only | Quản lý Danh mục Môn học & Chủ đề | ✅ **6-LAYER_COMPLIANT** |
| 43 | `/admin/question-bank` | `app/(admin)/admin/question-bank/page.tsx` | Admin Only | Quản lý Ngân Hàng Câu Hỏi Tổng | ✅ **6-LAYER_COMPLIANT** |
| 44 | `/admin/question-bank/migrate` | `app/(admin)/admin/question-bank/migrate/page.tsx` | Admin Only | Công cụ Migration dữ liệu ngân hàng câu hỏi | ✅ **6-LAYER_COMPLIANT** |
| 45 | `/admin/question-bank/conflicts` | `app/(admin)/admin/question-bank/conflicts/page.tsx` | Admin Only | Xử lý trùng lặp câu hỏi (SHA-256 Fingerprint) | ✅ **6-LAYER_COMPLIANT** |
| 46 | `/admin/ai-usage` | `app/(admin)/admin/ai-usage/page.tsx` | Admin Only | Thống kê sử dụng AI Assets & Tokens | ✅ **6-LAYER_COMPLIANT** |
| 47 | `/admin/feedback` | `app/(admin)/admin/feedback/page.tsx` | Admin Only | Quản lý phản hồi & Báo lỗi từ người dùng | ✅ **6-LAYER_COMPLIANT** |
| 48 | `/admin/settings` | `app/(admin)/admin/settings/page.tsx` | Admin Only | Cài đặt tham số hệ thống Admin | ✅ **6-LAYER_COMPLIANT** |
| 49 | N/A *(API Routes)* | `app/api/` | Middleware Auth | Hệ thống API Backend (REST / JSON) | **API_EXEMPT** |

---

## 🔒 3. Cơ Chế Phân Quyền & Bảo Vệ Router (Middleware Governance)

Các tuyến đường trên được điều phối bởi Middleware `proxy.ts`:
1. **Chế Độ Bảo Trì (`/maintenance`)**: Tự động chuyển hướng toàn bộ người dùng không phải Admin khi bật Maintenance Mode.
2. **Mobile Layout Auto-Redirect**: Tự động nhận diện User Agent mobile để ưu tiên chuyển hướng sang giao diện tối ưu di động (ví dụ `/quiz/[id]/session/[sessionId]/mobile`).
3. **Phân Quyền Vai Trò (Role Routing)**:
   - Giáo viên (`role: teacher`) được chuyển hướng truy cập khu vực `/teacher/*`.
   - Quản trị viên (`role: admin`) được quyền truy cập tất cả các tuyến đường `/admin/*` và `/teacher/*`.
   - Học sinh (`role: student`) truy cập các tuyến đường thuộc nhóm `(student)` và `(public)`.

---

*Trạng thái Router Index được cập nhật tự động bởi Antigravity System Architecture.*
