# Worked Example: Refactoring a Monolithic Quiz Review Page

This reference walks through applying the rules in `fquiz-code-refactor-performance` to a realistic case: a 480-line `app/(student)/quiz/[id]/review/page.tsx` that fetches quiz results, lets the student filter by question type, and shows a detail modal per question.

---

## Before (480 lines, all in `page.tsx`)

Symptoms typically found in a file like this:
- `useState` + `useEffect` fetching quiz results manually instead of TanStack Query.
- A `.populate('questions')` call in the API route behind it.
- Inline filter bar JSX, inline question list JSX, inline modal JSX — all in one return statement.
- A raw `<img src={question.imageUrl} />` for question images.
- A heavy "explanation" modal component rendered unconditionally even when closed.

---

## Step 1 — Read & Plan

List out the layers before touching anything:
- **Hook**: `useQuizReview(quizId)` — fetch + filter state + selected question state + memoized handlers.
- **Components**: `ReviewFilterBar`, `ReviewQuestionList`, `ReviewQuestionCard`, `QuestionDetailModal`.
- **Orchestrator**: `page.tsx` — composes the hook + components, ~60-80 lines.

---

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

---

## Step 3 — Extract components

`ReviewQuestionCard.tsx` wraps each row in `React.memo` since the list can be long and the parent re-renders on filter change:

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

`QuestionDetailModal.tsx` is lazy-loaded via `next/dynamic` since it's only needed once a question is selected:

```tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const QuestionDetailModal = dynamic(() => import('./QuestionDetailModal'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
});
```

Run the full pipeline (`lint`, `build`, `test`) after this step.

---

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

---

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

---

## Result

- `page.tsx`: 480 → ~70 lines.
- New files: `hooks/useQuizReview.ts` (~50 lines), 3 components (~50-90 lines each).
- Detail modal no longer ships in the initial bundle for this route (`next/dynamic`).
- Handlers wrapped in `useCallback` to ensure `React.memo` effectively skips unnecessary card re-renders.
- Next.js 15+ compatible using `React.use(params)` for async route params.
- Error state handled cleanly with Error Boundaries / Alert components.
- API route no longer uses `.populate()`; document hydration overhead removed via `.lean()`.
- Report to the user: before/after line counts per file, and confirmation that `npm run lint && npm run build && npm test` passed.
