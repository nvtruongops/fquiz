# FQuiz — Design System Master Specification (`ui-ux-pro-max` + `@fquiz/ui`)

> **LOGIC:** When building or refactoring a specific page, first check `design-system/fquiz/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> Otherwise, strictly follow the global rules below and [`docs/DESIGN_THEME.md`](../../docs/DESIGN_THEME.md).

---

**Project:** FQuiz (`@fquiz/web` & `@fquiz/admin`)
**Updated:** 2026-10-16
**Category:** Academic Examination, Active Comprehension & Analytics SaaS Platform (Text-Only Scope)
**Design Dials (`ui-ux-pro-max`):** Variance `7/10` (Modern Bento Grid) · Motion `6/10` (GPU GSAP Micro-interactions) · Density `7/10` (Balanced Academic / High-Density Admin)

---

## 1. 3-Tier Design Token & 4-Theme Architecture (`@fquiz/ui`)

All UI components across `apps/web`, `apps/admin`, and `packages/ui` **MUST** use semantic CSS variables and Tailwind token classes. Raw hex values (`#...`) and hardcoded palette utilities (`bg-white`, `bg-slate-*`, `text-gray-*`, `bg-amber-*`, `bg-emerald-*`) in `.tsx` files are strictly prohibited.

### 1.1 Official 4 Themes (WCAG 2.2 AA Verified $\ge 12.5:1$)

| Theme | Selector | Surface Background | Primary Brand | Aesthetic Profile | Text Contrast |
|---|---|---|---|---|---|
| ☀️ **Light** (Default) | `:root`, `.light` | `#F8FAFC` (`210 40% 98%`) | `#2563EB` (`221 83% 53%`) | Soft Slate White & Oceanic Royal Blue | **14.2:1** |
| 🌙 **Dark** | `.dark` | `#070B14` (`222 47% 5%`) | `#3768E2` (`223 75% 55%`) | Midnight Navy & Royal Study Blue / Gold | **13.8:1** |
| 🌿 **Green** | `.green` | `#ECE8DF` (`42 24% 90%`) | `#2D5A47` (`155 33% 26%`) | Warm Vintage Paper & Deep Forest Green | **12.5:1** |
| 🌸 **Pink** | `.pink` | `#FDF6F7` (`351 64% 98%`) | `#D47385` (`349 52% 64%`) | Soft Blush Cloud & Obsidian Rose | **14.5:1** |

### 1.2 Semantic Status Triad Tokens (Mandatory Pairing)

Never use單-token or raw Tailwind colors for status feedback. Always apply the full triad (`bg-*-bg`, `text-*-fg`, `border-*-border`):

| Triad | Classes | Usage Context |
|---|---|---|
| **Success** | `bg-success-bg text-success-fg border-success-border` | Correct answer, completed sync, active user badge |
| **Incorrect / Destructive** | `bg-incorrect-bg text-incorrect-fg border-incorrect-border` | Wrong answer, failed validation, critical error |
| **Warning** | `bg-warning-bg text-warning-fg border-warning-border` | Unfinished session banner, duplicate code warning, pending review |
| **Info** | `bg-info-bg text-info-fg border-info-border` | Contextual study tips, system announcements |
| **Attempted** | `bg-attempted-bg text-attempted-fg border-attempted-border` | Answered question in navigator matrix |
| **Quiz Domain** | `question-{unanswered,attempted,current,correct,incorrect,flagged}` | Exam & Practice question navigator and option cards |

---

## 2. Typography & Readability (`ui-ux-pro-max` Priority 6)

- **Primary UI & Body Font:** `Inter` (`--font-sans`) — clean, high x-height legibility for long-form reading passages and exam prompts.
- **Technical / Code / Timer Font:** `JetBrains Mono` / `Fira Code` (`font-mono`, `tabular-nums`) — mandatory `tabular-nums` on all countdown timers, score percentages, pagination counters, and KPI metrics to prevent horizontal layout jitter (CLS).
- **Type Scale & Measure:**
  - Base body text: `16px` (`text-base`) on mobile inputs to prevent iOS Safari auto-zoom (`text-base md:text-sm`).
  - Line height: `1.5–1.75` (`leading-relaxed`) for question stems and explanations.
  - Line length: `60–75ch` (`max-w-prose`) for reading passages and explanations.

---

## 3. Spacing, Elevation & Layout Rhythm (`ui-ux-pro-max` Priority 5)

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | `4px` (`0.25rem`) | Inline badge/icon gaps |
| `--space-sm` | `8px` (`0.5rem`) | Minimum gap between adjacent touch targets (`gap-2`) |
| `--space-md` | `16px` (`1rem`) | Standard mobile container gutter & card padding |
| `--space-lg` | `24px` (`1.5rem`) | Desktop card padding & Bento grid gap (`gap-6`) |
| `--space-xl` | `32px` (`2rem`) | Section separation |

- **Single-Layer Card Elevation (`fquiz-code-refactor-performance`):**
  - Every UI section (Header, Stats, Action Card) renders as a single-layer semantic surface (`bg-card text-card-foreground border border-border rounded-2xl shadow-xs hover:border-ring`).
  - **No Double Card Wrappers:** Never nest a bordered `Card` inside an outer `div` with duplicate `border`, `shadow`, or `backdrop-blur`.
- **Viewport & Safe Areas:**
  - Prefer `min-h-dvh` over `100vh`.
  - Mobile fixed footers (`MobileNav`, `MobileSessionFooter`) MUST include `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
  - Mobile fixed headers (`MobileSessionHeader`) MUST include `pt-[env(safe-area-inset-top)]`.

---

## 4. Touch, Interaction & Accessibility (`ui-ux-pro-max` Priority 1 & 2)

1. **Touch Target Minimum (`44×44px`):**
   - All primary mobile controls, exam header actions, and pagination buttons must meet `min-h-11 min-w-11` (`44×44px`) on mobile or `h-9 w-9` (`36×36px`) minimum for dense desktop table actions.
2. **Contextual Icon Semantics (`icon-context-accessibility`):**
   - Decorative icons beside visible text MUST carry `aria-hidden="true"`.
   - Icon-only buttons MUST carry a descriptive `aria-label` (never rely on `title` alone) and `aria-pressed` / `aria-expanded` where stateful.
3. **Focus Visibility & Not Obscured (WCAG 2.2 AA):**
   - Never use `outline-none` without `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
   - Dialogs and mobile drawers/sheets MUST expose `role="dialog"`, `aria-modal="true"`, trap focus, and support `Escape` dismissal.
4. **Forms & Validation (`ui-ux-pro-max` Priority 8):**
   - Every `<Input>` / `<Select>` / `<Textarea>` must have a programmatically linked `<label htmlFor="...">` or `aria-label`.
   - Validation errors must appear adjacent to the field with `role="alert"` or `aria-describedby`.
   - Never use blocking native `window.confirm()` or `window.alert()` — always use `@fquiz/ui` `<Dialog>`.

---

## 5. Motion & GSAP Choreography (`ui-ux-pro-max` Priority 7 + `fquiz-gsap-ui-ux`)

- **React 18 Hook Contract:** Always use `useGSAP(() => { ... }, { scope: containerRef })` from `@gsap/react` for automatic unmount cleanup.
- **GPU Transform Aliases Only:** Animate `x`, `y`, `scale`, `scaleX`, `rotation`, `autoAlpha`. Never animate layout properties (`width`, `height`, `top`, `left`).
- **Mandatory Reduced-Motion Guard:**
  ```tsx
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.bento-item', {
        autoAlpha: 0,
        y: 14,
        scale: 0.97,
        duration: 0.35,
        stagger: { each: 0.05, from: 'start', grid: 'auto' },
        ease: 'power2.out',
      })
    })
  }, { scope: containerRef })
  ```

---

## 6. Canonical Pre-Delivery Checklist

- [ ] Zero raw hex codes or hardcoded Tailwind palette classes in `.tsx` files (`node .agents/scripts/verify.js --strict` passes)
- [ ] All shared primitives imported from `@fquiz/ui` (no local duplicate Shadcn primitives)
- [ ] Decorative icons have `aria-hidden="true"`; icon-only buttons have `aria-label`
- [ ] Touch targets $\ge 44\times 44\text{px}$ on mobile exam/navigation controls; safe-area insets applied
- [ ] Heavy modals, drawers, and admin editors lazy-loaded via `next/dynamic(..., { ssr: false })`
- [ ] `prefers-reduced-motion` honored across all GSAP and CSS animations
- [ ] Exam Mode strictly disables AI Assistant and preserves session state on HTTP 401 via In-Place Re-auth Modal
