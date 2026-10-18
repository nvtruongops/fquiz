# Student dashboard layout proposal — 2026-10-18

## Decision

Reshape `/dashboard` into a task-first learning home using the data and routes already available. Put the most useful next action first: resume an active quiz when one exists; otherwise start practice from Explore. Keep recent activity as supporting context and reduce the large promotional cards to compact route links.

This is a proposal only. No dashboard application code was changed in this pass.

## Scope and evidence

- Reviewed `DashboardPage`, `DashboardHeader`, `IncompleteSessionBanner`, `PinnedCategoriesSection`, `LearningStudioGrid`, `RecentActivitiesFeed`, `DashboardSkeleton`, `useStudentDashboard`, and the existing dashboard API response.
- The live `/dashboard` route redirected to login during inspection, so authenticated visual behavior was not available. Findings below are static source observations, not a browser usability test.
- The prior static audit scored dashboard implementation intent **7/10**. Empirical UX remains **N/A** because there is no dashboard task study, route-level task-completion data, or authenticated field review in this evidence set.
- The dashboard query already returns recent activities, pinned categories, and active-session details. The proposal adds no endpoint, dependency, or speculative KPI.

## Current layout

`DashboardPage` uses a 7/5 desktop split: greeting, resume banner, pinned categories, and a four-card “Learning Studio” grid on the left; a sticky activity panel on the right. At mobile widths this becomes a long single column, with large cards and the activity filters stacked below. The global shell already provides a desktop sidebar and fixed mobile navigation.

The current composition has useful building blocks, but the hierarchy competes with itself:

- The greeting is a large elevated card with an avatar, role badge, promotional copy, glow, and refresh control, but it does not present the next learning action.
- “Resume Quiz” can appear below that greeting, while the largest Explore card and separate Classroom, History, and Community cards repeat routes already available in global navigation.
- The activity panel has All / In Progress / Completed filters that duplicate the fuller History route and add controls to the dashboard's supporting content.
- The pinned-subject row scrolls horizontally and supports mouse dragging. Keep its links reachable by touch and keyboard; don't make dragging the only way to browse.
- The query exposes loading but not a distinct error state. A failed first request can therefore look like an empty learning history, as recorded in the prior static audit.

Evidence: `apps/web/app/(student)/dashboard/page.tsx:12-69`; `apps/web/hooks/useStudentDashboard.ts:38-91`; `apps/web/components/dashboard/DashboardHeader.tsx:25-63`; `apps/web/components/dashboard/LearningStudioGrid.tsx:15-138`; `apps/web/components/dashboard/RecentActivitiesFeed.tsx:61-195`.

## Approaches considered

| Approach | Benefit | Trade-off |
|---|---|---|
| Polish the current Bento portal | Smallest visual change; keeps every feature card visible | Keeps several competing CTAs and leaves the long mobile stack intact |
| **Task-first learning home (recommended)** | Makes resume/start practice obvious, reduces repeated navigation, and uses current response fields | Less promotional surface area; route details remain in Explore, History, and Classrooms |
| Analytics-first dashboard | Could support richer progress review for frequent learners | Requires agreed definitions and new aggregate data; current recent-activity payload cannot truthfully support overall streaks or lifetime totals |

NN/G describes dashboards as quick, actionable overviews; Material's supporting-pane pattern gives the main task about two-thirds of the available width and reserves the rest for supporting information. These fit the recommended approach better than adding more summary cards. See [NN/G: Dashboards and fast visual understanding](https://www.nngroup.com/articles/dashboards-preattentive/) and [Material Design 3: Canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview).

## Proposed structure

### Desktop and wide tablet

```text
┌ Existing sidebar ─┬───────────────────────────────┬──────────────────┐
│                   │ Dashboard title + one action  │                  │
│                   ├───────────────────────────────┤ Recent activity  │
│                   │ Resume active quiz            │ last 4–5 items   │
│                   │ or Explore and start practice │ + History link   │
│                   ├───────────────────────────────┤                  │
│                   │ Pinned subjects               │                  │
│                   │ Compact learning shortcuts    │                  │
└───────────────────┴───────────────────────────────┴──────────────────┘
```

- Use a primary content area around 8/12 columns and a supporting activity pane around 4/12 at wide breakpoints. Avoid making the supporting pane sticky; keep the reading and keyboard focus order predictable.
- Replace the elevated greeting card with a clear page heading, brief greeting, and one primary action. Keep refresh as a secondary icon button with its accessible label.
- When `primaryIncomplete` exists, show a prominent resume card with quiz title and existing answered/total counts. Otherwise, make “Explore quizzes” the primary action.
- Keep pinned subjects below the primary action, with a clear “Manage pins” link.
- Replace four large promotional cards with a compact shortcut row for destinations that are not already obvious in the shell. The full descriptions and feature promotion can live on their destination pages.
- Show a short, unfiltered recent-activity list in the supporting pane and link to `/history` for filters and the full record set.

### Mobile

```text
Dashboard title                  [Explore]
Resume quiz + progress           (only when active)
Pinned subjects                  horizontal touch scroll
Recent activity                  compact rows + History
Other learning shortcuts         compact links
Existing fixed bottom navigation
```

- Use one content column and normal vertical scrolling. Do not pin the activity panel or duplicate the mobile bottom navigation with another large set of destination cards.
- Preserve bottom spacing for the fixed mobile bar and safe-area inset.
- At 320 CSS px, text and controls should reflow without page-level horizontal scrolling. W3C WCAG 2.2 SC 1.4.10 uses 320 CSS px as the reflow width for vertically scrolling content.
- Target at least 44×44 CSS px for primary touch controls as the product's usability target. WCAG 2.2 SC 2.5.8 requires 24×24 CSS px or a qualifying spacing exception; 44 px is a more comfortable app target, not the WCAG minimum.

## Component and state changes to make if approved

1. **`DashboardPage`** — change the composition/order only; keep the current dashboard response and route contracts.
2. **`DashboardHeader`** — reduce to heading, greeting, and refresh action; remove the large marketing treatment and ambient glow.
3. **`IncompleteSessionBanner`** — use it as the primary action when an active session exists; retain the current resume URL and counts.
4. **`LearningStudioGrid`** — replace large descriptive cards with a small set of compact shortcuts; do not add destinations or metrics.
5. **`RecentActivitiesFeed`** — render a short recent list without dashboard-level filters; preserve the full filters on `/history`.
6. **`DashboardSkeleton`** — match the proposed content order and dimensions to avoid a second visual rearrangement after data arrives.
7. **`useStudentDashboard`** — expose query error/refetch state and show an in-place retry when the first fetch fails. Preserve the genuine empty state when the request succeeds with no activity.
8. **Session completion** — invalidate the existing dashboard and history query keys after successful finalization so a quick return shows current activity.

Keep semantic design tokens and the four existing themes. Remove non-essential transform/scale and glow effects from dashboard cards; respect reduced-motion preferences. Keep the page heading, section headings, link names, visible focus, keyboard operation, and current minimum touch sizing.

## Review and acceptance checks

These checks apply only if this proposal is approved for implementation:

- At desktop widths, the active/resume or Explore action is visually first; activity remains secondary.
- At 320, 375, and 768 CSS px widths, the dashboard has no page-level horizontal overflow; all links remain reachable without drag.
- With an active session, resume shows the correct quiz and answered/total counts. With no active session, Explore is the primary action.
- Successful empty data shows the empty state; request failure shows an error and an in-place retry.
- Initial skeleton follows the same section order as the loaded view; background refetch does not replace the whole page.
- Keyboard-only pass: logical focus order, visible focus, functional links/buttons, and no focus hidden by sticky/fixed content.
- Check `prefers-reduced-motion`, all four themes, and target sizes. W3C documents 24×24 CSS px as WCAG 2.2's minimum with listed exceptions; the product target stays 44×44 for main touch controls.
- Measure authenticated route LCP, INP, CLS, resume/start task completion, and time to the first practice action before and after rollout. No baseline is asserted here.

Material Design 3 recommends that an app bar identify the current page and keep only one or two essential actions. W3C recommends responsive reflow rather than two-direction scrolling for ordinary page content. References: [Material Design 3 app bars](https://m3.material.io/components/app-bars/), [WCAG 2.2 reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and [WCAG 2.2 target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

## Out of scope

- New analytics APIs, streaks, aggregate score cards, personalized recommendations, or background polling.
- Replacing the global desktop sidebar or mobile bottom navigation.
- Changing quiz/session flows or introducing new animations.
- Claiming that a visual redesign improved satisfaction without authenticated mobile testing and field metrics.
