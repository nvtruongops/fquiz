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
  answerRevision?: number
}

interface ImmediateAnswerResponse {
  isCorrect: boolean
  answerIndexes: number[]
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

interface ReviewAnswerResponse {
  answerIndexes: number[]
  answerRevision?: number
  nextQuestion?: object
  completed?: boolean
}

type SubmitAnswerResponse = ImmediateAnswerResponse | ReviewAnswerResponse

type QuizSessionState = ReturnType<typeof useQuizSessionStore.getState>

function getPersistedAnswerIndexes(data: SubmitAnswerResponse, requestedIndexes: number[]) {
  return 'answerIndexes' in data && Array.isArray(data.answerIndexes) ? data.answerIndexes : requestedIndexes
}

function applyQuestionFeedback(old: any, questionIndex: number, correctAnswers: number[], explanation?: string) {
  if (!old || !Array.isArray(old.questions)) return old
  const questions = old.questions.map((question: any, index: number) => index === questionIndex ? {
    ...question,
    correct_answer: correctAnswers,
    explanation: explanation || question.explanation,
  } : question)
  return { ...old, questions }
}

function updateQuestionFeedbackCache(
  queryClient: QueryClient,
  sessionId: string,
  questionIndex: number,
  correctAnswers: number[],
  explanation?: string,
) {
  queryClient.setQueryData<any>(['sessions', sessionId, 'all-questions'], (old: any) =>
    applyQuestionFeedback(old, questionIndex, correctAnswers, explanation))
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
    if (answerIndexes.length === 0) {
      return { ...old, session: { ...old.session, user_answers: existingAnswers.filter((answer: any) => answer.question_index !== questionIndex) } }
    }
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
  complete: boolean,
) {
  if (store.sessionId === sessionId) {
    const answered = new Set(store.answeredQuestions)
    if (complete) answered.add(questionIndex)
    else answered.delete(questionIndex)
    store.restoreAnswers(answered)
  }
  if (!('isCorrect' in data) || store.sessionId !== sessionId || store.currentQuestionIndex !== questionIndex) return
  store.setLastAnswerResult({
    isCorrect: data.isCorrect,
    correctAnswer: data.correctAnswer,
    correctAnswers: getCorrectAnswerIndexes(data),
    explanation: data.explanation,
  })
}

function hasNewerPersistedRevision(queryClient: QueryClient, sessionId: string, questionIndex: number, revision?: number) {
  const persisted = queryClient.getQueryData<any>(['sessions', sessionId, 'initial'])?.session?.answer_revisions?.[questionIndex]
  return revision !== undefined && persisted > revision
}

function getCachedSelectionCount(queryClient: QueryClient, sessionId: string, questionIndex: number): number {
  const questions = queryClient.getQueryData<any>(['sessions', sessionId, 'all-questions'])?.questions
  const initial = queryClient.getQueryData<any>(['sessions', sessionId, 'initial'])
  const question = questions?.[questionIndex] ?? (initial?.session?.current_question_index === questionIndex ? initial.question : undefined)
  return question?.answer_selection_count ?? 1
}

function updateCachedAnswerRevision(queryClient: QueryClient, sessionId: string, questionIndex: number, revision?: number) {
  if (revision === undefined) return
  queryClient.setQueryData<any>(['sessions', sessionId, 'initial'], (old: any) => old?.session ? {
    ...old,
    session: { ...old.session, answer_revisions: { ...old.session.answer_revisions, [questionIndex]: revision } },
  } : old)
}

function getCorrectAnswerIndexes(data: ImmediateAnswerResponse) {
  return data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : [])
}

function handleSubmitAnswerSuccess(
  data: SubmitAnswerResponse,
  variables: SubmitAnswerVariables,
  context: { sessionId: string; questionIndex: number } | undefined,
  currentSessionId: string | undefined,
  queryClient: QueryClient,
) {
  if (!context || currentSessionId !== context.sessionId) return
  if (hasNewerPersistedRevision(queryClient, context.sessionId, context.questionIndex, variables.answerRevision)) return
  const store = useQuizSessionStore.getState()
  const requestSessionId = context.sessionId
  const answerIndexes = getPersistedAnswerIndexes(data, variables.answerIndexes)
  const required = getCachedSelectionCount(queryClient, requestSessionId, context.questionIndex)
  updateAnswerStore(data, requestSessionId, context.questionIndex, store, answerIndexes.length === required)

  if ('isCorrect' in data) {
    const correctAnswers = getCorrectAnswerIndexes(data)
    updateQuestionFeedbackCache(queryClient, requestSessionId, context.questionIndex, correctAnswers, data.explanation)
  }
  updateSessionAnswersCache(queryClient, requestSessionId, context.questionIndex, answerIndexes, 'isCorrect' in data ? data.isCorrect : false)
  updateCachedAnswerRevision(queryClient, requestSessionId, context.questionIndex, variables.answerRevision)
}

async function submitAnswer(
  sessionId: string,
  questionIndex: number,
  answerIndexes: number[],
  answerRevision?: number
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
        answer_revision: answerRevision,
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
    mutationFn: async ({ questionIndex, answerIndexes, answerRevision }) => {
      if (permissionRef.current.sessionId !== sessionId || !permissionRef.current.canWrite()) throw new Error('This tab is read-only. Continue in this tab to save answers.')
      return submitAnswer(sessionId, questionIndex, answerIndexes, answerRevision)
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
