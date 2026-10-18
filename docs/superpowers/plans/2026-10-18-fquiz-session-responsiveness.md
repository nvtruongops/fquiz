# FQuiz Session Responsiveness Implementation Plan

> **For agentic workers:** Use this checklist task-by-task with the FQuiz workflow and verification skills.

**Goal:** Make quiz loading occur once and make answer selection visibly responsive while measuring the real answer request.

**Architecture:** Keep the existing immediate-mode feedback from preloaded question data while answers save asynchronously; show a lightweight saving cue during the request. Remove route fallback skeletons that duplicate client loading states, reduce redundant activity events, and expose safe `Server-Timing` measurements on successful answer responses.

**Tech Stack:** Next.js App Router, React, TanStack Query, MongoDB/Mongoose, Jest, Vercel CLI.

**Spec:** User-approved design in the conversation on 2026-10-18; no separate spec file for this bounded existing-flow change.

## Global Constraints

- Do not change the existing immediate-mode feedback contract; the answer API still persists and returns the final result.
- MongoDB's read-only `hello` request reports `AP_SOUTHEAST_1` (Singapore); Vercel's current production functions were observed in `iad1`, so deploy with `sin1`.
- Do not submit answers to the user's live session during testing; no isolated production answer session is configured.
- Add no new package dependencies.
- Run `npm run lint`, `npm run check-types`, `npm test`, and `node .agents/scripts/verify.js --strict` before completion.

---

### Task 1: Remove duplicate route loading fallbacks

**Files:**
- Delete: `apps/web/app/quiz/[id]/loading.tsx`
- Delete: `apps/web/app/quiz/[id]/session/loading.tsx`
- Delete: `apps/web/app/quiz/[id]/session/[sessionId]/loading.tsx`

- [x] Confirm each client page retains its own query-backed skeleton.
- [x] Remove route fallbacks so each loading state has one owner.
- [x] Verify final production quiz and session page GETs return 200 in `sin1`; timings were 1.83 s / 0.48 s for quiz and 0.49 s / 0.41 s for session (first / warm).

### Task 2: Make pending answers visibly responsive and measurable

**Files:**
- Add: `apps/web/components/quiz/session/PendingAnswerIndicator.tsx`
- Modify: desktop and mobile session page parents to show the pending status.
- Modify: `apps/web/app/api/sessions/[id]/answer/route.ts`
- Test: pending indicator and answer route timing header.

- [x] Add an accessible pending status while an immediate answer is awaiting server persistence; show `Saving answer…` alongside existing immediate feedback.
- [x] Add `Server-Timing` for route, session validation, and answer processing to successful answer responses.
- [x] Verify the response timing header in route tests and record a read-only MongoDB handshake at 971 ms; no live answer POST was sent.

### Task 3: Reduce redundant activity requests

**Files:**
- Modify: `apps/web/hooks/quiz/useSessionActivityTracking.ts`
- Test: `apps/web/hooks/quiz/__tests__/useSessionActivityTracking.test.ts`

- [x] Preserve pause/resume on visibility changes and pagehide.
- [x] Remove redundant window focus/blur requests and update the lifecycle regression test.

### Task 4: Keep the loader light on mobile

**Files:**
- Modify: `apps/web/components/quiz/shared/QuizLoader.tsx`

- [x] Remove large backdrop and ambient blur work while keeping the existing progress and status content.
- [x] Remove Framer Motion overlay transitions and drop shadows from this loading path.

### Task 5: Verify, deploy, and smoke-test

- [ ] Verify the final source revision with the full test suite and strict checks; the focused pending-answer test, lint, and typecheck pass after the saving-status adjustment.
- [ ] Deploy the final source revision with Vercel CLI and `--regions sin1`; inspect the deployment region.
- [ ] Smoke-test production quiz/session page GETs and verify `Server-Timing` in the answer route test. Do not submit to the user's live session; no isolated production answer session is configured.
- [ ] Report the measurement boundary: answer POST latency is instrumented and covered by route tests, while a successful production answer POST requires an isolated test session.
