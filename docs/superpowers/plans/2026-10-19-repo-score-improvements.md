# Repo Score Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Fix the highest-impact security, session integrity, history accuracy, dashboard selection, CI, accessibility, error-handling, and search-copy findings from the departmental repo review.

**Architecture:** Keep the existing route and model boundaries. Bind guest sessions to a random browser capability cookie, enforce active status at both request and atomic-write boundaries, move history paging and filters into the database query, and keep the dashboard feed selection bounded.

**Tech Stack:** Next.js route handlers, TypeScript, Mongoose/MongoDB, React Query, GitHub Actions.

**Spec:** Departmental repo-review consensus in the current task conversation: guest result ownership bypass; guest identity stored but not checked; answer and submit writes insufficiently gated by active status; guest flashcard null dereference; history pagination/filter/statistics limited to an in-memory page; dashboard can suppress active work outside its capped completed candidates; lint is nonblocking and history filter buttons lack pressed state.

## Global Constraints

- Keep the existing session schema and avoid a database migration. Pre-release guest sessions without a browser capability remain inaccessible until their 24-hour retention window expires; do not preserve sessionId-only access.
- Use a cryptographically random guest capability, stored as an HttpOnly SameSite=Lax cookie and in QuizSession.guest_id.
- Require status='active' and absent or future expires_at for answer mutations and final submission, including the atomic database write.
- Preserve the existing history page size default of 20 and maximum of 100.
- Add no dependencies.
- Do not add or run test suites in this execution; run the repository lint, typecheck, and strict governance checks.
- Do not expand Explore search into quiz-title/API search; keep the current local category-name filter.
- Preserve unexpected student-quiz errors so server and network failures remain visible to the query error state.

## Progress

- [x] Task 1: Bind guest sessions to the browser capability
- [x] Task 2: Enforce active status on answer and submit
- [x] Task 3: Make guest flashcard answers safe and state-gated
- [x] Task 4: Keep active dashboard work visible
- [x] Task 5: Page and filter history in MongoDB
- [x] Task 6: Make lint blocking and expose selected filter state
- [x] Task 7: Preserve unexpected quiz-detail errors
- [x] Task 8: Make Explore search copy match category filtering

---

### Task 1: Bind guest sessions to the browser capability

**Files:**
- Modify: packages/auth/src/jwt.ts
- Modify: packages/auth/src/with-auth.ts
- Modify: apps/web/app/api/sessions/route.ts
- Modify: apps/web/app/api/sessions/[id]/result/route.ts
- Modify: apps/web/app/quiz/[id]/result/[sessionId]/page.tsx
- Modify: apps/web/lib/modules/quiz/session-utils.ts

**Interfaces:**
- Add optional guestId to the auth payload, populated from the request cookie.
- Validate guest sessions by exact guest_id match. Validate student sessions by exact student_id match.
- Reuse or mint one random guest capability during guest session creation, store it on the session, and set the HttpOnly cookie on the response.
- Pass guest identity to result lookup and reject missing or mismatched owners.
- Remove the result page direct helper lookup that has no owner identity; use its existing cookie-forwarding API path so authorization is checked once.

**Acceptance:**
- Anonymous callers without the matching capability cannot read or mutate a guest session.
- Authenticated callers cannot read another student's session; a matching guest capability can still access that browser's guest session.
- Guest sessions created in the current flow receive the capability cookie without exposing it in JSON.

---

### Task 2: Enforce active status on answer and submit

**Files:**
- Modify: apps/web/lib/modules/quiz/session-utils.ts
- Modify: apps/web/app/api/sessions/[id]/answer/route.ts
- Modify: apps/web/app/api/sessions/[id]/submit/route.ts
- Modify: apps/web/lib/modules/quiz/quiz-engine.ts

**Interfaces:**
- Add an explicit active-session validation option that returns a conflict for a non-active session.
- Require active status in answer and submit route validation.
- Require active status and an absent or future expires_at in every answer compare-and-set/update predicate and in the final submit predicate.

**Acceptance:**
- Expired, paused, completed, or otherwise non-active sessions cannot be mutated or finalized, including when expiry occurs after request validation but before the atomic write.
- Concurrent completion cannot be overwritten by a late answer or a second submit.

---

### Task 3: Make guest flashcard answers safe and state-gated

**Files:**
- Modify: apps/web/app/api/sessions/[id]/flashcard-answer/route.ts
- Modify: apps/web/lib/modules/quiz/session-utils.ts

**Interfaces:**
- Validate the guest capability and student ownership through the shared session validator.
- Handle student_id=null for guest sessions without dereferencing it.
- Require an active, unexpired session for both first-time answers and corrections to earlier answers; include the shared active-session write filter in every atomic predicate.

**Acceptance:**
- A valid guest flashcard answer is processed without a null dereference.
- Missing/mismatched guest capability is forbidden.
- Non-active flashcard sessions cannot change prior answers or advance.

---

### Task 4: Keep active dashboard work visible

**Files:**
- Modify: apps/web/app/api/student/dashboard/route.ts

**Interfaces:**
- Determine completed quiz/mode groups from the completed activities actually selected for the dashboard response.
- Use that bounded set when deciding whether an active session needs an active-only activity entry.

**Acceptance:**
- An active session is not suppressed solely because an older completed session for that quiz/mode group fell outside the capped recent completed candidates.
- Existing limits and chronological ordering remain intact.

---

### Task 5: Page and filter history in MongoDB

**Files:**
- Modify: apps/web/app/api/history/route.ts
- Modify: apps/web/hooks/useStudentHistory.ts

**Interfaces:**
- Send page, status, mode, and search filters to the API.
- Apply status/mode/search before pagination; page records in MongoDB rather than materializing all session records before slicing in Node.
- Return totals and statistics for the full filtered result set so displayed counts do not describe only the current page.
- Keep date-group rendering scoped to the requested page.

**Acceptance:**
- Paging does not load all of a student's session records into application memory.
- Search and filters operate over the full history set.
- Total attempts, completed attempts, perfect scores, and unique quizzes reflect the full filtered set.

---

### Task 6: Make lint blocking and expose selected filter state

**Files:**
- Modify: .github/workflows/ci.yml
- Modify: apps/web/components/history/HistoryFilterBar.tsx

**Interfaces:**
- Remove the CI configuration that allows lint failures to pass.
- Add accurate aria-pressed values to the All, Completed, In Progress, and mode filter buttons.

**Acceptance:**
- A lint step failure fails the CI job.
- Each history filter button exposes its current selected state to assistive technology.

---

### Task 7: Preserve unexpected quiz-detail errors

**Files:**
- Modify: apps/web/hooks/quiz/useQuizDetailState.ts

**Interfaces:**
- Return `null` from the student detail request only for expected 401/404 responses so the public detail endpoint can be tried.
- Propagate network, malformed-response, and other HTTP failures without silently switching endpoints.
- When no authentication token is present, request public quiz detail directly.

**Acceptance:**
- A student endpoint 401/404 may fall back to public detail.
- Student endpoint network/5xx failures reach the query error state and do not trigger a public request.
- An anonymous public failure is surfaced without an unnecessary student endpoint request.

### Task 8: Make Explore search copy match category filtering

**Files:**
- Modify: apps/web/components/quiz/explore/CategoryFilter.tsx
- Modify: apps/web/app/explore/page.tsx

**Interfaces:**
- Describe the input as searching study-category names, matching its local `category.name` filter.
- Adjust Explore metadata and visible supporting copy so they describe category browsing and quiz discovery without promising whole-library or quiz-title search.
- Keep the existing local filtering behavior and avoid a search API or other feature expansion.

**Acceptance:**
- Search copy accurately describes the fields filtered.
- Search behavior, request count, and page data contract remain unchanged.

### Verification

Run npm run lint, npm run check-types, and node .agents/scripts/verify.js --strict. Do not run npm test or add tests as part of this task.
