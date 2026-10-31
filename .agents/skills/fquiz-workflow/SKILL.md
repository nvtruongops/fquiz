---
name: fquiz-development-workflow
description: Mandatory development workflow and architectural standards for FQuiz. Enforces Pure Symmetrical Monorepo boundaries, text-only learning product scope, dependency inversion, database patterns, local-only validation before git push, and strict zero-cloud-CI/CD verification protocols.
version: 2.3
priority: high
---

# FQuiz Standard Development Workflow

## Architectural & Product Scope Invariants

1. **Text-Only Scope Boundary**: FQuiz is strictly text-only (vocabulary, grammar, sentences, paragraphs, quizzes, flashcards). **NEVER introduce audio, voice (TTS/STT), OCR, 3D, VR, or multimedia features**.
2. **Pure Symmetrical Monorepo Architecture**:
   - `apps/web`: Web Student, Teacher, Guest, Community, AI Assistant (Port 3000 / `@fquiz/web`).
   - `apps/admin`: Standalone Admin Portal with Zero-Trust Proxy (Port 3001 / `@fquiz/admin`).
   - `packages/*`: Shared libraries (`@fquiz/database`, `@fquiz/models`, `@fquiz/auth`, `@fquiz/ui`, `@fquiz/config-typescript`).
3. **No Direct Model/Cross-App Imports**: `apps/web` and `apps/admin` NEVER import directly from each other. Models are accessed through `@fquiz/models`.
4. **No Mongoose `.populate()`**: Use batch `$in` queries for application-level joins to prevent tight coupling and query bloat.
5. **Server-Authoritative Quiz Processing**: Scoring and state changes for Quiz sessions MUST happen on the server using `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.
6. **AI Generation Dedup**: Check `AIAsset` collection via `requestHash` + `responseHash` before invoking Gemini LLM API.
7. **3-Tier Design Tokens & WCAG 2.2 AA**: All UI styling must use semantic tokens from `@fquiz/ui` and `@gsap/react` GPU transform animations.
8. **Local-Only Validation & Zero Cloud CI/CD**: All code validation (linting, TypeScript checks, Jest unit tests, rule engine governance) is executed strictly **LOCALLY** before any `git push`. GitHub Actions workflows are completely removed from this repository; never initialize, configure, or expect cloud CI/CD pipelines via Git.

---

## Mandatory Local Verification Sequence (Pre-Push Gate)

Before declaring any development task complete or pushing changes to Git remote, execute the full local verification pipeline:
```bash
npm run lint
npm run check-types
npm test
node .agents/scripts/verify.js --strict
```
If any command fails, fix the underlying root cause locally before concluding or pushing.
