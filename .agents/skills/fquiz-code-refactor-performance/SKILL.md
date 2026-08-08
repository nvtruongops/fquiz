---
name: fquiz-code-refactor-performance
description: Code refactoring, line-count reduction, and performance optimization skill for FQuiz (Next.js + MongoDB/Mongoose + TanStack Query). Use when splitting fat pages (>250 lines), extracting custom hooks, optimizing re-renders, adding next/dynamic, optimizing MongoDB queries (.lean, batch $in), or improving bundle performance.
version: 2.1
priority: high
---

# FQuiz Refactoring & Performance Standards

## Core Targets & Line Limits
- **Pages (`app/**/page.tsx`)**: Max ~200 lines (act strictly as orchestrator routes).
- **UI Components (`components/**`)**: Max ~250 lines per component file.
- **Custom Hooks (`hooks/**`)**: Max ~200 lines (single responsibility).

---

## The 3-Layer Split Pattern
When any file exceeds ~250 lines, decompose it into 3 clear layers:
1. **State & Logic (`hooks/use[Feature].ts`)**: State (Zustand/React), API queries (TanStack Query), handlers, effects.
2. **Presentational Components (`components/[feature]/[SubComponent].tsx`)**: Small presentational components (`React.memo` where lists re-render).
3. **Orchestrator (`page.tsx`)**: Imports hook and sub-components with minimal layout JSX (<100 lines).

---

## Key Performance Rules

### 1. Client & React Render Optimization
- **Lazy Loading**: Use `next/dynamic` for heavy client modals, drawers, charts, or tabs not visible on initial load.
- **Memoization**: Wrap list items with `React.memo` and callbacks passed as props with `useCallback`. Wrap heavy transformations in `useMemo`.
- **Derived State**: Derive state during render instead of syncing via `useEffect`.

### 2. Backend & Database Optimization (MongoDB / Mongoose)
- **Read Queries**: ALWAYS append `.lean()` to eliminate document hydration overhead.
- **Field Projection**: Use `.select('field1 field2')` to fetch only required fields.
- **No Mongoose `.populate()`**: Use `$in` batch queries for application-level joins across collections.
- **Query Parallelization**: Use `Promise.all()` for independent queries to avoid database waterfalls (`async-parallel`).

### 3. Assets & Images
- Use `next/image` with explicit `width`/`height` for user-facing images to prevent layout shift.
- Load fonts via `next/font`.

---

## Verification Protocol
Run in exact sequence before marking task complete:
```bash
npm run lint
npm run build
npm test
```

> **Reference**: See [`references/refactor-example.md`](./references/refactor-example.md) for full step-by-step before/after code walkthrough.
