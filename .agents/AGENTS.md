# FQuiz — Agent Guide

Single Next.js 16 App Router project (not monorepo). MongoDB/Mongoose (Atlas), React 18, Tailwind CSS 3, shadcn/ui.

> **Key docs**: [`docs/README.md`](../docs/README.md) (Central Docs Hub), [`DESIGN.md`](../DESIGN.md) (Full technical design), [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), module READMEs at [`lib/modules/*/README.md`](../lib/modules/), [`lib/core/README.md`](../lib/core/README.md).

## Commands

| Command | What |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Next.js build (includes typecheck) |
| `npm run lint` | ESLint (`app components lib hooks store`) |
| `npm test` | Jest (Node env, unit tests only) |
| `npm run test:coverage` | Jest with coverage |
| `npm run seed:<target>` | Seed scripts (`public-quizzes`, `users`). Always pass `--env-file=.env.local` (handled in package.json). |
| `npm run migrate:*` | Migration scripts, also need `.env.local` |
| `codegraph sync` | Sync CodeGraph symbol index in `.codegraph/` |
| `node .agents/scripts/verify.js --strict` | Rule Engine Verification (Strict Mode) |

## Architecture

- **Route groups**: `(auth)`, `(student)`, `(teacher)`, `(admin)/admin`
- **Middleware**: `proxy.ts` (Node.js runtime). Handles: mobile redirect, CORS, maintenance mode, CSRF double-submit cookie, JWT auth, role routing (student vs admin). Matches all paths.
- **Auth**: JWT with rotation (`JWT_SECRET` + `JWT_SECRET_PREV`). Cookie + Bearer token. Token version bumps on ban/password change.
- **CSRF**: Double-submit cookie. `csrf-token` cookie (httpOnly:false, sameSite:strict). Mutations must include `x-csrf-token` header matching the cookie. Exempt: public paths + auth endpoints + cron jobs.
- **API routes**: `app/api/`. Admin routes at `/api/admin/*`. Public API v1 at `/api/v1/public/*`, `/api/v1/explore/*`. AI API at `/api/v1/ai/*`. Community at `/api/community/*`.
- **DI container**: `lib/core/di/` — lightweight (no decorators). Registers `IEventBus`, `ICache`, `ISearchProvider`, `IAIProvider`.
- **Event bus**: `lib/core/events/` — `IEventBus` (domain/integration) + `InMemoryEventBus`. Legacy `EventBus` (simple on/emit) still used by AIContentService.
- **Cache**: `lib/core/cache/` — `InMemoryCache` (Map-based, TTL + tag invalidation).
- **State**: TanStack Query v5 (server state) + Zustand v5 (client state, `quiz-session` persisted to localStorage).
- **Quiz engine**: `lib/modules/quiz/quiz-engine.ts`. Server-side answer processing only. Never trusts client state. Race condition prevention uses `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.

## Code Intelligence & Navigation (`.codegraph`)

- **CodeGraph Database**: Located at `E:\Code\fquiz\.codegraph/codegraph.db`.
- **CLI Commands**: Use `codegraph` CLI tool for querying symbols, graph status, impact analysis, and syncing:
  - `codegraph sync`: Update graph index after adding/modifying files.
  - `codegraph status`: Inspect total files, nodes, and edges indexed.
  - `codegraph query <symbol>`: Search for functions, interfaces, or classes.
  - `codegraph callers <symbol>` / `codegraph callees <symbol>`: Trace call chains.
  - `codegraph impact <symbol>`: Analyze affected files before refactoring.

## Development Style & Ponytail Mode (`/ponytail`)

- **Lazy Senior Developer Principles**:
  1. **YAGNI**: Don't build unused abstractions, helpers, or unrequested feature variations.
  2. **Reuse Existing**: Use built-in helpers in `lib/core/utils/`, stdlib, or installed dependencies.
  3. **Standard Library & Native Features First**: Prefer native JS/TS methods, `URL`, `Promise.all`, `Set`/`Map`, and standard hooks.
  4. **Shortest Working Diff**: Minimal diffs that solve the root cause. Deletion over addition. Boring over clever.
  5. **Root-Cause Fix**: Patch shared functions/guards at the root rather than patching single callers.
  6. **Single-Line Solutions**: If a operation can be done cleanly in 1-2 lines using native JS/TS, don't write multi-line boilerplate.

## Module Architecture

- **No cross-module model imports**. Modules (quiz, auth, classroom, community, ai) may only import their own `models/`. Cross-module data access uses pure ObjectId references + application-level joins via repository/service interfaces.
- **No Mongoose `.populate()`** in module code. Use batch queries with `$in` for application-level joins.
- **Dependency inversion**: Services depend on interfaces, wired via `lib/core/di/` container.
- **Model Registry** (`lib/core/db/model-registry.ts`): Modules register models via `registerModel()`. `bootstrapModels()` runs on connect to prevent MissingSchemaError in serverless routes.
- **Base entity** (`lib/core/types/base-entity.ts`): All Phase 2+ models extend `IBaseEntity` (adds `createdBy`, `updatedBy`, `deletedAt`, `status: draft|pending|published|archived|deleted`).

## AI Content

- **Product scope**: Text-only learning (vocabulary, grammar, sentences, paragraphs, quizzes, flashcards). No audio, voice (TTS/STT), OCR, 3D, VR, or multimedia.
- **Dedup before generation**: Check `AIAsset` collection via `requestHash` + `responseHash` before calling Gemini API. AIAsset has unique index on `{ requestHash: 1, aiProvider: 1 }`.
- **Prompt templates**: `lib/modules/ai/prompts/`. Use Zod schemas to validate structured JSON output from AI.

## Testing

- **Environment**: Node (not jsdom). `jest.setup.ts` sets `JWT_SECRET`, `MONGODB_URI`, `NODE_ENV=test`.
- **Pattern**: `**/__tests__/**/*.test.{ts,tsx}`. Excluded from tsconfig typecheck.
- **Mocks**: `jest.mock('next/server')`, `jest.mock('@/lib/core/db/mongodb')`, `jest.mock('@/lib/modules/auth/with-auth')`.
- Coverage excludes `models/`, `schemas/`, `constants/`, `quiz-import/`. Low thresholds (lines 5%).
- **Verification order**: `npm run lint` → `npm run build` (typecheck) → `npm test`.

## Database

- Singleton connection via `lib/core/db/mongodb.ts` (`global.mongooseCache`).
- DNS fallback: if `querySrv` fails, retries with 8.8.8.8 / 1.1.1.1.
- Models pre-registered via side-effect imports in module directories.
- **Migrations**: Scripts in `scripts/` use `tsx --env-file=.env.local`. Always run `--dry-run` first. Double-write pattern (keep old + new fields) for zero-downtime. Verify with `scripts/verify-migration.ts`.

## Security

- **CSP**: `next.config.js`. Report-only in dev, enforced in production (header swap by `NODE_ENV`).
- **Rate limiting**: `lib/core/security/rate-limit/` — public API only.
- **Logging**: Pino with redacted fields (password, token, email, cookie, auth header).

## GSAP UI/UX Animation Standards

- **React 18 Integration**: Always use `@gsap/react` via `useGSAP()` hook for automatic scoping (`scope` container ref) and unmount context cleanup (`ctx.revert()`).
- **UI/UX Micro-Interactions**:
  - Flashcard 3D perspective flip (`rotationY: 180`, `backfaceVisibility: hidden`).
  - Quiz option list staggered entrances (`autoAlpha`, `y`, `stagger: 0.06`).
  - Smooth progress bar filling (`scaleX` / `xPercent` transform instead of `width`).
  - Card hover micro-interactions (`scale: 1.02`, `y: -4` via `contextSafe()`).
- **GPU Performance First**: Animate transform aliases (`x`, `y`, `scale`, `rotation`, `autoAlpha`). Never animate layout-thrashing CSS properties (`width`, `height`, `top`, `left`).
- **Accessibility (`prefers-reduced-motion`)**: Use `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)` to set `duration: 0` or disable non-essential motion.
- **Text-Only Scope**: NO 3D WebGL scenes, NO particle canvases, NO audio/voice synchronization. Keep animations strictly focused on text-based UI/UX.
- **Skills Reference**: Workspace skill [`fquiz-gsap-ui-ux`](./skills/fquiz-gsap-ui-ux/SKILL.md) and global skills (`gsap-core`, `gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-performance`, `gsap-plugins`, `gsap-utils`).

## AI Agent Governance & CI/CD Engine

- **GitHub Actions CI/CD**: Workflow at `.github/workflows/ci.yml`. Triggers on push/PR to `main` and `develop`. Executes: `node .agents/scripts/verify.js --strict` → `npm ci` → `npm run lint` → `npm test` → `npm run build`.
- **Rule Engine Verification**: `node .agents/scripts/verify.js --strict` (CLI options: `--strict`, `--json`, `--sarif`, `--category`, `--rule`).
- **Governance System**:
  - `manifest.json`: System metadata and target stack definitions (`nextjs-16`, `mongodb-mongoose`, `react-18`, `tailwind-3`).
  - `pipeline.json`: DAG workflow execution stages for AI Agent task orchestration.
  - `registry.json`: Central registry of skills and capabilities.
  - `policies/`: Policy rules (`build-type-check`, `code-quality-security`, `cross-module-boundary`, `eslint-validation`, `folder-structure`, `lint-issues`, `no-mock-data`, `skills-governance`).
  - `scripts/rules/`: Enforces TypeScript compilation, ESLint & SonarJS audit, security audit, cross-module boundary isolation, folder structure, lint hygiene, and skills registration integrity.

## Quirks & Conventions

- `.npmrc` has `legacy-peer-deps=true` — use `npm install` (not pnpm/yarn).
- Path alias: `@/` → `./` (used everywhere).
- Scripts using `tsx` must pass `--env-file=.env.local`. Dev server auto-loads `.env.local`.
- CI Pipeline configured via GitHub Actions (`.github/workflows/ci.yml`) alongside Vercel auto-deploy from `main` branch.
- No pre-commit hooks, no lint-staged.
- `tsconfig.json` excludes `scripts/` and `__tests__` from compilation.
- `jose` is ESM — Jest transform-whitelisted in config.
- Quiz question IDs use SHA-256: `generateQuestionId()` (text + options, no answer) for conflicts; `generateQuestionFingerprint()` (includes answer + type + topic) for exact dedup.
- **Task Workflow**: If a task is long/complex (multi-step, major refactor, new feature), use `using-superpowers` to create an `implementation_plan.md` artifact first. If a task is short/simple (bugfix, small tweak, investigation), execute immediately without planning overhead.
