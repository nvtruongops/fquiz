# Admin Console Page Overrides (`apps/admin/app/(dashboard)`)

> **PROJECT:** FQuiz (`@fquiz/admin` — Port 3001)
> **Updated:** 2026-10-16
> **Page Type:** High-Density Data Operations, Question Bank Governance & RBAC Management

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/fquiz/MASTER.md`).

---

## Page-Specific Rules

### Layout, Theme & Component Unification
- **4-Theme Parity:** `apps/admin` consumes `@fquiz/ui` `ThemeProvider`, `ToastProvider`, and all 4 WCAG 2.2 AA themes (`light`, `dark`, `green`, `pink`).
- **Slim Route Orchestrators:** All `apps/admin/app/**/page.tsx` files must remain $< 150$ lines, delegating data tables, forms, and modals to `components/` and `hooks/`.
- **Lazy-Loaded Heavy Modals:** Question Bank file uploaders (`QuizEditorFileUploadModal`), conflict resolvers (`QuestionConflictModal`), and confirmation dialogs must be loaded via `next/dynamic(..., { ssr: false })`.

### Data Tables, Forms & Accessibility (`ui-ux-pro-max` Priority 1, 2, 8)
- **Standardized `<Table>` & `<Skeleton>`:** Use `@fquiz/ui` `<Table>` primitives and `<Skeleton>` loading rows instead of raw `<table>` markup or layout-shifting spinners.
- **No Native `window.confirm()`:** Destructive actions (deleting users, quizzes, categories, feedback) must use `@fquiz/ui` `<Dialog>` confirmation modals.
- **Icon-Only Action Buttons:** Every table/row icon action button (Edit, Delete, Suspend, Activate, Refresh, Move Up/Down, Pagination) MUST have an explicit `aria-label` and minimum `h-9 w-9` (`36×36px`) hit area (`min-h-11 min-w-11 sm:min-h-9 sm:min-w-9`).
