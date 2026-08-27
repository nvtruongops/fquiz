# 📚 FQuiz — Trung tâm Tài liệu Kỹ thuật (Documentation Hub)

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật toàn diện của nền tảng **FQuiz**. Tài liệu này đóng vai trò là kim chỉ nam cho các nhà phát triển (Developers), kiến trúc sư hệ thống (Architects), kỹ sư vận hành (DevOps) và các AI Agents khi tham gia phát triển dự án.

---

## 🗺️ Bản đồ Tài liệu (Documentation Index)

| Mục | Tài liệu | Mô tả trọng tâm | Đối tượng |
|---|---|---|---|
| 🏗️ | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Kiến trúc tổng thể Next.js 16 App Router, Module Boundaries, DI, Events, Caching | Devs, Architects |
| 📐 | [`DESIGN.md`](../DESIGN.md) | Đặc tả kỹ thuật toàn diện: Data Models, Mongoose Schemas, Quiz Engine, AI Pipeline | All |
| 🌐 | [`DESIGN_ROUTES.md`](./DESIGN_ROUTES.md) | Danh mục Page Routes Web Học viên & Cổng Quản trị Admin độc lập | Frontend Devs |
| 🎨 | [`DESIGN_THEME.md`](./DESIGN_THEME.md) | Chuẩn Design Tokens 3-Tier, 4 Themes (Light, Dark, Green, Pink), WCAG 2.2 AA Baseline | UI/UX, Frontend |
| 🔌 | [`API.md`](./API.md) | Danh mục API Endpoints Web & Cổng Quản trị (`apps/admin`), Auth guards & Error codes | Fullstack, Mobile |
| 🛡️ | [`SECURITY.md`](./SECURITY.md) | Kiến trúc bảo mật: Token Rotation, CSRF Double-Submit, Rate Limiting, CSP, Audit Logs | SecOps, Backend |
| 🧪 | [`TESTING.md`](./TESTING.md) | Chiến lược kiểm thử: Jest, Playwright Multi-Server E2E, AI Agent Rule Engine (`verify.js`) | QA, Devs, Agents |
| 🚀 | [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Hướng dẫn triển khai Turborepo Monorepo (2 Projects Vercel: `fquiz` & `fquiz-admin`), MongoDB Atlas, CI/CD | DevOps, Leads |
| 🤖 | [`AGENTS.md`](../.agents/AGENTS.md) | Hướng dẫn AI Agent: Rule governance, CI/CD Engine, CodeGraph, Ponytail mode | AI Agents, Devs |

---

## 📦 Tài liệu Modules Nghiệp vụ (`lib/modules/`)

Các module nghiệp vụ được đóng gói độc lập theo kiến trúc Modular Monolith, tuân thủ nghiêm ngặt nguyên tắc **Không import chéo Model** và **Join dữ liệu ở tầng ứng dụng (Application-level join với `$in`)**:

- 🧠 [`lib/modules/ai/README.md`](../lib/modules/ai/README.md): Dịch vụ sinh nội dung học tập thông minh (11 loại prompt), Cache dedup SHA-256, và hệ thống Quiz AI Assistant (Intent & Context Resolvers, Question Retriever, Confidence Engine).
- 🔐 [`lib/modules/auth/README.md`](../lib/modules/auth/README.md): Hệ thống xác thực JWT (jose), Token Rotation, Token Versioning, phân quyền Role Hierarchy (`student`, `teacher`, `admin`), và Site Settings.
- 🏫 [`lib/modules/classroom/README.md`](../lib/modules/classroom/README.md): Quản lý lớp học trực tuyến, tham gia qua mã lớp, giao bài tập trắc nghiệm theo thời hạn, và theo dõi tiến độ học viên.
- 👥 [`lib/modules/community/README.md`](../lib/modules/community/README.md): Diễn đàn thảo luận cộng đồng, bài viết (Posts), bình luận lồng nhau (Embedded Comments), lượt thích (Likes) và bộ lọc tags.
- 📝 [`lib/modules/quiz/README.md`](../lib/modules/quiz/README.md): Động cơ thi trắc nghiệm (Quiz Engine) với 3 chế độ (Immediate, Review, Flashcard), Quản lý Ngân hàng Câu hỏi (Question Bank), Trộn đề Mix Quiz, và Pipeline Import câu hỏi.

---

## ⚙️ Tài liệu Hạ tầng & Tầng ứng dụng

- 🛠️ [`lib/core/README.md`](../lib/core/README.md): Tầng hạ tầng dùng chung (MongoDB pool, Model Registry, DI Container, Event Bus, Cache, Search, Rate Limit).
- 🧩 [`components/README.md`](../components/README.md): Thư viện thành phần giao diện (Atomic / Domain-Driven components, shadcn/ui, GSAP animations, Accessibility).
- 🪝 [`hooks/README.md`](../hooks/README.md): Danh mục Custom React Hooks (Auth, TanStack Query, Session Hydration & Sync, Keyboard Navigation).
- 🗄️ [`store/README.md`](../store/README.md): Quản lý State phía Client bằng Zustand 5 (`quiz-session.store.ts`, `toast-store.ts`).
- 📜 [`scripts/README.md`](../scripts/README.md): Danh mục CLI tools: Seeders dữ liệu, Migrations dữ liệu lớn, Data Audit & Diagnostics, Performance Benchmarks.
- 📋 [`tasks/README.md`](../tasks/README.md): Tài liệu hóa các đặc tả tính năng và kế hoạch phát triển (Feature Specifications & Task Trackers).

---

## 🏛️ Triết lý Thiết kế Cốt lõi (Core Principles)

1. **Text-Only Quiz Scope**: Tập trung tối đa vào luyện thi trắc nghiệm và ôn luyện kiến thức qua văn bản (câu hỏi, đáp án, giải thích chi tiết, flashcards). Không triển khai audio/TTS/STT/3D WebGL rườm rà.
2. **Zero-Trust Server Validation**: Phía server không bao giờ tin tưởng client state; toàn bộ câu trả lời thi cử được chấm điểm và tổng kết trên `session.questions_cache` tại server.
3. **High Performance & Accessibility**: Tất cả animations sử dụng GPU transform aliases thông qua `@gsap/react`, hỗ trợ `prefers-reduced-motion` và đạt chuẩn tương phản màu **WCAG 2.2 AA** trên cả 4 giao diện.
4. **Strict Governance & CI/CD**: Mọi thay đổi mã nguồn bắt buộc phải vượt qua bộ quy tắc nghiêm ngặt tại `.agents/scripts/verify.js --strict` trước khi được tích hợp vào nhánh chính.
