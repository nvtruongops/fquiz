---
name: fquiz-code-refactor-performance
description: Code refactoring, line-count reduction, and performance optimization skill for FQuiz (Next.js + MongoDB/Mongoose + TanStack Query). Use this skill whenever the user asks to refactor a file, split up a "fat" page/component, reduce line count, extract custom hooks, speed up a slow page or API route, fix render performance, add lazy loading / code-splitting, optimize MongoDB queries, or mentions files over ~300 lines, monolithic components, N+1 queries, bundle size, Lighthouse/Web Vitals scores, or re-render issues — even if the user doesn't say the word "refactor" explicitly. Enforces file size limits, custom hook extraction, component decomposition, lazy loading (next/dynamic), memoization, MongoDB lean queries, TanStack Query caching, and strict verification protocols.
version: 2.0
priority: high
changelog:
  - "2.0: Added pre-refactor workflow, expanded performance section (images/fonts/bundle/Web Vitals), per-file verification, rollback guidance, and a worked before/after example (see references/refactor-example.md)."
  - "1.0: Initial version — line count rules, 3-layer split pattern, MongoDB/TanStack Query rules, product scope boundaries."
---

# FQuiz Code Refactoring & Performance Optimization Skill

## Goal

This skill provides mandatory standards, pattern guidelines, and refactoring methodologies for:
1. **Reducing code bloat & line count** (decomposing monolithic files >300 lines into clean sub-components and custom hooks).
2. **Maximizing performance** (React re-render optimization, code-splitting with `next/dynamic`, image/font optimization, bundle size, optimized TanStack Query caching, lean MongoDB queries).
3. **Preserving FQuiz architecture & product scope** (text-only learning, strict module boundaries, dependency inversion, zero cross-module direct Mongoose populates).

A full worked example of a page going from 480 lines / slow to <200 lines / fast using every rule below is included at the end of this document (see "Worked Example").

---

# Scope & Targets

Apply this skill whenever refactoring existing code or building complex new features across:

```
app/**
components/**
lib/core/**
lib/modules/**
hooks/**
```

### High-Priority Refactoring Targets in FQuiz
Files exceeding ~300 lines are candidates for modular decomposition:
- Pages in `app/(student)/`, `app/(admin)/`, `app/(teacher)/` with inline business logic & state.
- Monolithic UI components in `components/quiz/`, `components/community/`, `components/layout/`.

---

# Before You Start (Pre-Refactor Workflow)

Do NOT jump straight into splitting files. Follow this sequence every time:

1. **Read the whole file first**, not just the top. Note every piece of state, every effect, every data fetch, and every distinct visual section.
2. **Check for existing tests** covering the file/feature. If none exist and the file has non-trivial logic (scoring, session state, permissions), flag this to the user before refactoring — a refactor without a safety net is riskier.
3. **Identify true behavior vs. incidental duplication.** Don't "simplify" a conditional that looks redundant without confirming it isn't handling an edge case (e.g., a teacher-only branch).
4. **Plan the split on paper first**: list the target hook(s), sub-component(s), and orchestrator responsibilities before writing code. Share this plan briefly with the user for anything touching scoring, permissions, or payment logic.
5. **Refactor in small, verifiable increments** — extract one hook or one component at a time, re-run verification (see Verification Protocol) after each extraction, rather than rewriting the whole file in one pass.

---

# Core Principles & Rules

## 1. Line Count & Code Reduction Guidelines

### Target Thresholds
- **Pages (`app/**/page.tsx`)**: Maximum ~200 lines. Pages should act strictly as orchestrators/routes.
- **UI Components (`components/**`)**: Maximum ~250 lines per component file.
- **Custom Hooks (`hooks/**`)**: Maximum ~200 lines. Focus on single responsibility.

### Refactoring Strategy: The 3-Layer Split Pattern
When a file exceeds 300 lines, decompose it into three clear layers:

1. **State & Business Logic Layer (`hooks/use[Feature].ts`)**:
   - Extract state management (Zustand/React state), API fetching (TanStack Query hooks), event handlers, and side effects.
   - Return clean action handlers and state values.

2. **UI Component Layer (`components/[feature]/[SubComponent].tsx`)**:
   - Break large render methods/JSX blocks into small, single-purpose components (e.g. `FilterBar.tsx`, `ItemCard.tsx`, `DetailModal.tsx`, `EmptyState.tsx`).
   - Keep components presentational whenever possible.

3. **Orchestrator Layer (`page.tsx` / `[Feature]View.tsx`)**:
   - Import the custom hook and sub-components.
   - Layout components concisely with minimal inline logic.

### Eliminating Code Duplication (DRY)
- **Shared Utilities**: Move repeated inline data formatters, date manipulators, and status helpers into `lib/core/utils/` or domain helper modules.
- **Shared UI Elements**: Re-use `shadcn/ui` components (`Button`, `Dialog`, `Badge`, `Skeleton`) instead of writing custom inline modal overlay/loading HTML structure.

### Automated Enforcement
Where possible, back these thresholds with tooling rather than relying on manual counting:
- Add/confirm an ESLint rule such as `max-lines: ["warn", { max: 250, skipBlankLines: true, skipComments: true }]` scoped to `components/**` and a stricter one for `hooks/**`.
- Use `wc -l <file>` as a quick sanity check before/after a refactor to quantify the reduction in the final summary to the user.

---

## 2. Performance Optimization Standards

### React Render & Component Optimization
- **Lazy Loading (Code-Splitting)**: Use `next/dynamic` for heavy client components, modals, and conditional tabs that are not visible on initial viewport load:
  ```tsx
  import dynamic from 'next/dynamic';

  const HeavyModal = dynamic(() => import('./HeavyModal'), {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,
  });
  ```
- **Memoization (`useMemo` & `useCallback`)**:
  - Wrap expensive data transformations or filter operations on large lists in `useMemo`.
  - Wrap handler callbacks passed as props to memoized sub-components in `useCallback`.
  - Wrap frequently re-rendered list item components with `React.memo(ItemComponent)`.
- **Derive State Instead of Syncing State**:
  - Avoid redundant `useEffect` calls that copy prop values or query results into local state. Derive values directly during render.

### Assets: Images & Fonts
- **Images**: Always use `next/image` instead of raw `<img>` tags for anything user-facing — it handles responsive sizing, lazy loading below the fold, and format negotiation (WebP/AVIF) automatically. Set explicit `width`/`height` (or `fill` with a sized parent) to avoid layout shift.
- **Fonts**: Load fonts via `next/font` (not a `<link>` to Google Fonts or a manual `@font-face`) so they're self-hosted and don't block rendering.
- **Icons**: Prefer tree-shakeable icon imports (e.g. `import { IconName } from 'react-icons/fa'` per-icon patterns already used elsewhere in the repo) over importing an entire icon barrel file.

### Bundle Size & Web Vitals
- After a significant refactor of a page or shared component, spot-check bundle impact with `next build` output (it prints First Load JS per route) — a refactor that "reduces lines" but increases a shared chunk's size is not a win.
- For pages with real user traffic (quiz-taking, dashboard), keep an eye on Core Web Vitals (LCP, CLS, INP). Heavy client components behind `next/dynamic`, correctly sized images, and avoiding layout-shifting skeletons are the highest-leverage fixes here.

### Data Fetching & Caching Optimization (TanStack Query v5)
- Set appropriate `staleTime` (e.g. `1000 * 60 * 5` for static metadata) to prevent unnecessary background re-fetches.
- Use `select` option in `useQuery` to transform data on fetch, preventing downstream component re-renders when un-selected fields change.
- Implement optimistic updates (`onMutate`, `onError`, `onSettled`) for interactive UI (likes, bookmarks, toggle status).

### Backend & Database Optimization (MongoDB / Mongoose)
- **Always use `.lean()`** for read-only API queries to eliminate heavy Mongoose document hydration overhead.
- **Field Projection (`.select()`)**: Only fetch the fields needed by the API/UI.
- **Application-Level Joins**: Never use `.populate()`. Use `$in` batch queries for cross-collection references:
  ```ts
  const userIds = [...new Set(items.map(i => i.authorId))];
  const users = await UserModel.find({ _id: { $in: userIds } }).select('name avatar').lean();
  ```
- **Proper Database Indexing**: Ensure any filter (`status`, `createdBy`, `topicId`, `createdAt`) is backed by an index in the model schema. When adding a new filter/sort combination, check `db.collection.getIndexes()` or the schema file rather than assuming an index exists.
- **Watch for N+1 patterns**: A `.map()` over a list that issues one query per item (instead of a single `$in` batch query) is the most common regression to catch during review.

---

## 3. Mandatory FQuiz Product & Architecture Boundaries

- **Text-Only Scope Boundary**: FQuiz is strictly text-only (vocabulary, grammar, sentences, paragraphs, quizzes, flashcards). **NEVER introduce audio, voice (TTS/STT), OCR, 3D, VR, or multimedia**.
- **Server-Authoritative Processing**: Scoring and state changes for Quiz sessions MUST happen on the server side using `findOneAndUpdate` with `{ status: { $ne: 'completed' } }`.
- **Dependency Inversion**: Service layers must depend on interfaces registered in `lib/core/di/`.

---

# Refactoring Checklist

Before completing any refactoring task, verify:

- [ ] Has the file line count been reduced significantly (ideally <250 lines)? Quote before/after `wc -l` numbers to the user.
- [ ] Is business logic extracted to custom hooks or helper functions?
- [ ] Are heavy non-initial components dynamically imported via `next/dynamic`?
- [ ] Are expensive list computations memoized with `useMemo`?
- [ ] Are images using `next/image` and fonts using `next/font`?
- [ ] Are Mongoose read queries using `.lean()`, `.select()`, and batch `$in` joins (no `.populate()`, no N+1 loops)?
- [ ] Does the code respect text-only product scope and module boundaries?
- [ ] Have all verification commands passed without warnings or errors?
- [ ] Does behavior match the pre-refactor plan (no accidental logic changes)?

---

# Verification Protocol

Always execute the verification pipeline in strict sequence:

```bash
npm run lint
npm run build
npm test
```

If any step fails, fix errors before marking the task complete.

Additional guidance:
- **Verify incrementally.** After each hook/component extraction (see Before You Start), it's fine to run just `npm run lint` and a targeted `tsc --noEmit` before doing the full pipeline at the end — catching a type error right after the change that caused it is much cheaper than debugging it at the end of a big refactor.
- **If a step fails and the fix isn't obvious**, don't silently change unrelated code to make an error disappear — report the failing output to the user and explain the likely cause.
- **Rollback awareness**: since refactors are done in small increments, if an increment breaks verification and the fix isn't quick, it's reasonable to revert just that increment rather than debugging deep into an unrelated area.

---

# Worked Example: Refactoring a Monolithic Quiz Review Page

This walks through applying the rules above to a realistic case: a 480-line
`app/(student)/quiz/[id]/review/page.tsx` that fetches quiz results, lets the
student filter by question type, and shows a detail modal per question.

## Before (480 lines, all in `page.tsx`)

Symptoms typically found in a file like this:
- `useState` + `useEffect` fetching quiz results manually instead of TanStack Query.
- A `.populate('questions')` call in the API route behind it.
- Inline filter bar JSX, inline question list JSX, inline modal JSX — all in one return statement.
- A raw `<img src={question.imageUrl} />` for question images.
- A heavy "explanation" modal component rendered unconditionally even when closed.

## Step 1 — Read & Plan

List out the layers before touching anything:
- **Hook**: `useQuizReview(quizId)` — fetch + filter state + selected question state + memoized handlers.
- **Components**: `ReviewFilterBar`, `ReviewQuestionList`, `ReviewQuestionCard`, `QuestionDetailModal`.
- **Orchestrator**: `page.tsx` — composes the hook + components, ~60-80 lines.

## Step 2 — Extract the hook (`hooks/useQuizReview.ts`)

```ts
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchQuizReview } from '@/lib/api/quiz';

export function useQuizReview(quizId: string) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quiz-review', quizId],
    queryFn: () => fetchQuizReview(quizId),
    staleTime: 1000 * 60 * 5,
    select: (raw) => raw.questions, // only re-render on the fields consumers use
  });

  const [filter, setFilter] = useState<QuestionFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredQuestions = useMemo(
    () => (data ?? []).filter((q) => filter === 'all' || q.type === filter),
    [data, filter]
  );

  // Memoized handlers so React.memo on child cards actually prevents re-renders
  const handleSelectQuestion = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const handleFilterChange = useCallback((newFilter: QuestionFilter) => {
    setFilter(newFilter);
  }, []);

  return {
    filteredQuestions,
    filter,
    setFilter: handleFilterChange,
    selectedId,
    setSelectedId: handleSelectQuestion,
    isLoading,
    isError,
    error,
  };
}
```

Run `npm run lint` + `tsc --noEmit` now, before writing any components.

## Step 3 — Extract components

`ReviewQuestionCard.tsx` wraps each row in `React.memo` since the list can be
long and the parent re-renders on filter change:

```tsx
import React from 'react';
import Image from 'next/image';

interface Props {
  question: Question;
  onSelect: (id: string) => void;
}

export const ReviewQuestionCard = React.memo(function ReviewQuestionCard({
  question,
  onSelect,
}: Props) {
  return (
    <button onClick={() => onSelect(question.id)} className="...">
      <Image src={question.imageUrl} alt="" width={64} height={64} />
      <span>{question.text}</span>
    </button>
  );
});
```

`QuestionDetailModal.tsx` is lazy-loaded via `next/dynamic` since it's only needed once a
question is selected:

```tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const QuestionDetailModal = dynamic(() => import('./QuestionDetailModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
});
```

Run the full pipeline (`lint`, `build`, `test`) after this step.

## Step 4 — Orchestrator (`page.tsx`, ~70 lines, Next.js 15+ compatible)

```tsx
'use client';

import React from 'react';
import { useQuizReview } from '@/hooks/useQuizReview';
import { ReviewFilterBar } from './ReviewFilterBar';
import { ReviewQuestionList } from './ReviewQuestionList';
import { QuestionDetailModal } from './QuestionDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function QuizReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const {
    filteredQuestions,
    filter,
    setFilter,
    selectedId,
    setSelectedId,
    isLoading,
    isError,
    error,
  } = useQuizReview(id);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
        <AlertDescription>{error?.message || 'Không thể tải kết quả bài quiz.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ReviewFilterBar value={filter} onChange={setFilter} />
      <ReviewQuestionList questions={filteredQuestions} onSelect={setSelectedId} />
      {selectedId && (
        <QuestionDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
```

## Step 5 — Fix the backend N+1 / populate issue

Before:
```ts
const quiz = await QuizModel.findById(id).populate('questions').lean();
```

After (application-level join, projected fields only):
```ts
const quiz = await QuizModel.findById(id).select('title questionIds').lean();
if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

const questions = await QuestionModel
  .find({ _id: { $in: quiz.questionIds } })
  .select('text type imageUrl')
  .lean();
```

## Result

- `page.tsx`: 480 → ~70 lines.
- New files: `hooks/useQuizReview.ts` (~50 lines), 3 components (~50-90 lines each).
- Detail modal no longer ships in the initial bundle for this route (`next/dynamic`).
- Handlers wrapped in `useCallback` to ensure `React.memo` effectively skips unnecessary card re-renders.
- Next.js 15+ compatible using `React.use(params)` for async route params.
- Error state handled cleanly with Error Boundaries / Alert components.
- API route no longer uses `.populate()`; document hydration overhead removed via `.lean()`.
- Report to the user: before/after line counts per file, and confirmation that
  `npm run lint && npm run build && npm test` passed.

