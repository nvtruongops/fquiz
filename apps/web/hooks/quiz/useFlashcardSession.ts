import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { promptSessionReauth } from '@/store/shared/auth-prompt-store'

interface FlashcardQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
}

interface FlashcardSessionData {
  session: {
    _id: string
    mode: 'flashcard'
    status: 'active' | 'completed'
    current_question_index: number
    user_answers?: Array<{ question_index: number; is_correct: boolean }>
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

type FlashcardAnswerError = Error & { status?: number }

function readSessionCache<T>(storageKey: string, isValid: (value: any) => boolean): T | null {
  try {
    const cached = sessionStorage.getItem(storageKey)
    if (!cached) return null
    const parsed = JSON.parse(cached)
    if (!isValid(parsed)) return null
    sessionStorage.removeItem(storageKey)
    return parsed as T
  } catch {
    return null
  }
}

function readCachedFlashcardSession(sessionId: string): FlashcardSessionData | null {
  return readSessionCache(`session_initial_preload_${sessionId}`, (value) => Boolean(value.session))
}

function readCachedFlashcardQuestions(sessionId: string): { questions: FlashcardQuestion[] } | null {
  return readSessionCache(`session_preload_${sessionId}`, (value) => Boolean(value.questions?.length))
}

function getFlashcardSessionError(status: number): Error {
  if (status === 401) promptSessionReauth()
  return new Error(status === 401 ? 'Session expired' : 'Failed to load session')
}

async function fetchFlashcardSession(sessionId: string): Promise<FlashcardSessionData> {
  const cached = readCachedFlashcardSession(sessionId)
  if (cached) return cached

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}`)
  if (!res.ok) throw getFlashcardSessionError(res.status)
  return res.json()
}

async function fetchFlashcardQuestions(sessionId: string): Promise<{ questions: FlashcardQuestion[] }> {
  const cached = readCachedFlashcardQuestions(sessionId)
  if (cached) return cached

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/questions`)
  if (!res.ok) throw new Error('Failed to preload questions')
  return res.json()
}

function hasFlashcardAnswerError(payload: unknown): payload is { error: string } {
  return typeof payload === 'object' && payload !== null &&
    'error' in payload && typeof payload.error === 'string'
}

function getFlashcardAnswerErrorMessage(payload: unknown) {
  return hasFlashcardAnswerError(payload) ? payload.error : 'Failed to submit answer'
}

function getFlashcardSessionContent(
  data: FlashcardSessionData | undefined,
  allQuestionsData: { questions: FlashcardQuestion[] } | undefined,
) {
  return {
    session: data?.session,
    question: getCurrentFlashcardQuestion(data, allQuestionsData),
    allQuestions: allQuestionsData?.questions,
  }
}

function getCurrentFlashcardQuestion(
  data: FlashcardSessionData | undefined,
  allQuestionsData: { questions: FlashcardQuestion[] } | undefined,
) {
  if (!data) return undefined
  if (!allQuestionsData) return data.question
  return allQuestionsData.questions[data.session.current_question_index] ?? data.question
}

function getFlashcardQueryState(
  isLoading: boolean,
  isPreloading: boolean,
  isSubmitting: boolean,
  isAnswerError: boolean,
  answerVariables: { knows: boolean; questionIndex: number } | undefined,
) {
  return {
    isLoading: isLoading || isPreloading,
    isPreloading,
    isSubmitting,
    failedAnswer: isAnswerError ? answerVariables : undefined,
  }
}

async function submitFlashcardAnswer(sessionId: string, knows: boolean, questionIndex: number) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/flashcard-answer`, {
    method: 'POST',
    headers: withCsrfHeaders(),
    body: JSON.stringify({ knows, question_index: questionIndex }),
  })
  if (res.ok) return res.json()
  const payload: unknown = await res.json().catch(() => null)
  const error = new Error(getFlashcardAnswerErrorMessage(payload)) as FlashcardAnswerError
  error.status = res.status
  throw error
}

function getNextQuestionIndex(currentIndex: number, questionIndex: number) {
  return questionIndex < currentIndex ? currentIndex : currentIndex + 1
}

function getOptimisticFlashcardStats(
  stats: FlashcardSessionData['session']['flashcard_stats'],
  knows: boolean,
  isUpdatingPrevious: boolean,
) {
  if (!stats) return stats
  if (isUpdatingPrevious) return stats
  return {
    ...stats,
    cards_known: stats.cards_known + Number(knows),
    cards_unknown: stats.cards_unknown + Number(!knows),
  }
}

async function prepareFlashcardAnswer(
  queryClient: QueryClient,
  sessionId: string,
  knows: boolean,
  questionIndex: number,
) {
  const queryKey = ['flashcard-session', sessionId]
  await queryClient.cancelQueries({ queryKey })
  const previousData = queryClient.getQueryData<FlashcardSessionData>(queryKey)
  if (previousData) {
    const isUpdatingPrevious = questionIndex < previousData.session.current_question_index
    queryClient.setQueryData<FlashcardSessionData>(queryKey, {
      ...previousData,
      session: {
        ...previousData.session,
        current_question_index: getNextQuestionIndex(previousData.session.current_question_index, questionIndex),
        flashcard_stats: getOptimisticFlashcardStats(previousData.session.flashcard_stats, knows, isUpdatingPrevious),
      },
    })
  }
  return { previousData }
}

function handleFlashcardAnswerSuccess(
  queryClient: QueryClient,
  sessionId: string,
  data: FlashcardAnswerResponse,
) {
  const queryKey = ['flashcard-session', sessionId]
  if (data.updatedData) queryClient.setQueryData(queryKey, data.updatedData)
  else void queryClient.invalidateQueries({ queryKey })
}

function handleFlashcardAnswerError(
  queryClient: QueryClient,
  sessionId: string,
  error: FlashcardAnswerError,
  context: { previousData: FlashcardSessionData | undefined } | undefined,
) {
  const queryKey = ['flashcard-session', sessionId]
  if (error.status === 401) promptSessionReauth()
  if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData)
  void queryClient.invalidateQueries({ queryKey })
}

export function useFlashcardSession(sessionId: string) {
  const queryClient = useQueryClient()

  // Fetch current session state
  const { data, isLoading, error, refetch } = useQuery<FlashcardSessionData>({
    queryKey: ['flashcard-session', sessionId],
    queryFn: () => fetchFlashcardSession(sessionId),
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  })
  
  // Preload all questions for immediate transitions
  const { data: allQuestionsData, isLoading: isAllQuestionsLoading } = useQuery<{ questions: FlashcardQuestion[] }>({
    queryKey: ['flashcard-session', sessionId, 'all-questions'],
    queryFn: () => fetchFlashcardQuestions(sessionId),
    enabled: !!sessionId,
    staleTime: Infinity, // Preloaded once, stay in cache
  })

  // Submit flashcard answer
  const answerMutation = useMutation<
    FlashcardAnswerResponse,
    FlashcardAnswerError,
    { knows: boolean; questionIndex: number },
    { previousData: FlashcardSessionData | undefined }
  >({
    mutationFn: ({ knows, questionIndex }) => submitFlashcardAnswer(sessionId, knows, questionIndex),
    onMutate: ({ knows, questionIndex }) => prepareFlashcardAnswer(queryClient, sessionId, knows, questionIndex),
    onSuccess: (data) => handleFlashcardAnswerSuccess(queryClient, sessionId, data),
    onError: (err, _answer, context) => handleFlashcardAnswerError(queryClient, sessionId, err, context),
  })

  const { session, question, allQuestions } = getFlashcardSessionContent(data, allQuestionsData)
  const queryState = getFlashcardQueryState(
    isLoading,
    isAllQuestionsLoading,
    answerMutation.isPending,
    answerMutation.isError,
    answerMutation.variables,
  )

  // We expose a way to override the display index for local history navigation
  return {
    session,
    question,
    allQuestions,
    ...queryState,
    error,
    refetch,
    submitAnswer: answerMutation.mutate,
    answerError: answerMutation.error,
  }
}

import { useAnimationPreference } from '@/hooks/quiz/useAnimationPreference'

export function useFlashcardSessionState(sessionId: string, quizId: string) {
  const router = useRouter()
  const { session, allQuestions, isLoading, isPreloading, error, submitAnswer, isSubmitting, answerError, failedAnswer } = useFlashcardSession(sessionId)
  const [stats, setStats] = useState({ known: 0, unknown: 0, total: 0 })
  const [displayIndex, setDisplayIndex] = useState<number | null>(null)
  const [enableAnimation, setEnableAnimation] = useAnimationPreference(true)

  const rawIndex = displayIndex !== null ? displayIndex : (session?.current_question_index ?? 0)
  const actualIndex = Math.min(Math.max(rawIndex, 0), Math.max((session?.totalQuestions ?? 1) - 1, 0))
  const question = allQuestions?.[actualIndex]

  useEffect(() => {
    if (session?.flashcard_stats) {
      setStats({
        known: session.flashcard_stats.cards_known,
        unknown: session.flashcard_stats.cards_unknown,
        total: session.flashcard_stats.total_cards,
      })
    }
  }, [session])

  useEffect(() => {
    if (session?.status === 'completed') {
      router.push(`/quiz/${quizId}/result/${sessionId}`)
    }
  }, [session?.status, quizId, sessionId, router])

  const handleBack = () => {
    if (actualIndex > 0) {
      setDisplayIndex(actualIndex - 1)
    }
  }

  const handleForward = () => {
    if (actualIndex < (session?.current_question_index ?? 0)) {
      setDisplayIndex(actualIndex + 1)
    }
  }

  const userAnswers = session?.user_answers || []
  const currentAnswer = userAnswers.find((a: any) => a.question_index === actualIndex)
  const taggedStatus: 'known' | 'unknown' | null = currentAnswer
    ? (currentAnswer.is_correct ? 'known' : 'unknown')
    : null

  return {
    session,
    question,
    allQuestions,
    isLoading,
    isPreloading,
    error,
    submitAnswer,
    isSubmitting,
    answerError,
    failedAnswer,
    stats,
    setStats,
    displayIndex,
    setDisplayIndex,
    enableAnimation,
    setEnableAnimation,
    actualIndex,
    taggedStatus,
    handleBack,
    handleForward,
  }
}

