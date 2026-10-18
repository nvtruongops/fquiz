# FQuiz Lite Quiz Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make active quiz sessions lighter on client rendering and avoid optional usage-stat reads during question preload, while preserving server-authoritative answer scoring and saving.

**Architecture:** Reuse the existing animation preference and the existing cached question-usage service. Default to the existing static question view, narrow the mobile answer transition, and skip usage lookups only for active multiple-choice sessions.

**Tech Stack:** Next.js, React, Mongoose, Jest, TypeScript.

**Spec:** User request in this conversation to assess the free-tier deployment and rebuild quiz interactions as a lite experience.

## Global Constraints

- Keep quiz authorization, answer persistence, and scoring server-authoritative.
- Do not change Vercel function regions or MongoDB pool sizes without confirming the production database region and workload.
- Preserve usage badges for completed sessions and flashcard sessions.
- Keep explicit saved animation preferences intact.

---

### Task 1: Default quiz motion to lite and remove broad mobile answer transitions

**Files:**
- Modify: `apps/web/hooks/quiz/useAnimationPreference.ts`
- Modify: `apps/web/components/quiz/session/DesktopSessionContent.tsx`
- Modify: `apps/web/components/quiz/mobile/MobileSessionQuestionCard.tsx`
- Test: `apps/web/hooks/quiz/__tests__/useAnimationPreference.test.ts`
- Test: `apps/web/components/quiz/mobile/__tests__/MobileSessionQuestionCard.test.tsx`

- [x] Add a hook test proving an unset preference defaults to animations off; run it and confirm the expected failure.
- [x] Add a render test proving mobile answer buttons use no all-property transition; run it and confirm the expected failure.
- [x] Change only the hook default and mobile answer-button transition class; keep saved preferences and option feedback behavior.
- [x] Run both focused tests.

### Task 2: Skip optional usage-stat lookups while an assessment is active

**Files:**
- Modify: `apps/web/app/api/sessions/[id]/questions/route.ts`
- Test: `apps/web/app/api/sessions/__tests__/questions-route.test.ts`

- [x] Add tests that active immediate/review sessions do not call the usage lookup, while completed or flashcard sessions still do; confirm the new active-session case fails first.
- [x] Reuse an empty usage map for active immediate/review sessions; preserve the existing lookup for completed and flashcard sessions.
- [x] Run the focused route test.

### Task 3: Verify and synchronize

- [x] Run `npm run lint`.
- [x] Run `npm run check-types`.
- [x] Run `npm test`.
- [x] Run `node .agents/scripts/verify.js --strict`.
- [x] Run `codegraph sync .` and confirm an up-to-date index.
