# Dashboard Page Overrides (`apps/web/app/(student)/dashboard`)

> **PROJECT:** FQuiz
> **Updated:** 2026-10-16
> **Page Type:** Student Learning Studio & Bento Analytics Dashboard

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/fquiz/MASTER.md`).

---

## Page-Specific Rules

### Layout & Hierarchy
- **Max Width:** `max-w-7xl` (`1280px`) with adaptive horizontal gutters (`px-4 sm:px-6 lg:px-8`).
- **Grid Architecture:** 12-column Bento Grid (`LearningStudioGrid`) with single-layer `.glass-card` elevation (`bg-card text-card-foreground border-border hover:border-ring`).
- **Section Priority:** Incomplete Exam Banner (Warning Triad) $\rightarrow$ Hero Welcome & Streak KPI $\rightarrow$ Quick-Start Studio Bento Cards $\rightarrow$ Recent Activity Timeline Rail.

### Motion & Performance
- **Bento Entrance Stagger:** Wrap all `useGSAP()` entrance animations in `gsap.matchMedia()` checking `(prefers-reduced-motion: no-preference)`.
- **Progressive Loading:** Use `<Skeleton />` placeholders from `@fquiz/ui` matching exact card heights to guarantee `CLS < 0.02`.
