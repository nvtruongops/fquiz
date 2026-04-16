'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import QuizHeader from '@/components/quiz/QuizHeader'
import QuizSidebar from '@/components/quiz/QuizSidebar'
import { QuizTimer } from '@/components/QuizTimer'
import { useQuizSessionStore } from '@/store/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/useSubmitAnswer'
import { cn } from '@/lib/utils'
import { withCsrfHeaders } from '@/lib/csrf'

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

export default function QuizSessionPage() {
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
  const [isHydratedFromServer, setIsHydratedFromServer] = useState(false)
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null)
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<number, QuestionFeedback>>({})
  const [preloadedQuestions, setPreloadedQuestions] = useState<SessionQuestion[] | null>(null)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const lastSyncedQuestionIndexRef = useRef<number | null>(null)

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

    // Fire-and-forget API call to persist answer (no need to wait for response)
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

    // Auto-submit when user has selected the required number of answers
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

  function handleExitQuiz() {
    if (!activeData?.session || activeData.session.status === 'completed') {
      router.push(`/quiz/${quizId}`)
      return
    }
    setExitConfirmOpen(true)
  }

  function handleConfirmExitQuiz() {
    reportSessionActivity('pause')
    setExitConfirmOpen(false)
    router.push(`/quiz/${quizId}`)
  }

  // Show preloading screen with progress
  if (isPreloading || isInitialLoading || !isPreloadSuccess || !isInitialSuccess || (!activeData && isLoading)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-[#EAE7D6]/30 to-white font-sans">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#5D7B6F]/20" />
          <Loader2 className="relative h-12 w-12 animate-spin text-[#5D7B6F]" />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.25em] text-[#5D7B6F]">
          {isPreloading ? 'Đang tải bộ câu hỏi...' : 'Loading Exam Mode...'}
        </p>
        {isPreloading && (
          <div className="mt-4 w-64">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-[#5D7B6F] to-[#A4C3A2] transition-all duration-300 ease-out"
                style={{ width: `${preloadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">
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
      <div className="flex h-screen items-center justify-center bg-[#f3f3f3] font-sans">
        <div className="max-w-sm border-2 border-[#101010] bg-white p-6 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-[26px] font-bold text-[#111111]">Không thể tải bộ câu hỏi</h2>
          <p className="mt-2 text-[16px] text-[#444444]">
            Vui lòng kiểm tra kết nối mạng và thử lại
          </p>
          <Button
            type="button"
            onClick={() => router.push(`/quiz/${quizId}`)}
            className="mt-5 rounded-none border-2 border-[#101010] bg-[#efefef] text-[18px] font-semibold text-[#111111] hover:bg-white"
          >
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  if (isInitialError || isError || !activeData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f3f3] font-sans">
        <div className="max-w-sm border-2 border-[#101010] bg-white p-6 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-[26px] font-bold text-[#111111]">Lỗi phòng thi</h2>
          <p className="mt-2 text-[16px] text-[#444444]">{activeError?.message}</p>
          <Button
            type="button"
            onClick={() => router.back()}
            className="mt-5 rounded-none border-2 border-[#101010] bg-[#efefef] text-[18px] font-semibold text-[#111111] hover:bg-white"
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
      <div className="flex h-screen items-center justify-center bg-[#f3f3f3]">
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

  function handleNavigate(index: number) {
    if (!isHydratedFromServer) return
    if (index < 0 || index >= effectiveTotal) return
    navigateToQuestion(index)
  }

  return (
    <div className="quiz-scroll h-screen overflow-auto bg-[#ececec] font-sans">
      <div className="flex min-h-full min-w-[820px] flex-col">
        <QuizHeader
          categoryName={session.categoryName}
          courseCode={session.courseCode}
          totalQuestions={effectiveTotal}
          currentIndex={effectiveIndex}
          answeredCount={answeredCount}
        >
          <QuizTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            totalPausedDurationMs={session.total_paused_duration_ms}
            className="text-[#5D7B6F]"
          />
        </QuizHeader>

        <div className="flex min-h-0 flex-1">
          <QuizSidebar
            onSelectOption={handleSelectOption}
            onNavigate={(index) => {
              // Don't reset submitted state here - let useEffect handle it based on server data
              navigateToQuestion(index)
            }}
            onSubmit={handleSubmit}
            currentIndex={effectiveIndex}
            totalQuestions={effectiveTotal}
            selectedOptions={selectedOptions}
            optionCount={question.options.length}
            isSubmitted={submitted}
            isPending={submitMutation.isPending || finalizeMutation.isPending}
            answeredCount={answeredCount}
          />

          <main className="min-w-0 flex-1 border-l-2 border-[#101010] bg-[#ececec]">
            <div className="flex h-full flex-col">
              <section className="quiz-main-scale quiz-scroll border-b-2 border-[#101010] overflow-y-auto px-4 py-4 sm:px-6 sm:py-4">
                <p className="mb-2 text-[clamp(11px,0.2vw+10px,13px)] text-[#4f4f4f]">
                  {requiredSelectionCount === 1
                    ? '(Choose 1 answer)'
                    : `(Choose ${requiredSelectionCount} answers)`}
                </p>
                <div className="max-w-4xl border border-[#c7c7c7] bg-[#f5f5f5] px-[clamp(12px,1vw,20px)] py-[clamp(12px,1vw,20px)]">
                  <p className="text-[clamp(14px,0.4vw+12px,17px)] font-semibold leading-snug text-[#101010]">
                    Câu {effectiveIndex + 1}/{effectiveTotal}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[clamp(13px,0.45vw+11px,16px)] leading-relaxed text-[#101010]">
                    {question.text}
                  </p>

                  {question.image_url && (
                    <div className="mt-4 border border-[#d0d0d0] bg-white p-2">
                      <div className="flex min-h-[220px] max-h-[420px] w-full items-center justify-center overflow-hidden rounded-sm bg-[#fafafa]">
                        <img
                          src={question.image_url}
                          alt="Minh họa câu hỏi"
                          className="h-full max-h-[420px] w-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2.5">
                    {question.options.map((option, idx) => {
                      const isSelected = selectedOptions.includes(idx)
                      const isCorrect = showImmediateFeedback && correctAnswerSet.includes(idx)
                      const isWrongSelected = showImmediateFeedback && isSelected && !correctAnswerSet.includes(idx)
                      const optionKey = `${idx}-${option}`
                      // Only disable after submitted (not while API is pending - feedback already shown)
                      const isDisabled = submitted

                      return (
                        <button
                          key={optionKey}
                          onClick={() => !isDisabled && handleSelectOption(idx)}
                          disabled={isDisabled}
                          className={cn(
                            'w-full select-none px-3 py-2.5 text-left text-[clamp(13px,0.45vw+11px,16px)] leading-relaxed transition-all duration-200 rounded-md border-2',
                            isDisabled && 'cursor-not-allowed opacity-60',
                            !isDisabled && 'cursor-pointer hover:bg-gray-50',
                            isCorrect && 'border-green-500 bg-green-50 text-green-700 font-semibold',
                            isWrongSelected && 'border-red-500 bg-red-50 text-red-700 font-semibold',
                            // Selected but not yet submitted - neutral blue (not green to avoid confusion)
                            !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-blue-400 bg-blue-50 font-semibold text-blue-700',
                            // Selected after submitted but correct (already covered by isCorrect)
                            !isCorrect && !isWrongSelected && !isSelected && 'border-gray-300 bg-white text-[#202020]'
                          )}
                        >
                          <span className="font-semibold">{String.fromCodePoint(65 + idx)}.</span> {option}
                        </button>
                      )
                    })}
                  </div>

                </div>
              </section>

              {session.mode === 'immediate' && (
                <section className="quiz-main-scale quiz-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                  <h3 className="text-[clamp(18px,0.7vw+14px,24px)] font-bold leading-none text-[#101010]">Giải thích nếu có</h3>
                  <div className="mt-4 min-h-[140px] max-w-4xl border border-[#c7c7c7] bg-[#f5f5f5] p-[clamp(12px,1vw,20px)]">
                    {showImmediateFeedback ? (
                      <div className="flex items-start gap-3 text-[clamp(12px,0.35vw+11px,15px)] text-[#111111]">
                        {lastAnswerResult?.isCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                        ) : (
                          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                        )}
                        <div>
                          <p className="font-semibold">
                            {lastAnswerResult?.isCorrect ? 'Bạn đã trả lời đúng.' : 'Bạn trả lời chưa đúng.'}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                            {lastAnswerResult?.explanation || 'Hệ thống chưa có phần giải thích cho câu này.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[clamp(12px,0.35vw+11px,15px)] leading-relaxed text-[#4f4f4f]">
                        Chưa có giải thích. Sau khi nộp đáp án ở chế độ luyện tập, nội dung giải thích sẽ hiển thị tại đây.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md border-2 border-[#101010] bg-[#f3f3f3] p-5">
            <DialogHeader>
              <DialogTitle className="text-center text-[22px] font-bold text-[#101010]">Xác nhận nộp bài</DialogTitle>
              <DialogDescription className="pt-1 text-center text-[15px] text-[#3d3d3d]">
                Bạn đã làm {answeredCount}/{effectiveTotal} câu. Bạn có chắc chắn muốn nộp không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="rounded-none border-[#101010] bg-white px-6 text-[15px] font-semibold text-[#111111] hover:bg-[#efefef]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitMutation.isPending || finalizeMutation.isPending}
                className="rounded-none border border-[#101010] bg-[#efefef] px-6 text-[15px] font-semibold text-[#111111] hover:bg-white"
              >
                {finalizeMutation.isPending ? 'Đang nộp...' : 'OK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
          <DialogContent className="max-w-md border-2 border-[#101010] bg-[#f3f3f3] p-5">
            <DialogHeader>
              <DialogTitle className="text-center text-[22px] font-bold text-[#101010]">Quiz chưa hoàn thành</DialogTitle>
              <DialogDescription className="pt-1 text-center text-[15px] text-[#3d3d3d]">
                Bạn đang ở câu {effectiveIndex + 1}/{effectiveTotal}, đã trả lời {answeredCount}/{effectiveTotal} câu.
                <br />
                Bạn có muốn thoát không?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExitConfirmOpen(false)}
                className="rounded-none border-[#101010] bg-white px-6 text-[15px] font-semibold text-[#111111] hover:bg-[#efefef]"
              >
                Ở lại làm tiếp
              </Button>
              <Button
                type="button"
                onClick={handleConfirmExitQuiz}
                className="rounded-none border border-[#101010] bg-[#efefef] px-6 text-[15px] font-semibold text-[#111111] hover:bg-white"
              >
                Thoát
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
