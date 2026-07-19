# 📚 FQuiz — Tài Liệu Dự Án

> Hub tài liệu cho FQuiz — Nền tảng học ngôn ngữ & thi trắc nghiệm.  
> Cập nhật: 2026-07-19

---

## 🗂 Cấu Trúc Tài Liệu

```
FQuiz/
├── DESIGN.md              ← Tài liệu thiết kế kỹ thuật (CHÍNH THỨC)
├── README.md              ← Tổng quan dự án, setup, API, kiến trúc
├── AGENTS.md              ← Hướng dẫn cho AI agent (commands, conventions)
├── Docs/
│   ├── README.md          ← Hub này — bạn đang ở đây
│   ├── requirements.md    ← Đặc tả yêu cầu hệ thống (formal)
│   ├── design.md          ← [DEPRECATED] → Tham khảo DESIGN.md ở thư mục gốc
│   ├── UI_UX_GUIDE.md     ← Hướng dẫn UI/UX cho developer
│   ├── ui-colors.md       ← Bảng màu UI reference
│   └── security.md        ← Hướng dẫn bảo mật & công cụ quét
├── lib/modules/
│   ├── ai/README.md       ← Module AI (AIContentService, 11 prompts, dedup)
│   ├── auth/README.md     ← Module Auth (JWT, withAuth HOF, UserService)
│   ├── learning/README.md ← Module Learning (15 models, DI, FSRS, repos)
│   ├── quiz/README.md     ← Module Quiz (engine, import, question bank)
│   └── community/README.md ← Module Community (Post, comments)
└── lib/core/README.md     ← Core infrastructure (DI, AI providers, events, cache)

---

## 📖 Mô Tả Từng Tài Liệu

### [`DESIGN.md`](../DESIGN.md) — Tài Liệu Thiết Kế Kỹ Thuật
> **File quan trọng nhất — đọc đầu tiên.**

- Kiến trúc hệ thống (Vercel + MongoDB Atlas + QStash + Gemini/OpenAI)
- Data schema (Mongoose models: User, Quiz, QuizSession, Category, QuestionBank, AIAsset, 15 learning models, Post...)
- API routes đầy đủ (`/api/auth/*`, `/api/admin/*`, `/api/sessions/*`, `/api/community/*`, `/api/v1/*`)
- Component hierarchy & Server/Client split
- Quiz Engine logic (immediate, review, flashcard, mix quiz)
- AI Module (Gemini/OpenAI, AIContentService, prompt registry, dedup)
- Learning Module (FSRS, DI container, Repository pattern, course structure)
- Core Infrastructure (Event bus, Cache, Search, AI providers)
- External services (Cloudinary, Nodemailer, QStash)
- Testing strategy, deployment, environment variables
- Known design decisions & tradeoffs

### Module READMEs
> Tài liệu chi tiết cho từng module:

| Module | File | Nội dung chính |
|--------|------|---------------|
| **AI** | [`lib/modules/ai/README.md`](../lib/modules/ai/README.md) | AIContentService, 11 prompt types, AIAsset dedup, AILearningLog |
| **Auth** | [`lib/modules/auth/README.md`](../lib/modules/auth/README.md) | JWT, withAuth HOF, UserService, token rotation, SiteSettings |
| **Learning** | [`lib/modules/learning/README.md`](../lib/modules/learning/README.md) | 15 models, 10 repos, 5 services, FSRS, DI wiring, search |
| **Quiz** | [`lib/modules/quiz/README.md`](../lib/modules/quiz/README.md) | Quiz engine, question bank, import pipeline, mix quiz |
| **Community** | [`lib/modules/community/README.md`](../lib/modules/community/README.md) | Post model, comments, authorization |
| **Core** | [`lib/core/README.md`](../lib/core/README.md) | DI container, AI providers, events, cache, search, types |

### [`Docs/requirements.md`](./requirements.md) — Đặc Tả Yêu Cầu
> Formal requirement specification với Acceptance Criteria.

- 17 requirement gốc (R1–R15, R17): Auth, Category, Quiz CRUD, Session, History, Search, Result, Media, UI/UX...
- Requirement mở rộng (R18–R24): Flashcard, Mix Quiz, Question Bank, Community, Email Verify, Password Reset, Public Access
- Glossary & Tech Stack

### [`Docs/UI_UX_GUIDE.md`](./UI_UX_GUIDE.md) — Hướng Dẫn UI/UX
> Bắt buộc đọc trước khi thêm UI mới.

- Design Language (Glassmorphism / Modern Soft UI)
- Color System (Tailwind tokens + shadcn/ui CSS variables)
- Typography (Inter, font weight, responsive sizes)
- Component Library (shadcn/ui + Radix primitives)
- Quiz Session, Flashcard UI patterns
- Animation & Transition rules
- Responsive Design checkpoints
- Accessibility (ARIA, contrast, keyboard)
- Checklist khi thêm UI mới

### [`Docs/ui-colors.md`](./ui-colors.md) — Bảng Màu
> Quick reference cho color tokens.

- Core brand colors (Primary `#5D7B6F`, app background `#F9F9F7`...)
- State colors (success, info, warning, danger)
- My Quizzes status colors
- Usage notes (contrast ratio, red-only-for-destructive)

### [`Docs/security.md`](./security.md) — Bảo Mật
> Công cụ và quy trình bảo mật.

- Semgrep (SAST)
- Snyk (SCA)
- Gitleaks (Secrets scanning)
- ESLint security plugins
- Hướng dẫn triển khai nhanh

### [`Docs/design.md`](./design.md) — [DEPRECATED]
> ⚠️ **Không còn được duy trì.** Đã chuyển về `DESIGN.md` ở thư mục gốc.

---

## 🚀 Cho Người Mới Bắt Đầu

| Thứ tự | Đọc gì | Mục đích |
|--------|--------|----------|
| 1 | `DESIGN.md` | Hiểu tổng quan hệ thống, kiến trúc, data flow |
| 2 | `Docs/requirements.md` | Hiểu các tính năng và acceptance criteria |
| 3 | `Docs/UI_UX_GUIDE.md` | Nắm convention UI trước khi code giao diện |
| 4 | `Docs/ui-colors.md` | Reference nhanh màu sắc |
| 5 | `Docs/security.md` | Biết cách quét bảo mật |

---

## 🔧 Tech Stack Tổng Quan

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 App Router (Server Components + Client Components) |
| **Language** | TypeScript 5 |
| **Database** | MongoDB Atlas (Mongoose 9 ODM) |
| **Auth** | JWT (`jose` library), bcryptjs |
| **Validation** | Zod 4 (shared frontend + backend) |
| **UI** | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) |
| **State** | Zustand 5 (client), TanStack Query 5 (server) |
| **Animation** | Framer Motion 12 |
| **3D** | React Three Fiber + Drei |
| **Testing** | Jest 30 + fast-check (property-based) |
| **CI/CD** | Vercel auto-deploy (sin1 region) |
| **Jobs** | Upstash QStash (email, stats sync) |
| **Storage** | Cloudinary (image upload) |
| **Email** | Nodemailer (SMTP) |
| **Security** | Semgrep, Snyk, Gitleaks, ESLint plugins |

---

## 📝 Quy Ước Tài Liệu

- Tài liệu kỹ thuật chính thức: **`DESIGN.md`** (thư mục gốc)
- Đặc tả yêu cầu: **`Docs/requirements.md`**
- Guide thực hành: **`Docs/UI_UX_GUIDE.md`**, **`Docs/security.md`**
- File tham chiếu nhỏ: **`Docs/ui-colors.md`**

Khi thêm tính năng mới:
1. Cập nhật `DESIGN.md` (schema, API, architecture)
2. Cập nhật `Docs/requirements.md` (requirement + acceptance criteria)
3. Cập nhật `Docs/UI_UX_GUIDE.md` nếu có UI pattern mới
