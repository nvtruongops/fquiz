---
name: fquiz-development-workflow
description: Mandatory development workflow and architectural standards for FQuiz. Enforces module boundaries, product scope rules (text-only learning), dependency inversion, database patterns, and strict verification protocols.
version: 2.0
priority: high
---

# FQuiz Standard Development Workflow Skill

## Goal

This skill defines the mandatory engineering workflow, architectural boundaries, and quality standards for developing, refactoring, and maintaining the FQuiz platform.

Primary objectives:
- Enforce strict modular architecture and cross-module boundaries.
- Protect product scope (text-only learning; no audio/voice/OCR/3D/multimedia).
- Guarantee Quiz Engine integrity and server-side state security.
- Prevent schema corruption, race conditions, and un-handled side effects.
- Ensure 100% reliable verification via linting, typechecking, and unit tests.

---

# Scope & Architectural Boundaries

Apply this skill to all development tasks in FQuiz across:

```
app/**
components/**
lib/core/**
lib/modules/**
hooks/**
store/**
scripts/**
```

### Module Boundaries
The codebase is structured into isolated domain modules:
- `lib/modules/auth` (User, Session, JWT)
- `lib/modules/quiz` (Quiz, Session, Question Bank, Engine)
- `lib/modules/learning` (Language, Topic, Vocabulary, Lesson, FSRS)
- `lib/modules/community` (Post, Comment, Interaction)
- `lib/modules/ai` (Prompt Templates, AI Asset Dedup, AI Service)

---

# Priority Rules

## P0 (Critical — Non-Negotiable)

Must never be violated.

- **Product Scope Boundary**: Text-only learning only (vocabulary, grammar, sentences, paragraphs, quizzes, flashcards). **NEVER introduce audio, voice (TTS/STT), OCR, 3D, VR, or multimedia features**.
- **No Cross-Module Model Imports**: A module may NEVER import Mongoose models from another module's `models/` directory. Use pure ObjectId references + application-level joins (`$in` queries).
- **No Mongoose `.populate()` in Module Code**: Perform batch application-level joins using `$in` to prevent query bloat and tight coupling.
- **Server-Authoritative Quiz Processing**: Quiz answer evaluation and scoring MUST run on the server. Never trust client state. Prevent race conditions using `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.
- **Dedup AI Generation**: Always check `AIAsset` collection via `requestHash` + `responseHash` before calling LLM APIs.

---

## P1 (Required Standards)

Must be implemented whenever applicable.

- **Model Registration**: Register all models via `registerModel()` in `lib/core/db/model-registry.ts` to prevent `MissingSchemaError`.
- **Base Entity Standard**: All Phase 2+ models must extend `IBaseEntity` (`createdBy`, `updatedBy`, `deletedAt`, `status`).
- **Dependency Inversion**: Services depend on interfaces, wired through `lib/core/di/` container.
- **Database Migrations**: Scripts in `scripts/` using `tsx` must pass `--env-file=.env.local`. Always run `--dry-run` first with double-write pattern.

---

## P2 (Best Practices)

Improve code quality when possible.

- **Question ID Fingerprinting**: Use SHA-256 `generateQuestionId()` (text + options) for conflicts; `generateQuestionFingerprint()` (text + answer + type + topic) for exact dedup.
- **State Management**: TanStack Query v5 for server state, Zustand v5 for client state.
- **Structured AI Prompts**: Use Zod schemas in `lib/modules/ai/prompts/` to validate AI JSON outputs.

---

# Core Development Phases

## Phase 1 — Task & Boundary Analysis
Before writing code:
1. Verify task matches FQuiz product scope (Text-only learning).
2. Identify target module (`auth`, `quiz`, `learning`, `community`, `ai`).
3. Check for existing utilities or DI services before creating new abstractions.

## Phase 2 — Implementation Planning
1. Break work into small, independently testable subtasks.
2. Design interfaces & schema changes first.
3. Identify cache invalidation and DI registration requirements.

## Phase 3 — Execution
1. Keep diffs minimal and focused (refuse scope creep).
2. Enforce strict type safety and parameter validation.
3. Handle error states explicitly (no swallowing exceptions or returning dummy fallbacks).

## Phase 4 — Verification Protocol (Mandatory Sequence)
Run verification commands in exact order before declaring task completion:

1. **Linting**:
   ```bash
   npm run lint
   ```
2. **Typecheck & Build**:
   ```bash
   npm run build
   ```
3. **Unit Tests**:
   ```bash
   npm test
   ```

## Phase 5 — Expected Report Format
Every completed task must report:
- **Scope & Module Verification**: Confirmed boundaries respected.
- **Files Modified**: Clear list of changed files.
- **Verification Commands Executed**: Lint, build, and test status.
- **Impact & Regression Check**: Confirmation Quiz Engine and existing routes are unaffected.

---

# Validation Commands

Mandatory verification sequence before completing any task:

```bash
npm run lint
npm run build
npm test
```

If any command fails, the task is not considered complete.

---

# Success Criteria

This skill is successful when:
- All features stay strictly within text-only learning product boundaries.
- Cross-module boundaries and DI principles are respected.
- Quiz Engine integrity and server-side state safety are preserved.
- Database access uses application-level joins without `.populate()`.
- Code changes pass `lint`, `build`, and `test` cleanly.
