'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
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
  answerIndexes: number[]
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

type QuizSessionState = ReturnType<typeof useQuizSessionStore.getState>

function getPersistedAnswerIndexes(data: SubmitAnswerResponse, requestedIndexes: number[]) {
  return 'answerIndexes' in data && Array.isArray(data.answerIndexes) ? data.answerIndexes : requestedIndexes
}

function updateQuestionFeedbackCache(
  queryClient: QueryClient,
  sessionId: string,
  questionIndex: number,
  correctAnswers: number[],
  explanation?: string,
) {
  queryClient.setQueryData<any>(['sessions', sessionId, 'all-questions'], (old: any) => {
    if (!old || !Array.isArray(old.questions)) return old
    const questions = [...old.questions]
    if (questions[questionIndex]) {
      questions[questionIndex] = {
        ...questions[questionIndex],
        correct_answer: correctAnswers,
        explanation: explanation || questions[questionIndex].explanation,
      }
    }
    return { ...old, questions }
  })
}

function updateSessionAnswersCache(
  queryClient: QueryClient,
  sessionId: string,
  questionIndex: number,
  answerIndexes: number[],
  isCorrect: boolean,
) {
  queryClient.setQueryData<any>(['sessions', sessionId, 'initial'], (old: any) => {
    if (!old?.session) return old
    const existingAnswers = Array.isArray(old.session.user_answers) ? old.session.user_answers : []
    const existingIndex = existingAnswers.findIndex((answer: any) => answer.question_index === questionIndex)
    const updatedAnswer = {
      question_index: questionIndex,
      answer_index: answerIndexes[0],
      answer_indexes: answerIndexes,
      is_correct: isCorrect,
    }
    const userAnswers = existingIndex >= 0
      ? existingAnswers.map((answer: any, index: number) => index === existingIndex ? updatedAnswer : answer)
      : [...existingAnswers, updatedAnswer]
    return { ...old, session: { ...old.session, user_answers: userAnswers } }
  })
}

function updateAnswerStore(
  data: SubmitAnswerResponse,
  sessionId: string,
  questionIndex: number,
  store: QuizSessionState,
) {
  if (store.sessionId === sessionId) store.markAnswered(questionIndex)
  if (!('isCorrect' in data) || store.sessionId !== sessionId || store.currentQuestionIndex !== questionIndex) return
  store.setLastAnswerResult({
    isCorrect: data.isCorrect,
    correctAnswer: data.correctAnswer,
    correctAnswers: data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : []),
    explanation: data.explanation,
  })
}

function handleSubmitAnswerSuccess(
  data: SubmitAnswerResponse,
  variables: SubmitAnswerVariables,
  context: { sessionId: string; questionIndex: number } | undefined,
  currentSessionId: string | undefined,
  queryClient: QueryClient,
) {
  if (!context || currentSessionId !== context.sessionId) return
  const store = useQuizSessionStore.getState()
  const requestSessionId = context.sessionId
  const answerIndexes = getPersistedAnswerIndexes(data, variables.answerIndexes)
  updateAnswerStore(data, requestSessionId, context.questionIndex, store)

  if ('isCorrect' in data) {
    const correctAnswers = data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : [])
    updateQuestionFeedbackCache(queryClient, requestSessionId, context.questionIndex, correctAnswers, data.explanation)
  }
  updateSessionAnswersCache(queryClient, requestSessionId, context.questionIndex, answerIndexes, 'isCorrect' in data ? data.isCorrect : false)
}

async function submitAnswer(
  sessionId: string,
  questionIndex: number,
  answerIndexes: number[]
): Promise<SubmitAnswerResponse> {
  const normalizedAnswerIndexes = [...new Set(answerIndexes)].sort((a, b) => a - b)
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error('Answer request timed out. Retry saving this answer.')),
    10_000
  )

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        answer_index: normalizedAnswerIndexes[0],
        answer_indexes: normalizedAnswerIndexes,
        question_index: questionIndex,
      }),
      signal: controller.signal,
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

    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

export function useSubmitAnswer(sessionId: string, canWrite: () => boolean = () => true) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
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

    onSuccess: (data, variables, context) => handleSubmitAnswerSuccess(
      data,
      variables,
      context,
      permissionRef.current.sessionId,
      queryClient,
    ),

    onError: (error, _variables, context) => {
      if (context && permissionRef.current.sessionId !== context.sessionId) return
      toast.error(error.message || 'Failed to submit answer, please try again')
    },
  })
}
