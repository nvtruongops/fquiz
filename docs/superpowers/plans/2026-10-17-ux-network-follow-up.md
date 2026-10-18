# FQuiz Usability and Request Optimization Follow-up Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Fix six verified usability and request-flow findings from the approved follow-up audit and leave both production apps building successfully.

**Architecture:** Reuse the existing in-place session re-auth prompt, exam-tab write lease, TanStack Query cache and fetch signal, and current navigation/theme handlers. Keep all API contracts, scoring, app boundaries, and dependencies unchanged.

**Tech Stack:** Next.js 16, React 18, TanStack Query, TypeScript, Jest.

**Spec:** `C:/Users/nvt/.codex/visualizations/2026/10/17/01a14869-09a8-7980-a52b-e8c5213649af/followup-audit/FQUIZ_USABILITY_NETWORK_AUDIT.md`

## Global Constraints

- Ponytail full; no new dependencies or cache/event frameworks.
- Keep active quiz state, server-authoritative scoring, and existing app boundaries intact.
- Use existing theme tokens and accessible feedback.
- Preserve all existing uncommitted F1–F8 work and generated `next-env.d.ts` files.
- Leave the branch uncommitted as required by the original implementation plan; review each task by its scoped file diff.
- Verify lint, types, complete Jest suite, strict rules, and both production builds before completion.

---

### Task 1: Preserve active quiz on GET 401

**Files:** `apps/web/lib/modules/quiz/session-api.ts`, `apps/web/hooks/quiz/useQuizSessionQueries.ts`, `apps/web/components/quiz/session/DesktopSessionContent.tsx`, `apps/web/app/quiz/[id]/session/[sessionId]/mobile/page.tsx`, plus focused tests under `apps/web/lib/modules/quiz/__tests__/` and `apps/web/hooks/quiz/__tests__/`.
- [x] Write failing tests: both GET helpers keep the current pathname, open the in-place prompt, and return status 401; cached session/questions remain usable after background 401; an uncached 401 error screen exposes a same-page retry.
- [x] Run the focused test and confirm it fails because 401 currently redirects.
- [x] Reuse `promptSessionReauth()` in the shared response handler and attach status 401 to the error. Keep cached query data out of full-screen error branches; expose the existing query refetch methods and wire Retry buttons on desktop and mobile.
- [x] Review retry availability: hide Retry and skip refetch for terminal 404/410; retain same-page recovery for 401 and transient errors.
- [x] Rerun focused tests (3 suites/7 tests), web typecheck, scoped ESLint (0 errors, 1 existing object-indexing warning), `git diff --check`, and fresh review (no findings).

### Task 2: Stop activity writes on question changes and read-only tabs

**Files:** `apps/web/hooks/quiz/useSessionActivityTracking.ts`, its existing desktop/mobile callers, and `apps/web/hooks/quiz/__tests__/useSessionActivityTracking.test.ts`.
- [x] Add failing cases for stable callback across question changes, read-only write suppression, and exact `initial` cache update/invalidation without refetching question data.
- [x] Run the focused test and confirm the regressions.
- [x] Read the latest question index from a ref, pass the current exam lease permission, deduplicate by pause/resume transition, and target `['sessions', sessionId, 'initial']` only.
- [x] Add recovery for rejected and non-OK activity requests, including out-of-order responses; only successful responses update cache.
- [x] Rerun focused tests (7/7), web typecheck, scoped ESLint, `git diff --check`, CodeGraph sync/status and fresh review; preserve timer and manual pause behavior.

### Task 3: Disable the remaining speculative mobile navigation prefetch

**Files:** `apps/web/components/layout/MobileNav.tsx` and its focused component test.
- [x] Add a failing assertion that Home, Classroom, and Community links disable prefetch.
- [x] Confirm the focused test fails, add `prefetch={false}` to those three links, and rerun it (1/1; fresh review clean).

### Task 4: Debounce and cancel admin searches

**Files:** `apps/admin/hooks/users/useAdminUsers.ts`, `apps/admin/hooks/quizzes/useAdminQuizzes.ts`, their tests, and the smallest search containers needed to expose busy state.
- [x] Add failing tests for 300 ms debounce, trimmed query keys, AbortSignal forwarding, and previous results remaining visible while refetching.
- [x] Confirm the focused tests fail, then implement using existing timers, TanStack `keepPreviousData`, and the query function signal; keep page reset atomic with the committed search term to avoid an old-term request.
- [x] Rerun focused tests and inspect loading/aria-busy behavior in both list pages (4 suites/13 tests); admin typecheck, targeted lint, diff check, CodeGraph sync, and fresh review pass.

### Task 5: Refresh the admin quiz list through its own query cache

**Files:** `apps/admin/hooks/quiz/useQuizEditorForm.ts` and a focused hook test.
- [x] Add a failing test that successful save invalidates `['admin', 'quizzes']` before navigation and does not issue an unnecessary RSC refresh.
- [x] Confirm failure, then invalidate the existing list query on successful save before `router.push('/quizzes')`.
- [x] Rerun the focused test and verify validation/error paths do not invalidate or navigate (1 suite/3 tests); admin typecheck, scoped lint, diff check, CodeGraph sync, and fresh review pass.

### Task 6: Persist theme using the mutation response

**Files:** `apps/web/components/layout/MobileNav.tsx`, `apps/web/components/layout/UserDropdown.tsx`, and focused tests.
- [x] Add failing tests for no-op when selecting the active theme, one successful PUT with zero auth GETs, cache merge preserving other user fields, visible errors/rollback, and stale-response suppression.
- [x] Confirm the failures, then validate `res.ok`, merge the returned theme into `['auth-user']`, and guard rapid selections with the smallest local request-sequence state.
- [x] Rerun focused tests and inspect both layout handlers (3 suites/16 tests); web typecheck, targeted lint, diff check, CodeGraph sync, and fresh review pass. Reviewer notes duplicate handler lines as a non-blocking follow-up; kept scope local.

### Final verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run check-types -- --force`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `node .agents/scripts/verify.js --strict`.
- [ ] Run `npm run build -- --force`; confirm `@fquiz/web` and `@fquiz/admin` both exit 0.
- [ ] Run `git diff --check`, update CodeGraph, and review the six scoped diffs plus final branch diff.

