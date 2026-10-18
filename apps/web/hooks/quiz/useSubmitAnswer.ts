'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { promptSessionReauth } from '@/store/shared/auth-prompt-store'

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

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
    // Handle 401 Unauthorized - in-place re-auth, never unload the exam page
    if (res.status === 401) {
      promptSessionReauth()
      throw new Error('Session expired. Sign in again in the new tab, then retry.')
    }

    const error = await res.json().catch(() => ({})) as { message?: string; error?: string; code?: string }
    throw new ApiError(res.status, error.code, error.error || error.message || 'Failed to submit answer')
  }

  return res.json()
}

export function useSubmitAnswer(sessionId: string, canWrite: () => boolean = () => true) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const {
    markAnswered,
    setLastAnswerResult,
  } = useQuizSessionStore()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const permissionRef = useRef({ sessionId, canWrite })
  permissionRef.current = { sessionId, canWrite }

  // Cleanup pending invalidation timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sessionId])

  return useMutation<SubmitAnswerResponse, Error, SubmitAnswerVariables, { sessionId: string; questionIndex: number }>({
    mutationKey: ['sessions', sessionId, 'answer'],
    mutationFn: async ({ questionIndex, answerIndexes }) => {
      if (permissionRef.current.sessionId !== sessionId || !permissionRef.current.canWrite()) throw new Error('This tab is read-only. Continue in this tab to save answers.')
      return submitAnswer(sessionId, questionIndex, answerIndexes)
    },

    onMutate: async ({ questionIndex }) => {
      // Clear any pending invalidation from a previous answer to avoid stacking timers
      if (timerRef.current) clearTimeout(timerRef.current)
      return { sessionId, questionIndex }
    },

    onSuccess: (data, _variables, context) => {
      if (!context || permissionRef.current.sessionId !== context.sessionId) return
      const requestSessionId = context.sessionId
      const currentStore = useQuizSessionStore.getState()
      if (currentStore.sessionId === requestSessionId) markAnswered(context.questionIndex)
      if ('isCorrect' in data) {
        const rawCorrect = data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : [])
        if (currentStore.sessionId === requestSessionId && currentStore.currentQuestionIndex === context.questionIndex) setLastAnswerResult({
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          correctAnswers: rawCorrect,
          explanation: data.explanation,
        })

        // Update preloaded questions cache in React Query so current session question contains correct answer
        queryClient.setQueryData<any>(['sessions', requestSessionId, 'all-questions'], (old: any) => {
          if (!old || !Array.isArray(old.questions)) return old
          const updatedQuestions = [...old.questions]
          if (updatedQuestions[context.questionIndex]) {
            updatedQuestions[context.questionIndex] = {
              ...updatedQuestions[context.questionIndex],
              correct_answer: rawCorrect,
              explanation: data.explanation || updatedQuestions[context.questionIndex].explanation,
            }
          }
          return { ...old, questions: updatedQuestions }
        })
      }

      // Optimistically update session user_answers in React Query cache without triggering a background server refetch
      queryClient.setQueryData<any>(['sessions', requestSessionId, 'initial'], (old: any) => {
        if (!old?.session) return old
        const existingAnswers = Array.isArray(old.session.user_answers) ? old.session.user_answers : []
        const existingIndex = existingAnswers.findIndex((a: any) => a.question_index === context.questionIndex)
        const updatedAnswer = {
          question_index: context.questionIndex,
          answer_index: _variables.answerIndexes[0],
          answer_indexes: _variables.answerIndexes,
          is_correct: 'isCorrect' in data ? data.isCorrect : false,
        }
        const updatedUserAnswers = existingIndex >= 0
          ? existingAnswers.map((a: any, i: number) => i === existingIndex ? updatedAnswer : a)
          : [...existingAnswers, updatedAnswer]
        return {
          ...old,
          session: {
            ...old.session,
            user_answers: updatedUserAnswers,
          },
        }
      })
    },

    onError: (error, _variables, context) => {
      if (context && permissionRef.current.sessionId !== context.sessionId) return
      toast.error(error.message || 'Failed to submit answer, please try again')
    },
  })
}
