# Flashcard Page Overrides (`apps/web/app/quiz/[id]/session/[sessionId]/flashcard`)

> **PROJECT:** FQuiz
> **Updated:** 2026-10-16
> **Page Type:** Active Comprehension CSS 3D Flashcard Deck (Desktop & Mobile)

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/fquiz/MASTER.md`).

---

## Page-Specific Rules

### Product Scope & Motion Invariants
- **Strictly Text-Only CSS 3D Transforms:** Use GPU-accelerated CSS `perspective`, `transform-style: preserve-3d`, and `backface-visibility: hidden` (or GSAP `rotationY` / `x` / `autoAlpha`). **NEVER load WebGL, Three.js, 3D models, or audio assets.**
- **Reduced Motion Fallback:** Under `prefers-reduced-motion: reduce`, replace 3D card flip rotation and swipe physics with an instant crossfade (`autoAlpha`).
- **Gesture + Button Parity (`ui-ux-pro-max` `gesture-alternative`):** Every touch swipe action (Know / Still Learning / Undo) MUST have an explicit, visible button with $\ge 44\times 44\text{px}$ touch target and desktop keyboard shortcut (`Space` to flip, `ArrowLeft` / `ArrowRight` to grade, `Z` to undo).
