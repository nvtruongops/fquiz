# Quiz Session First-Paint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the current quiz question as soon as its session data is ready, avoid the transition skeleton flash, and keep navigation safe until all questions are loaded.

**Architecture:** Share one readiness rule between desktop and mobile. The initial session response can render the server-selected question while the full question list loads in parallel; navigation stays disabled until that full list is available. During a quiz transition, keep a quiz loading overlay instead of briefly replacing it with a skeleton.

**Tech Stack:** Next.js 16, React, TanStack Query, Jest, TypeScript.

**Spec:** User report for `/quiz/[id]/session/[sessionId]` and mobile session creation flow.

## Global Constraints

- Preserve existing API response and answer-security contracts; never expose correctness before submission.
- Use the server-hydrated session index for the current question.
- Keep mock E2E fixtures intact; production has no mock data to remove.
- Do not add dependencies or claim authenticated production latency without an authenticated measurement.

---

### Task 1: Define and test session first-paint readiness

**Files:**
- Create: `apps/web/hooks/quiz/session-rendering.ts`
- Test: `apps/web/hooks/quiz/__tests__/session-rendering.test.ts`

**Interfaces:**
- `isSessionQuestionReady({ isInitialLoading, isReadyToRender, sessionStatus })` returns `true` only when the initial request completed, server hydration completed, and status is not `preparing`.
- `isQuestionNavigationReady(preloadedCount, totalQuestions)` returns `true` for a one-question session or after the complete question set is preloaded.
- `shouldShowSessionSkeleton(isLoading, sessionLoaderOpen, transitionLoaderActive)` returns `true` only when loading with neither a session loader nor a transition loader active.

- [x] Write tests for a hydrated active question, a preparing session, an initial request in flight, a transition with no question data, and ordinary initial skeleton fallback.
- [x] Run `npm test -- --runInBand apps/web/hooks/quiz/__tests__/session-rendering.test.ts` and confirm the missing helper causes the expected failure.
- [x] Implement the three small pure functions with those exact inputs and boolean outputs.
- [x] Re-run the focused test and require all assertions to pass.

### Task 2: Render the available question and guard unloaded navigation

**Files:**
- Modify: `apps/web/components/quiz/session/DesktopSessionContent.tsx`
- Modify: `apps/web/hooks/quiz/useMobileQuizSessionController.ts`
- Modify: `apps/web/app/quiz/[id]/session/[sessionId]/mobile/page.tsx`
- Modify: `apps/web/components/quiz/session/SessionLayout.tsx`
- Modify: `apps/web/components/quiz/session/QuizSessionSkeleton.tsx`
- Modify: `apps/web/components/quiz/session/QuizSidebar.tsx`
- Modify: `apps/web/components/quiz/session/QuestionDisplay.tsx`
- Modify: `apps/web/components/quiz/mobile/MobileSessionFooter.tsx`
- Modify: `apps/web/components/quiz/mobile/MobileSessionDialogs.tsx`
- Modify: `e2e/helpers/mock-data.ts`
- Modify: `e2e/quiz-session.spec.ts`

**Interfaces:**
- Desktop and mobile loading gates use `isSessionQuestionReady`; they do not wait for the full preload if the initial question is ready.
- Desktop and mobile navigation handlers reject indexes until `preloadedQuestions.length >= session.totalQuestions`; the visible navigation controls are disabled in that interval.
- Initialize the session loader open for desktop/mobile session routes so the first render cannot flash `QuizSessionSkeleton` before an effect runs.

- [x] Wire the shared loading helpers into both session surfaces and remove `isPreloading` from the first-question gate.
- [x] Disable desktop sidebar, inline question navigation, mobile footer, and swipe/map navigation until the full question list is loaded.
- [x] Preserve the current question card and its immediate local selection state while preloading continues.
- [x] Keep initial-session errors blocking and do not surface correct answers before the answer endpoint responds.

### Task 3: Verify the quiz flow and repository

**Files:**
- No additional source files.

**Interfaces:**
- The test and strict verification gates must pass on the complete current diff before any new commit.

- [x] Run the focused session-rendering, pending-answer, session API, session answer, and Playwright mobile/desktop session tests.
- [x] Run lint, type checks, the full test suite, strict repository verification, and the Web production build.
- [x] Inspect `git diff --check`, the complete diff, mock policy, and `git status`.

### Task 4: Push, deploy, and smoke check

**Files:**
- No additional source files.

**Interfaces:**
- Push the verified changes to the current feature branch and deploy the root-linked `fquiz` Web project with `npx vercel --prod --yes --scope nvtruongops`.

- [ ] Commit and push the verified implementation.
- [ ] Verify the production deployment reaches `READY` and retains the `https://fquiz-web.vercel.app` alias.
- [ ] Smoke-check public routes and report that authenticated quiz interaction latency remains unmeasured without an authenticated production session.
