# 🎓 FQuiz — Nền tảng Thi Trắc nghiệm & Ôn luyện Kiến thức Thông minh

<p align="center">
  <strong>Nền tảng thi trắc nghiệm trực tuyến, quản lý ngân hàng câu hỏi và lớp học thông minh tích hợp AI Assistant thời gian thực.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Monorepo-Turborepo_2.x-black?logo=turborepo" alt="Turborepo" />
  <img src="https://img.shields.io/badge/Next.js-16.2_(App_Router)-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-18.3-61dafb?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.0_(Strict)-blue?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas_Mongoose_9-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Tests-Jest_66_Suites_PASS-brightgreen?logo=jest" alt="Jest Tests" />
  <img src="https://img.shields.io/badge/E2E-Playwright_57_Tests_PASS-brightgreen?logo=playwright" alt="Playwright Tests" />
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

## 🛠️ Tech Stack & Monorepo Architecture

| Phân hệ | Công nghệ / Thư viện |
|---|---|
| **Monorepo Engine** | [Turborepo 2.x](https://turbo.build/) + npm Workspaces |
| **Applications** | `apps/web` (Học viên & Giáo viên :3000) + `apps/admin` (Cổng Quản trị :3001) |
| **Shared Packages** | `@fquiz/database`, `@fquiz/models`, `@fquiz/auth`, `@fquiz/ui`, `@fquiz/config-typescript` |
| **Core Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 18](https://react.dev/) |
| **Ngôn ngữ** | [TypeScript 5 (Strict Mode)](https://www.typescriptlang.org/) |
| **Database & ODM** | [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose 9](https://mongoosejs.com/) |
| **UI & Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives) |
| **Micro-Animations** | [GSAP](https://gsap.com/) (`@gsap/react` with GPU Transforms) + [Framer Motion 12](https://motion.dev/) |
| **State Management** | [TanStack React Query v5](https://tanstack.com/query) (Server State) + [Zustand v5](https://zustand-demo.pmnd.rs/) (Client State) |
| **AI Integration** | [Google Gemini API](https://ai.google.dev/) (`@google/generative-ai`) + [OpenAI API](https://platform.openai.com/) |
| **Auth & Security** | [jose](https://github.com/panva/jose) (JWT Rotation), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), Double-Submit CSRF, [Pino](https://getpino.io/) |
| **Testing & CI/CD** | [Jest](https://jestjs.io/), [ts-jest](https://kulshekhar.github.io/ts-jest/), [fast-check](https://fast-check.dev/), [Playwright](https://playwright.dev/), [ESLint](https://eslint.org/), GitHub Actions |

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

# 2. Cài đặt dependencies toàn bộ monorepo
npm install

# 3. Thiết lập biến môi trường
cp .env.example .env.local
# Cập nhật MONGODB_URI, JWT_SECRET trong .env.local

# 4. Seed dữ liệu mẫu (Tùy chọn)
npm run seed                 # Tạo tài khoản admin & student mẫu
npm run seed:public-quizzes  # Tạo ngân hàng đề thi công khai mẫu

# 5. Khởi chạy song song cả 2 ứng dụng Web (:3000) và Admin (:3001)
npm run dev
```

Mở trình duyệt:
- 🎓 **Web Học viên & Giáo viên**: [http://localhost:3000](http://localhost:3000)
- 🛡️ **Cổng Quản trị Admin**: [http://localhost:3001](http://localhost:3001)

---

## 📜 Các Lệnh Scripts Thường dùng

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Khởi chạy song song cả Web (`:3000`) và Admin (`:3001`) qua Turborepo |
| `npm run dev:web` | Khởi chạy riêng Web học viên (`http://localhost:3000`) |
| `npm run dev:admin` | Khởi chạy riêng Admin Portal (`http://localhost:3001`) |
| `npm run build` | Biên dịch production toàn bộ Monorepo (`apps/web` + `apps/admin`) |
| `npm run build:web` | Biên dịch production riêng Web học viên |
| `npm run build:admin` | Biên dịch production riêng Admin Portal |
| `npm run lint` | Kiểm tra chất lượng mã nguồn & bảo mật với ESLint (0 errors) |
| `npm run check-types` | Kiểm tra kiểu dữ liệu TypeScript trên 7 workspaces qua Turborepo |
| `npm test` | Chạy toàn bộ 66 Jest Unit & Property-based test suites (430 tests) |
| `npx playwright test` | Chạy toàn bộ 57 Playwright E2E tests đa máy chủ (`:3000` & `:3001`) |
| `npm run codegraph:sync` | Đồng bộ chỉ mục đồ thị mã nguồn CodeGraph (`.codegraph/`) |
| `node .agents/scripts/verify.js --strict` | Chạy bộ kiểm tra AI Agent Rule Engine (18 quy chuẩn nghiêm ngặt) |

---

## 📂 Cấu trúc Thư mục Tổng quan (Pure Symmetrical Monorepo)

```
fquiz/
├── apps/
│   ├── web/                            # 🎓 Web Học Viên & Giáo Viên (Port 3000 / @fquiz/web)
│   │   ├── app/                        # Next.js 16 App Router ((auth), (student), (teacher), quiz, community)
│   │   ├── components/                 # Web UI Components (Quiz, Classroom, Community, AI)
│   │   ├── hooks/                      # Custom React Hooks
│   │   ├── store/                      # Zustand Stores (quiz-session, toast)
│   │   ├── lib/                        # Web Services & Feature Modules
│   │   └── proxy.ts                    # Web Edge Proxy Middleware
│   │
│   └── admin/                          # 🛡️ Cổng Quản Trị Hệ Thống (Port 3001 / @fquiz/admin)
│       ├── app/                        # Next.js 16 App Router (Categories, Feedback, Question Bank, Quizzes)
│       ├── components/                 # Admin UI Components & Subcomponents
│       ├── hooks/                      # Admin Custom Hooks Layer
│       └── proxy.ts                    # Zero-Trust Admin Proxy Middleware
│
├── packages/
│   ├── database/                       # 🗄️ Database Singleton & Connection Pool (@fquiz/database)
│   ├── models/                         # 📦 Single Source of Truth Mongoose Schemas & Types (@fquiz/models)
│   ├── auth/                           # 🔐 Security, JWT Rotation, CSRF & RBAC (@fquiz/auth)
│   ├── ui/                             # 🎨 Shared UI Primitives, 3-Tier Tokens & GSAP (@fquiz/ui)
│   └── config-typescript/              # ⚙️ Shared TypeScript Configs (@fquiz/config-typescript)
│
├── e2e/                                # 🧪 Multi-Server End-to-End Test Suite (Playwright - 57 Tests)
├── docs/                               # 📚 Trung tâm Tài liệu Kỹ thuật Chi tiết
├── scripts/                            # CLI Tools: Seeders, Migrations, Audits, Benchmarks
└── .agents/                            # AI Agent Governance, Rule Engine & Pipeline Policies
```

---

## 📚 Trung tâm Tài liệu Kỹ thuật (`docs/`)

Để tìm hiểu sâu về kiến trúc, đặc tả API, bảo mật và thiết kế chi tiết, vui lòng tham khảo các tài liệu chuyên biệt tại **[Documentation Hub](file:///d:/Code/fquiz/docs/README.md)**:

| Tài liệu | Mô tả Trọng tâm | Liên kết |
|---|---|:---:|
| 🏛️ **Kiến trúc Tổng thể** | Pure Symmetrical Monorepo, 8 Invariants, Data Flow, AI Pipeline, Package Matrix | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 📐 **Đặc tả Thiết kế Kỹ thuật** | Data Models, Mongoose Schemas, Quiz Engine Lifecycle, AI Pipeline | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 🔌 **Đặc tả 80+ API Endpoints** | Request/Response contracts, Auth roles, Query parameters, Mã lỗi | [`docs/API.md`](./docs/API.md) |
| 🛡️ **Kiến trúc Bảo mật** | Token Rotation, Double-Submit CSRF, Content Security Policy (CSP), Rate Limit | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 🧪 **Chiến lược Kiểm thử** | Jest Unit Tests (66 suites), Playwright Multi-Server E2E, AI Rule Engine | [`docs/TESTING.md`](./docs/TESTING.md) |
| 🚀 **Hướng dẫn Triển khai** | Triển khai Dual Vercel Projects, MongoDB Atlas, Biến môi trường, Migrations | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| 🌐 **Bản đồ Page Routes** | Danh mục Page Routes Web Học viên & Admin Portal | [`docs/DESIGN_ROUTES.md`](./docs/DESIGN_ROUTES.md) |
| 🎨 **Design Token Contract** | Hệ thống Design Tokens 3-Tier, 4 Theme Modes và Chuẩn WCAG 2.2 AA | [`docs/DESIGN_THEME.md`](./docs/DESIGN_THEME.md) |
| 🤖 **Hướng dẫn AI Agents** | Quản trị quy chuẩn mã nguồn, CI/CD Engine, CodeGraph và Ponytail mode | [`.agents/AGENTS.md`](./.agents/AGENTS.md) |

---

## 🛡️ Giấy phép & Đóng góp (License & Contribution)

Dự án tuân thủ quy chuẩn mã nguồn nghiêm ngặt. Trước khi tạo Pull Request, vui lòng đảm bảo vượt qua toàn bộ quy tắc:
```bash
node .agents/scripts/verify.js --strict && npm run lint && npm test && npm run build
```

© 2026 FQuiz Team. All rights reserved.
