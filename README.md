# 🎓 FQuiz — Intelligent Quiz & Exam Preparation Platform

<p align="center">
  <strong>An online quiz and exam platform featuring smart question bank management, classroom assignment workflows, and real-time AI assistance.</strong>
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

## 🌟 Key Features

- ⚡ **3 Flexible Exam & Practice Modes**: Instant question-by-question scoring (`Immediate`), end-of-session submission (`Review`), and 3D card flipping (`Flashcard`).
- 🤖 **Quiz AI Assistant**: Real-time answer breakdown, mistake explanation, and conceptual question lookup in the question bank (supports Gemini, OpenAI, and custom endpoints).
- 📚 **Question Bank**: Automatic conflict reconciliation, course-level synchronization (`course_code`), and reusable question lifecycle management.
- 🏫 **Classrooms & Assignments**: Teachers create classes, assign timed quizzes with deadlines, and monitor student score distributions; students join quickly via class codes.
- 🔀 **Mix Quiz**: Dynamically combine and shuffle questions across multiple quizzes and categories into a custom practice test.
- 🎨 **Design System & Accessibility**: 4 distinct theme modes (`Light`, `Dark`, `Green`, `Pink`) adhering to **WCAG 2.2 AA** contrast ratios with smooth `@gsap/react` micro-interactions.
- 🛡️ **Defense-in-Depth Security**: JWT rotation, Double-Submit CSRF cookie protection, sliding window rate limiting, and zero-trust proxy boundaries.

---

## 🛠️ Tech Stack & Monorepo Architecture

| Subsystem | Technology / Library |
|---|---|
| **Monorepo Engine** | [Turborepo 2.x](https://turbo.build/) + npm Workspaces |
| **Applications** | `apps/web` (Student & Teacher Portal :3000) + `apps/admin` (System Admin Portal :3001) |
| **Shared Packages** | `@fquiz/database`, `@fquiz/models`, `@fquiz/auth`, `@fquiz/ui`, `@fquiz/config-typescript` |
| **Core Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 18](https://react.dev/) |
| **Language** | [TypeScript 5 (Strict Mode)](https://www.typescriptlang.org/) |
| **Database & ODM** | [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose 9](https://mongoosejs.com/) |
| **UI & Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives) |
| **Micro-Animations** | [GSAP](https://gsap.com/) (`@gsap/react` with GPU Transforms) + [Framer Motion 12](https://motion.dev/) |
| **State Management** | [TanStack React Query v5](https://tanstack.com/query) (Server State) + [Zustand v5](https://zustand-demo.pmnd.rs/) (Client State) |
| **AI Integration** | [Google Gemini API](https://ai.google.dev/) (`@google/generative-ai`) + [OpenAI API](https://platform.openai.com/) |
| **Auth & Security** | [jose](https://github.com/panva/jose) (JWT Rotation), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), Double-Submit CSRF, [Pino](https://getpino.io/) |
| **Testing & CI/CD** | [Jest](https://jestjs.io/), [ts-jest](https://kulshekhar.github.io/ts-jest/), [fast-check](https://fast-check.dev/), [Playwright](https://playwright.dev/), [ESLint](https://eslint.org/), GitHub Actions |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** 18.18+ or 20+
- **npm** (repository uses `.npmrc` configured with `legacy-peer-deps=true`)
- MongoDB connection string (MongoDB Atlas or local MongoDB 7+)

### 2. Installation & Setup

```bash
# 1. Clone repository
git clone https://github.com/nvtruongops/fquiz.git
cd fquiz

# 2. Install monorepo dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Set MONGODB_URI, JWT_SECRET, etc. in .env.local

# 4. Seed initial database records (optional)
npm run seed                 # Create sample admin & student accounts
npm run seed:public-quizzes  # Create sample public quiz banks

# 5. Launch both Web (:3000) and Admin (:3001) concurrently
npm run dev
```

Open your browser:
- 🎓 **Student & Teacher Web Portal**: [http://localhost:3000](http://localhost:3000)
- 🛡️ **Admin Portal**: [http://localhost:3001](http://localhost:3001)

---

## 📜 Common Scripts & Commands

| Command | Description |
|---|---|
| `npm run dev` | Run Web (`:3000`) and Admin (`:3001`) concurrently via Turborepo |
| `npm run dev:web` | Run Web portal independently (`http://localhost:3000`) |
| `npm run dev:admin` | Run Admin portal independently (`http://localhost:3001`) |
| `npm run build` | Build entire monorepo for production (`apps/web` + `apps/admin`) |
| `npm run build:web` | Build Web application for production |
| `npm run build:admin` | Build Admin application for production |
| `npm run lint` | Run ESLint code quality and security checks (0 errors) |
| `npm run check-types` | Run TypeScript type checks across all 7 workspaces via Turborepo |
| `npm test` | Run all 66 Jest unit and property-based test suites (430 tests) |
| `npx playwright test` | Run all 57 Playwright multi-server E2E tests (`:3000` & `:3001`) |
| `npm run codegraph:sync` | Synchronize CodeGraph AST index (`.codegraph/`) |
| `node .agents/scripts/verify.js --strict` | Run AI Agent Governance Rule Engine (18 strict checks) |

---

## 📂 Monorepo Structure (Pure Symmetrical Monorepo)

```
fquiz/
├── apps/
│   ├── web/                            # 🎓 Student & Teacher Web Portal (Port 3000 / @fquiz/web)
│   │   ├── app/                        # Next.js 16 App Router ((auth), (student), (teacher), quiz, community)
│   │   ├── components/                 # Web UI Components (Quiz, Classroom, Community, AI)
│   │   ├── hooks/                      # Custom React Hooks
│   │   ├── store/                      # Zustand Stores (quiz-session, toast)
│   │   ├── lib/                        # Web Services & Feature Modules
│   │   └── proxy.ts                    # Web Edge Proxy Middleware
│   │
│   └── admin/                          # 🛡️ Admin Portal (Port 3001 / @fquiz/admin)
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
├── docs/                               # 📚 Technical Documentation Hub
├── scripts/                            # CLI Tools: Seeders, Migrations, Audits, Benchmarks
└── .agents/                            # AI Agent Governance, Rule Engine & Pipeline Policies
```

---

## 📚 Technical Documentation Hub (`docs/`)

For in-depth architectural specifications, API schemas, security policies, and technical designs, refer to the **[Documentation Hub](file:///d:/Code/fquiz/docs/README.md)**:

| Document | Core Focus | Link |
|---|---|:---:|
| 🏛️ **Master Architecture** | Pure Symmetrical Monorepo, 8 Invariants, Data Flow, AI Pipeline, Package Matrix | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 📐 **Technical Design Specification** | Data Models, Mongoose Schemas, Quiz Engine Lifecycle, AI Pipeline | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 🔌 **API Catalog (80+ Endpoints)** | Request/Response contracts, Auth roles, Query parameters, Error codes | [`docs/API.md`](./docs/API.md) |
| 🛡️ **Security Architecture** | Token Rotation, Double-Submit CSRF, Content Security Policy (CSP), Rate Limiting | [`docs/SECURITY.md`](./docs/SECURITY.md) |
| 🧪 **Testing Strategy** | Jest Unit Tests (66 suites), Playwright Multi-Server E2E, AI Rule Engine | [`docs/TESTING.md`](./docs/TESTING.md) |
| 🚀 **Deployment & Operations Guide** | Dual Vercel Projects, MongoDB Atlas, Environment Variables, Migrations | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| 🌐 **Route Catalog** | Complete Page Route Mapping for Web & Admin Portals | [`docs/DESIGN_ROUTES.md`](./docs/DESIGN_ROUTES.md) |
| 🎨 **Design Tokens & Themes** | 3-Tier Design Tokens, 4 Theme Modes, and WCAG 2.2 AA Contrast Compliance | [`docs/DESIGN_THEME.md`](./docs/DESIGN_THEME.md) |
| 🤖 **AI Agent Governance** | Code quality governance, CI/CD Engine, CodeGraph, and Ponytail workflow | [`.agents/AGENTS.md`](./.agents/AGENTS.md) |

---

## 🛡️ Contribution & Verification Standards

This repository enforces strict code quality and security standards. Before creating a Pull Request, ensure all checks pass:
```bash
node .agents/scripts/verify.js --strict && npm run lint && npm test && npm run build
```

© 2026 FQuiz Team. All rights reserved.
