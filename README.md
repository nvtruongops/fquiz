# 🎓 FQuiz — Nền tảng Thi Trắc nghiệm & Ôn luyện Kiến thức Thông minh

<p align="center">
  <strong>Nền tảng thi trắc nghiệm trực tuyến, quản lý ngân hàng câu hỏi và lớp học thông minh tích hợp AI Assistant thời gian thực.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2_(App_Router)-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-18.3-61dafb?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.0_(Strict)-blue?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas_Mongoose_9-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tests-Jest_67_Suites_PASS-brightgreen?logo=jest" alt="Jest Tests" />
</p>

---

## 🌟 Điểm nổi bật (Key Features)

- ⚡ **3 Chế độ Thi Linh hoạt**: Chấm ngay từng câu (`Immediate`), Nộp bài cuối giờ (`Review`), và Lật thẻ ghi nhớ (`Flashcard`).
- 🤖 **Trợ lý Phòng thi AI (Quiz AI Assistant)**: Giải đáp thắc mắc, phân tích đáp án đúng/sai, tìm kiếm câu tương tự trong Ngân hàng đề theo thời gian thực (hỗ trợ Gemini / OpenAI / Custom endpoints).
- 📚 **Ngân hàng Câu hỏi (Question Bank)**: Tự động đối chiếu conflict đáp án, đồng bộ hóa và quản lý câu hỏi tái sử dụng theo môn học (`course_code`).
- 🏫 **Lớp học & Giao bài tập (Classrooms & Assignments)**: Giáo viên tạo lớp học, giao đề thi trắc nghiệm có hạn nộp và thống kê phổ điểm học sinh; học sinh tham gia nhanh qua mã code.
- 🔀 **Trộn đề Thi (Mix Quiz)**: Tự động kết hợp câu hỏi ngẫu nhiên hoặc tuần tự từ nhiều bộ đề thi khác nhau.
- 🎨 **Thiết kế Chuẩn mực & Accessibility**: Hỗ trợ 4 theme modes (`Light`, `Dark`, `Green`, `Pink`) đạt chuẩn tương phản màu **WCAG 2.2 AA** và hoạt ảnh mượt mà với `@gsap/react`.
- 🛡️ **Bảo mật Đa tầng**: Xác thực JWT Rotation, chống tấn công CSRF Double-Submit Cookie, Rate Limiting công khai, và kiểm soát dữ liệu nghiêm ngặt.

---

## 🛠️ Tech Stack

| Thành phần | Công nghệ / Thư viện |
|---|---|
| **Core Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 18](https://react.dev/) |
| **Ngôn ngữ** | [TypeScript 5 (Strict Mode)](https://www.typescriptlang.org/) |
| **Database & ODM** | [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose 9](https://mongoosejs.com/) |
| **UI & Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives) |
| **Micro-Animations** | [GSAP](https://gsap.com/) (`@gsap/react` with GPU Transforms) + [Framer Motion 12](https://motion.dev/) |
| **State Management** | [TanStack React Query v5](https://tanstack.com/query) (Server State) + [Zustand v5](https://zustand-demo.pmnd.rs/) (Client State) |
| **AI Integration** | [Google Gemini API](https://ai.google.dev/) (`@google/generative-ai`) + [OpenAI API](https://platform.openai.com/) |
| **Auth & Security** | [jose](https://github.com/panva/jose) (JWT Rotation), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), Double-Submit CSRF, [Pino](https://getpino.io/) |
| **Testing & CI/CD** | [Jest](https://jestjs.io/), [ts-jest](https://kulshekhar.github.io/ts-jest/), [fast-check](https://fast-check.dev/), [ESLint](https://eslint.org/) SonarJS, GitHub Actions |

---

## 🚀 Bắt đầu Nhanh (Quick Start)

### 1. Yêu cầu Tiên quyết
- **Node.js** 18.18+ hoặc 20+
- **npm** (dự án dùng `.npmrc` với `legacy-peer-deps=true`)
- MongoDB Connection String (MongoDB Atlas hoặc local MongoDB 7+)

### 2. Cài đặt & Khởi chạy

```bash
# 1. Clone repository
git clone https://github.com/nvtruongops/fquiz.git
cd fquiz

# 2. Cài đặt dependencies
npm install

# 3. Thiết lập biến môi trường
cp .env.example .env.local
# Cập nhật MONGODB_URI, JWT_SECRET trong .env.local

# 4. Seed dữ liệu mẫu (Tùy chọn)
npm run seed                 # Tạo tài khoản admin & student mẫu
npm run seed:public-quizzes  # Tạo ngân hàng đề thi công khai mẫu

# 5. Khởi chạy development server
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm.

---

## 📜 Các Lệnh Scripts Thường dùng

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Khởi chạy máy chủ phát triển (Turbopack) |
| `npm run build` | Biên dịch production bundle & Type-check toàn bộ dự án |
| `npm run lint` | Kiểm tra chất lượng mã nguồn & bảo mật với ESLint (0 errors) |
| `npm test` | Chạy bộ kiểm thử Jest Unit & Property-based tests (67 suites / 431 tests) |
| `npm run test:performance` | Đo kiểm hiệu năng xử lý câu trả lời của Quiz Engine |
| `npm run seed:public-quizzes` | Nạp dữ liệu danh mục & đề thi trắc nghiệm công khai |
| `npm run codegraph:sync` | Đồng bộ chỉ mục đồ thị mã nguồn CodeGraph (`.codegraph/`) |
| `node .agents/scripts/verify.js --strict` | Chạy bộ kiểm tra AI Agent Rule Engine (18 quy chuẩn nghiêm ngặt) |

---

## 📂 Cấu trúc Thư mục Tổng quan

```
.
├── 📁 app/                     # Next.js App Router (49 Page Routes & 80+ API Route Handlers)
│   ├── (auth)/                 # Xác thực: Login, Register, Forgot/Reset Password
│   ├── (student)/              # Không gian học viên: Dashboard, Quizzes, History, Classrooms
│   ├── (teacher)/              # Không gian giáo viên: Lớp học & Quản lý bài tập
│   ├── (admin)/admin/          # Quản trị hệ thống: Users, Quizzes, Question Bank, Settings
│   ├── quiz/[id]/              # Chi tiết đề thi, Chọn chế độ, Phòng thi, Kết quả
│   └── api/                    # REST API endpoints (Auth, Sessions, Classrooms, AI, Community)
├── 📁 components/              # Thư viện UI Components (Xem components/README.md)
│   ├── quiz/                   # Chi tiết quiz, Phòng thi, Soạn thảo, Thẻ flashcard
│   ├── shared/                 # shadcn/ui components, animations GSAP, modals, forms
│   └── layout/                 # Header, Sidebar, Mobile Navigation, Footer
├── 📁 lib/
│   ├── core/                   # Hạ tầng cốt lõi dùng chung (Xem lib/core/README.md)
│   │   ├── db/                 # MongoDB singleton connection pool & Model Registry
│   │   ├── di/                 # Lightweight Dependency Injection Container
│   │   ├── ai/                 # Dynamic AI Provider (Gemini, OpenAI, Custom)
│   │   ├── events/             # Domain Event Bus (IEventBus, InMemoryEventBus)
│   │   ├── cache/              # In-memory Cache với TTL & Tag Invalidation
│   │   └── security/           # CSRF protection, Rate limiter, Password hashing
│   └── modules/                # Các module nghiệp vụ theo Modular Monolith
│       ├── ai/                 # AI Content Service & Quiz AI Assistant (lib/modules/ai/README.md)
│       ├── auth/               # User, JWT Rotation, withAuth guard (lib/modules/auth/README.md)
│       ├── classroom/          # Quản lý lớp học & bài tập (lib/modules/classroom/README.md)
│       ├── community/          # Bài viết & Thảo luận cộng đồng (lib/modules/community/README.md)
│       └── quiz/               # Động cơ thi & Ngân hàng câu hỏi (lib/modules/quiz/README.md)
├── 📁 docs/                    # 📚 Trung tâm Tài liệu Kỹ thuật Chi tiết (Xem docs/README.md)
├── 📁 hooks/                   # Custom React Hooks (Auth, Query, Session, Sync)
├── 📁 store/                   # Client State Management với Zustand 5 (Session, Toast)
├── 📁 scripts/                 # CLI Tools: Seeders, Migrations, Audits, Benchmarks
└── 📁 .agents/                 # AI Agent Governance, Rule Engine & Pipeline Policies
```

---

## 📚 Trung tâm Tài liệu Kỹ thuật (`docs/`)

Để tìm hiểu sâu về kiến trúc, đặc tả API, bảo mật và thiết kế chi tiết, vui lòng tham khảo các tài liệu chuyên biệt tại **[Documentation Hub](file:///d:/Code/fquiz/docs/README.md)**:

| Tài liệu | Mô tả Trọng tâm | Liên kết |
|---|---|:---:|
| 🏛️ **Kiến trúc Tổng thể** | Phân rã Modular Monolith, Module Boundaries, DI Container, Event Bus, Caching | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 📐 **Đặc tả Thiết kế Kỹ thuật** | Data Models, Mongoose Schemas, Quiz Engine Lifecycle, AI Pipeline | [`DESIGN.md`](./DESIGN.md) |
| 🔌 **Đặc tả 80+ API Endpoints** | Request/Response contracts, Auth roles, Query parameters, Mã lỗi | [`docs/API.md`](./docs/API.md) |
| 🛡️ **Kiến trúc Bảo mật** | Token Rotation, Double-Submit CSRF, Content Security Policy (CSP), Rate Limit | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 🧪 **Chiến lược Kiểm thử** | Jest Unit & Property-based Tests, Benchmarks, AI Rule Engine (`verify.js`) | [`docs/TESTING.md`](./docs/TESTING.md) |
| 🚀 **Hướng dẫn Triển khai** | Triển khai Vercel, MongoDB Atlas, Biến môi trường, Database Migrations | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| 🌐 **Bản đồ 49 Page Routes** | Danh mục 49 Page Routes, Route Groups và Phân quyền Middleware | [`DESIGN_ROUTES.md`](./DESIGN_ROUTES.md) |
| 🎨 **Design Token Contract** | Hệ thống Design Tokens 3-Tier, 4 Theme Modes và Chuẩn WCAG 2.2 AA | [`DESIGN_THEME.md`](./DESIGN_THEME.md) |
| 🤖 **Hướng dẫn AI Agents** | Quản trị quy chuẩn mã nguồn, CI/CD Engine, CodeGraph và Ponytail mode | [`.agents/AGENTS.md`](./.agents/AGENTS.md) |

### 📦 Tài liệu Modules Nghiệp vụ & Subsystems
- **Modules**: [`ai`](./lib/modules/ai/README.md) • [`auth`](./lib/modules/auth/README.md) • [`classroom`](./lib/modules/classroom/README.md) • [`community`](./lib/modules/community/README.md) • [`quiz`](./lib/modules/quiz/README.md)
- **Subsystems**: [`lib/core`](./lib/core/README.md) • [`components`](./components/README.md) • [`hooks`](./hooks/README.md) • [`store`](./store/README.md) • [`scripts`](./scripts/README.md) • [`tasks`](./tasks/README.md)

---

## 🛡️ Giấy phép & Đóng góp (License & Contribution)

Dự án tuân thủ quy chuẩn mã nguồn nghiêm ngặt. Trước khi tạo Pull Request, vui lòng đảm bảo vượt qua toàn bộ quy tắc:
```bash
node .agents/scripts/verify.js --strict && npm run lint && npm test && npm run build
```

© 2026 FQuiz Team. All rights reserved.
