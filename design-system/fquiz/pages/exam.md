# Exam & Session Page Overrides (`apps/web/app/quiz/[id]/session/[sessionId]`)

> **PROJECT:** FQuiz
> **Updated:** 2026-10-16
> **Page Type:** Mission-Critical Exam & Practice Execution Room

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/fquiz/MASTER.md`).

---

## Mission-Critical Exam Mode Invariants (`fquiz-ui-ux-audit` P0/P1)

1. **Zero Unload on 401 (`In-Place Re-Auth Mandate`):**
   - Never assign `window.location.href = '/login...'` inside `useSubmitAnswer`, `useSessionFinalize`, or `useFlashcardSession`.
   - On HTTP `401`, trigger the In-Place Re-auth Modal (`useAuthModalStore`) so client-side answer selections and timer state remain 100% intact.
2. **Strict AI Prohibition in Exam Mode:**
   - When `session.mode === 'review'` (Exam Mode), `<QuizAIAssistantDrawer />` and any AI trigger buttons MUST be completely unmounted (`null`), and lazy-loaded via `next/dynamic` only in Practice/Learn modes.
3. **Authoritative Multi-Tab Exam Lease (`BroadcastChannel`):**
   - Synchronize active exam sessions across browser tabs via `BroadcastChannel('fquiz_exam_lease_${sessionId}')`. Only one tab holds active submission authority at a time; secondary tabs display a read-only warning banner with a *"Take over session in this tab"* action.
4. **Mobile Safe-Area & Ergonomics:**
   - `MobileSessionHeader`: `pt-[env(safe-area-inset-top)]`, all icon buttons `h-11 w-11` (`44×44px`) with explicit `aria-label` and `aria-pressed`.
   - `MobileSessionFooter`: `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
   - Progress Bar: Animate via `transform: scaleX(...)` (`origin-left`) instead of layout-thrashing `width`.
5. **Screen Reader Semantic Flow:**
   - Question navigator buttons must announce `Question N, Answered/Unanswered/Flagged` via `aria-label` and `aria-current="step"` on the active question.
   - Answer option cards must expose `role="radio"` / `role="checkbox"` and `aria-checked={isSelected}`.
