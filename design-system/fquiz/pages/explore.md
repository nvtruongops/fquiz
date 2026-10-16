# Explore & Course Discovery Page Overrides (`apps/web/app/explore`, `courses/[code]`)

> **PROJECT:** FQuiz
> **Updated:** 2026-10-16
> **Page Type:** Public Course Catalog, Mix-Quiz Synthesizer & Pinned Questions Hub

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/fquiz/MASTER.md`).

---

## Page-Specific Rules

### Search & Filtering UX (`ui-ux-pro-max` Priority 8 & 9)
- **Debounced Live Filtering:** Filter course codes and titles with a 250ms debounce (`useDebounce`) without blocking input keystrokes.
- **Accessible Filter Pills:** Category filter chips must remain keyboard focusable (`focus-visible:ring-2 focus-visible:ring-ring`), expose `aria-pressed`, and wrap cleanly on 320px–375px viewports without horizontal page overflow.
- **Helpful Empty States:** When a search query or filter returns 0 courses/questions, render a clear empty state card with a 1-click *"Reset filters"* button.

### Component Decomposition
- Keep `CategoryFilter`, `CourseQuizList`, `MixQuizTab`, and `PinnedQuestionsTab` modular (< 250 lines per file), extracting card items, filter bars, and quota dialogs into dedicated subcomponents.
