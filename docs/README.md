# 📚 FQuiz — Trung tâm Tài liệu Kỹ thuật (Documentation Hub)

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật toàn diện của nền tảng **FQuiz**. Tài liệu này đóng vai trò là kim chỉ nam cho các nhà phát triển (Developers), kiến trúc sư hệ thống (Architects), kỹ sư vận hành (DevOps) và các AI Agents khi tham gia phát triển dự án.

---

## 🗺️ Bản đồ Tài liệu (Documentation Index)

| Mục | Tài liệu | Mô tả trọng tâm | Đối tượng |
|---|---|---|---|
| 🏗️ | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Đặc tả kiến trúc Pure Symmetrical Turborepo Monorepo (`apps/web`, `apps/admin`, `packages/*`), 8 Invariants, Data Flow, AI Pipeline | All |
| 📐 | [`DESIGN.md`](./DESIGN.md) | Đặc tả kỹ thuật toàn diện: Data Models, Mongoose Schemas, Quiz Engine, AI Pipeline | Fullstack Devs |
| 🌐 | [`DESIGN_ROUTES.md`](./DESIGN_ROUTES.md) | Danh mục Page Routes Web Học viên (`apps/web`) & Cổng Quản trị Admin (`apps/admin`) | Frontend Devs |
| 🎨 | [`DESIGN_THEME.md`](./DESIGN_THEME.md) | Chuẩn Design Tokens 3-Tier, 4 Themes (Light, Dark, Green, Pink), WCAG 2.2 AA Baseline | UI/UX, Frontend |
| 🔌 | [`API.md`](./API.md) | Danh mục REST APIs Web & Admin (`apps/web/app/api`, `apps/admin/app/api`), Auth guards & Error codes | Fullstack, Mobile |
| 🛡️ | [`SECURITY.md`](./SECURITY.md) | Kiến trúc bảo mật: Token Rotation, CSRF Double-Submit, Rate Limiting, CSP, Audit Logs | SecOps, Backend |
| 🧪 | [`TESTING.md`](./TESTING.md) | Chiến lược kiểm thử: Jest (66 suites), Playwright Multi-Server E2E (57 tests), AI Rule Engine (`verify.js`) | QA, Devs, Agents |
| 🚀 | [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Hướng dẫn triển khai Turborepo Monorepo (2 Projects Vercel: `fquiz-web` & `fquiz-admin`), MongoDB Atlas, CI/CD | DevOps, Leads |
| 🤖 | [`AGENTS.md`](../.agents/AGENTS.md) | Hướng dẫn AI Agent: Rule governance, CI/CD Engine, CodeGraph, Ponytail mode | AI Agents, Devs |

---

## 📦 Các Packages Dùng Chung (`packages/*`)

Hệ thống được module hóa cao độ thông qua 5 packages độc lập:

- 🗄️ [`packages/database`](../packages/database): Singleton kết nối MongoDB Atlas, DNS SRV Failover (8.8.8.8, 1.1.1.1), Model Registry Bootstrap ngăn chặn MissingSchemaError.
- 📦 [`packages/models`](../packages/models): Single Source of Truth cho toàn bộ Mongoose Schemas, Base Entity (`IBaseEntity`), TypeScript Types, Zod Schemas và Application-level join helpers.
- 🔐 [`packages/auth`](../packages/auth): Hệ thống xác thực JWT (jose) với Zero-Downtime Key Rotation (`JWT_SECRET` + `JWT_SECRET_PREV`), Double-Submit CSRF, Sliding Rate Limiter, RBAC, và `withAuth` Higher-Order Function.
- 🎨 [`packages/ui`](../packages/ui): Thư viện giao diện dùng chung (Shadcn primitives, Design Tokens CSS Variables, Toast store, Theme Provider, GSAP helpers).
- ⚙️ [`packages/config-typescript`](../packages/config-typescript): Cấu hình TypeScript chia sẻ tối ưu cho Next.js 16 (`nextjs.json`), React libraries (`react-library.json`) và base (`base.json`).

---

## 📱 Các Ứng Dụng Thực Thi (`apps/*`)

- 🎓 [`apps/web`](../apps/web): Nền tảng học tập chính (Port 3000 / `fquiz-web.vercel.app`) phục vụ Học viên, Giáo viên, Khách vãng lai, Diễn đàn cộng đồng và Quiz AI Assistant thời gian thực.
- 🛡️ [`apps/admin`](../apps/admin): Cổng Quản trị Hệ thống độc lập (Port 3001 / `fquiz-admin.vercel.app`) với Zero-Trust RBAC Proxy, quản lý danh mục, đề thi chuẩn, ngân hàng câu hỏi, giải quyết conflicts và cấu hình hệ thống.

---

## 🏛️ Triết lý Thiết kế Cốt lõi (Core Principles)

1. **Text-Only Learning Scope Boundary**: Nền tảng FQuiz chỉ phục vụ học tập, thi trắc nghiệm và ôn luyện qua văn bản. Tuyệt đối không đưa vào audio/TTS/STT/3D WebGL rườm rà.
2. **Không import chéo Model & Cấm `.populate()`**: `apps/web` và `apps/admin` không tham chiếu mã nguồn của nhau; liên kết bảng dữ liệu thực hiện hoàn toàn ở tầng ứng dụng bằng batch `$in`.
3. **Server-Authoritative Quiz Engine**: Phía server không bao giờ tin tưởng client state; toàn bộ câu trả lời thi cử được chấm điểm và tổng kết trên `session.questions_cache` tại server, chống Race Condition bằng `findOneAndUpdate({ status: { $ne: 'completed' } })`.
4. **Cache & Deduplication Nội dung AI**: Băm SHA-256 nội dung yêu cầu (`requestHash`) để đối soát với collection `AIAsset` trước khi gọi Gemini API.
5. **High Performance & Accessibility**: Tất cả animations sử dụng GPU transform aliases thông qua `@gsap/react`, hỗ trợ `prefers-reduced-motion` và đạt chuẩn tương phản màu **WCAG 2.2 AA** trên cả 4 giao diện.
6. **Strict Governance & CI/CD**: Mọi thay đổi mã nguồn bắt buộc phải vượt qua bộ quy tắc nghiêm ngặt tại `node .agents/scripts/verify.js --strict` trước khi được tích hợp vào nhánh chính.
