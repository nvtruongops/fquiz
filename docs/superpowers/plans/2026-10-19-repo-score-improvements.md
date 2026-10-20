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
- [x] Task 9: Enforce current account state in authenticated API wrappers
- [x] Task 10: Keep answer persistence, session completion, and review data consistent
- [x] Task 11: Make desktop flashcard failures and keyboard shortcuts safe
- [x] Task 12: Name register password visibility controls
- [x] Task 13: Reject future and out-of-range flashcard indexes
- [x] Task 14: Keep production auth fail-closed under CI/test flags
- [x] Task 15: Surface mobile flashcard save failures and retry
- [x] Task 16: Type redacted review answers accurately
- [x] Task 17: Make register password visibility controls independent

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

---

## Phase 3 — Findings Confirmed by the Blind Departmental Challenge

The three independent reviewers agreed on these source-confirmed defects. Their severity remains conditional where the defect requires overlapping requests or unusual data; no runtime frequency or exploitation claim is made.

### Task 9: Enforce current account state in authenticated API wrappers

**Files:**
- Modify: `packages/auth/src/with-auth.ts`
- Modify: `apps/web/lib/modules/auth/with-auth.ts`
- Modify: `apps/admin/lib/auth/auth.ts`

**Interfaces:**
- Add an optional token-verifier dependency to shared `withAuth`; default to the existing package verifier so other consumers retain behavior.
- Make the web wrapper inject the app verifier, which checks current user status and token version while preserving shared role and guest-id handling.
- Remove admin authorization based solely on proxy-injected identity headers; verify the cookie/bearer token against the current database user and fail closed if the user is missing, inactive, demoted, revoked, or the database cannot be checked.

**Acceptance:**
- A web token whose user is inactive or whose version is stale is rejected on all `withAuth` routes, including session APIs.
- Admin role/status/version are checked for every protected API request, including requests that passed through the proxy.
- Database errors do not authorize an admin request from an unverified/stale JWT.
- Guest access and its existing browser capability parsing remain unchanged.

### Task 10: Keep answer persistence, session completion, and review data consistent

**Files:**
- Modify: `apps/web/app/api/sessions/[id]/submit/route.ts`
- Modify: `apps/web/app/api/sessions/[id]/flashcard-answer/route.ts`
- Modify: `apps/web/lib/modules/quiz/quiz-engine.ts`
- Modify: `apps/web/app/api/sessions/[id]/route.ts`

**Interfaces:**
- Compare the submitted snapshot's `answer_version` in the atomic completion predicate; if a concurrent answer changes the snapshot, return a conflict and do not persist the stale score.
- Increment `answer_version` in both flashcard answer writes (new answers and corrections) so every answer writer participates in the completion compare-and-set.
- Preserve the session's `current_question_index` in OCC retries so retries cannot reset progress to zero.
- Resolve the next review question through the existing reference-aware resolver before persisting an answer that advances to it.
- Omit `is_correct` from unfinished review-mode `user_answers`; preserve it after explicit completion and in modes that intentionally reveal feedback.

**Acceptance:**
- A submit based on stale answers cannot mark the session complete with a score for an older answer snapshot.
- An OCC retry cannot regress the resume index because a projection omitted it.
- A reference-backed next question is resolved before the current answer is committed.
- An unfinished review session response does not reveal correctness flags.

### Task 11: Make desktop flashcard failures and keyboard shortcuts safe

**Files:**
- Modify: `apps/web/hooks/quiz/useFlashcardSession.ts`
- Modify: `apps/web/components/quiz/flashcard/DesktopFlashcardView.tsx`

**Interfaces:**
- Expose flashcard-answer mutation errors and retain the attempted answer so the desktop view can offer a direct retry; prompt in-place re-auth when the mutation receives 401.
- Ignore keyboard shortcuts when the event was already handled, focus is in an interactive/editable control, or the guide dialog is open; do not steal focus by calling `blur()`.
- Give each desktop flashcard switch an accessible name matching its visible purpose.

**Acceptance:**
- A failed answer save has a visible message and a way to retry the same answer.
- Keyboard shortcuts do not submit/toggle while users interact with buttons, switches, editable text, or the guide dialog.
- Flashcard preference switches have programmatic names.

### Task 12: Name register password visibility controls

**Files:**
- Modify: `apps/web/components/auth/RegisterFormFields.tsx`

**Interfaces:**
- Add state-aware accessible names to the two register password-visibility buttons confirmed unnamed by reviewers.
- Leave controls already carrying accessible names unchanged.

**Acceptance:**
- Each register password-visibility button has a clear name that changes between showing and hiding its associated password.

### Phase 3 Verification

Run `npm run lint`, `npm run check-types`, `node .agents/scripts/verify.js --strict`, `git diff --check`, and CodeGraph sync/status. Do not add or run tests during this execution.

### Verification

Run npm run lint, npm run check-types, and node .agents/scripts/verify.js --strict. Do not run npm test or add tests as part of this task.

---

## Phase 4 — Findings That Won the Final Cross-Challenge

The blind panel reviewed the staged implementation without prior review artifacts. On cross-challenge, all three departments corroborated the flashcard index and mobile recovery findings. Engineering and Product also confirmed the production CI/test-flag auth bypass; Security confirmed the source path but downgraded operational severity because deployed environment values were unavailable. The chair verified all paths in CodeGraph. Legacy admin token-version mismatch remains a rollout data gate because production records are not available for inspection.

### Task 13: Reject future and out-of-range flashcard indexes

**Files:**
- Modify: `apps/web/app/api/sessions/[id]/route.ts`
- Modify: `apps/web/app/api/sessions/[id]/questions/route.ts`
- Modify: `apps/web/app/api/sessions/[id]/flashcard-answer/route.ts`
- Modify: `apps/web/lib/modules/quiz/session-utils.ts`
- Modify: `apps/web/lib/modules/quiz/quiz-engine.ts`

**Acceptance:**
- A new answer can only target the server's current question index and an index inside the session deck.
- Previously answered indexes can still use the existing correction path.
- Missing or empty stored question order resolves through the same quiz-order fallback as session GET and is persisted before advancing.
- Nonempty `questions_cache` is authoritative; cacheless resolution prefers `question_refs[index]` and falls back to `quiz.questions[index]` at that same source index.
- Session GET, flashcard next-question responses, and quiz-engine grading use the same source order and per-index resolver; refs count takes precedence over embedded-question count, and stored order is accepted only as a full permutation.
- Missing sources leave their source slots unresolved and return the existing question-not-found response without shifting the cursor or `user_answers` indexes.
- Session GET and flashcard-answer look up only the requested or next reference; cache-backed resolution makes no extra question query.
- The preloaded deck uses the same source precedence and retains unresolved slots; referenced questions are batch-loaded, and no unresolved slot is replaced by the first question.
- New flashcard answers resolve the target and next display question before mutating answers, progress, or stats; unresolved sources return 404 with session state unchanged. Previous-answer corrections validate only the corrected target because they do not advance or return the next card.
- Rejected indexes make no answer, stats, or progress mutation.

### Task 14: Keep production auth fail-closed under CI/test flags

**Files:**
- Modify: `apps/web/lib/modules/auth/auth.ts`

**Acceptance:**
- Missing users and database failures never authorize a production request, regardless of `CI` or `PLAYWRIGHT_TEST` values.
- Existing non-production test behavior remains available.

### Task 15: Surface mobile flashcard save failures and retry

**Files:**
- Modify: `apps/web/app/quiz/[id]/session/[sessionId]/flashcard/mobile/page.tsx`

**Acceptance:**
- Mobile users see a clear message when answer persistence fails.
- They can retry the exact failed answer without advancing or changing the selected card.

### Task 16: Type redacted review answers accurately

**Files:**
- Modify: `apps/web/lib/modules/quiz/types/session.ts`

**Acceptance:**
- API `SessionData.user_answers` allows omitted `is_correct` for active review responses.
- Persisted `IQuizSession.user_answers` and `UserAnswer.is_correct` remain required.

### Task 17: Make register password visibility controls independent

**Files:**
- Modify: `apps/web/components/auth/RegisterFormFields.tsx`

**Acceptance:**
- Each visibility button changes only the field named by its accessible label.

### Phase 4 Verification

Run lint, typecheck, strict governance, diff checks, and CodeGraph status. Do not add or run tests in this execution. Before rollout, verify admin records have persisted `token_version` values; backfill missing admin versions to a value that invalidates any preexisting version-1 token before enabling strict verification.

### Phase 5: Final cross-challenge fixes

- [x] Task 18: Preserve the first immediate-mode answer during concurrent requests.
- [x] Task 19: Require the configured JWT secret for admin token signing.
- [x] Task 20: Associate registration validation messages with their inputs and announce them.
- [x] Task 21: Expose current-page state on active navigation links.
- [ ] Task 22: Decide whether browser and accessibility checks should become blocking CI gates after test execution is authorized.
- [x] Task 23: Revoke web sessions when an admin changes a user's role.
- [x] Task 24: Reject web JWTs without a valid token version.

#### Task 18: Preserve the first immediate-mode answer during concurrent requests

**Files:** `apps/web/lib/modules/quiz/quiz-engine.ts`

Immediate mode inserts an answer only when its question index is still unanswered. If an OCC retry sees another request's committed answer, it returns that stored answer and its correctness result. Review mode retains its existing update behavior for answer corrections.

#### Task 19: Require the configured JWT secret for admin token signing

**Files:** `apps/admin/lib/auth/auth.ts`

Admin signing fails when `JWT_SECRET` is missing, matching the shared verifier's accepted secret configuration and preventing login from issuing unusable fallback-signed tokens.

#### Task 20: Associate registration validation messages with their inputs and announce them

**Files:** `apps/web/components/auth/RegisterFormFields.tsx`

Each validated input exposes `aria-invalid` and references its visible validation message with `aria-describedby`; dynamically rendered messages use `role="alert"`.

#### Task 21: Expose current-page state on active navigation links

**Files:** `apps/web/components/layout/Sidebar.tsx`, `apps/web/components/layout/MobileNav.tsx`

Links sharing the current route's active state expose `aria-current="page"`; dialog-opening buttons remain buttons and do not claim a page state.

#### Task 23: Revoke web sessions when an admin changes a user's role

**Files:** `apps/admin/app/api/users/[id]/route.ts`

Actual role or status transitions now compare-and-set the observed token version and advance it atomically. Missing or invalid versions start at version 2 so tokens signed with the legacy version-1 fallback are revoked. A concurrent state update returns HTTP 409 for refresh and retry. The existing web verifier cache can retain the old version for up to 60 seconds.

#### Task 24: Reject web JWTs without a valid token version

**Files:** `apps/web/lib/modules/auth/auth.ts`

Web token verification now rejects a missing, non-integer, or non-positive `v` claim before consulting the status/version cache. All current web token signing paths include the version claim; versionless legacy tokens must be reissued through login.

#### Accepted and deferred findings

- Browser and accessibility checks remain advisory in the current CI configuration. The panel split between P2 (Engineering/Security) and P3 (Product/Ops); the chair records this as P3 release assurance because no current product failure was demonstrated. Review blocking CI gates when browser/test execution is authorized.
- Admin login now applies a five-attempt-per-minute IP limit per process. It is not a cross-instance budget; confirm a shared limiter or trusted edge control for deployments that need aggregate throttling.
- Admin login atomically upgrades missing or invalid stored token versions to `2` before signing a cookie. Page and API guards both compare the positive token version against the current user record.
- No tests were added or run in this task, per the plan's execution constraint. Static checks and strict governance were run after the source changes.

### Phase 6: Cross-challenge fixes

- [x] Task 25: Restore incomplete answer drafts as reviewable unsaved work; block retry unless the required selection count is met.
- [x] Task 26: Enforce active status and current token version in admin page authorization; atomically migrate missing or invalid admin versions on login.
- [x] Task 27: Compare observed role, status, and token version on every admin user update, including no-op updates.
- [x] Task 28: Return the committed result for an identical retry of the final flashcard answer.
- [x] Task 29: Expose mobile single-choice and multi-choice semantics with radio-key navigation.
- [x] Correct the deployment guide's maintenance-script link and document process-local rate-limit scope.
- [x] Run a fresh blind three-department panel and cross-challenge the final source snapshot.

### Phase 6 verification

Run `npm run check-types`, `npm run lint`, `node .agents/scripts/verify.js --strict`, `git diff --check HEAD`, and `codegraph status`. Do not add or run test suites for this execution.

### Phase 6 final blind departmental review

- Independent scores: Engineering 7.1/10, Security/Reliability/QA 7.0/10, Product/UX/Ops 7.5/10; equal-weight mean 7.20/10.
- Cross-challenge scores: Engineering 7.0/10, Security/Reliability/QA 7.0/10, Product/UX/Ops 7.3/10; equal-weight mean 7.10/10.
- Winning findings: six-digit verification code hashes permit offline enumeration after a live database read; per-code attempt increments can race; answer OCC exhaustion becomes HTTP 500; History errors have no explicit live announcement and retry resets local filters; coverage thresholds are advisory and very low. Limiter scope, web token cache delay, and `lang="en"` remain conditional on runtime/deployment/content.
- Rejected or downgraded: empty `question_order` does not block valid legacy answers because the engine reconstructs identity order; out-of-range inputs may still surface as 500 when no positive count is available. Compact History tap targets are a comfort concern only; the cited CSS did not establish a WCAG target-size failure. `any` and omitted explicit workspace typecheck are maintainability/CI coverage risks without a demonstrated current runtime defect.
- Review was static. No tests, browser/assistive-technology checks, live deployment inspection, or database inspection were performed.

### Phase 7: Fix cross-challenge security and concurrency findings

- [x] Task 30: Store verification-code digests with a server-held HMAC key.
- [x] Task 31: Atomically cap wrong-code increments across reset, forgot-password, and registration flows.
- [x] Task 32: Preserve answer OCC conflicts as an actionable HTTP 409 response.
- [x] Update security documentation for verification-code key and attempt-counter behavior.
- [x] Run a fresh blind three-department panel and cross-challenge the post-fix snapshot.

### Phase 7 verification

Run `npm run check-types`, `npm run lint`, `node .agents/scripts/verify.js --strict`, `git diff --check HEAD`, and `codegraph status`. Do not add or run test suites for this execution.

### Phase 7 final blind departmental review

- Independent scores: Engineering 7.5/10, Security/Reliability/QA 6.5/10, Product/UX/Ops 7.0/10; equal-weight mean 7.00/10.
- Cross-challenge scores: Engineering 7.0/10, Security/Reliability/QA 7.0/10, Product/UX/Ops 6.5/10; equal-weight mean 6.83/10.
- Winning findings: CI builds run under `NODE_ENV=test` and skip production-only Next configuration; classroom load errors look like an empty classroom list; the public registration flow signals whether an email exists. Secondary concerns: history retry loses local filters, error boundary displays exception text without evidence of a sensitive source, explicit monorepo type-check is absent from CI, root Next cache path misses app caches, and admin rate-limit behavior depends on proxy/instance configuration.
- Rejected: guest-session requests with `allowGuest` are forwarded directly to the route handler before authenticated role checks; the reported guest role rejection is not present on the anonymous cookie flow.
- Review was static. No tests, browser/assistive-technology checks, live deployment inspection, or database inspection were performed.

### Phase 8: Improve release and student feedback paths

- [x] Task 33: Build Next apps under their production configuration while keeping tests in test mode; cache app build directories and run workspace type checks in CI.
- [x] Task 34: Distinguish classroom and assignment request failures from empty success, with retry actions.
- [x] Task 35: Remove public email-existence signals from registration code request and registration validation paths.
- [x] Task 36: Keep History filters on retry and announce the failure; use safe generic copy in the root error boundary.
- [x] Run CodeGraph sync, static checks, and a blind three-department panel with cross-challenge.

### Phase 8 verification

Run `npm run check-types`, `npm run lint`, `node .agents/scripts/verify.js --strict`, `git diff --check HEAD`, and `codegraph status`. Do not add or run test suites for this execution.

### Phase 8 final blind departmental review and cross-challenge

- Independent scores: Engineering 6.5/10, Security/Reliability/QA 7.0/10, Product/UX/Ops 7.0/10; equal-weight mean 6.83/10.
- Cross-challenge scores: Engineering 6.5/10, Security/Reliability/QA 6.5/10, Product/UX/Ops 7.0/10; equal-weight mean 6.67/10.
- Accepted: the API-wide limiter is process-local, which weakens limits across multiple/restarted instances; login limits use the first `x-forwarded-for` value and have no account bucket, with impact dependent on trusted-ingress behavior and distributed sources; answer correctness feedback lacks a completed-result live announcement; Explore search has no programmatic name; GitHub Actions lacks a blocking browser-interaction smoke job (the Lighthouse job is advisory); CI duplicated Jest's existing `--forceExit` flag.
- Rejected/downgraded: accepting an arbitrary in-range answer index and submitting with unanswered questions is consistent with visible navigation, the explicit incomplete-finish confirmation, and immediate mode's PRACTICE label. Keep it as a conditional contract gap only if product requirements later demand strict sequential/all-question completion. The result-page heading finding was lower-confidence and not retained.
- Review was static. No tests, browser/assistive-technology checks, live deployment, ingress/proxy, or database configuration were inspected.

### Phase 9: Close small accessibility and CI findings

- [x] Task 37: Announce immediate-answer correctness changes to screen readers on desktop and mobile.
- [x] Task 38: Give the Explore search an accessible name and result pages a page heading.
- [x] Task 39: Remove the duplicate Jest `--forceExit` from the CI invocation.
- [x] Run CodeGraph sync, static checks, and a fresh blind three-department panel with cross-challenge.

### Phase 9 verification

Run `npm run check-types`, `npm run lint`, `node .agents/scripts/verify.js --strict`, `git diff --check HEAD`, and `codegraph status`. Do not add or run test suites for this execution.

### Phase 9 fresh blind departmental review and cross-challenge

- Independent scores: Engineering 7.5/10, Security/Reliability/QA 6.5/10, Product/UX/Ops 7.0/10; equal-weight mean 7.00/10.
- Cross-challenge scores: Engineering 7.5/10, Security/Reliability/QA 5.5/10, Product/UX/Ops 6.0/10; equal-weight mean 6.33/10.
- Accepted: answer submission can remain pending without an application timeout and block finalization; password-reset cooldown and mail-failure responses can reveal account existence; History search lacks a programmatic label and has no debounce/cancellation; Lighthouse is advisory. Rate-limit aggregation/header trust and 60-second web auth cache are source-confirmed but operational impact depends on deployment, ingress, and cache state.
- Rejected/narrowed: History search is functional; only request volume, not functionality, is in question. Report Lighthouse specifically as a non-gating workflow. Do not infer exploitable X-Forwarded-For spoofing without checking ingress.
- Static review only. No tests/builds, rendered browser or screen-reader checks, live deployment, or database inspection.

### Phase 10: Close final confirmed request, privacy, and history findings

- [x] Task 40: Bound answer persistence requests so stalled saves enter the existing retry path.
- [x] Task 41: Keep password-reset cooldown and mail-delivery failure responses indistinguishable for existing and unknown email addresses.
- [x] Task 42: Name the History search input and debounce/cancel superseded search requests.
- [x] Update security docs with password-reset response privacy behavior.
- [x] Re-sync CodeGraph and run final static checks; no test suites.

### Phase 10 verification

Run `npm run check-types`, `npm run lint`, `node .agents/scripts/verify.js --strict`, `git diff --check HEAD`, and `codegraph status`. Do not add or run test suites for this execution.

### Phase 10 verification results — 2026-10-20

- `npm run check-types`: passed, 6/6 workspace tasks.
- `npm run lint`: passed with 0 errors; 151 Web and 44 Admin warnings remain.
- `node .agents/scripts/verify.js --strict`: passed 18 checks, 0 errors, 0 warnings, 6 info.
- `git diff --check HEAD`: passed; only an LF-to-CRLF notice for this plan file.
- `codegraph status`: up to date (936 files, 7,251 nodes, 16,861 edges).
- Tests were not added or run.

### Phase 11: Publish the scored review and close-out record

- [x] Task 43: Return a generic response for missing, expired, incorrect, and locked password-reset codes.
- [x] Task 44: Bound finalization requests and make retry after an already-committed completion return the saved result.
- [x] Task 45: Show a visible retry cue after finalization errors on desktop and mobile.
- [x] Update security documentation and the dated report with the follow-up findings and scoped scores.
- [x] Re-run fresh static checks and synchronize CodeGraph.
- [x] Review and commit the complete diff; complete the ordinary fast-forward push to `main` in Phase 13.

The blind panel scores in the report apply to the snapshot reviewed before Tasks 40–45 were closed. Follow-up reviewers rechecked only the closed findings and gave revised scoped scores; these are not described as a blind whole-repository re-score. Final follow-up mean: 7.00/10 (Engineering 8.0, Security/Reliability/QA 5.5, Product/UX/Ops 7.5).

At that phase, the ordinary commit was attempted but the pre-commit Fallow gate rejected the diff: 52 introduced complexity findings, 14 introduced duplicate-code groups, and 16 introduced Tailwind token-drift findings; no new dead-code finding was reported. No hook bypass was used. Phase 13 records the later cleanup and successful release.

### Phase 12: Close final blind-panel findings and re-score

- [x] Task 46: Run a fresh independent departmental panel and one cross-challenge round on the post-Phase-11 snapshot.
- [x] Task 47: Correct conditional registration/reset delivery copy, add classroom assignment loading and stale-response guards, and stop substituting the first question for a missing result reference.
- [x] Task 48: Synchronize CodeGraph and rerun type check, lint, strict repository verification, and whitespace validation; do not run tests.
- [x] Task 49: Complete the post-fix blind panel and chair adjudication; update the dated report.
- [x] Task 50: Complete the ordinary hook-checked commit and fast-forward push to `main` (the Fallow cleanup is recorded in Phase 13).
- [x] Task 51: Explicitly accept and document the remaining conditional blind-panel findings after checking production variable configuration.

Phase 12 static checks after Tasks 47–48: `npm run check-types` passed (6/6 workspace tasks); `npm run lint` passed with 0 errors (151 Web and 44 Admin warnings); `node .agents/scripts/verify.js --strict` passed 18 checks with 0 errors/warnings and 6 info; `git diff --check HEAD` passed. No test suites were added or run. CodeGraph is synchronized (936 files, 7,253 nodes, 16,858 edges).

At the start of Phase 13, the Fallow audit still reported 52 introduced complexity findings, 14 introduced duplicate-code groups, and 16 introduced Tailwind token-drift findings. The gate was subsequently cleared as recorded below.

The second blind panel scored the corrected snapshot 7.00/10 independent and 6.50/10 after cross-challenge. Accepted follow-ups include a safe exam-tab lease fallback/server-side rule if one-writer integrity is required, language annotations for Vietnamese content, trusted shared rate limiting after ingress verification, a defined revocation freshness guarantee, and in-flight AI generation coordination/cancellation. The exception-capture observation remains conditional on host-level logging. Details and severity conditions are in `docs/REPO_SCORE_REVIEW_2026-10-20.md`.

### Phase 13: Close the final Fallow findings and release

- [x] Re-run the new-only Fallow audit against `main` before commit; it passes with 0 introduced dead-code, complexity, duplicate-code, and styling findings. The 11 dead-code items, 74 complexity findings, 28 duplicate groups, and 2 styling findings are inherited and outside this gate.
- [x] Run the last blind cross-challenge and record its final scores and chair decisions in the dated review report.
- [x] Verify that production `JWT_SECRET` and `MONGODB_URI` variables are configured for both Vercel projects by listing variable names only; values were not read.
- [x] Task 50: Create an ordinary commit through the installed hook and fast-forward push to `main` (`4e05c7b`).
- [x] Task 51: Explicitly accept and document the remaining conditional operational, credential-contract, and accessibility follow-ups after checking production variable configuration.
- [x] Fix the Web sitemap build input: expose `MONGODB_URI` only to `@fquiz/web#build`, then confirm Turbo resolves it in strict mode.
- [x] Deploy Web and Admin to production through Vercel CLI; both deployments reached `READY`, production aliases resolved to those deployments, and `/`, `/login`, and `/sitemap.xml` returned HTTP 200.
- [x] Verify the production sitemap includes database-backed course routes (15 course URLs after the Web redeploy).

Final cross-challenge scores for this snapshot: Engineering 5.5/10, Security/Reliability/QA 7.0/10, and Product/UX/Operations 6.2/10 (equal-weight mean 6.23/10). This is a static source review and is not a runtime or user study.

Pre-release gate snapshot refreshed on 2026-10-20 at `557afb3`: `verdict=pass`; all four introduced finding counts are 0. `npm run check-types` passed (6/6 workspace tasks), `node .agents/scripts/verify.js --strict` passed (18 checks, 0 errors/warnings, 6 info), `git diff --check HEAD` passed, and CodeGraph was up to date (941 files, 7,765 nodes, 18,208 edges). No tests were added or run at that snapshot; the pre-push hook later ran Jest as recorded in the release close-out.

Chair disposition: production environment listings contain `JWT_SECRET` and `MONGODB_URI` for both projects, reducing the production crypto-fallback concern for these deployments; this does not establish configuration for every environment. Keep the source-literal fallback as a fail-closed hardening follow-up. Retain the web login response's reusable JWT as a P2 contract question until external clients are ruled out. Keep process-local rate-limit aggregation, web's bounded 60-second authorization cache, forwarded-header trust, AI in-flight coordination, mobile question-map semantics, generic image alt text, manual flashcard retry, and toolchain major-version drift in the prioritized backlog at the severities and confidence stated in the review report.

Release close-out: `4e05c7b` is pushed to `main`. The pre-push pipeline passed 18 strict checks and 104 Jest suites / 578 tests. Vercel deployments are READY: Web `dpl_BZgZVRNGs2BhoTMmAVQ8ett5G2oB` and Admin `dpl_6z84t4MuC4ZRvssZGsfAsH9NuHUC`. The first Web deploy showed a sitemap build-time MongoDB omission; `apps/web/turbo.json` now scopes `MONGODB_URI` to the Web build task. The next Web deploy connected to MongoDB and the production sitemap returned 15 course URLs. See the release follow-up in `docs/REPO_SCORE_REVIEW_2026-10-20.md` for remaining build warnings.
