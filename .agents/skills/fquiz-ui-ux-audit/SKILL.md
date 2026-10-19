---
name: fquiz-ui-ux-audit
description: UI/UX Audit Standards, Empirical Validation, Exam Resilience, WCAG 2.2 AA AT Matrix, and P0-P3 Priority Governance for FQuiz. Use when scoring, auditing, evaluating user experience, or verifying UI quality before release.
version: 1.0
priority: high
---

# FQuiz — UI/UX Empirical Audit & System Resilience Standard

This skill defines the multi-tiered UI/UX audit methodology for FQuiz, strictly distinguishing between **Code Implementation Quality (Engineering Intent)** and **Empirically Validated User Experience (Field UX Validation)**.

---

## 1. Dual-Track Scoring Model

When conducting any UI/UX audit report, always provide two independent score metrics:
1. **Engineering & Implementation Intent (0–10)**: Measured via AST, static code scans, clean architecture, React 18 / GSAP GPU patterns, and semantic token structures.
2. **Empirically Validated UX (0–10, or N/A if field telemetry is unavailable)**: Measured via Real User Monitoring (RUM), System Usability Scale (SUS) scores, task completion rates, drop-off funnels, and screen reader AT matrix evaluations.

> ⚠️ **Golden Rule**: Never extrapolate from *"Feature exists in code"* to *"UX is proven effective"*. Source implementation merely proves completeness of code, not real-world frictionlessness or user satisfaction.

---

## 2. 4 Experience Modes Mental Model

All UI design must adhere to strict boundary separation across four distinct experience modes:

1. **Learn Mode (Active Comprehension)**:
   - Flashcard study interactions (`DesktopFlashcardView`, `MobileFlashcardView`).
   - Instant step-by-step explanations, touch swipe gestures with a dedicated **Undo** action.
   - Deep AI Assistant integration (question breakdown, keyword analysis, conceptual background).
2. **Practice Mode (Skill Reinforcement)**:
   - Multi-category randomized test synthesis (`MixQuizTab`).
   - Targeted retry of incorrect questions (`RetryWrongButton`).
   - State-based question filtering (Correct / Incorrect / Unanswered / Flagged).
3. **Exam Mode (High-Stakes Simulation)**:
   - Minimalist interface adhering to EOS exam standards.
   - **100% AI Assistant and distracting widgets disabled**.
   - Authoritative Multi-Tab Lease (`BroadcastChannel`).
   - Conflict-free data preservation and atomic submission mechanisms.
4. **Result & Mastery Mode (Analytics & Competency Assessment)**:
   - Visual score dashboard with automatic focus on the first incorrect answer (`InteractiveResultViewer`).
   - Visual side-by-side comparison: *Selected answer* vs. *Correct answer*.
   - Knowledge mastery tier grading (*Beginner*, *Intermediate*, *Mastered*).

---

## 3. Critical Verification: "Exam Failure & Resilience"

Exam disruptions represent the highest criticality level (**Mission-Critical**). Mandatory testing and design scenarios:
- **Scenario**: *Internet drop $\rightarrow$ JWT Token Expiration $\rightarrow$ Browser Refresh / Tab Crash $\rightarrow$ Student resumes exam session.*
- **Mandatory Requirements**:
  - **In-Place Re-auth Modal**: When tokens expire, render the re-authentication modal directly within the exam session; **STRICTLY PROHIBITED from redirecting to `/login` which purges client-side question state**.
  - **Reconcile State**: Automatically synchronize locally cached responses with MongoDB upon network reconnection.
  - **Authoritative Multi-Tab Lease**: Grant submission authority to only one active tab (`Active`). Concurrently opened tabs transition to `Read-Only` with a *"Transfer authority to this tab"* action.
  - **Exam Reliability Metric**: Report submission and state preservation rates only from a dated, reproducible measurement with its environment and sample size.
  - **Zero Unload Invariant**: Direct assignment to `window.location.href` is forbidden across all session hooks when encountering network or auth errors.

---

## 4. Accessibility AT Matrix

Mandatory accessibility testing across the multi-platform assistive technology matrix:

| Test Category | Tool / Environment | Standard & Requirement |
|---|---|---|
| **Semantic Reading Flow** | NVDA (Desktop), TalkBack (Android), VoiceOver (iOS) | Sequential announcement: Question # $\rightarrow$ Prompt $\rightarrow$ Choices A-D $\rightarrow$ Selection State $\rightarrow$ Flag State $\rightarrow$ Next Button. |
| **Keyboard-Only** | Desktop Browser (Chrome/Firefox/Safari) | 100% exam flow operable without mouse; `Tab` with visible focus rings; Arrow keys / `Enter` / `Space` for option selection. |
| **Reflow (320px)** | 320px Viewport (iPhone SE Gen 1) | Zero horizontal scrollbars. |
| **Zoom (200%)** | 200% Browser Zoom | Fully responsive text scaling without clipping, truncation, or overlapping elements. |
| **Focus Trap & Restoration** | Radix Dialog / Modals | Modal open: Focus trapped on initial focusable element; Modal close: Focus restored to triggering element. |
| **Reduced Motion** | OS `prefers-reduced-motion` | Disable card turns, sliding panels, and non-essential transitions. |

---

## 5. Mobile Ergonomics & Safe Area Matrix

- **Safe-Area Insets**: Mandate `padding-bottom: max(1rem, env(safe-area-inset-bottom))` for bottom navigation bars (`MobileNav`) and mobile session footers (`MobileSessionFooter`) to avoid iOS Home Indicator collisions.
- **Dynamic Island / Notch**: Enforce `padding-top: env(safe-area-inset-top)` for fixed top headers.
- **Virtual Keyboard Occlusion**: Guarantee that submission and note-taking CTAs remain fully visible when virtual keyboards trigger (`interactive-widget=resizes-content`).

---

## 6. Tiered P75 Web Vitals

The following values are targets for planning. They are not measured results. Report current performance only with dated RUM or lab evidence and its collection method:

| Tier | LCP (Largest Contentful Paint) | INP (Interaction to Next Paint) | CLS (Cumulative Layout Shift) | First Load JS Bundle |
|---|:---:|:---:|:---:|:---:|
| **Good** | $< 2.5\text{s}$ | $< 200\text{ms}$ | $< 0.10$ | $< 220\text{KB}$ |
| **Excellent** | $< 1.5\text{s}$ | $< 150\text{ms}$ | $< 0.05$ | $< 180\text{KB}$ |
| **Elite Target** | **$< 1.2\text{s}$ (Desktop) / $< 1.8\text{s}$ (Mobile 4G)** | **$< 100\text{ms}$** | **$< 0.02$** | **$< 150\text{KB}$** |

---

## 7. Priority Classification Formula

Priority Formula: $\text{Priority} = \text{Impact} \times \text{Probability} \times \text{Recoverability}$.

- 🔴 **P0 (Critical - Release Blocker)**: Data loss, failed submission, session expiration kicking users out of active exam, desynchronized timers, leaked exam content, unrecoverable crashes.
- 🟠 **P1 (High - Must Fix Before Launch)**: Screen reader exam flow, authoritative multi-tab collision handling, iOS safe-area clipping, 320px reflow breaks, offline-to-online reconciliation.
- 🟡 **P2 (Medium - Upcoming Release)**: Field Web Vitals optimization, 404 UX enhancements, funnel telemetry analytics, virtual keyboard occlusion handling.
- 🟢 **P3 (Polish - Quality of Life)**: Number key shortcuts (1-4), cleanup of residual utility color classes, haptic vibration feedback, micro-animation tuning.
