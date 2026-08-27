# 🧩 Shared Components (`components/shared/`)

Thư mục chứa các thành phần giao diện dùng chung nền tảng của toàn bộ ứng dụng **FQuiz**: từ các UI Primitives theo chuẩn **shadcn/ui**, các form xác thực, hoạt ảnh GSAP đóng gói sẵn, cho đến các React Context Providers toàn cục.

---

## Cấu trúc Phân hệ

```
components/shared/
├── ui/                        # shadcn/ui Primitives (Radix UI + Tailwind CSS)
│   ├── alert.tsx              # Hộp thông báo trạng thái (Info, Warning, Destructive)
│   ├── avatar.tsx             # Ảnh đại diện người dùng với chữ cái fallback
│   ├── badge.tsx              # Huy hiệu nhãn trạng thái (Success, Secondary, Outline...)
│   ├── button.tsx             # Nút bấm chuẩn với các biến thể (Primary, Ghost, Outline...)
│   ├── card.tsx               # Khung thẻ nội dung (CardHeader, CardTitle, CardContent...)
│   ├── checkbox.tsx           # Hộp kiểm trắc nghiệm nhiều đáp án
│   ├── collapsible.tsx        # Vùng mở rộng thu gọn nội dung
│   ├── dialog.tsx             # Hộp thoại Modal tương tác cao
│   ├── dropdown-menu.tsx      # Menu thả xuống chọn hành động
│   ├── FQuizLogo.tsx          # Logo thương hiệu FQuiz chuẩn hóa vector SVG
│   ├── input.tsx              # Ô nhập liệu văn bản với focus ring semantic
│   ├── page-transition-loader.tsx # Loader thanh tiến độ khi chuyển trang
│   ├── progress.tsx           # Thanh tiến độ phần trăm cơ bản
│   ├── scroll-area.tsx        # Vùng cuộn tùy biến thanh cuộn mượt mà
│   ├── ScrollToTopButton.tsx  # Nút bấm cuộn nhanh lên đầu trang với hoạt ảnh fade
│   ├── select.tsx             # Hộp chọn danh sách tùy biến
│   ├── skeleton.tsx           # Khung xương tải trang (Skeleton Shimmer)
│   ├── switch.tsx             # Nút gạt bật/tắt cài đặt
│   ├── tabs.tsx               # Tab chuyển đổi nội dung
│   ├── textarea.tsx           # Khung nhập văn bản nhiều dòng
│   └── toast-provider.tsx     # Bộ điều khiển hiển thị thông báo Toast
├── auth/                      # Form & nút tương tác xác thực
│   ├── AuthFormComponents.tsx # Các input group tái sử dụng cho Login/Register
│   └── GoogleSignInButton.tsx # Nút đăng nhập nhanh bằng tài khoản Google
├── gsap/                      # GSAP Animation Wrappers
│   ├── GsapProgressBar.tsx    # Thanh tiến độ thời gian thực chuyển động mượt 60fps
│   └── GsapStaggerContainer.tsx # Container tự động tạo hiệu ứng xuất hiện so le cho con
├── providers/                 # React Context Providers
│   ├── QueryProvider.tsx      # Khởi tạo TanStack React Query Client với cache config
│   └── ThemeProvider.tsx      # Quản lý 4 giao diện (Light, Dark, Green, Pink)
├── selection/                 # Công cụ tương tác ngôn ngữ
│   └── InteractiveText.tsx    # Bôi đen từ vựng trong bài thi để tra cứu nhanh nghĩa
└── DevOnlyGuard.tsx           # Component bảo vệ các công cụ gỡ lỗi (chỉ render ở NODE_ENV !== 'production')
```

---

## 1. UI Primitives (`components/shared/ui/`)

Toàn bộ primitives được xây dựng trên nền tảng **Radix UI Unstyled Components**, đảm bảo:
- **Khả năng tiếp cận (Accessibility - A11y)**: Hỗ trợ 100% điều hướng bằng bàn phím (`Tab`, `Enter`, `Escape`, `Arrow Keys`) và các thuộc tính WAI-ARIA tiêu chuẩn.
- **Tương thích Semantic Design Tokens**: Không chứa bất kỳ class màu cố định nào. Tự động chuyển đổi màu sắc liền mạch khi người dùng đổi chủ đề (Theme).

---

## 2. Animation Wrappers (`components/shared/gsap/`)

- **`GsapProgressBar`**: Nhận thuộc tính `progress` (0 - 100) và điều khiển biến đổi `scaleX` trên GPU thay vì làm biến dạng layout bằng `width`.
- **`GsapStaggerContainer`**: Nhận danh sách các thẻ con và tự động áp dụng hiệu ứng trượt nhẹ từ dưới lên kèm hiệu ứng mờ dần (`y: 16`, `autoAlpha: 0`) với độ lệch `stagger: 0.05s`.

---

## 3. Global Providers (`components/shared/providers/`)

- **`QueryProvider`**:
  - Thiết lập `staleTime: 60 * 1000` (1 phút) mặc định để giảm thiểu các truy vấn trùng lặp.
  - Tắt tự động refetch on window focus cho các tác vụ thi trắc nghiệm để tránh làm phiền học viên.
- **`ThemeProvider`**:
  - Lưu trữ giao diện người dùng chọn trong `localStorage` (`theme` key).
  - Gán các class tương ứng lên thẻ `<html>`: `.theme-light`, `.theme-dark`, `.theme-green`, `.theme-pink`.
