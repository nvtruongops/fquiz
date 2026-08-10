---
name: fquiz-gsap-ui-ux
description: GSAP UI/UX animation standards and performance optimization for FQuiz (Next.js 16 App Router + React 18 + Tailwind CSS 3). Use when adding micro-interactions, flashcard flips, quiz engine transitions, progress bar animations, card hovers, or scroll-driven UI effects with GSAP. Enforces @gsap/react useGSAP hook cleanup, GPU transform aliases, reduced-motion accessibility, and text-only product scope.
version: 1.0
priority: high
---

# FQuiz GSAP UI/UX Animation Standards

## Product Scope & Architectural Guardrails

1. **Text-Only Scope Boundary**: All GSAP animations MUST serve text-based learning UI/UX. **NEVER introduce 3D WebGL scenes, Canvas particle engines, audio/voice synchronization, or heavy video overlays**.
2. **React 18 & Next.js App Router Integration**:
   - MUST use `@gsap/react` via `useGSAP()` hook with container `scope` ref for automatic context cleanup on unmount.
   - NEVER use raw `useEffect` with `gsap.to()` without context cleanup (`ctx.revert()`).
3. **GPU Performance First**: Use GPU transform aliases (`x`, `y`, `scale`, `rotation`, `xPercent`, `yPercent`, `autoAlpha`). NEVER animate layout-thrashing properties (`top`, `left`, `width`, `height`, `margin`).
4. **Code Splitting**: Wrap heavy animated components with `next/dynamic`.
5. **Accessibility**: Enforce `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)`.

---

## Core Rules & Property Mapping

| UI Interaction | Preferred GSAP Property | Avoid (Layout Thrashing) |
|---|---|---|
| Card / List Entrance | `y`, `autoAlpha`, `stagger` | `top`, `marginTop`, `opacity` |
| Progress Bar Fill | `scaleX` (origin: left) | `width: %` |
| Flashcard Flip | `rotationY` (perspective, backface hidden) | CSS toggle without GSAP |
| Hover Micro-Interaction | `scale: 1.02`, `y: -4` via `contextSafe()` | `margin-top`, `width` |

> **Full Code Examples**: See [`references/gsap-patterns.md`](./references/gsap-patterns.md) for full React/Next.js code snippets for Flashcards, Quiz Progress, List Staggers, and Hover interactions.

---

## Theme-Native Custom Scrollbar Standards

1. **Automatic Theme Alignment**: All scrollbars MUST use semantic CSS variables (`hsl(var(--primary))`, `hsl(var(--muted-foreground))`) to dynamically match Light, Dark, and custom theme modes.
2. **Inner Container Scrollbars**: Apply `.custom-scrollbar` on internal scrollable containers (e.g. `overflow-y-auto custom-scrollbar`) for sleek 6px trackless scrollbars.
3. **Cross-Browser Support**:
   - Webkit browsers: Custom `::-webkit-scrollbar-thumb` using HSL opacity (`hsl(var(--primary) / 0.35)` default, `hsl(var(--primary) / 0.75)` hover).
   - Firefox: `scrollbar-width: thin; scrollbar-color: hsl(var(--primary) / 0.35) transparent;`.


---

## Mandatory Verification Protocol

Execute before declaring any GSAP UI/UX work complete:
```bash
npm run lint
npm run build
npm test
node .agents/scripts/verify.js --strict
```
