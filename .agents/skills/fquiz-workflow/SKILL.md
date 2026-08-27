---
name: fquiz-development-workflow
description: Mandatory development workflow and architectural standards for FQuiz. Enforces Pure Symmetrical Monorepo boundaries, text-only learning product scope, dependency inversion, database patterns, and strict verification protocols.
version: 2.2
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

---

## Mandatory Verification Sequence

Before declaring any development task complete, execute the full pipeline:
```bash
npm run lint
npm run check-types
npm test
node .agents/scripts/verify.js --strict
```
If any command fails, fix the underlying root cause before concluding.
