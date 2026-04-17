'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuizSessionStore } from '@/store/quiz-session.store'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'

interface SubmitAnswerVariables {
  questionIndex: number
  answerIndexes: number[]
}

interface ImmediateAnswerResponse {
  isCorrect: boolean
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

interface ReviewNextQuestionResponse {
  nextQuestion: object
}

interface ReviewCompletedResponse {
  completed: true
  score: number
}

type SubmitAnswerResponse =
  | ImmediateAnswerResponse
  | ReviewNextQuestionResponse
  | ReviewCompletedResponse

async function submitAnswer(
  sessionId: string,
  questionIndex: number,
  answerIndexes: number[]
): Promise<SubmitAnswerResponse> {
  const normalizedAnswerIndexes = [...new Set(answerIndexes)].sort((a, b) => a - b)

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/answer`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      answer_index: normalizedAnswerIndexes[0],
      answer_indexes: normalizedAnswerIndexes,
      question_index: questionIndex,
    }),
  })

  if (!res.ok) {
    // Handle 401 Unauthorized - token expired
    if (res.status === 401) {
      // Redirect to login with return URL
      const currentUrl = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
      throw new Error('Session expired. Redirecting to login...')
    }

    const error = await res.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(error.error || error.message || 'Failed to submit answer')
  }

  return res.json()
}

export function useSubmitAnswer(sessionId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const {
    mode,
    optimisticallyMarkAnswered,
    rollbackOptimisticAnswer,
    confirmAnswer,
    setLastAnswerResult,
  } = useQuizSessionStore()

  return useMutation<SubmitAnswerResponse, Error, SubmitAnswerVariables, { questionIndex: number }>({
    mutationFn: ({ questionIndex, answerIndexes }) => submitAnswer(sessionId, questionIndex, answerIndexes),

    onMutate: async ({ questionIndex }) => {
      optimisticallyMarkAnswered(questionIndex)
      return { questionIndex }
    },

    onSuccess: (data, _variables, context) => {
      confirmAnswer(context.questionIndex)

      if (mode === 'immediate' && 'isCorrect' in data) {
        setLastAnswerResult({
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          correctAnswers: data.correctAnswers,
          explanation: data.explanation,
        })
      }
      
      // Always invalidate to keep user_answers in sync for navigation
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] })
    },

    onError: (error, _variables, context) => {
      if (context) {
        rollbackOptimisticAnswer(context.questionIndex)
      }
      toast.error(error.message || 'Không thể gửi câu trả lời, vui lòng thử lại')
    },
  })
}
