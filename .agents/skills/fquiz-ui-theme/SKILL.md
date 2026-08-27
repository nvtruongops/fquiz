---
name: fquiz-ui-theme
description: Theme Governance, Semantic Design Tokens, and Color Consolidation standards for FQuiz (Next.js + shadcn/ui + CSS Variables). Use when editing or creating UI components, adding theme tokens, or managing color variables.
---

# FQuiz — Theme & Design Tokens Governance Skill

This skill enforces **Theme as Code** governance, **4 Official Themes** (`light`, `dark`, `green`, `pink`), and **Semantic Design Tokens** across `fquiz`.

> ⚠️ **MANDATORY CONTRACT ACCESS REQUIREMENT**:
> Before making ANY changes to UI components, theme CSS variables, or page routes, you **MUST** first inspect and adhere strictly to the two authoritative documentation contracts:
> 1. 🎨 **Theme & Accessibility Contract**: [`docs/DESIGN_THEME.md`](../../docs/DESIGN_THEME.md) (Design Tokens 3-Tier Architecture, WCAG 2.2 AA Baseline & FQuiz Enhanced Policy, Status Triads, Quiz Domain Tokens, and 3-Tier Quality Gates).
> 2. 🗺️ **Page Router Architecture Index**: [`docs/DESIGN_ROUTES.md`](../../docs/DESIGN_ROUTES.md) (Registry of Page Routes across Web Student/Teacher & Standalone Admin Portal, Middleware Governance, and Theme Compliance Status).

---

## Official 4 Themes

`fquiz` supports 4 official themes configured via `next-themes` and CSS variables:

1. ☀️ **Light Theme (`light`)** [Default]: Soft Slate White background (`#F8FAFC`), Crisp Slate Black text (`#0F172A`), Oceanic Royal Blue primary (`#2563EB`).
2. 🌙 **Dark Theme (`dark`)**: Midnight Navy background (`#070B14`), Crisp Soft White text (`#F3F6FA`), Royal Study Blue primary (`#3768E2`) & Vivid Amber Gold accent (`#FBC444`).
3. 🌿 **Green Theme (`green`)** [Custom]: Warm Vintage Paper Beige background (`#ECE8DF`), Deep Sage Green text (`#153020`), Deep Forest Green primary (`#2D5A47`).
4. 🌸 **Pink Theme (`pink`)** [Custom]: Soft Blush Cloud background (`#FDF6F7`), Deep Obsidian Rose text (`#2B1619`), Aesthetic Blush Rose primary (`#D47385`).

---

## Core Brand & Status Triad Tokens

| Token Category | Utility Class | Light Mode | Dark Mode | Green Mode | Usage Context |
|---|---|---|---|---|---|
| **Primary Brand** | `bg-primary`, `text-primary` | `#0F172A` | `#FFFFFF` | `#396150` | Primary buttons, brand text, focus ring |
| **Primary Foreground** | `text-primary-foreground` | `#FFFFFF` | `#000000` | `#FFFFFF` | Text inside primary buttons |
| **Success Triad** | `bg-success-bg`, `text-success-fg`, `border-success-border` | `#E2F4E7` / `#145A32` | `#0F281E` / `#6EE7B7` | `#CBE7D2` / `#104A29` | Positive state feedback |
| **Incorrect Triad** | `bg-incorrect-bg`, `text-incorrect-fg`, `border-incorrect-border` | `#FEE2E2` / `#991B1B` | `#371313` / `#FCA5A5` | `#FCE6E6` / `#8C1C1C` | Failed / Incorrect exam answer |
| **Warning Triad** | `bg-warning-bg`, `text-warning-fg`, `border-warning-border` | `#F1F5F9` / `#0F172A` | `#27272A` / `#FFFFFF` | `#EFE8D3` / `#664010` | Caution / Pending review / Warm Beige |
| **Info Triad** | `bg-info-bg`, `text-info-fg`, `border-info-border` | `#CFFAFE` / `#0D5C75` | `#123B47` / `#8EE0F5` | `#D9F5F9` / `#0D5C75` | Information tips |
| **Attempted Triad** | `bg-attempted-bg`, `text-attempted-fg`, `border-attempted-border` | `#EFF6FF` / `#1E3A8A` | `#1E293B` / `#BFDBFE` | `#E3EEFD` / `#1E3A8A` | Answered question state |

---

## Governance Rules & Standards

1. **Mandatory Documentation Inspection**:
   - Always read [`docs/DESIGN_THEME.md`](../../docs/DESIGN_THEME.md) and [`docs/DESIGN_ROUTES.md`](../../docs/DESIGN_ROUTES.md) before writing or refactoring UI components.

2. **NO Hardcoded Colors**:
   - Never write raw Hex codes (`#5D7B6F`, `#EAE7D6`, `#18181b`, `#3b82f6`) or Tailwind raw palettes (`bg-slate-100`, `text-gray-900`, `bg-blue-500`) directly inside `.tsx` components.
   - Use semantic tokens: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `bg-success-bg`, `text-success-fg`.

3. **Status Triad Pattern**:
   - Always pair status colors using the Triad format: `-bg` (background), `-fg` (text/icon), and `-border` (outline). Never mix `text-danger-fg` or `bg-success/10`.

4. **Quiz Domain Specific Tokens**:
   - Use domain tokens for exam states: `question-unanswered`, `question-attempted`, `question-current`, `question-correct`, `question-incorrect`, `question-flagged`.

5. **Accessibility Standards**:
   - Always combine Color + Icon + Visual Text Label + ARIA (`sr-only`) state. Never rely exclusively on color to convey meaning.

6. **3-Tier Quality Gate CI Verification**:
   - Run `npm run verify:theme` (Tier 1 Theme Governance) and `npx tsc --noEmit` (Tier 2 Type Safety) before committing any changes.

7. **Navigation & Sidebar Theme Consolidation**:
   - Never use hardcoded rainbow colors (`text-blue-600`, `text-indigo-600`, `text-purple-600`) for navigation section titles or menu items. All Navigation Sidebars, Floating Docks, and Popups MUST use unified Semantic Tokens (`text-primary`, `text-foreground`, `bg-interactive-selected-bg`, `text-interactive-selected-fg`).

8. **Yellow & Amber Status Mapping**:
   - Never use raw Tailwind amber/yellow classes (`bg-amber-100`, `text-amber-600`, `bg-amber-500`) directly inside components for unfinished exam banners or in-progress badges. Map all yellow/amber status UI to **Warning Triad** (`bg-warning-bg`, `text-warning-fg`, `border-warning-border`) or **Quiz Flagged Triad** (`bg-question-flagged-bg`, `text-question-flagged-fg`, `border-question-flagged-border`).

9. **Card Hover Icon Clarity**:
   - Keep icon containers crisp, clear, and high contrast on hover (`bg-primary/10 text-primary group-hover:bg-primary/20`).

10. **Theme-Adaptive Bento Cards & Theme-Native Hover Borders**:
   - All Bento/Studio cards MUST use semantic tokens (`bg-card text-card-foreground border-border hover:border-ring`) so that cards switch color 100% with the active theme.
   - Use `hover:border-ring` for card hover states: Dark Theme highlights with **Crisp White Border (`#FFFFFF`)**, Light Theme highlights with **Jade Green (`#2D5A46`)**, Green Theme highlights with **Olive Pine (`#1E5638`)**.

11. **Button Elevation & Soft Shadow Governance**:
   - Primary and Destructive CTA Buttons MUST possess soft elevation shadows (`shadow-sm shadow-primary/25` / `shadow-sm shadow-destructive/20`) and micro-interaction hover states (`hover:shadow-md hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-xs`) configured centrally in the core `Button` component (`components/shared/ui/button.tsx`). Avoid scattering ad-hoc shadow classes inside individual page components.

12. **Glassmorphism & Ambient Glow Governance**:
   - Bento Cards, Studio Containers, and Sticky Headers SHOULD utilize `.glass-card` (`backdrop-filter: blur(16px) saturate(150%)`) or `.glass-card-elevated` (`backdrop-filter: blur(24px) saturate(160%)`) for frosted glass visual depth.
   - Combine glassmorphism cards with `.ambient-glow-sphere` and `.rail-glow-*` to provide subtle background light diffusion while maintaining 100% WCAG 2.2 AA text contrast standards.


