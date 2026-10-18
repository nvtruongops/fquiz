# Task-First Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` for independent tasks or `executing-plans` for tightly coupled work. Steps use checkbox syntax for tracking.

**Goal:** Implement the approved task-first desktop/mobile dashboard using existing routes, dashboard data, and API contracts.

**Architecture:** Keep the dashboard query and response shape. Move resume/Explore ahead of secondary activity, remove heavy duplicate route cards and dashboard-only filters, render a real first-load error with retry, and invalidate existing dashboard/history caches after successful quiz finalization.

**Tech Stack:** Next.js 16, React, TanStack Query, Tailwind CSS, Jest.

**Spec:** `docs/superpowers/specs/2026-10-18-dashboard-layout-proposal.md`

## Global Constraints

- Preserve all existing dashboard API and response contracts; do not add endpoints or dependencies.
- An active session is the primary action; otherwise the primary action opens `/explore`.
- Keep the desktop content/supporting split at 8/4 columns and use one-column mobile flow with no sticky activity panel.
- Keep genuine empty data distinct from request failure, and retain cached data when a background refresh fails.
- Preserve the existing global navigation, four themes, semantic tokens, quiz routes, and mobile bottom spacing.
- Do not claim authenticated UX metrics without authenticated testing.

---

### Task 1: Distinguish dashboard load failure from a real empty state

**Files:**
- Modify: `apps/web/hooks/useStudentDashboard.ts`
- Modify: `apps/web/app/(student)/dashboard/page.tsx`
- Create: `apps/web/hooks/__tests__/useStudentDashboard.test.ts`

**Interfaces:**
- `useStudentDashboard()` returns its existing fields plus `isError`.
- The page shows a retry state only when the initial query failed without cached data.

- [x] Write a hook test where `useQuery` returns `isError: true`; assert the hook exposes `isError`.
- [x] Run that test and confirm it fails because `isError` is not returned.
- [x] Return `isError` from the existing query and render a dashboard-level retry message when `isError && !data`.
- [x] Re-run the focused hook test and the dashboard lint/type checks.

### Task 2: Refresh dashboard/history after successful finalization

**Files:**
- Modify: `apps/web/hooks/quiz/useSessionFinalize.ts`
- Modify: `apps/web/hooks/quiz/__tests__/sessionMutationIdentity.test.ts`

**Interfaces:**
- On a current-session success, invalidate `['student', 'dashboard']` and `['history']` before navigating to results.
- Stale-session responses must continue to avoid invalidation and navigation.

- [x] Add a successful-finalization test asserting both existing query prefixes are invalidated.
- [x] Run the new test and confirm it fails before implementation.
- [x] Add the minimal `useQueryClient()` invalidations in the successful current-session path.
- [x] Run the identity and mutation-guard tests.

### Task 3: Implement the task-first responsive layout

**Files:**
- Modify: `apps/web/app/(student)/dashboard/page.tsx`
- Modify: `apps/web/components/dashboard/DashboardHeader.tsx`
- Modify: `apps/web/components/dashboard/IncompleteSessionBanner.tsx`
- Modify: `apps/web/components/dashboard/PinnedCategoriesSection.tsx`
- Modify: `apps/web/components/dashboard/RecentActivitiesFeed.tsx`
- Modify: `apps/web/components/dashboard/DashboardSkeleton.tsx`
- Modify: `packages/ui/src/components/skeleton.tsx`
- Create: `apps/web/components/dashboard/__tests__/DashboardHeader.test.tsx`
- Remove: `apps/web/components/dashboard/LearningStudioGrid.tsx` if no compact shortcut remains useful beside the existing shell and History link.

**Interfaces:**
- Header shows a compact dashboard heading, greeting, refresh action, and Explore action only without an active session.
- Activity feed shows up to five unfiltered recent rows and one History link.
- Mobile order is primary action/resume, pinned subjects, recent activity, then compact Classroom and Community shortcuts. Wide screens use 8/4 columns with no sticky pane.

- [x] Write server-rendered header tests for the no-session Explore action and active-session state; verify they fail against the old header.
- [x] Update the markup and skeleton to the same order and compact shapes; keep only compact Classroom and Community shortcuts while removing ambient glow, large promo cards, drag-only scrolling, and hover scaling.
- [x] Keep links keyboard reachable, horizontally scrollable pinned links touch accessible, and visible controls at least 44px high where already promised.
- [x] Run lint, type checks, full tests, strict repository verification, and web production build.
- [x] Inspect the diff for API/data changes, theme-token violations, missing shortcuts, and accidental changes outside the dashboard.

### Task 4: Push and deploy the Web Portal

**Files:**
- No additional source files.

**Interfaces:**
- Deploy only the root-linked `fquiz` Web project to `https://fquiz-web.vercel.app`.

- [x] Confirm the correct root `.vercel/project.json` project ID.
- [x] Commit the verified changes and push the current feature branch.
- [x] Deploy with `npx vercel --prod --yes --scope nvtruongops` from the monorepo root.
- [x] Verify deployment status and public route response without claiming an authenticated visual test.

### Task 5: Rebuild dashboard density from authenticated visual feedback

**Files:**
- Modify: `apps/web/app/(student)/dashboard/page.tsx`
- Modify: `apps/web/components/dashboard/IncompleteSessionBanner.tsx`
- Modify: `apps/web/components/dashboard/PinnedCategoriesSection.tsx`
- Modify: `apps/web/components/dashboard/RecentActivitiesFeed.tsx`
- Modify: `apps/web/components/dashboard/DashboardSkeleton.tsx`

**Interfaces:**
- Keep the active-session banner first, followed by pinned subjects, recent activity, then compact secondary links.
- Render recent activity in a responsive full-width card grid; use a single column on mobile and multiple columns on wide screens.
- Preserve existing activity links, status labels, quiz/session data, API response, semantic theme tokens, and mobile navigation spacing.
- Use light surfaces and color-only hover states; remove the large glass activity container and vertical timeline rails from the dashboard.

- [x] Update the page and loading skeleton to use the full-width section order.
- [x] Convert recent activity into compact, equal-height responsive cards without timeline connector rails.
- [x] Review keyboard-focus states and 320px responsive classes in source; verify all four theme tiers. Authenticated visual rendering is unavailable in this session.
- [x] Run lint, type checks, repository verification, and a production build; inspect the final diff.
- [ ] Commit, push the feature branch, deploy the Web project, and smoke-check the production alias.
