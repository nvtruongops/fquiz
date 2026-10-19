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

The text contrast target for normal text is **4.5:1 or higher**. Theme-level automated checks are useful evidence, but verify the current rendered color pairs and interaction states before claiming full WCAG conformance.

| Theme | CSS Selector | Aesthetic Profile | Contrast guidance |
|---|---|---|---|
| ☀️ **Light Theme** | `.theme-light` / root | Bright background with high-contrast text | Meet 4.5:1 for normal text; verify current pairs |
| 🌙 **Dark Theme** | `.theme-dark` / `.dark` | Midnight navy background with blue and gold accents | Meet 4.5:1 for normal text; verify current pairs |
| 🌿 **Green Theme** | `.theme-green` | Green palette | Meet 4.5:1 for normal text; verify current pairs |
| 🌸 **Pink Theme** | `.theme-pink` | Rose palette | Meet 4.5:1 for normal text; verify current pairs |

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
