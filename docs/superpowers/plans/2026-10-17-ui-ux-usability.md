# UI/UX Usability Implementation Plan

> Execute task by task with executing-plans / subagent-driven-development; review each scoped diff.

**Goal:** Resolve F1–F8 from the approved usability audit and produce successful web/admin production builds.
**Architecture:** Keep the existing hooks, session controllers and shared Radix primitives. Enforce tab write permission at answer/finalize boundaries, preserve failed answer payloads for retry, and correct existing UI state contracts.
**Tech stack:** Next.js 16, React 18, TypeScript, React Query, Zustand, Radix, existing Jest/Playwright.
**Spec:** C:/Users/nvt/.codex/visualizations/2026/10/17/01a14869-09a8-7980-a52b-e8c5213649af/FQUIZ_UI_UX_AUDIT.md

Global constraints: Ponytail full; no new dependencies; text-only product; semantic theme tokens; existing app/package boundaries; server-side scoring unchanged. Use current clean checkout on task branch codex/ui-ux-usability. No publishing, push, database mutations or commits. Leave changes reviewable in the workspace.

- [x] Task 1 — Session reliability and keyboard (F2/F3/F4).
  - Trace callers of useExamTabLease, useSubmitAnswer, useSessionFinalize, useSessionAnswerSync, SessionLayout and the mobile controller.
  - Add failing behavioral tests for read-only answer/finalize rejection, failed-answer retry, and native button/dialog key handling.
  - Share one lease state per mounted session with both desktop/mobile mutation guards and controls. Guard final submit while an answer is pending or unsaved. Preserve selected failed answers and provide a concise retry action/status; acknowledge success before counting saved progress.
  - Keep native Enter/Space behavior on controls and ignore handled events/dialogs; retain arrow navigation in quiz content.
  - Run focused tests, verify RED→GREEN and review the diff.
- [x] Task 2 — Accessible auth and navigation (F1/F5/F6).
  - Remove auth opacity-0 defaults; retain the existing conditional GSAP entrance.
  - Use existing shared Radix Dialog for web mobile sheets and admin mobile drawer, with accessible titles, Escape, trapped/restored focus and scrolling.
  - Link login errors to inputs, focus first invalid field, and enlarge Show password target.
  - Add focused behavioral checks where needed; browser acceptance covers actual focus/reflow.
- [x] Task 3 — Results and admin feedback (F7/F8).
  - Use one filtered index list for matrix and Previous/Next; normalize selection on filter changes and show an empty state.
  - Expose users query error/refetch; show load failure with Retry separately from an empty successful response.
  - Add and run minimal regression tests against real component/hook behavior.
- [x] Final — Review, browser smoke, lint, uncached types, full Jest, strict rules, production build.
  - Commands: npm run lint; npm run check-types -- --force; npm test -- --runInBand; node .agents/scripts/verify.js --strict; npm run build -- --force.
  - Both @fquiz/web and @fquiz/admin must build successfully with exit 0.
  - Inspect warnings separately; do not report existing warnings as zero warnings.
  - Stop temporary servers, restore only generated files introduced by validation, and sync CodeGraph.

Final evidence (2026-10-17): all five commands exited 0. Jest 87 suites / 517 tests; all 74 baseline suites retained. Strict rules 18/18; types 6/6 uncached tasks. Web and admin production build 2/2 uncached tasks. Lint 0 errors / 204 warnings; React 18 deprecation remains. Final re-review: all three findings addressed, no new Important/Critical. CodeGraph current; git diff --check exit 0. Changes remain uncommitted on codex/ui-ux-usability.
