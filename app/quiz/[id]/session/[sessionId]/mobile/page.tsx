'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQuizSessionStore } from '@/store/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/useSubmitAnswer'
import { cn } from '@/lib/utils'
import { withCsrfHeaders } from '@/lib/csrf'
import { ScrollArea } from '@/components/ui/scroll-area'
import { QuizTimer } from '@/components/QuizTimer'

interface QuestionFeedback {
  isCorrect: boolean
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

interface SessionQuestion {
  _id: string
  text: string
  options: string[]
  answer_selection_count?: number
  image_url?: string
  correct_answer?: number | number[]
  explanation?: string
}

interface SessionData {
  session: {
    _id: string
    mode: 'immediate' | 'review'
    status: 'active' | 'completed'
    current_question_index: number
    user_answers: Array<{ question_index: number; answer_index: number; answer_indexes?: number[]; is_correct: boolean }>
    score: number
    totalQuestions: number
    courseCode: string
    categoryName: string
    title: string
    started_at: string
    paused_at?: string | null
    total_paused_duration_ms?: number
  }
  question: SessionQuestion
}

interface PreloadedQuestions {
  sessionId: string
  mode: 'immediate' | 'review'
  status: 'active' | 'completed'
  totalQuestions: number
  questions: SessionQuestion[]
}

type SessionApiError = Error & {
  status?: number
  code?: string
}

async function fetchSession(sessionId: string): Promise<SessionData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string }
    const apiError = new Error(err.error ?? 'Failed to load session') as SessionApiError
    apiError.status = res.status
    apiError.code = err.code
    throw apiError
  }
  return res.json()
}

async function fetchAllQuestions(sessionId: string): Promise<PreloadedQuestions> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/questions`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string }
    const apiError = new Error(err.error ?? 'Failed to load questions') as SessionApiError
    apiError.status = res.status
    apiError.code = err.code
    throw apiError
  }
  return res.json()
}

export default function QuizSessionMobilePage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''
  const router = useRouter()

  const {
    sessionId: storeSessionId,
    currentQuestionIndex,
    answeredQuestions,
    lastAnswerResult,
    initSession,
    resumeSession,
    navigateToQuestion,
    restoreAnswers,
    setLastAnswerResult,
  } = useQuizSessionStore()

  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false) // Synchronous guard to prevent double-submit on fast clicks
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [questionMapOpen, setQuestionMapOpen] = useState(false)
  const [isHydratedFromServer, setIsHydratedFromServer] = useState(false)
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null)
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<number, QuestionFeedback>>({})
  const [preloadedQuestions, setPreloadedQuestions] = useState<SessionQuestion[] | null>(null)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const lastSyncedQuestionIndexRef = useRef<number | null>(null)

  // Only render quiz when server data has been applied for THIS session
  const isReadyToRender = isHydratedFromServer && hydratedSessionId === resolvedSessionId

  // Reset hydration when sessionId changes so we always wait for fresh server data
  useEffect(() => {
    setIsHydratedFromServer(false)
    setHydratedSessionId(null)
    setSelectedOptions([])
    setSubmitted(false)
    submittedRef.current = false
    lastSyncedQuestionIndexRef.current = null
    setFeedbackByQuestion({})
  }, [resolvedSessionId])

  function reportSessionActivity(event: 'pause' | 'resume') {
    if (!sessionId) return
    const payload = JSON.stringify({ event, current_question_index: currentQuestionIndex })
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/activity`

    void fetch(url, {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: payload,
      keepalive: true,
    })
  }

  // Preload all questions - check sessionStorage cache first (seeded by quiz detail page)
  const {
    data: preloadData,
    isLoading: isPreloading,
    isError: isPreloadError,
    isSuccess: isPreloadSuccess,
  } = useQuery<PreloadedQuestions, Error>({
    queryKey: ['sessions', resolvedSessionId, 'all-questions'],
    queryFn: async () => {
      // Check sessionStorage for pre-seeded data from create session response
      try {
        const cached = sessionStorage.getItem(`session_preload_${resolvedSessionId}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.questions?.length > 0) {
            sessionStorage.removeItem(`session_preload_${resolvedSessionId}`)
            setPreloadProgress(100)
            return parsed as PreloadedQuestions
          }
        }
      } catch {}

      setPreloadProgress(10)
      const data = await fetchAllQuestions(resolvedSessionId)
      setPreloadProgress(60)
      setPreloadProgress(90)
      setPreloadProgress(100)
      return data
    },
    enabled: resolvedSessionId.length > 0,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  })

  const {
    data: initialData,
    isLoading: isInitialLoading,
    isError: isInitialError,
    error: initialError,
    isSuccess: isInitialSuccess,
  } = useQuery<SessionData, Error>({
    queryKey: ['sessions', resolvedSessionId, 'initial'],
    queryFn: () => fetchSession(resolvedSessionId),
    enabled: resolvedSessionId.length > 0,
    staleTime: 0,
    gcTime: 0, // Never cache - always fetch fresh to get correct current_question_index
    refetchOnMount: 'always',
  })

  // Store preloaded questions when available
  useEffect(() => {
    if (preloadData?.questions) {
      setPreloadedQuestions(preloadData.questions)
    }
  }, [preloadData])

  const clampedQuestionIndex = Math.min(
    Math.max(currentQuestionIndex, 0),
    Math.max((initialData?.session.totalQuestions ?? 1) - 1, 0)
  )

  // Use preloaded questions instead of fetching individually
  const currentQuestion = preloadedQuestions?.[clampedQuestionIndex]

  // Construct session data from preloaded questions and initial session data
  const activeData: SessionData | undefined = initialData && currentQuestion ? {
    session: initialData.session,
    question: currentQuestion,
  } : initialData

  const activeError = initialError
  const isLoading = isInitialLoading
  const isError = isInitialError

  useEffect(() => {
    const err = activeError as SessionApiError | undefined
    if (!quizId || !err) return
    if (err.code !== 'SESSION_EXPIRED' && err.status !== 410) return

    router.replace(`/quiz/${quizId}?reason=session_expired`)
  }, [activeError, quizId, router])

  useEffect(() => {
    if (!initialData || isHydratedFromServer) return

    const serverAnsweredSet = new Set<number>(
      initialData.session.user_answers.map((a) => a.question_index)
    )

    // Single atomic update - no flash between states
    resumeSession(
      resolvedSessionId,
      resolvedQuizId,
      initialData.session.mode,
      initialData.session.totalQuestions,
      initialData.session.current_question_index,
      serverAnsweredSet
    )
    setIsHydratedFromServer(true)
    setHydratedSessionId(resolvedSessionId)
  }, [initialData, isHydratedFromServer, resolvedQuizId, resolvedSessionId, resumeSession])

  useEffect(() => {
    if (!activeData?.session) return

    const previousQuestionIndex = lastSyncedQuestionIndexRef.current
    const isSameQuestionRender = previousQuestionIndex === currentQuestionIndex

    const existing = activeData.session.user_answers.find((a) => a.question_index === currentQuestionIndex)
    if (existing) {
      const restored = existing.answer_indexes && existing.answer_indexes.length > 0
        ? existing.answer_indexes
        : [existing.answer_index]
      setSelectedOptions(restored)
      setSubmitted(activeData.session.mode === 'immediate')
      submittedRef.current = activeData.session.mode === 'immediate'

      if (activeData.session.mode === 'immediate') {
        // Try to get feedback from cache first
        let feedback = feedbackByQuestion[currentQuestionIndex]
        
        // If not in cache, reconstruct from preloaded question data
        if (!feedback && currentQuestion?.correct_answer !== undefined) {
          const correctAnswerIndexes = Array.isArray(currentQuestion.correct_answer)
            ? currentQuestion.correct_answer
            : [currentQuestion.correct_answer]
          
          feedback = {
            isCorrect: existing.is_correct,
            correctAnswer: correctAnswerIndexes[0],
            correctAnswers: correctAnswerIndexes,
            explanation: currentQuestion.explanation,
          }
          
          // Cache it for future navigation
          setFeedbackByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: feedback! }))
        }
        
        setLastAnswerResult(feedback ?? null)
      }
      lastSyncedQuestionIndexRef.current = currentQuestionIndex
    } else {
      const localImmediateFeedback =
        activeData.session.mode === 'immediate'
          ? feedbackByQuestion[currentQuestionIndex]
          : undefined

      if (localImmediateFeedback) {
        setSubmitted(true)
        submittedRef.current = true
        setLastAnswerResult(localImmediateFeedback)
        lastSyncedQuestionIndexRef.current = currentQuestionIndex
        return
      }

      if (isSameQuestionRender) {
        return
      }

      setSelectedOptions([])
      setSubmitted(false)
      submittedRef.current = false
      setLastAnswerResult(null)
      lastSyncedQuestionIndexRef.current = currentQuestionIndex
    }
  }, [activeData?.session, currentQuestionIndex, feedbackByQuestion, currentQuestion, setLastAnswerResult])

  useEffect(() => {
    if (!sessionId) return
    reportSessionActivity('resume')
  }, [sessionId])

  useEffect(() => {
    if (activeData?.session.status === 'completed') {
      router.push(`/quiz/${quizId}/result/${sessionId}`)
    }
  }, [activeData?.session.status, quizId, router, sessionId])

  const shouldWarnBeforeLeave = Boolean(activeData?.session && activeData.session.status !== 'completed')

  useEffect(() => {
    if (!shouldWarnBeforeLeave || !sessionId) return

    const guardState = { quizSessionGuard: sessionId }
    globalThis.history.pushState(guardState, '', globalThis.location.href)

    const handlePopState = () => {
      setExitConfirmOpen(true)
      globalThis.history.pushState(guardState, '', globalThis.location.href)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [sessionId, shouldWarnBeforeLeave])

  useEffect(() => {
    if (!shouldWarnBeforeLeave) return

    const handlePageHide = () => {
      reportSessionActivity('pause')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportSessionActivity('pause')
      } else if (document.visibilityState === 'visible') {
        // Resume when user comes back to the tab
        reportSessionActivity('resume')
      }
    }

    globalThis.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      globalThis.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [shouldWarnBeforeLeave, sessionId, currentQuestionIndex])

  const submitMutation = useSubmitAnswer(resolvedSessionId)
  const finalizeMutation = useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error>({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Không thể nộp bài')
      }
      return res.json()
    },
    onSuccess: () => {
      router.push(`/quiz/${quizId}/result/${sessionId}`)
    },
  })

  function handleSubmit() {
    if (!activeData?.session) return
    setConfirmOpen(true)
  }

  function submitInImmediateMode(answerIndexes: number[]) {
    if (!activeData?.session) return
    if (activeData.session.mode !== 'immediate') return
    // Use ref for synchronous guard - prevents double-submit on fast clicks
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)

    // Compute feedback instantly from preloaded questions (no need to wait for API)
    if (currentQuestion?.correct_answer !== undefined) {
      const correctAnswerIndexes = Array.isArray(currentQuestion.correct_answer)
        ? [...new Set(currentQuestion.correct_answer)].sort((a, b) => a - b)
        : [currentQuestion.correct_answer as number]
      const submittedSorted = [...new Set(answerIndexes)].sort((a, b) => a - b)
      const isCorrect =
        submittedSorted.length === correctAnswerIndexes.length &&
        submittedSorted.every((v, i) => v === correctAnswerIndexes[i])

      const feedback: QuestionFeedback = {
        isCorrect,
        correctAnswer: correctAnswerIndexes[0],
        correctAnswers: correctAnswerIndexes,
        explanation: currentQuestion.explanation,
      }
      setFeedbackByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: feedback }))
      setLastAnswerResult(feedback)
    }

    // Fire-and-forget API call to persist answer
    submitMutation.mutate(
      { questionIndex: currentQuestionIndex, answerIndexes },
      {
        onError: () => {
          submittedRef.current = false
          setSubmitted(false)
        },
      }
    )
  }

  function handleSelectOption(idx: number) {
    if (!activeData?.session) return
    if (submitted || submitMutation.isPending) return

    const exists = selectedOptions.includes(idx)
    let nextSelections: number[]

    if (requiredSelectionCount === 1 && activeData.session.mode === 'review') {
      nextSelections = [idx]
    } else if (exists) {
      nextSelections = selectedOptions.filter((v) => v !== idx)
    } else if (selectedOptions.length >= requiredSelectionCount) {
      nextSelections = selectedOptions
    } else {
      nextSelections = [...selectedOptions, idx].sort((a, b) => a - b)
    }

    const hasChanged =
      nextSelections.length !== selectedOptions.length ||
      nextSelections.some((value, index) => value !== selectedOptions[index])

    if (!hasChanged) return

    setSelectedOptions(nextSelections)

    if (nextSelections.length === requiredSelectionCount) {
      if (activeData.session.mode === 'immediate') {
        submitInImmediateMode(nextSelections)
      } else {
        submitMutation.mutate({
          questionIndex: currentQuestionIndex,
          answerIndexes: nextSelections,
        })
      }
    }
  }

  function handleConfirmSubmit() {
    if (!activeData?.session || finalizeMutation.isPending || submitMutation.isPending) {
      setConfirmOpen(false)
      return
    }

    setConfirmOpen(false)
    finalizeMutation.mutate()
  }

  function handleConfirmExitQuiz() {
    reportSessionActivity('pause')
    setExitConfirmOpen(false)
    router.push(`/quiz/${quizId}`)
  }

  function handleNavigate(index: number) {
    if (!isHydratedFromServer) return
    if (index < 0 || index >= effectiveTotal) return
    submittedRef.current = false
    setSubmitted(false)
    navigateToQuestion(index)
    setQuestionMapOpen(false)
  }

  // Show preloading screen with progress
  if (isPreloading || isInitialLoading || !isPreloadSuccess || !isInitialSuccess || (!activeData && isLoading)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-[#EAE7D6]/30 to-white">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#5D7B6F]/20" />
          <Loader2 className="relative h-12 w-12 animate-spin text-[#5D7B6F]" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-wider text-[#5D7B6F]">
          {isPreloading ? 'Đang tải bộ câu hỏi...' : 'Đang tải...'}
        </p>
        {isPreloading && (
          <div className="mt-4 w-64 px-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-[#5D7B6F] to-[#A4C3A2] transition-all duration-300 ease-out"
                style={{ width: `${preloadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              {preloadProgress < 60 && 'Đang tải câu hỏi...'}
              {preloadProgress >= 60 && preloadProgress < 90 && `Đã tải ${(preloadData as PreloadedQuestions | undefined)?.totalQuestions ?? '...'} câu hỏi`}
              {preloadProgress >= 90 && 'Sẵn sàng!'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Show error if preload failed
  if (isPreloadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F7] p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-gray-100 bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-black text-gray-900">Không thể tải bộ câu hỏi</h2>
          <p className="mb-6 text-sm text-gray-600">
            Vui lòng kiểm tra kết nối mạng và thử lại
          </p>
          <Button
            type="button"
            onClick={() => router.push(`/quiz/${quizId}`)}
            className="w-full bg-[#5D7B6F] py-6 text-white hover:bg-[#4a6358]"
          >
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  if (isInitialError || isError || !activeData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F7] p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-gray-100 bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-black text-gray-900">Lỗi phòng thi</h2>
          <p className="mb-6 text-sm text-gray-600">{activeError?.message}</p>
          <Button
            type="button"
            onClick={() => router.back()}
            className="w-full bg-[#5D7B6F] py-6 text-white hover:bg-[#4a6358]"
          >
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  // Wait for server hydration before rendering to avoid showing wrong question index
  if (!isReadyToRender) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#5D7B6F]" />
      </div>
    )
  }

  const { session, question } = activeData
  const effectiveTotal = session.totalQuestions || 0
  const effectiveIndex = Math.min(currentQuestionIndex, Math.max(effectiveTotal - 1, 0))
  const answeredFromSession = new Set(
    session.user_answers
      .map((answer) => answer.question_index)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < effectiveTotal)
  )
  if (selectedOptions.length > 0) {
    answeredFromSession.add(currentQuestionIndex)
  }
  const answeredCount = Math.max(answeredQuestions.size, answeredFromSession.size)
  const showImmediateFeedback = session.mode === 'immediate' && submitted && lastAnswerResult !== null
  const requiredSelectionCount = Math.max(question.answer_selection_count ?? 1, 1)
  const correctAnswerSet = showImmediateFeedback
    ? lastAnswerResult?.correctAnswers ?? [lastAnswerResult?.correctAnswer ?? -1]
    : []

  return (
    <div className="flex h-screen flex-col bg-[#F9F9F7]">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuestionMapOpen(true)}
              className="h-10 w-10 rounded-xl bg-gray-50 text-[#5D7B6F] hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{session.categoryName}</p>
              <p className="text-sm font-black text-[#5D7B6F]">{session.courseCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <QuizTimer
              startedAt={session.started_at}
              pausedAt={session.paused_at}
              totalPausedDurationMs={session.total_paused_duration_ms}
              className="text-[#5D7B6F]"
            />
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400">Tiến độ</p>
              <p className="text-sm font-black text-[#5D7B6F]">
                {answeredCount}/{effectiveTotal}
              </p>
            </div>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#5D7B6F] transition-all duration-300"
            style={{ width: `${(answeredCount / effectiveTotal) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 pb-24">
          {/* Question Number */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">
              Câu {effectiveIndex + 1}/{effectiveTotal}
            </h2>
            <p className="text-xs font-bold text-gray-500">
              {requiredSelectionCount === 1
                ? 'Chọn 1 đáp án'
                : `Chọn ${requiredSelectionCount} đáp án`}
            </p>
          </div>

          {/* Question Text */}
          <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-900">
              {question.text}
            </p>

            {question.image_url && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={question.image_url}
                  alt="Minh họa câu hỏi"
                  className="h-auto w-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedOptions.includes(idx)
              const isCorrect = showImmediateFeedback && correctAnswerSet.includes(idx)
              const isWrongSelected = showImmediateFeedback && isSelected && !correctAnswerSet.includes(idx)

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={submitted}
                  className={cn(
                    'w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]',
                    isCorrect && 'border-green-500 bg-green-50',
                    isWrongSelected && 'border-red-500 bg-red-50',
                    !isCorrect && !isWrongSelected && isSelected && 'border-[#5D7B6F] bg-[#5D7B6F]/5',
                    !isCorrect && !isWrongSelected && !isSelected && 'border-gray-200 bg-white hover:border-[#A4C3A2]',
                    submitted && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black',
                        isCorrect && 'bg-green-500 text-white',
                        isWrongSelected && 'bg-red-500 text-white',
                        !isCorrect && !isWrongSelected && isSelected && 'bg-[#5D7B6F] text-white',
                        !isCorrect && !isWrongSelected && !isSelected && 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {String.fromCodePoint(65 + idx)}
                    </div>
                    <p
                      className={cn(
                        'flex-1 text-sm leading-relaxed',
                        isCorrect && 'font-bold text-green-700',
                        isWrongSelected && 'font-bold text-red-700',
                        !isCorrect && !isWrongSelected && isSelected && 'font-bold text-[#5D7B6F]',
                        !isCorrect && !isWrongSelected && !isSelected && 'text-gray-700'
                      )}
                    >
                      {option}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Immediate Feedback */}
          {session.mode === 'immediate' && (
            <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-400">
                Giải thích
              </h3>
              {showImmediateFeedback ? (
                <div className="flex items-start gap-3">
                  {lastAnswerResult?.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="mb-2 font-bold text-gray-900">
                      {lastAnswerResult?.isCorrect ? 'Bạn đã trả lời đúng!' : 'Bạn trả lời chưa đúng.'}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                      {lastAnswerResult?.explanation || 'Hệ thống chưa có phần giải thích cho câu này.'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-gray-500">
                  Chưa có giải thích. Sau khi nộp đáp án, nội dung giải thích sẽ hiển thị tại đây.
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 border-t-2 border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          {/* Back/Next buttons on the left */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleNavigate(effectiveIndex - 1)}
              disabled={effectiveIndex === 0}
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-gray-200 p-0 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              onClick={() => handleNavigate(effectiveIndex + 1)}
              disabled={effectiveIndex === effectiveTotal - 1}
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-gray-200 p-0 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Submit button on the right */}
          <Button
            onClick={handleSubmit}
            disabled={finalizeMutation.isPending}
            className="h-12 flex-1 rounded-xl bg-[#5D7B6F] font-bold uppercase tracking-wider text-white hover:bg-[#4a6358]"
          >
            {finalizeMutation.isPending ? 'Đang nộp...' : 'Nộp bài'}
          </Button>
        </div>
      </div>

      {/* Question Map Dialog */}
      <Dialog open={questionMapOpen} onOpenChange={setQuestionMapOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[80vh] rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-gray-200 px-6 py-4">
            <DialogTitle className="text-lg font-black text-[#5D7B6F]">Danh sách câu hỏi</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Đã trả lời: {answeredCount}/{effectiveTotal} câu
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] px-6 py-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: effectiveTotal }, (_, i) => {
                const isAnswered = answeredFromSession.has(i)
                const isCurrent = i === effectiveIndex

                return (
                  <button
                    key={i}
                    onClick={() => handleNavigate(i)}
                    className={cn(
                      'flex h-12 items-center justify-center rounded-xl font-bold transition-all active:scale-95',
                      isCurrent && 'ring-2 ring-[#5D7B6F] ring-offset-2',
                      isAnswered && !isCurrent && 'bg-[#5D7B6F] text-white',
                      !isAnswered && !isCurrent && 'border-2 border-gray-200 bg-white text-gray-600 hover:border-[#A4C3A2]'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl px-6 py-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black text-[#5D7B6F]">
              Xác nhận nộp bài
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm text-gray-600">
              Bạn đã làm {answeredCount}/{effectiveTotal} câu. Bạn có chắc chắn muốn nộp không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-3 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-xl border-2 py-6 font-bold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={submitMutation.isPending || finalizeMutation.isPending}
              className="flex-1 rounded-xl bg-[#5D7B6F] py-6 font-bold text-white hover:bg-[#4a6358]"
            >
              {finalizeMutation.isPending ? 'Đang nộp...' : 'Nộp bài'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl px-6 py-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black text-[#5D7B6F]">
              Quiz chưa hoàn thành
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm text-gray-600">
              Bạn đang ở câu {effectiveIndex + 1}/{effectiveTotal}, đã trả lời {answeredCount}/{effectiveTotal} câu.
              <br />
              Bạn có muốn thoát không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-3 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExitConfirmOpen(false)}
              className="flex-1 rounded-xl border-2 py-6 font-bold"
            >
              Ở lại
            </Button>
            <Button
              type="button"
              onClick={handleConfirmExitQuiz}
              className="flex-1 rounded-xl bg-[#5D7B6F] py-6 font-bold text-white hover:bg-[#4a6358]"
            >
              Thoát
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
