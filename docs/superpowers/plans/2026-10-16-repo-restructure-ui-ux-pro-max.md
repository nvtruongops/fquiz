# FQuiz Repository Restructuring & `ui-ux-pro-max` Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate "Hollow Monorepo Syndrome" across `@fquiz/*` packages, enforce P0/P1 exam resilience, decompose oversized pages/hooks per `fquiz-code-refactor-performance`, and apply `ui-ux-pro-max` Priority 1–10 accessibility, touch-target, safe-area, lazy-loading, and reduced-motion standards across `apps/web` and `apps/admin`.

**Architecture:** Symmetrical Turborepo Monorepo (`apps/web`, `apps/admin`, `packages/database`, `packages/models`, `packages/auth`, `packages/ui`, `packages/config-typescript`) with single-source shared primitives/utilities in `packages/*`, slim route/hook orchestrators (<200L), and strict 3-Tier Semantic Theme Tokens (4 WCAG 2.2 AA themes).

**Tech Stack:** Next.js 16 App Router, React 18, TypeScript 5, Tailwind CSS 3, Shadcn/Radix UI (`@fquiz/ui`), GSAP (`@gsap/react`), Zustand, TanStack Query v5, Mongoose 9, Jest.

**Spec:** `docs/superpowers/specs/2026-10-16-repo-restructure-ui-ux-pro-max-design.md`

## Global Constraints

- **Text-Only Scope:** Never introduce audio, TTS/STT, OCR, 3D WebGL, or multimedia features.
- **No Hardcoded Colors:** Never write raw hex (`#...`) or hardcoded Tailwind palette classes (`bg-white`, `bg-slate-*`, `text-gray-*`, `bg-amber-*`, `bg-emerald-*`) in `.tsx` files; always use semantic tokens (`bg-card`, `text-foreground`, `bg-warning-bg text-warning-fg border-warning-border`, `bg-success-bg text-success-fg border-success-border`).
- **No `.populate()` or Cross-App Imports:** Never import between `apps/web` and `apps/admin` or use Mongoose `.populate()`.
- **Line Limits:** Pages (`app/**/page.tsx`) $\le 200$ lines (`apps/admin` pages $\le 150$ lines); Hooks (`hooks/**/*.ts`) $\le 200$ lines; New extracted components $\le 250$ lines.
- **Strict Verification:** `npm run lint`, `npm run check-types`, `npm test`, and `node .agents/scripts/verify.js --strict` must pass with 0 errors.

---

### Task 1: Unify `@fquiz/ui`, `@fquiz/auth`, `@fquiz/database` & Clean Legacy Root Clutter

**Files:**
- Modify: `packages/ui/src/components/badge.tsx`
- Modify: `packages/ui/src/components/dialog.tsx`
- Modify: `packages/ui/src/components/select.tsx`
- Modify: `packages/ui/src/components/dropdown-menu.tsx`
- Modify: `packages/ui/src/components/checkbox.tsx`
- Modify: `packages/ui/src/toast/toast-provider.tsx`
- Modify: `packages/auth/src/crypto.ts`
- Modify: `packages/database/src/mongodb.ts`
- Modify: `apps/web/lib/core/security/crypto.ts`
- Modify: `apps/admin/lib/security/crypto.ts`
- Modify: `apps/web/lib/core/db/base-schema.ts`
- Modify: `apps/web/lib/core/db/model-registry.ts`
- Modify: `apps/web/lib/core/utils/cn.ts`
- Modify: `apps/admin/lib/utils/cn.ts`
- Modify: `apps/web/components/shared/ui/{alert,avatar,badge,button,card,checkbox,collapsible,dialog,dropdown-menu,input,progress,scroll-area,select,skeleton,switch,tabs,textarea,toast-provider}.tsx`
- Modify: `apps/web/store/shared/toast-store.ts`
- Modify: `apps/admin/components/ui/{badge,button,card,dialog,dropdown-menu,input,scroll-area,select,switch,table,tabs,tooltip}.tsx`
- Modify: `apps/admin/app/globals.css`
- Modify: `apps/admin/app/layout.tsx`
- Modify: `apps/admin/app/providers.tsx`
- Modify: `package.json`
- Delete: `tailwind.config.ts`, `postcss.config.js`, `components.json`, `vercel.json`, `next-env.d.ts` (root-level legacy copies only)
- Delete empty dirs: `apps/web/components/home`, `apps/web/components/shared/landing`, `apps/web/components/shared/utils`
- Test: `packages/auth/__tests__/crypto-unification.test.ts`

**Interfaces:**
- Produces:
  - `@fquiz/ui` `Badge` variants: `'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'attempted'`
  - `@fquiz/auth` `encryptSecret(plainText: string): string` & `decryptSecret(cipherText: string): string` with multi-key fallback across `ENCRYPTION_KEY` and `JWT_SECRET`
  - Unified `@fquiz/database` `registerModel` & `bootstrapModels` shared by `apps/web` and `apps/admin`

- [ ] **Step 1: Write unit test verifying cross-app AES-256-GCM encryption/decryption compatibility**
- [ ] **Step 2: Unify `packages/auth/src/crypto.ts`, `packages/database/src/mongodb.ts`, and re-export from `apps/web` and `apps/admin`**
- [ ] **Step 3: Enhance `packages/ui` primitives (`badge.tsx`, `toast-provider.tsx`, `aria-hidden="true"` on decorative icons) and wire `apps/web/components/shared/ui/*` & `apps/admin/components/ui/*` to re-export from `@fquiz/ui`**
- [ ] **Step 4: Sync 4-theme CSS variables in `apps/admin/app/globals.css`, enable `ThemeProvider` in `apps/admin/app/providers.tsx`, and remove legacy root single-app config files & empty directories**
- [ ] **Step 5: Run `npm test`, `npm run check-types`, and `node .agents/scripts/verify.js --strict`**

---

### Task 2: P0/P1 Mission-Critical Exam Resilience, Safe-Area & Accessibility in `apps/web`

**Files:**
- Create: `apps/web/hooks/quiz/useExamTabLease.ts`
- Create: `apps/web/hooks/quiz/__tests__/useExamTabLease.test.ts`
- Modify: `apps/web/hooks/quiz/useSubmitAnswer.ts`
- Modify: `apps/web/hooks/quiz/useSessionFinalize.ts`
- Modify: `apps/web/hooks/quiz/useFlashcardSession.ts`
- Modify: `apps/web/components/quiz/session/SessionLayout.tsx`
- Modify: `apps/web/components/quiz/session/QuizHeader.tsx`
- Modify: `apps/web/components/quiz/session/QuizSidebar.tsx`
- Modify: `apps/web/components/quiz/mobile/MobileSessionHeader.tsx`
- Modify: `apps/web/components/quiz/mobile/MobileSessionFooter.tsx`
- Modify: `apps/web/components/quiz/mobile/MobileSessionQuestionCard.tsx`
- Modify: `apps/web/components/quiz/detail/InteractiveResultViewer.tsx`
- Modify: `apps/web/components/dashboard/LearningStudioGrid.tsx`
- Modify: `apps/web/components/dashboard/RecentActivitiesFeed.tsx`
- Modify: `apps/web/components/dashboard/IncompleteSessionBanner.tsx`

**Interfaces:**
- Produces:
  - `useExamTabLease(sessionId: string, enabled: boolean): { isReadOnlyTab: boolean; takeOverLease: () => void }`
  - Zero `window.location.href` redirects on 401 inside quiz session hooks (`openAuthPrompt()` invoked instead)
  - Dynamic-imported `QuizAIAssistantDrawer` strictly unmounted when `session.mode !== 'practice'`

- [ ] **Step 1: Write unit test for `useExamTabLease` and 401 non-redirect behavior**
- [ ] **Step 2: Implement `useExamTabLease.ts` (`BroadcastChannel`) and wire read-only multi-tab banner + strict `session.mode === 'practice'` AI guard into `SessionLayout.tsx`**
- [ ] **Step 3: Replace `window.location.href = '/login...'` on 401 in `useSubmitAnswer.ts`, `useSessionFinalize.ts`, and `useFlashcardSession.ts` with `useAuthModalStore.getState().openModal('login')` + toast error**
- [ ] **Step 4: Apply `ui-ux-pro-max` safe-area insets, `44×44px` (`h-11 w-11`) touch targets, GPU `scaleX` progress bars, `aria-label`/`aria-current`/`aria-checked` attributes, and `gsap.matchMedia()` `(prefers-reduced-motion: no-preference)` guards**
- [ ] **Step 5: Run `npm test`, `npm run lint`, and ` npm run check-types`**

---

### Task 3: Refactor Fat Pages (`< 200L`) & Add `next/dynamic` Lazy Loading in `apps/web`

**Files:**
- Create: `apps/web/components/teacher/quizzes/TeacherQuizGridCard.tsx`
- Create: `apps/web/components/teacher/quizzes/TeacherQuizFilterToolbar.tsx`
- Create: `apps/web/components/auth/LoginHeroPanel.tsx`
- Create: `apps/web/lib/constants/legal-content.ts`
- Modify: `apps/web/app/(teacher)/teacher/quizzes/page.tsx` (314L $\rightarrow < 150\text{L}$)
- Modify: `apps/web/app/(auth)/login/page.tsx` (306L $\rightarrow < 160\text{L}$)
- Modify: `apps/web/app/terms/page.tsx` (206L $\rightarrow < 100\text{L}$)
- Modify: `apps/web/app/privacy/page.tsx` (205L $\rightarrow < 100\text{L}$)
- Modify: `apps/web/components/layout/MobileNav.tsx`
- Modify: `apps/web/components/layout/MobileNavExamSheet.tsx`
- Modify: `apps/web/components/layout/MobileNavUserSheet.tsx`
- Modify: `apps/web/components/layout/AppLayout.tsx`
- Modify: `apps/web/components/quiz/detail/QuizActionCard.tsx`
- Modify: `apps/web/app/(student)/profile/page.tsx`

- [ ] **Step 1: Extract `TeacherQuizGridCard.tsx` and `TeacherQuizFilterToolbar.tsx` to slim `apps/web/app/(teacher)/teacher/quizzes/page.tsx` below 150 lines**
- [ ] **Step 2: Extract `LoginHeroPanel.tsx` to slim `apps/web/app/(auth)/login/page.tsx` below 160 lines**
- [ ] **Step 3: Extract static legal content to `apps/web/lib/constants/legal-content.ts` to slim `terms/page.tsx` and `privacy/page.tsx` below 100 lines**
- [ ] **Step 4: Add `next/dynamic` (`{ ssr: false }`) for `MobileNavExamSheet`, `MobileNavUserSheet`, `AuthPromptModal`, `QuizResumeSessionModal`, `GuestHistoryReminderModal`, and `DeleteAccountModal`, plus `role="dialog" aria-modal="true"` and safe-area padding on `MobileNav*`**
- [ ] **Step 5: Run `npm run lint`, `npm run check-types`, and `npm test`**

---

### Task 4: Refactor Fat Hooks/Pages & Apply `ui-ux-pro-max` Standards in `apps/admin`

**Files:**
- Create: `apps/admin/lib/utils/quiz-file-parser.ts`
- Create: `apps/admin/hooks/quiz/useQuizBankSync.ts`
- Create: `apps/admin/hooks/quiz/useCourseCodeCheck.ts`
- Create: `apps/admin/components/settings/LLMSettingsCard.tsx`
- Create: `apps/admin/components/dashboard/RecentRegistrationsTable.tsx`
- Create: `apps/admin/components/users/UserDeleteDialog.tsx`
- Modify: `apps/admin/hooks/quiz/useQuizFileUpload.ts` (408L $\rightarrow < 190\text{L}$)
- Modify: `apps/admin/hooks/quiz/useQuizEditorForm.ts` (383L $\rightarrow < 195\text{L}$)
- Modify: `apps/admin/app/(dashboard)/settings/page.tsx` (166L $\rightarrow < 115\text{L}$)
- Modify: `apps/admin/app/(dashboard)/page.tsx` (163L $\rightarrow < 115\text{L}$)
- Modify: `apps/admin/app/(dashboard)/users/page.tsx`
- Modify: `apps/admin/components/quiz/QuizEditorWithQuestionBank.tsx`
- Modify: `apps/admin/components/quiz/editor/QuizEditorMetadataCard.tsx`
- Modify: `apps/admin/components/quiz/editor/QuizEditorSyncConfirmModal.tsx`
- Modify: `apps/admin/components/quiz/editor/QuizEditorFileUploadModal.tsx`
- Modify: `apps/admin/components/quiz/editor/QuizEditorQuestionCard.tsx`
- Modify: `apps/admin/components/quiz/editor/ QuizEditorHeader.tsx`
- Modify: `apps/admin/components/quiz/editor/upload/UploadQuickJumpBar.tsx`
- Modify: `apps/admin/components/AdminHeader.tsx`
- Modify: `apps/admin/components/categories/CategoryList.tsx`
- Modify: `apps/admin/components/users/UserTable.tsx`
- Modify: `apps/admin/components/quizzes/QuizTable.tsx`
- Modify: `apps/admin/components/feedback/FeedbackList.tsx`
- Modify: `apps/admin/components/QuestionBankStatus.tsx`
- Modify: `apps/admin/components/QuestionBankAnalytics.tsx`
- Modify: `apps/admin/app/login/page.tsx`

- [ ] **Step 1: Split `useQuizFileUpload.ts` (408L) and `useQuizEditorForm.ts` (383L) below 200 lines each by extracting `lib/utils/quiz-file-parser.ts`, `useQuizBankSync.ts`, and `useCourseCodeCheck.ts`**
- [ ] **Step 2: Slim `apps/admin/app/(dashboard)/settings/page.tsx` (166L) and `apps/admin/app/(dashboard)/page.tsx` (163L) below 120 lines by extracting `LLMSettingsCard.tsx` and `RecentRegistrationsTable.tsx` (using `@fquiz/ui` `<Table>`)**
- [ ] **Step 3: Replace `window.confirm()` in `users/page.tsx` with `UserDeleteDialog.tsx`, and lazy-load heavy modals in `QuizEditorWithQuestionBank.tsx` via `next/dynamic`**
- [ ] **Step 4: Add `aria-label` to all icon-only buttons, `aria-hidden="true"` to decorative icons, `htmlFor`/`id` to `login/page.tsx` & `QuizEditorMetadataCard.tsx`, touch target sizing (`h-9 w-9`), and replace raw `amber-*`/`emerald-*`/`text-success-text` classes with semantic Warning/Success Triad tokens**
- [ ] **Step 5: Run `npm run lint`, `npm run check-types`, `npm test`, and `node .agents/scripts/verify.js --strict`**
