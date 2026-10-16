# 📚 FQuiz — Documentation Hub

Welcome to the comprehensive technical documentation hub for the **FQuiz** platform. This hub serves as the authoritative guide for developers, system architects, DevOps engineers, and AI agents contributing to the project.

---

## 🗺️ Documentation Index

| Section | Document | Core Focus | Target Audience |
|---|---|---|---|
| 🏗️ | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Pure Symmetrical Turborepo Monorepo specification (`apps/web`, `apps/admin`, `packages/*`), 8 Invariants, Data Flow, AI Pipeline | All Engineers |
| 📐 | [`DESIGN.md`](./DESIGN.md) | Comprehensive technical design: Data Models, Mongoose Schemas, Quiz Engine, AI Pipeline | Fullstack Devs |
| 🌐 | [`DESIGN_ROUTES.md`](./DESIGN_ROUTES.md) | Catalog of Page Routes for Student Web Portal (`apps/web`) & Admin Portal (`apps/admin`) | Frontend Devs |
| 🎨 | [`DESIGN_THEME.md`](./DESIGN_THEME.md) | 3-Tier Design Tokens standard, 4 Themes (Light, Dark, Green, Pink), WCAG 2.2 AA Baseline | UI/UX, Frontend |
| 🔌 | [`API.md`](./API.md) | Complete REST API catalog for Web & Admin (`apps/web/app/api`, `apps/admin/app/api`), Auth guards & Error codes | Fullstack, Mobile |
| 🛡️ | [`SECURITY.md`](./SECURITY.md) | Security architecture: Token Rotation, Double-Submit CSRF, Rate Limiting, CSP, Audit Logs | SecOps, Backend |
| 🧪 | [`TESTING.md`](./TESTING.md) | Testing strategy: Jest (66 suites), Playwright Multi-Server E2E (57 tests), AI Rule Engine (`verify.js`) | QA, Devs, Agents |
| 🚀 | [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Monorepo deployment guide (Dual Vercel Projects: `fquiz-web` & `fquiz-admin`), MongoDB Atlas, CI/CD | DevOps, Leads |
| 📊 | [`REPO_AUDIT_REPORT.md`](./REPO_AUDIT_REPORT.md) | Comprehensive repository audit: Scorecard, oversized files, shadow models & refactor roadmap | Architects, Devs |
| 🔍 | [`DATABASE_VECTOR_AI_AUDIT.md`](./DATABASE_VECTOR_AI_AUDIT.md) | Rigorous audit of Vector Indexes, database query logic & AI Retrieval RAG Pipeline | DBAs, AI Devs |
| 🤖 | [`AI_CHATBOT_SPEC.md`](./AI_CHATBOT_SPEC.md) | Comprehensive specification for multi-context AI Chatbot across FQuiz (Student, Teacher, Community, Admin) | AI Devs, Architects |
| 🤖 | [`AGENTS.md`](../.agents/AGENTS.md) | AI Agent Guide: Rule governance, CI/CD Engine, CodeGraph, Ponytail mode | AI Agents, Devs |

---

## 📦 Shared Packages (`packages/*`)

The codebase is highly modularized into 5 independent shared packages:

- 🗄️ [`packages/database`](../packages/database): Singleton MongoDB Atlas connection pool, DNS SRV Failover (8.8.8.8, 1.1.1.1), Model Registry Bootstrap preventing MissingSchemaError in serverless environments.
- 📦 [`packages/models`](../packages/models): Single Source of Truth for all Mongoose Schemas, Base Entity (`IBaseEntity`), TypeScript Types, Zod Schemas, and application-level join helpers.
- 🔐 [`packages/auth`](../packages/auth): JWT authentication engine (jose) with zero-downtime key rotation (`JWT_SECRET` + `JWT_SECRET_PREV`), Double-Submit CSRF, sliding window rate limiting, RBAC, and `withAuth` Higher-Order Functions.
- 🎨 [`packages/ui`](../packages/ui): Shared UI primitives library (Shadcn primitives, CSS variable design tokens, Toast store, Theme Provider, GSAP animation helpers).
- ⚙️ [`packages/config-typescript`](../packages/config-typescript): Shared TypeScript configurations tailored for Next.js 16 (`nextjs.json`), React libraries (`react-library.json`), and base environments (`base.json`).

---

## 📱 Applications (`apps/*`)

- 🎓 [`apps/web`](../apps/web): Primary learning platform (Port 3000 / `example.invalid`) serving Students, Teachers, Guests, Community Forums, and the real-time Quiz AI Assistant.
- 🛡️ [`apps/admin`](../apps/admin): Standalone System Admin Portal (Port 3001 / `example.invalid`) featuring a Zero-Trust RBAC Proxy, category management, standardized quizzes, question banks, conflict resolution, and system configuration.

---

## 🏛️ Core Design Principles

1. **Text-Only Learning Scope Boundary**: FQuiz is strictly dedicated to text-based learning, quizzes, and knowledge mastery. Audio, voice (TTS/STT), OCR, 3D WebGL, and heavy multimedia features are strictly prohibited.
2. **No Direct Cross-Module Model Imports & No `.populate()`**: `apps/web` and `apps/admin` never reference each other directly. Database relationships are joined exclusively at the application level using batch `$in` queries.
3. **Server-Authoritative Quiz Engine**: The server never trusts client-submitted scores or states. All quiz sessions are evaluated and aggregated against the server's `session.questions_cache`, with race conditions prevented via `findOneAndUpdate({ status: { $ne: 'completed' } })`.
4. **AI Content Deduplication & Caching**: SHA-256 hashes of prompt payloads (`requestHash`) are matched against the `AIAsset` collection before executing external Gemini API calls.
5. **High Performance & Accessibility**: All UI animations leverage GPU transform aliases via `@gsap/react`, support `prefers-reduced-motion`, and guarantee **WCAG 2.2 AA** color contrast across all 4 themes.
6. **Strict Governance & CI/CD**: Every code change must pass the strict governance rule engine (`node .agents/scripts/verify.js --strict`) before integration into main branches.
