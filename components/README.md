# 🧩 Components Library (`components/`)

Thư viện thành phần giao diện người dùng (UI Component Library) của **FQuiz**, được tổ chức theo mô hình **Domain-Driven Component Architecture** kết hợp với hệ thống **shadcn/ui (Radix Primitives)**, **Tailwind CSS 3** và hoạt ảnh hiệu năng cao **GSAP 3**.

---

## 1. Cấu trúc Thư mục (Directory Structure)

```
components/
├── admin/                     # Giao diện dành riêng cho Quản trị viên (Admin)
│   ├── AdminSidebar.tsx       # Sidebar điều hướng trang quản trị
│   ├── QuestionBank*.tsx      # Quản lý ngân hàng câu hỏi, analytics, giải quyết conflict
│   └── settings/              # Thẻ cấu hình hệ thống & bảo mật
├── community/                 # Diễn đàn cộng đồng & bài viết học tập
│   ├── CommunityHeader.tsx    # Header & thống kê bài viết
│   ├── CommunityPostCard.tsx  # Thẻ hiển thị bài viết, likes, comments
│   ├── CreatePostModal.tsx    # Modal tạo bài thảo luận mới
│   └── FeedbackModal.tsx      # Modal tiếp nhận phản hồi người dùng
├── dashboard/                 # Bảng điều khiển học tập cá nhân (Student Dashboard)
│   ├── DashboardHeader.tsx    # Chào mừng & thống kê streak
│   ├── IncompleteSessionBanner.tsx # Banner nhắc nhở tiếp tục bài thi đang dở
│   ├── LearningStudioGrid.tsx # Lưới các công cụ học tập thông minh
│   ├── PinnedCategoriesSection.tsx # Danh mục yêu thích được ghim
│   └── RecentActivitiesFeed.tsx # Nhật ký hoạt động thi gần đây
├── history/                   # Lịch sử thi & ôn tập
│   └── HistorySkeleton.tsx    # Skeleton loading trạng thái lịch sử
├── layout/                    # Layout khung toàn ứng dụng
│   ├── AppLayout.tsx          # Wrapper layout chung (Header, Sidebar, Content, Footer)
│   ├── Sidebar.tsx            # Sidebar điều hướng chính đa vai trò
│   ├── TopHeaderBar.tsx       # Thanh header trên cùng, chuyển theme, notifications
│   ├── MobileNav.tsx          # Thanh điều hướng dưới đáy cho màn hình di động
│   ├── Footer.tsx             # Footer thông tin hệ thống và bản quyền
│   └── UserDropdown.tsx       # Menu tài khoản, hồ sơ và đăng xuất
├── quiz/                      # Động cơ & Giao diện Thi trắc nghiệm (Xem components/quiz/README.md)
│   ├── detail/                # Chi tiết bài thi, thống kê và bảng xếp hạng
│   ├── editor/                # Bộ soạn thảo đề thi kéo thả, form metadata
│   ├── explore/               # Khám phá đề thi công khai, bộ lọc danh mục
│   ├── my-quizzes/            # Quản lý kho đề thi cá nhân của học viên
│   ├── question-bank/         # Tích hợp ngân hàng câu hỏi, cảnh báo conflict
│   ├── session/               # Phòng thi trắc nghiệm (Immediate, Review, Flashcard)
│   └── shared/                # Thành phần dùng chung: Timer, Badge, ImageUpload
├── shared/                    # Các thành phần giao diện nền tảng (Xem components/shared/README.md)
│   ├── ui/                    # shadcn/ui Primitives (button, card, dialog, select...)
│   ├── auth/                  # Form đăng nhập, đăng ký, Google OAuth
│   ├── gsap/                  # Animation components (ProgressBar, StaggerContainer)
│   ├── providers/             # React Context Providers (QueryProvider, ThemeProvider)
│   ├── selection/             # Tương tác văn bản tra cứu từ điển
│   └── DevOnlyGuard.tsx       # Component bảo vệ các công cụ dev trên production
├── student/                   # Không gian học sinh
│   └── classrooms/            # Giao diện lớp học của học viên
└── teacher/                   # Không gian giảng dạy
    └── TeacherSidebar.tsx     # Sidebar điều hướng cho giáo viên
```

---

## 2. Quy chuẩn Hoạt ảnh GSAP (GSAP Animation Standards)

FQuiz sử dụng `@gsap/react` để đem lại trải nghiệm mượt mà 60fps với độ trễ thấp nhất:

1. **Sử dụng `useGSAP()` Hook**: Luôn bọc animation trong `useGSAP(() => { ... }, { scope: containerRef })` để tự động dọn dẹp bộ nhớ (`ctx.revert()`) khi unmount.
2. **GPU Performance First**: Chỉ animate các thuộc tính GPU transform (`x`, `y`, `scale`, `rotation`, `autoAlpha`). Tuyệt đối không animate layout properties (`width`, `height`, `top`, `left`).
3. **Accessibility (`prefers-reduced-motion`)**: Sử dụng `gsap.matchMedia()` để tự động tắt animation nếu người dùng bật chế độ giảm chuyển động trong hệ điều hành:

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(itemsRef.current, { opacity: 1, y: 0 });
  });
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(itemsRef.current, {
      opacity: 0,
      y: 20,
      stagger: 0.06,
      duration: 0.4,
      ease: 'power2.out'
    });
  });
}, { scope: containerRef });
```

---

## 3. Quy chuẩn Design Tokens & Theme Governance

Mọi component trong thư viện phải tuân thủ nghiêm ngặt chuẩn **3-Tier Theme Governance**:

- ❌ **Cấm hardcoded Hex**: Không viết `color: #10b981` hoặc `#ffffff`.
- ❌ **Cấm Tailwind Light Clashing**: Không viết `bg-white`, `text-black`, `bg-gray-100`.
- ✅ **Sử dụng Semantic Variables**: Sử dụng `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`.
- ✅ **Trật tự độ sáng Surface Elevation**: `Background` $\le$ `Card` $\le$ `Popover/Dialog`.
- ✅ **Độ tương phản WCAG 2.2 AA**: Mọi văn bản kết hợp với nền phải đạt tỷ lệ tương phản $\ge 4.5:1$ trên cả 4 themes: `Light`, `Dark`, `Green`, `Pink`.

---

## 4. Tối ưu Hiệu năng Render (React Performance)

- **Lazy Loading với `next/dynamic`**: Các modal nặng hoặc trình soạn thảo đề thi phức tạp (`QuizEditorWithQuestionBank`, `CreatePostModal`) được load theo nhu cầu (on-demand) với `ssr: false`.
- **Selector Memoization**: Khi kết nối với Zustand Store, luôn sử dụng selector nông (`state => state.field`) thay vì lấy toàn bộ state object để tránh re-render thừa.
- **Tách Component hạt nhân**: Chia nhỏ các thẻ câu hỏi và bảng điều khiển thành các sub-components độc lập để tối ưu hóa việc render lại từng dòng khi học viên làm bài.
