---
name: fquiz-development-workflow
description: Mandatory development workflow and architectural standards for FQuiz. Enforces module boundaries, text-only learning product scope, dependency inversion, database patterns, and strict verification protocols.
version: 2.1
priority: high
---

# FQuiz Standard Development Workflow

## Architectural & Product Scope Rules

1. **Text-Only Scope Boundary**: FQuiz is strictly text-only (vocabulary, grammar, sentences, paragraphs, quizzes, flashcards). **NEVER introduce audio, voice (TTS/STT), OCR, 3D, VR, or multimedia features**.
2. **No Cross-Module Model Imports**: Modules (`auth`, `quiz`, `learning`, `community`, `ai`) may only import their own `models/`. Cross-module data access uses pure ObjectId references + application-level joins (`$in` queries).
3. **No Mongoose `.populate()`**: Use batch `$in` queries for application-level joins to prevent tight coupling and query bloat.
4. **Server-Authoritative Quiz Processing**: Scoring and state changes for Quiz sessions MUST happen on the server using `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.
5. **AI Generation Dedup**: Check `AIAsset` collection via `requestHash` + `responseHash` before invoking Gemini LLM API.

---

## Mandatory Verification Sequence

Before declaring any development task complete, execute the full pipeline:
```bash
npm run lint
npm run build
npm test
```
If any command fails, fix the underlying root cause before concluding.
