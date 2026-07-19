# FQuiz — Agent Guide

Single Next.js 16 App Router project (not monorepo). MongoDB/Mongoose (Atlas), React 18, Tailwind CSS 3, shadcn/ui.

> **Key docs**: [`DESIGN.md`](./DESIGN.md) (full technical design), module READMEs at [`lib/modules/*/README.md`](./lib/modules/), [`lib/core/README.md`](./lib/core/README.md).

## Commands

| Command | What |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Next.js build (includes typecheck) |
| `npm run lint` | ESLint (`app components lib hooks store`) |
| `npm test` | Jest (Node env, unit tests only) |
| `npm run test:coverage` | Jest with coverage |
| `npm run seed:<target>` | Seed scripts (`language`, `topic`, `vocabulary`, `public-quizzes`, `users`). Always pass `--env-file=.env.local` (handled in package.json). |
| `npm run migrate:*` | Migration scripts, also need `.env.local` |

Seed order: `seed:language` → `seed:topic`. `seed:learning` runs both.

## Architecture

- **Route groups**: `(auth)`, `(student)`, `(admin)/admin`
- **Middleware**: `proxy.ts` (Node.js runtime). Handles: mobile redirect, CORS, maintenance mode, CSRF double-submit cookie, JWT auth, role routing (student vs admin). Matches all paths.
- **Auth**: JWT with rotation (`JWT_SECRET` + `JWT_SECRET_PREV`). Cookie + Bearer token. Token version bumps on ban/password change.
- **CSRF**: Double-submit cookie. `csrf-token` cookie (httpOnly:false, sameSite:strict). Mutations must include `x-csrf-token` header matching the cookie. Exempt: public paths + auth endpoints + mail job.
- **API routes**: `app/api/`. Admin routes at `/api/admin/*`. Public API v1 at `/api/v1/public/*`, `/api/v1/explore/*`. Learning API at `/api/v1/learning/*`. AI API at `/api/v1/ai/*`. Community at `/api/community/*`.
- **DI container**: `lib/core/di/` — lightweight (no decorators). Registers `IEventBus`, `ICache`, `ISearchProvider`, `IAIProvider`. Learning module uses DI for repos/services.
- **Event bus**: `lib/core/events/` — `IEventBus` (domain/integration) + `InMemoryEventBus`. Legacy `EventBus` (simple on/emit) still used by AIContentService, VocabularyService.
- **Cache**: `lib/core/cache/` — `InMemoryCache` (Map-based, TTL + tag invalidation). Used for lesson content, course structure caching.
- **State**: TanStack Query v5 (server state) + Zustand v5 (client state, `quiz-session` persisted to localStorage).
- **Quiz engine**: `lib/modules/quiz/quiz-engine.ts`. Server-side answer processing only. Never trusts client state. Race condition prevention uses `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.
- **Learning engine**: `lib/modules/learning/` — 15 models (IBaseEntity), 10 repositories, 5 services, FSRS review engine, wired via DI. See [`lib/modules/learning/README.md`](./lib/modules/learning/README.md).

## Module Architecture

- **No cross-module model imports**. Modules (quiz, auth, learning, community, ai) may only import their own `models/`. Cross-module data access uses pure ObjectId references + application-level joins via repository/service interfaces.
- **No Mongoose `.populate()`** in module code. Use batch queries with `$in` for application-level joins.
- **Dependency inversion**: Services depend on interfaces, wired via `lib/core/di/` container. Learning module follows this; legacy modules (quiz, auth) import directly.
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

## Quirks & Conventions

- `.npmrc` has `legacy-peer-deps=true` — use `npm install` (not pnpm/yarn).
- Path alias: `@/` → `./` (used everywhere).
- Scripts using `tsx` must pass `--env-file=.env.local`. Dev server auto-loads `.env.local`.
- No CI pipeline beyond Vercel auto-deploy from `main` branch (Singapore region `sin1`).
- No pre-commit hooks, no lint-staged.
- `tsconfig.json` excludes `scripts/` and `__tests__` from compilation.
- `jose` is ESM — Jest transform-whitelisted in config.
- Quiz question IDs use SHA-256: `generateQuestionId()` (text + options, no answer) for conflicts; `generateQuestionFingerprint()` (includes answer + type + topic) for exact dedup.
