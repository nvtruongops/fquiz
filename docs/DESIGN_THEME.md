# 🎨 FQuiz — Theme & Accessibility Specification (`docs/DESIGN_THEME.md`)

> **Version**: 2.0.0 (Pure Symmetrical Monorepo Architecture)  
> **Managed Package**: `@fquiz/ui` (`packages/ui`)  
> **Standards**: WCAG 2.2 AA (Text contrast $\ge$ 4.5:1), GPU-Accelerated GSAP Animations.

---

## 1. 3-Tier Design Tokens Architecture (`@fquiz/ui`)

1. **Tier 1 (Primitives)**: Raw HSL CSS variables (`--background`, `--foreground`, `--primary`, `--muted`...).
2. **Tier 2 (Semantic Tokens)**: Defines surface elevation hierarchies (`Background` $\le$ `Card` $\le$ `Popover`) and Status Triads (Success, Warning, Destructive, Info).
3. **Tier 3 (Domain-Specific Tokens)**: Specialized tokens tailored for the examination experience (`--quiz-correct`, `--quiz-incorrect`, `--quiz-selected`, `--quiz-timer`, `--quiz-streak`).

---

## 2. 4 Official Theme Palettes

All 4 official themes strictly adhere to **WCAG 2.2 AA** accessibility standards (minimum text contrast ratio of 4.5:1, with empirical scores $\ge$ 12.5:1):

| Theme | CSS Selector | Aesthetic Profile | WCAG Contrast Ratio |
|---|---|---|---|
| ☀️ **Light Theme** | `.theme-light` / root | Crisp, elegant bright background with high-contrast text | **14.2:1** |
| 🌙 **Dark Theme** | `.theme-dark` / `.dark` | Eye-soothing midnight navy background with refined royal blue/gold accents | **13.8:1** |
| 🌿 **Green Theme** | `.theme-green` | Organic emerald tones fostering calm, focused study sessions | **12.5:1** |
| 🌸 **Pink Theme** | `.theme-pink` | Vibrant, modern pastel rose palette with balanced warmth | **14.5:1** |

---

## 3. 3-Tier Quality Gates

The automated governance engine inspects the codebase via `node .agents/scripts/verify.js --strict`:

- **Gate 1 (Source Linting)**: Hardcoded hex codes (`#fff`, `#000`) and rigid Tailwind color classes (`bg-white`, `bg-gray-100`) are strictly forbidden in JSX/TSX. All UI components must consume semantic design tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`).
- **Gate 2 (Elevation Verification)**: Validates surface elevation ordering to ensure cards, dialogs, and popovers properly layer above the background (`Background L` $\le$ `Card L`).
- **Gate 3 (WCAG Contrast Assertion)**: Automatically computes mathematical contrast ratios between text and background using standard W3C luminance formulas.

---

## 4. GSAP Micro-Interaction Standards

- **React 18 Integration**: Always use `@gsap/react` via the `useGSAP()` hook scoped to `scope: containerRef` for automatic unmount context cleanup (`ctx.revert()`).
- **GPU Performance First**: Animate GPU transform aliases only (`x`, `y`, `scale`, `rotation`, `autoAlpha`). Never animate layout geometry properties (`width`, `height`, `top`, `left`).
- **Motion Accessibility**: Accommodate motion-sensitive users with `gsap.matchMedia()` targeting `(prefers-reduced-motion: reduce)`.
