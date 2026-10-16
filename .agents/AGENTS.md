# FQuiz — Agent Guide

Pure Symmetrical Turborepo Monorepo Next.js 16 App Router project (`apps/web` for Web Student & Teacher on port 3000, `apps/admin` for Standalone Admin Portal on port 3001, `packages/*` for shared libraries). MongoDB/Mongoose (Atlas), React 18, Tailwind CSS 3, shadcn/ui.

> **Key docs**: [`docs/README.md`](../docs/README.md) (Central Docs Hub), [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (Master Architecture Specification), [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) (Monorepo deployment & operations guide), [`docs/DESIGN.md`](../docs/DESIGN.md) (Full technical design), [`docs/SECURITY.md`](../docs/SECURITY.md), [`docs/TESTING.md`](../docs/TESTING.md).

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Launch Web (`:3000`) & Admin (`:3001`) concurrently via Turborepo |
| `npm run dev:web` | Run Next.js dev server for Web (`apps/web` `:3000`) |
| `npm run dev:admin` | Run Next.js dev server for Admin (`apps/admin` `:3001`) |
| `npm run build` | Next.js production build for entire monorepo (`apps/web` + `apps/admin`) |
| `npm run build:web` | Next.js production build for Web (`apps/web`) |
| `npm run build:admin` | Next.js production build for Admin (`apps/admin`) |
| `npm run check-types` | TypeScript type-check across all 7 workspaces (`apps/*` & `packages/*`) |
| `npm run lint` | ESLint across entire monorepo |
| `npm test` | Jest unit & integration tests (66 suites, 430 tests) |
| `npx playwright test` | Playwright multi-server E2E tests (57 tests) |
| `node .agents/scripts/verify.js --strict` | Rule Engine Verification (18 checks - Strict Mode) |

## Architecture

- **Workspaces**:
  - `apps/web`: Web Student/Teacher (`@fquiz/web` / Port 3000 / `fquiz-web.vercel.app`). Route groups: `(auth)`, `(student)`, `(teacher)`, `quiz/`, `community/`, `explore/`.
  - `apps/admin`: Standalone Admin Portal (`@fquiz/admin` / Port 3001 / `fquiz-admin.vercel.app`). Route structure: `app/(dashboard)/` (`categories`, `feedback`, `question-bank`, `quizzes`, `settings`, `users`), `app/api/`.
  - `packages/database`: Singleton MongoDB Atlas connection, DNS SRV fallback, Model Registry.
  - `packages/models`: Single Source of Truth for Mongoose Schemas, Base Entity (`IBaseEntity`), Zod Schemas.
  - `packages/auth`: JWT Rotation (`jose`), Double-Submit CSRF, Sliding Rate Limiter, RBAC, `withAuth`.
  - `packages/ui`: Shadcn primitives, 3-Tier Design Tokens, 4 Themes (WCAG 2.2 AA), Toast store, GSAP helpers.
  - `packages/config-typescript`: Shared TSConfig presets.
- **Middleware**: `apps/web/proxy.ts` (Web: redirects `/admin` to `NEXT_PUBLIC_ADMIN_URL`, isolates `/api/admin` with 404). `apps/admin/proxy.ts` (Admin: Zero-trust RBAC proxy).
- **Auth**: JWT with rotation (`JWT_SECRET` + `JWT_SECRET_PREV`). Cookie + Bearer token. Shared between Web and Admin via cross-app tokens.
- **CSRF**: Double-submit cookie. `csrf-token` cookie (httpOnly:false, sameSite:strict). Mutations must include `x-csrf-token` header matching the cookie.
- **API routes**: Web `apps/web/app/api/`. Admin `apps/admin/app/api/`.
- **Quiz engine**: Server-side answer processing only. Never trusts client state. Race condition prevention uses `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.

## Code Intelligence & Navigation (`.codegraph`)

- **CodeGraph Database**: Located at `.codegraph/codegraph.db`.
- **CLI Commands**:
  - `npm run codegraph:sync`: Update graph index after adding/modifying files.
  - `codegraph status`: Inspect total files, nodes, and edges indexed.
  - `codegraph query <symbol>`: Search for functions, interfaces, or classes.
  - `codegraph callers <symbol>` / `codegraph callees <symbol>`: Trace call chains.
  - `codegraph impact <symbol>`: Analyze affected files before refactoring.

## Development Style & Workflow Standards

- **Mandatory 3-Phase Agent Workflow**:
  1. **Pre-Task / Conversation Start**: ALWAYS invoke [`using-superpowers`](./skills/using-superpowers/SKILL.md). Check and invoke relevant skills BEFORE any action or response.
  2. **During Task Execution**: ALWAYS apply [`ponytail`](./skills/ponytail/SKILL.md) (Lazy Senior Developer mode). Enforce YAGNI, standard library first, shortest working diff, root-cause fixes.
  3. **Pre-Completion Verification**: ALWAYS run [`verification-before-completion`](./skills/verification-before-completion/SKILL.md) and `node .agents/scripts/verify.js --strict`.

- **Lazy Senior Developer Principles ([`ponytail`](./skills/ponytail/SKILL.md))**:
  1. **YAGNI**: Don't build unused abstractions or boilerplate.
  2. **Reuse Existing**: Use packages in `packages/*` and built-in helpers in stdlib.
  3. **Shortest Working Diff**: Minimal diffs that solve the root cause.
  4. **Root-Cause Fix**: Patch shared packages/guards at the root.

## Module Architecture

- **No cross-module model imports**. Business modules only import models through `@fquiz/models`.
- **No Mongoose `.populate()`**. Use batch queries with `$in` for application-level joins.
- **Model Registry**: Modules register models via `registerModel()`. `bootstrapModels()` runs on connect to prevent MissingSchemaError in serverless routes.
- **Base entity**: All models extend `IBaseEntity`.

## UI/UX & Experience Modes Architecture

- **4 Experience Modes Mental Model** (Reference [`fquiz-ui-ux-audit`](./skills/fquiz-ui-ux-audit/SKILL.md)):
  1. `Learn Mode`: 3D Flashcards, Instant Explanations, AI Assistant, Swipe Gestures with Undo.
  2. `Practice Mode`: Multi-category Mix Quiz, Retry Wrong Questions, Smart Filters.
  3. `Exam Mode`: EOS-standard minimalist UI, ALL AI & Distracting Widgets DISABLED, Authoritative Multi-tab lock, Maximum Exam State Preservation.
  4. `Result & Mastery Mode`: Visual score analysis, Auto-focus first incorrect question, Knowledge mastery level radar/charts.
- **Mission-Critical Exam Reliability**: Exam completion and state preservation rate $\ge 99.9\%$.
- **In-Place Re-auth Mandate**: Strictly no redirect to `/login` upon 401 in exam rooms (`/session/*`). Mandatory In-Place Re-auth Modal to preserve client memory state.
- **Authoritative Multi-Tab Lease**: Use `BroadcastChannel` to lock submission authority to a single active tab.
- **Mobile Safe-Area Inset**: Apply `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))` across all mobile footers.
- **Dual-Track Audit Protocol**: UI/UX audit reports must strictly differentiate between *Engineering Quality* and *Empirically Validated UX*.

## AI Content

- **Product scope**: Text-only learning (vocabulary, grammar, sentences, paragraphs, quizzes, flashcards). No audio, voice (TTS/STT), OCR, 3D, VR, or multimedia.
- **Dedup before generation**: Check `AIAsset` collection via `requestHash` + `responseHash` before calling Gemini API. AIAsset has unique index on `{ requestHash: 1, aiProvider: 1 }`.
- **Prompt templates**: Validate structured JSON output from AI with Zod schemas.
- **Exam Integrity**: The AI Assistant is strictly prohibited from appearing or intervening in simulated exams (`Exam Mode`).

## Testing & Verification Standard

- **Environment**: Node (not jsdom).
- **Pattern**: `**/__tests__/**/*.test.{ts,tsx}` and `e2e/**/*.spec.ts`.
- **Routine Verification (Default after every task)**:
  `npm run lint` → `npm run check-types` → `npm test` → `node .agents/scripts/verify.js --strict`
- **E2E Playwright Tests (`npx playwright test`)**:
  Executed on-demand only (Release testing), NOT run by default after routine development tasks to optimize response latency.

## GSAP UI/UX Animation Standards

- **React 18 Integration**: Always use `@gsap/react` via `useGSAP()` hook for automatic scoping (`scope` container ref) and unmount context cleanup (`ctx.revert()`).
- **GPU Performance First**: Animate transform aliases (`x`, `y`, `scale`, `rotation`, `autoAlpha`). Never animate layout properties (`width`, `height`, `top`, `left`).
- **Accessibility (`prefers-reduced-motion`)**: Use `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)` to disable non-essential motion.
- **Text-Only Scope**: NO 3D WebGL scenes, NO particle canvases, NO audio/voice synchronization.
