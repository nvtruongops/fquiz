---
name: fquiz-code-refactor-performance
description: Code refactoring, line-count reduction, card nesting elimination, and performance optimization skill for FQuiz (Next.js + MongoDB/Mongoose + TanStack Query). Use when splitting fat pages (>200 lines), eliminating nested cards, extracting custom hooks, optimizing re-renders, adding next/dynamic, optimizing MongoDB queries (.lean, batch $in), or improving bundle performance.
version: 2.2
priority: high
---

# FQuiz Refactoring & Performance Standards

## Core Targets & Line Limits
- **Pages (`app/**/page.tsx`)**: Max ~200 lines (act strictly as orchestrator routes).
- **UI Components (`components/**`)**: Max ~250 lines per component file.
- **Custom Hooks (`hooks/**`)**: Max ~200 lines (single responsibility).

---

## 1. Card Nesting Elimination ("Giảm thẻ lồng thẻ")
- **No Double Wrappers**: Never wrap inner `Card` or border components inside an outer `div` that duplicates `border`, `bg-white/40`, `backdrop-blur`, or `shadow`.
- **Single-Layer Elevation**: Every UI section (Header, Stats, Action Card) must render as a clean single-layer card (`bg-white border border-slate-200/80 shadow-xs rounded-2xl`).

---

## 2. The 3-Layer Split Pattern
When any page exceeds ~200 lines or component exceeds ~250 lines, decompose it into 3 layers:
1. **State & Logic (`hooks/use[Feature].ts`)**: State (Zustand/React), API queries (TanStack Query), handlers, effects.
2. **Presentational Components (`components/[feature]/[SubComponent].tsx`)**: Small presentational components (`React.memo` for list items).
3. **Orchestrator (`page.tsx`)**: Imports hook and sub-components with minimal layout JSX (<100 lines).

### Key Refactoring Targets:
- `app/quiz/[id]/session/[sessionId]/mobile/page.tsx` (732 lines → split into `useMobileQuizSession`)
- `components/quiz/question-bank/QuizImportPanel.tsx` (844 lines → split parser hook)
- `app/(student)/history/page.tsx` (406 lines → split `useStudentHistory`)
- `app/(student)/settings/page.tsx` (449 lines → split `useUserSettings`)

---

## 3. Performance & Bundle Optimization
- **Lazy Loading (`next/dynamic`)**: ALWAYS load heavy admin/teacher tools (`QuizImportPanel`, `QuestionBankConflictResolver`) and AI studios dynamically:
  ```tsx
  const QuizImportPanel = dynamic(() => import('@/components/quiz/question-bank/QuizImportPanel'), { ssr: false })
  ```
- **MongoDB / Mongoose Query Optimization**:
  - Read queries MUST use `.lean()` to eliminate Mongoose document hydration.
  - Use `.select('field1 field2')` to fetch required fields only.
  - Avoid `.populate()` — use `$in` batch queries across collections.
  - Parallelize independent queries via `Promise.all()`.

---

## Verification Protocol
Run in exact sequence before marking any refactoring task complete:
```bash
npm run lint
npm run check-types
npm test
node .agents/scripts/verify.js --strict
```

> **Reference**: See [`references/refactor-example.md`](./references/refactor-example.md) for step-by-step code walkthrough.
