# FQuiz Repository Score Review — 2026-10-20

## Executive result

The latest blind three-department review produced an independent mean of **7.00/10** (Engineering 7.5, Security/Reliability/QA 6.5, Product/UX/Ops 7.0). After cross-challenge, the revised mean was **6.33/10** (7.5, 5.5, 6.0). The lower cross-challenge mean reflects the panel's stricter weighting of answer-save reliability, reset-account privacy, and release assurance.

After that scored snapshot, the repository closed six actionable findings: answer saves now time out into the existing retry state; forgot-password send and verification responses stay generic across account-specific states; History search has an accessible name with debounced, cancellable requests; and finalization has a timeout, safe completed-session retry response, and visible retry cue on desktop and mobile. Scoped post-fix reviews revised Engineering to **8.0**, Security/Reliability/QA to **5.5**, and Product/UX/Ops to **7.5**, for a follow-up mean of **7.00/10**. This was a targeted check by the same reviewers, not a new blind whole-repository panel.

## Review scope and evidence

- Repository: FQuiz monorepo, work branch `codex/repo-score-improvements`, based on `557afb34b7cd5aa8c760abfc331d5b9afd7a0982`.
- Review method: three independent department reviews followed by cross-challenge and chair adjudication. Scores use equal department weights.
- Evidence: source and repository configuration review, CodeGraph navigation, TypeScript, lint, strict repository governance, and whitespace checks.
- Limits: static review only. No tests were added or run; no browser, assistive-technology, live deployment, ingress/proxy, database, or production configuration was inspected.

## Debate outcomes

### Accepted and fixed

| Finding | Chair disposition | Closure |
| --- | --- | --- |
| A stalled answer-save request could remain pending and block quiz completion. | Confirmed, conditional on a stalled network request; P2 reliability. | A 10-second abort moves the failed save through the existing retryable error path. |
| Forgot-password cooldown and mail-send failure could distinguish existing from unknown accounts. | Confirmed privacy/account-enumeration concern; P2. | Cooldown and delivery-failure paths now return the same generic success response used for unknown accounts; internal delivery failures remain logged. |
| Reset-code verification could distinguish an active code from a missing, expired, or exhausted one. | Confirmed through a post-panel security cross-check. | Invalid, missing, expired, and locked code states now return the same generic HTTP 400 response. Successful verification remains distinguishable because the client must proceed to reset the password. |
| History search lacked a programmatic name and issued work for each typed value without cancellation. | Confirmed accessibility issue; request-volume impact is plausible but unmeasured. | Added an accessible name, 300 ms debounce, and React Query cancellation signal. |
| Final submission could remain pending without an application timeout. | Confirmed by the post-panel engineering cross-check; a timeout alone could make a committed result appear failed. | Added a 30-second abort and made replay after completion return the persisted result for the authorized session. |
| Finalization failures gave no visible retry cue. | Confirmed in the scoped desktop and mobile review. | Both layouts now announce that answers are saved and tell the user to select Submit again. |
| Lighthouse checks are non-gating in the inspected workflow. | Retained as a release-assurance gap, conditional on Lighthouse being an intended release gate. | Backlog: make the policy explicit and gate only when CI stability and branch protection are understood. |

### Retained as deployment-dependent risks

- Some proxy/admin rate limits are stored per process, and client IP selection uses the first `X-Forwarded-For` value. Cross-instance throttling and spoofability depend on the actual deployment and trusted ingress configuration, which were not inspected.
- Web token status/version data has a 60-second process-local cache. Revocation delay depends on mutation paths, cache invalidation, and runtime topology.

These are documented risks rather than claims of an exploitable production defect. Follow-up should first verify the deployed ingress, instance topology, and cache invalidation paths, then decide whether shared limiting or shorter/invalidation-aware caching is warranted.

The reset verification path now uses the same generic response for normal invalid-code states. A hash or database exception can still produce the route's generic HTTP 500 response; that exceptional difference was retained so infrastructure failures remain visible and failed attempt counters do not silently fail open.

### Rejected or narrowed during challenge

- **Arbitrary question index / partial submit:** not accepted as a confirmed defect. The visible quiz flow supports Next/Back and explicitly confirms incomplete PRACTICE submission. Revisit only if product requirements require sequential answering or full completion.
- **History search does not work:** rejected; the control is wired to the query and API. The supported concern was excessive per-keystroke requests, which is now mitigated.
- **Forwarded-header spoofing:** narrowed to an ingress-dependent concern; static source inspection alone did not establish client control of the trusted header.
- **Lighthouse as a release blocker:** reported only as non-gating assurance. No branch-protection or deployment policy was inspected, so severity remains conditional.

## Improvements included in this repository work

- Made quiz answer persistence and final submission more resilient to retries, concurrent writes, incomplete drafts, and transient failures.
- Tightened web and admin authentication checks, token-version handling, rate-limit behavior, and verification-code attempt accounting.
- Removed account-existence differences from registration and password-reset responses.
- Distinguished classroom/history failures from successful empty states and preserved retry context.
- Improved keyboard and screen-reader feedback across quiz, flashcard, Explore, History, and result flows.
- Updated security/deployment documentation, CI production-build/type-check coverage, repository plan, and the departmental review skill.

## Fresh static verification after the final three closures

- `npm run check-types` — passed (6/6 workspace tasks).
- `npm run lint` — passed with 0 errors; existing warnings remain (151 Web, 44 Admin).
- `node .agents/scripts/verify.js --strict` — passed 18 checks, 0 errors, 0 warnings, 6 informational entries.
- `git diff --check HEAD` — passed; Git printed only the existing LF-to-CRLF notice for the plan document.
- `codegraph status` — up to date after final source edits: 936 files, 7,253 nodes, 16,858 edges.
- Test suites — not run, per this task's execution constraint.

## Long-term score plan

1. Reduce the new Fallow findings with targeted simplification and reuse, then rerun the commit gate before publishing.
2. Verify deployed ingress and instance topology; then use a trusted client-IP source and shared limiter for controls that require aggregate limits.
3. Set a revocation freshness guarantee for web authentication and choose cross-instance invalidation or a database check that meets it.
4. Make the exam tab lease safe when BroadcastChannel is unavailable, with a fallback or explicit read-only behavior and server-side protection for one-writer rules.
5. Coordinate in-flight AI generation by request hash and propagate cancellation when the provider supports it; record cost/duplicate behavior from runtime evidence.
6. Mark localized Vietnamese content with its language and decide whether client exceptions need a repository-level capture path.
7. Decide whether Lighthouse and a browser interaction smoke check are required release gates; make CI blocking only after stabilizing the environment and confirming branch protection.
8. Add focused runtime/browser/accessibility evidence when test execution is authorized, then request a new blind panel score against the resulting snapshot.

## Final blind panel and chair decisions — 2026-10-20

A fresh three-department panel reviewed the post-Phase-11 source snapshot without the review report or plan. Independent scores were Engineering 7.5/10, Security/Reliability/QA 7.0/10, and Product/UX/Operations 7.0/10 (equal-weight mean **7.17/10**). After one cross-challenge, revised scores were 7.2, 6.5, and 6.5 (mean **6.73/10**).

| Finding | Chair decision | Action |
| --- | --- | --- |
| Registration displayed “code has been sent” for the generic-success path, including an already-registered address where no registration code is sent. | Accepted as a source-confirmed recovery/UX defect; account privacy still requires neutral copy. | Registration success copy now explains conditionally that a code may be sent and directs existing users to sign in. |
| Password-reset send can return generic success when delivery fails; the form’s earlier copy could imply definite delivery. | Accepted as a source-confirmed recovery risk, with mail delivery itself unverified. | Copy now says a code may be sent and gives inbox/spam and retry guidance without revealing account or delivery state. |
| Classroom assignment loading cleared data but exposed no loading state or response identity guard. | Accepted as a normal-path race/false-empty defect; timing determines whether stale results are visible. | The list now announces loading, hides results from a different selected classroom, and ignores responses superseded by a newer request. |
| Unresolved question references could be replaced with the first question in a completed result. | Accepted as a conditional result-integrity defect. | Results now show “Question unavailable” for the missing slot instead of misattributing another question. |
| A nonempty partial question cache could shorten the deck. | Narrowed to legacy/corrupt cache state; ordinary session creation caches the resolved deck. The behavior is confirmed, but prevalence is not. | Retained for data-invariant validation; no fallback to changed live quiz content was introduced. |
| Admin login limiting uses a process-local store and the first forwarded IP value. | Retained as a documented operational control boundary; aggregate enforcement and header trust depend on deployment topology and ingress configuration. | No deployment-specific remediation was selected without inspecting trusted ingress and runtime topology. |
| Web token status/version checks can use a process-local cache for up to 60 seconds after admin mutation. | Retained as bounded, source-confirmed revocation staleness; actual exposure depends on warm instances and request timing. | Kept in the security documentation and long-term plan pending a deployment-specific revocation guarantee. |

The panel was static and read-only. It did not inspect production proxy configuration, runtime instance count, mail delivery, database records, browser rendering, or assistive technology. The follow-up panel reviewed the corrected snapshot; its scores and final adjudication are recorded below.

### Post-fix blind panel

The corrected source snapshot received a second fresh blind three-department review. Independent scores were Engineering 7.0/10, Security/Reliability/QA 7.0/10, and Product/UX/Operations 7.0/10 (mean **7.00/10**). Cross-challenge scores were 6.5/10 in all three areas (mean **6.50/10**).

The panel confirmed that the prior round’s registration/reset copy, classroom loading/stale-response handling, and unavailable-question placeholder are present. New cross-challenged findings and chair disposition:

| Finding | Chair decision | Follow-up |
| --- | --- | --- |
| Exam tab lease grants write authority if BroadcastChannel is missing or construction fails; answer API has no lease identity. | Accepted as a conditional P2 reliability/integrity risk. OCC protects concurrent persistence but does not impose a one-writer rule; this is not an authorization bypass. | Plan a supported fallback or server-side lease if one-writer exam integrity is a product requirement. |
| Root HTML declares English while a session warning contains Vietnamese text. | Accepted as a P3 accessibility markup mismatch. Impact depends on language-aware assistive technology reading that content. | Add a language annotation to localized content and review other mixed-language surfaces. |
| Error boundaries log to `console.error`; no central client exception capture was found in inspected app source. | Retained as a P3 observability gap with an absence caveat. Hosting-side console collection was not inspected. | Confirm whether production host logs are sufficient before adding an app-level capture dependency. |
| Global and admin login limits use process-local maps and the first forwarded IP value; guest session limiting also keys from the raw header. | Accepted as one P2 operational control weakness. Aggregate enforcement depends on instance topology; spoofability depends on ingress sanitization. A Mongo-backed limiter is already used on selected routes, so this does not describe every API limit. | Validate ingress/runtime deployment, then migrate only controls that need shared aggregation to a trusted identity and shared store. |
| Web authorization can use cached token version/status for up to 60 seconds after an admin change. | Accepted as bounded P2 revocation staleness, with impact limited to web routes and warm instances. | Define the required revocation freshness and add a matching cross-instance guarantee. |
| AI timeout returns a fallback while provider work continues; a matching request can start another call while an asset remains `processing`. | Accepted as a conditional P2/P3 cost and lifecycle risk; completion order and billing were not measured. | Add in-flight coordination/cancellation when provider capabilities and deployment behavior are established. |

Independent review mean stayed at 7.00/10; cross-challenge moved the final panel to 6.50/10 after reviewers combined these conditional operational risks with the UX findings. This score is a static-source assessment, not a production or usability measurement.

The panel remained read-only. No tests, browser/device/screen-reader checks, production ingress checks, mail/database inspection, or AI-provider billing checks were performed. Post-fix static checks passed TypeScript (6/6 workspace tasks), lint (0 errors; 151 Web and 44 Admin warnings), strict repository verification (18 pass, 0 errors/warnings, 6 info), and `git diff --check`. Fallow still reports 52 introduced complexity findings, 14 duplicate-code groups, and 16 Tailwind token-drift findings; the ordinary commit gate remains blocked.

## Commit gate status

The ordinary commit was attempted and the repository's installed pre-commit hook rejected it. The hook runs `fallow audit --base main --quiet --gate-marker pre-commit` and enforces new-only findings. Its report for this diff showed 0 new dead-code findings, 52 new complexity findings, 14 new duplicate-code groups, and 16 new Tailwind token-drift findings. The largest complexity result was the flashcard-answer POST handler at cyclomatic complexity 71. No hook bypass was used, so no commit was created and no push to `main` was attempted. The staged branch is ready for a focused cleanup pass.

The detailed phase-by-phase execution record is in [the repository improvement plan](superpowers/plans/2026-10-19-repo-score-improvements.md).

## Final pre-release cross-challenge and chair disposition — 2026-10-20

The post-Phase-12 snapshot received independent scores of Engineering **6.5/10**, Security/Reliability/QA **7.0/10**, and Product/UX/Operations **6.5/10** (mean **6.67/10**). After the cross-challenge, scores were Engineering **5.5/10**, Security/Reliability/QA **7.0/10**, and Product/UX/Operations **6.2/10** (mean **6.23/10**). Scores reflect static source review, not runtime assurance or measured user experience.

| Finding | Chair decision | Follow-up |
| --- | --- | --- |
| `encryptSecret` can use a source-literal fallback if both configured secrets are absent. | Accepted as a fail-closed configuration risk; production impact is conditional. Vercel production variable listings show `JWT_SECRET` exists for both projects, but values and every non-production environment were not inspected. | Remove the literal fallback or fail startup when no configured key is available; validate migration and key rotation before changing encryption behavior. |
| Web login returns a reusable seven-day JWT in JSON while also setting an HttpOnly cookie; the in-repo client uses the cookie. | Accepted as a P2 credential-exposure/contract question. External clients were not inspected, so removing the field could break an undocumented consumer. | Inventory external consumers, then stop returning the bearer token if no supported contract requires it. |
| API/admin rate limits use process-local counters on selected routes; web authorization can cache token state for up to 60 seconds. | Accepted as bounded operational risks. The production environment was inspected through Vercel variable names, but live instance topology, ingress behavior, and warm-instance revocation timing were not measured. | Use shared aggregation for controls requiring global quotas; choose and document a revocation freshness guarantee. Treat forwarded-header trust as ingress-dependent, not as proven spoofability. |
| Mobile question-map controls omit current/answered screen-reader state; some quiz images use generic alt text; mobile flashcard load failure offers no manual retry after automatic attempts. | Accepted as P2 navigation semantics and P3 content/recovery usability follow-ups. Alt-text impact depends on the image content. No assistive-technology or rendered-device check was performed. | Add descriptive question-map state, content-appropriate image alternatives, and a manual retry action in a focused accessibility pass. |
| Next 16 is paired with eslint-config-next 14 and a legacy peer install setting. | Accepted as P3 tooling drift only; the panel did not establish a build failure. | Align the toolchain and remove the legacy setting after dependency compatibility is verified. |

Fallow's fresh new-only audit against `main` at `557afb3` passed: 0 introduced dead-code, complexity, duplicate-code, and styling findings. Inherited counts were 11, 74, 28, and 2, respectively. `npm run check-types` passed (6/6 workspace tasks), strict repository verification passed (18 checks, 0 errors/warnings, 6 informational entries), `git diff --check HEAD` passed, and CodeGraph was current (941 files, 7,765 nodes, 18,208 edges). Previously verified Web and Admin production builds passed; no source changes followed those builds. Tests were not run.

Vercel production environment listings confirmed the names `JWT_SECRET` and `MONGODB_URI` for both `fquiz-web` and `fquiz-admin`; no values were retrieved. This narrows the current production crypto-fallback concern but does not prove runtime behavior or the settings of preview/development environments. The findings above are accepted as documented follow-ups, not represented as fixes or as measured production impact.

The earlier “Commit gate status” paragraph is historical. The final commit, push, deployment, and post-deployment verification are recorded below.

## Release follow-up — 2026-10-20

- The ordinary Fallow pre-commit hook accepted the release changes. Commit `4e05c7b` was pushed fast-forward to `main`; the installed pre-push pipeline passed 18 strict governance checks and Jest passed 104 suites / 578 tests. No hook was bypassed.
- Production deployments are `READY`: Web `dpl_BZgZVRNGs2BhoTMmAVQ8ett5G2oB` (`https://fquiz-web.vercel.app`) and Admin `dpl_6z84t4MuC4ZRvssZGsfAsH9NuHUC` (`https://fquiz-admin.vercel.app`). The Web home page, Admin login page, and Web sitemap each returned HTTP 200.
- The first Web deployment exposed a build-time configuration gap: Turbo strict mode filtered `MONGODB_URI`, so the sitemap contained only four static URLs. Added a Web-only package Turbo configuration for `MONGODB_URI`, then redeployed. The new Web build connected to MongoDB and the production sitemap now contains 15 course URLs.
- Turbo/Vercel still reports environment variables that are only needed by runtime tasks but are not allowlisted to build tasks. They were not broadly passed into builds. Both builds completed successfully; the remaining Vercel output also includes 33 dependency audit advisories (21 moderate, 12 high), an install-script notice, and the existing React 18 / Next 16 deprecation warning. These were not changed in this release.

The departmental scores above remain static-review scores for the reviewed source snapshot. Deployment readiness and the sitemap correction are operational verification results, not a re-score or a user-experience measurement.

## Final blind departmental review — 2026-10-20

**Snapshot:** `e87a32e1d94ed58b724c176352785997853b19bf`. Three reviewers independently assessed Engineering / Architecture, Security / Reliability / QA, and Product / UX / Operations, then completed one cross-challenge round. Initial scores were 6.5, 7.0, and 7.0. Final scores were **6.3**, **6.8**, and **6.9**, for an equal-weight mean of **6.67/10**. The Product score uses four equally weighted dimensions: flow clarity (8), responsive usability (8), accessibility (5), and feedback / operations (6.5), rounded from 6.875. The mean is 0.44 above the earlier 6.23 panel mean; separate blind reviewers and the static rubric make this directional, not a measured improvement attributable to any one change.

### Findings that survived cross-challenge

| Finding | Debate result | Smallest useful follow-up |
| --- | --- | --- |
| Admin login rate limits are stored in a process-local `Map` ([`rate-limit.ts`](../packages/auth/src/rate-limit.ts#L16), [`login route`](../apps/admin/app/api/auth/login/route.ts#L108)). | Confirmed implementation; aggregate protection depends on instance count and request routing. | Use a shared store if production requires a global quota. |
| Web login returns the JWT in JSON and also sets an HttpOnly cookie ([`login route`](../apps/web/app/api/auth/login/route.ts#L117)). The first-party hook reads role and user but ignores the token ([`useLoginForm.ts`](../apps/web/hooks/auth/useLoginForm.ts#L82)); external clients were not inspected. | Confirmed contract and code path; exposure severity depends on external consumers and threat model. | Inventory consumers, then remove the JSON token if the cookie is the supported contract. |
| Web authentication caches user status and token version for up to 60 seconds ([`auth.ts`](../apps/web/lib/modules/auth/auth.ts#L9)). | Confirmed bounded staleness; invalidation of one process does not clear another warm instance. | Set a revocation freshness target and match cache invalidation to it. |
| Rate-limit keys use the first `x-forwarded-for` entry ([`rate-limit.ts`](../packages/auth/src/rate-limit.ts#L73), [`web limiter`](../apps/web/lib/core/security/rate-limit/sliding-window.ts#L84)). | Header selection is confirmed. Client spoofability remains conditional on ingress sanitization, which this review did not verify. | Use only an ingress-trusted client identity. |
| Mobile question changes are not announced by the live region; it announces correctness feedback only ([`MobileSessionQuestionCard.tsx`](../apps/web/components/quiz/mobile/MobileSessionQuestionCard.tsx#L70), [`mobile page`](../apps/web/app/quiz/[id]/session/[sessionId]/mobile/page.tsx#L286)). | Confirmed source behavior; assistive-technology impact was not tested. | Announce the new question number on navigation or move focus to the new question heading. |
| Course detail controls declare a tablist and tabs but lack roving focus, arrow-key behavior, and a linked tabpanel ([`CourseDetailClient.tsx`](../apps/web/components/quiz/explore/CourseDetailClient.tsx#L186)). | Confirmed after resolving a reviewer path mix-up: these are in-page tabs whose selected content changes with the query string. | Implement the full keyboard and panel relationship for tabs. |
| Admin navigation identifies the active route with styling only ([`AdminSidebar.tsx`](../apps/admin/components/AdminSidebar.tsx#L70)). | Confirmed, lower-priority accessibility issue. | Set `aria-current="page"` on the active link. |
| Expired in-memory cache entries are removed only when the same key is read again ([`in-memory-cache.ts`](../apps/web/lib/core/cache/in-memory-cache.ts#L16)); AI content stores entries with a one-hour TTL. | Confirmed mechanism; memory impact depends on unique-key volume and warm-process lifetime. | Add bounded eviction or periodic expiry cleanup if measured usage warrants it. |
| Answer requests select the full question snapshot, and writes replace the full `user_answers` array ([`answer route`](../apps/web/app/api/sessions/[id]/answer/route.ts#L123), [`quiz-engine.ts`](../apps/web/lib/modules/quiz/quiz-engine.ts#L113)). | Source behavior confirmed; the resolver selects one requested question, and performance impact was not measured. | Use `Server-Timing` data to establish whether targeted persistence is worthwhile before redesigning storage. |
| Sessions without `questions_cache` resolve from the quiz's current questions ([`quiz-engine.ts`](../apps/web/lib/modules/quiz/quiz-engine.ts#L203)). | Confirmed conditional correctness risk for older active sessions after quiz edits; prevalence is unknown. | Expire or migrate legacy sessions, or pin a quiz revision when the snapshot is absent. |

### What won and what remains uncertain

The final set retains behaviors visible in the current source and narrows their impact to what the review can prove. The security reviewer initially challenged the course-tab claim using a different classroom page; after checking the cited `CourseDetailClient.tsx`, the team confirmed the finding. The Product reviewer rejected presenting whole-array answer persistence as a demonstrated performance defect; the chair accepted that correction and reports it as an unmeasured scaling concern. The `x-forwarded-for` value selection is confirmed, while spoofability and global rate-limit effectiveness remain dependent on ingress and runtime topology.

Positive evidence includes explicit session ownership validation and optimistic answer-version checks, fail-closed Web JWT validation on database errors, the post-fix submission timeout and retry behavior, and clear dashboard resume / discover actions. The panel did not run tests, benchmarks, browser or assistive-technology checks, or inspect production ingress. Separate release verification passed 18 strict governance checks and 104 Jest suites / 578 tests; live Web home, Admin login, and sitemap returned HTTP 200, and the sitemap contained 15 course URLs.
