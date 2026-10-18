# High-Use Route UX Audit — 2026-10-17

## Scope and evidence boundary

This static audit covers the student Dashboard (`/dashboard`), Explore (`/explore`), Quiz History (`/history`), and Quiz Detail (`/quiz/[id]`). History is linked directly from the dashboard and mobile practice menu; Quiz Detail is the main transition from Explore into practice. These are high-priority product flows, but this workspace does not include route-visit or task-completion counts, so their actual traffic ranking is **not verified**. `SpeedInsights` is mounted by the web app; no page-view or funnel event was found in the inspected app source.

The scores below measure **engineering and implementation intent only**. They do not prove that users can complete tasks easily. Empirical UX is **N/A** without route-level RUM exports, SUS/task studies, or assistive-technology runs. Findings use the repo's P0–P3 scale and prioritize usability and interaction over visual polish.

| Route | Implementation intent | Empirical UX | Static evidence |
|---|---:|---:|---|
| `/dashboard` | 7/10 | N/A | Cached single dashboard query, skeleton, manual refresh, activity empty state; query errors are not surfaced distinctly. |
| `/explore` | 8/10 | N/A | Server supplies initial category/pin data; client search is local and does not refetch on mount; the search scope is narrower than its copy promises. |
| `/history` | 6/10 | N/A | Paginated query and useful filters; search, counts, and errors do not preserve clear page-wide semantics. |
| `/quiz/[id]` | 7/10 | N/A | Quiz has explicit loading/error states; authenticated detail can fall back to another GET on any student endpoint error, and related reads start after quiz detail resolves. |

## Findings

### P2 — Dashboard failures look like a new user's empty history

`useStudentDashboard` exposes loading and refetching state but omits `isError`. When `/api/student/dashboard` fails without cached data, the page leaves its skeleton and `RecentActivitiesFeed` renders “No study history yet.” That tells users their account has no progress when the data request actually failed. The header refresh icon is the only recovery affordance and does not explain the failure.

**Recommendation:** expose query error/refetch state and render a compact, in-place error with Retry. If cached data exists, keep it visible and report the background refresh failure separately. Do not replace the existing empty state for successful empty results.

Evidence: `apps/web/hooks/useStudentDashboard.ts:46-57,81-90`; `apps/web/app/(student)/dashboard/page.tsx:13-29`; `apps/web/components/dashboard/RecentActivitiesFeed.tsx:171-200`.

### P2 — Dashboard and history can remain stale after quiz submission

The dashboard query is fresh for 60 seconds. Successful submission in `useSessionFinalize` navigates to the result route but does not invalidate `['student','dashboard']` or `['history']`. Returning quickly to either route can therefore show the pre-submission activity until the cached query becomes stale or the user manually refreshes.

**Recommendation:** on successful finalization, mark only those two existing query prefixes stale. Since the user is on the result route, inactive queries can refresh when next opened; this avoids an extra request during result viewing while making the next dashboard/history visit current.

Evidence: `apps/web/hooks/useStudentDashboard.ts:46-57`; `apps/web/hooks/quiz/useSessionFinalize.ts:55-59`.

### P2 — Explore search promises quizzes but only filters category names

The route headline and description promise courses and quizzes, while `CategoryFilter` filters only `categories` by `c.name`. The card then links to a course/category page. A user searching for a quiz title can receive “No courses found” even when that quiz exists under a category.

**Recommendation:** take the ponytail path first: clarify the copy to say the field searches subjects/categories. Add quiz-title search only if route/search evidence shows that users expect and need it; that broader behavior would require a debounced query against the existing search surface.

Evidence: `apps/web/app/explore/page.tsx:50-56`; `apps/web/components/quiz/explore/CategoryFilter.tsx:169-171,195-199,238-239`.

### P2 — History search and summary numbers cover only the current 20-item page

`fetchHistory` requests `limit=20`. Search, status, and mode filters run in the browser against `data.history`, so they only inspect the loaded page. The summary cards also compute “Quizzes Taken” and “Perfect Scores” from that same page, without saying they are page-scoped. A valid older match can appear missing, and the displayed totals can change as users paginate.

**Recommendation:** extend the existing `/api/history` request with the committed search/status/mode filters, put those committed filters in the query key, and reset to page 1 when a filter is committed. Debounce text search so typing does not issue per-keystroke requests and retain current rows while results load. Return summary counts in that same response if the labels are intended to describe the full history; otherwise label them “on this page.”

Evidence: `apps/web/hooks/useStudentHistory.ts:57-60,78-95,97-150`; `apps/web/app/(student)/history/page.tsx:53-85,97-126`; `apps/web/app/api/history/route.ts:54-68,139-146`.

### P3 — History retry reloads the entire route

On a history query error, `HistoryGroupList` calls `window.location.reload()`. That reloads the document and discards local search, filter, and page state when retrying one failed query.

**Recommendation:** return the query's `refetch` function from `useStudentHistory` and retry in place, preserving the current controls. Keep the existing error message and skeleton behavior.

Evidence: `apps/web/components/history/HistoryGroupList.tsx:28-40`; `apps/web/hooks/useStudentHistory.ts:78-84,152-166`.

### P3 — History filter controls are small and do not expose selected state

Filter buttons use compact padding with no `aria-pressed`; pagination buttons use `h-9` (36px). On mobile the selected filter is primarily conveyed by styling, and these targets are below the 44×44px touch target used elsewhere in the app.

**Recommendation:** add `aria-pressed` to toggle filters and bring the primary filter/pagination targets to 44px where layout permits. Keep the horizontal filter strip usable at 320px and verify the selected state with keyboard and screen-reader testing.

Evidence: `apps/web/components/history/HistoryFilterBar.tsx:39-95`; `apps/web/app/(student)/history/page.tsx:97-125`.

### P2 — Quiz detail fallback can hide a real API failure and issue a second GET

For an authenticated visitor, `fetchQuizDetail` catches every error from the student-detail request and proceeds to the public-detail endpoint. The student helper already returns `null` for the expected 401/404 fallback cases, so this broad catch also converts network and server errors into a second request. If the public endpoint succeeds, user-specific detail may silently degrade; if it fails, the page can show the public error instead of the original student API failure.

**Recommendation:** preserve the explicit 401/404 fallback and let transient/network/server failures reach the existing query error UI. This avoids unnecessary fallback traffic during outages and keeps error feedback accurate.

Evidence: `apps/web/hooks/quiz/useQuizDetailState.ts:46-80,115-132`.

### P3 — Quiz detail has a two-stage request path; active-session data is not safely deduplicated

The authenticated path makes one quiz-detail GET first. After that query resolves, the active-session GET and quiz-history GET are enabled together, so they run in parallel as a second stage. The history route also looks up an active session, but its response contains only summary fields (ID, answered count, total count, start time); the start/resume flow consumes the separate sessions response with per-mode session payloads. Removing that GET based only on the overlap would risk breaking the resume decision.

**Recommendation:** keep the current two-stage behavior until route latency or request traces show it affects time to practice. If it does, evaluate extending the existing history response to carry the exact assessment and learning session shapes consumed by the UI, then reuse that one response. Preserve both per-mode entries and compare payload size/DB work before accepting the consolidation. Do not issue both dependent reads before quiz validity is known just to parallelize them.

Evidence: `apps/web/hooks/quiz/useQuizDetailState.ts:177-216,289-302`; `apps/web/app/api/sessions/route.ts:15-85`; `apps/web/app/api/history/[id]/route.ts:48-76,89-146,181-203`.

## Request and navigation audit

- Dashboard performs one TanStack dashboard GET after the shared `auth-user` query resolves. Its 60-second cache and disabled focus refetch avoid repeated focus traffic. Keep the dashboard payload consolidated; the main gap is stale-state invalidation after finalization, not request fan-out.
- Explore receives categories and optional pinned-category IDs together on the server. `usePublicCategories` has a 5-minute stale time and `refetchOnMount: false`; the pinned query receives initial data and has a 1-minute stale time. Search is local, and pin success updates the query cache after one POST. **Do not add a request per keystroke or a duplicate initial category GET.**
- Explore is `force-dynamic`, so its server loader still performs the catalog lookup on route render. This is not a duplicate browser API request. Measure server render/database latency before adding server caching; the page also has user-specific pinned data.
- History pagination intentionally requests a new 20-item page. The concern is search/filter scope, not the expected page change. Debouncing a committed server filter preserves low request volume while making results global.
- Quiz Detail makes three normal authenticated reads across two stages: quiz detail first, then active sessions and history in parallel. The auth-user query may be served from shared TanStack cache and is not counted as a guaranteed new GET. A fallback public-detail GET occurs only when the student-detail request fails, but the current catch is broader than the expected 401/404 cases. Keep the session/history reads separate unless latency evidence and a complete per-mode response contract justify consolidation.

## Suggested implementation order

1. Dashboard query error/retry state and post-submit cache invalidation — small scope, directly prevents misleading or stale progress.
2. Explore search copy correction — smallest change; no new API or dependency.
3. Quiz-detail fallback error handling — preserve expected authorization fallback while preventing extra GETs on outages.
4. History filter/query semantics and truthful summary scope — align the UI with the server's 20-item pagination.
5. History in-place retry and mobile filter accessibility polish.

## Next routes to rank with usage data

Use available Vercel route-level data, if enabled, before calling these “highest traffic”: `/courses/[code]` → `/quiz/[id]` → `/quiz/[id]/mode` (the explore-to-practice conversion path), `/community`, and the separate admin dashboard. Keep student and admin audiences separate. The source audit alone cannot supply visit counts, completion rates, or field performance.

## UX guidance applied

The UI/UX Pro Max search returned relevant guidance to provide a useful no-results recovery action and stable loading feedback. Explore already has a clear-search action, retry UI, and initial skeleton; preserve these while correcting search scope. This audit also applies the FQuiz standard's distinction between implementation intent and empirically validated experience. No browser, mobile viewport, keyboard, or assistive-technology run was performed for this static pass.
