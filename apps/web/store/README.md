# 🗄️ Client State Stores (`store/`)

Design documentation and client state management guide for **FQuiz** using **Zustand v5**.

---

## 1. Directory Structure

```
store/
├── quiz/
│   └── quiz-session.store.ts   # Quiz session state management (Persisted)
├── shared/
│   ├── toast-store.ts          # Global toast notification queue
│   └── __tests__/              # Unit tests for store actions
└── README.md                   # State store documentation
```

---

## 2. Quiz Session Store (`store/quiz/quiz-session.store.ts`)

Central store managing the complete lifecycle of a student's quiz session, ensuring instant responsiveness (0ms latency) and state retention across page reloads.

### 2.1. State Shape

```typescript
interface QuizSessionState {
  // Session metadata
  sessionId: string | null;
  quizId: string | null;
  mode: 'immediate' | 'review' | null;

  // Question navigation
  currentQuestionIndex: number;
  totalQuestions: number;

  // Answered state (mirrored from database)
  answeredQuestions: Set<number>;

  // Immediate feedback for recently submitted answer
  lastAnswerResult: {
    isCorrect: boolean;
    correctAnswer: number;
    correctAnswers?: number[];
    explanation?: string;
  } | null;

  // Optimistic UI state
  pendingAnswerIndex: number | null;

  // Highlight & Note mode
  isNoteMode: boolean;

  // Actions
  initSession: (sessionId: string, quizId: string, mode: string, total: number) => void;
  resumeSession: (sessionId: string, quizId: string, mode: string, total: number, currentIndex: number, answered: Set<number>) => void;
  navigateToQuestion: (index: number) => void;
  restoreAnswers: (answered: Set<number>) => void;
  markAnswered: (index: number) => void;
  optimisticallyMarkAnswered: (questionIndex: number) => void;
  rollbackOptimisticAnswer: (questionIndex: number) => void;
  confirmAnswer: (questionIndex: number) => void;
  setLastAnswerResult: (result: LastAnswerResult | null) => void;
  toggleNoteMode: () => void;
  resetSession: () => void;
}
```

### 2.2. Persistence Strategy
- **Middleware**: `persist` combined with `createJSONStorage(() => localStorage)`.
- **Key Name**: `quiz-session`.
- **Serialization Handling**: `Set<number>` cannot be serialized directly to JSON; middleware converts between in-memory `Set<number>` and `number[]` array upon persisting via `partialize`.

### 2.3. Optimistic Updates & Rollback Flow
When a student selects an answer under slow network conditions:
1. `optimisticallyMarkAnswered(index)`: Instantly marks the question as answered in the sidebar palette.
2. Dispatches `POST /api/sessions/[id]/answer` request in the background.
3. On success: `confirmAnswer(index)`.
4. On failure (network error): `rollbackOptimisticAnswer(index)` and surfaces a toast warning allowing the student to retry.

---

## 3. Toast Notification Store (`store/shared/toast-store.ts`)

Manages the global toast notification queue:
- Supports 4 states: `success`, `error`, `info`, `warning`.
- Auto-dismisses after **5000ms** by default.
- Resolves string error messages and `Error` instances automatically.

```typescript
import { useToast } from '@/store/shared/toast-store';

function MyComponent() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast.success('Quiz saved successfully!');
    } catch (err) {
      toast.error(err);
    }
  };
}
```

---

## 4. Performance Guidelines

To avoid re-rendering the entire quiz runner UI when a single property updates:

- ❌ **Avoid subscribing to the entire store**:
  ```tsx
  // BAD: Re-renders on ANY state change in the store
  const { currentQuestionIndex, answeredQuestions } = useQuizSessionStore();
  ```
- ✅ **Use Fine-Grained Selectors**:
  ```tsx
  // FQUIZ STANDARD: Re-renders only when currentQuestionIndex changes
  const currentIndex = useQuizSessionStore((state) => state.currentQuestionIndex);
  const navigateTo = useQuizSessionStore((state) => state.navigateToQuestion);
  ```
