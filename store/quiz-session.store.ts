import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface LastAnswerResult {
  isCorrect: boolean
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

interface QuizSessionState {
  // Session data
  sessionId: string | null
  quizId: string | null
  mode: 'immediate' | 'review' | null

  // Question navigation
  currentQuestionIndex: number
  totalQuestions: number

  // Answer tracking (client-side mirror of DB state)
  answeredQuestions: Set<number>

  // Immediate mode feedback
  lastAnswerResult: LastAnswerResult | null

  // Optimistic answer tracking
  pendingAnswerIndex: number | null

  // Actions
  initSession: (sessionId: string, quizId: string, mode: string, total: number) => void
  resumeSession: (sessionId: string, quizId: string, mode: string, total: number, currentIndex: number, answered: Set<number>) => void
  navigateToQuestion: (index: number) => void
  restoreAnswers: (answered: Set<number>) => void
  markAnswered: (index: number) => void
  optimisticallyMarkAnswered: (questionIndex: number) => void
  rollbackOptimisticAnswer: (questionIndex: number) => void
  confirmAnswer: (questionIndex: number) => void
  setLastAnswerResult: (result: LastAnswerResult | null) => void
  resetSession: () => void
}

// Persisted shape uses arrays instead of Sets (JSON-serializable)
interface PersistedQuizSession {
  sessionId: string | null
  quizId: string | null
  currentQuestionIndex: number
  answeredQuestions: number[]
  pendingAnswerIndex: number | null
}

export const useQuizSessionStore = create<QuizSessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      quizId: null,
      mode: null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      answeredQuestions: new Set(),
      lastAnswerResult: null,
      pendingAnswerIndex: null,

      initSession: (sessionId, quizId, mode, total) =>
        set({
          sessionId,
          quizId,
          mode: mode as 'immediate' | 'review',
          totalQuestions: total,
          currentQuestionIndex: 0,
          answeredQuestions: new Set(),
          lastAnswerResult: null,
          pendingAnswerIndex: null,
        }),

      // Resume existing session - single atomic update to avoid flash
      resumeSession: (sessionId, quizId, mode, total, currentIndex, answered) =>
        set({
          sessionId,
          quizId,
          mode: mode as 'immediate' | 'review',
          totalQuestions: total,
          currentQuestionIndex: currentIndex,
          answeredQuestions: new Set(answered),
          lastAnswerResult: null,
          pendingAnswerIndex: null,
        }),

      navigateToQuestion: (index) => set({ currentQuestionIndex: index }),

      restoreAnswers: (answered) => set({ answeredQuestions: new Set(answered) }),

      markAnswered: (index) =>
        set((state) => ({
          answeredQuestions: new Set(Array.from(state.answeredQuestions).concat(index)),
        })),

      optimisticallyMarkAnswered: (questionIndex) =>
        set((state) => ({
          answeredQuestions: new Set(Array.from(state.answeredQuestions).concat(questionIndex)),
          pendingAnswerIndex: questionIndex,
        })),

      rollbackOptimisticAnswer: (questionIndex) =>
        set((state) => {
          const next = new Set(state.answeredQuestions)
          next.delete(questionIndex)
          return { answeredQuestions: next, pendingAnswerIndex: null }
        }),

      confirmAnswer: (_questionIndex) => set({ pendingAnswerIndex: null }),

      setLastAnswerResult: (result) => set({ lastAnswerResult: result }),

      resetSession: () =>
        set({
          sessionId: null,
          quizId: null,
          mode: null,
          currentQuestionIndex: 0,
          totalQuestions: 0,
          answeredQuestions: new Set(),
          lastAnswerResult: null,
          pendingAnswerIndex: null,
        }),
    }),
    {
      name: 'quiz-session',
      storage: createJSONStorage(() => localStorage),
      // Only persist session identity, NOT currentQuestionIndex
      // currentQuestionIndex is always restored from server on mount to avoid stale index
      partialize: (state): PersistedQuizSession => ({
        sessionId: state.sessionId,
        quizId: state.quizId,
        currentQuestionIndex: 0, // always start at 0, server will correct it
        answeredQuestions: Array.from(state.answeredQuestions),
        pendingAnswerIndex: state.pendingAnswerIndex,
      }),
      // Convert arrays back to Sets on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const raw = state as unknown as QuizSessionState & {
            answeredQuestions: number[] | Set<number>
          }
          if (Array.isArray(raw.answeredQuestions)) {
            state.answeredQuestions = new Set(raw.answeredQuestions)
          }
        }
      },
    }
  )
)
