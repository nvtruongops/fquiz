import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/csrf'

interface FlashcardQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
}

interface FlashcardSessionData {
  session: {
    _id: string
    mode: 'flashcard'
    status: 'active' | 'completed'
    current_question_index: number
    flashcard_stats?: {
      total_cards: number
      cards_known: number
      cards_unknown: number
      time_spent_ms: number
      current_round: number
    }
    totalQuestions: number
    courseCode: string
    categoryName: string
    title: string
    started_at: string
  }
  question: FlashcardQuestion
}

interface FlashcardAnswerResponse {
  success: boolean
  knows: boolean
  isLastQuestion: boolean
  nextQuestionIndex: number | null
  stats: {
    total: number
    known: number
    unknown: number
  }
  updatedData?: FlashcardSessionData
}

export function useFlashcardSession(sessionId: string) {
  const queryClient = useQueryClient()

  // Fetch current session state
  const { data, isLoading, error, refetch } = useQuery<FlashcardSessionData>({
    queryKey: ['flashcard-session', sessionId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}`
      )
      if (!res.ok) {
        if (res.status === 401) {
          const currentUrl = window.location.pathname + window.location.search
          window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
          throw new Error('Session expired')
        }
        throw new Error('Failed to load session')
      }
      return res.json()
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  })

  // Submit flashcard answer
  const answerMutation = useMutation<
    FlashcardAnswerResponse,
    Error,
    { knows: boolean; questionIndex: number }
  >({
    mutationFn: async ({ knows, questionIndex }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/flashcard-answer`,
        {
          method: 'POST',
          headers: withCsrfHeaders(),
          body: JSON.stringify({ knows, question_index: questionIndex }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to submit answer' }))
        throw new Error(err.error)
      }
      return res.json()
    },
    onSuccess: (data) => {
      // If the API provided the next piece of data directly, we can update the cache
      // optimistically without waiting for a whole GET request roundtrip!
      if (data.updatedData) {
        queryClient.setQueryData(['flashcard-session', sessionId], data.updatedData)
      } else {
        // Fallback
        void queryClient.invalidateQueries({ queryKey: ['flashcard-session', sessionId] })
      }
    },
  })

  return {
    session: data?.session,
    question: data?.question,
    isLoading,
    error,
    refetch,
    submitAnswer: answerMutation.mutate,
    isSubmitting: answerMutation.isPending,
  }
}
