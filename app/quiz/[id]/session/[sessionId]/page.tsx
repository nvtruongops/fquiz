'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/quiz/useSubmitAnswer'
import QuizSessionMobilePage from '@/app/quiz/[id]/session/[sessionId]/mobile/page'
import { QuizLoadingOverlay, useSessionLoader } from '@/components/quiz/shared/QuizLoader'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'
import { SessionData, PreloadedQuestions, QuestionFeedback, SessionQuestion } from '@/lib/modules/quiz/types/session'
import { computeQuestionFeedback } from '@/lib/modules/quiz/feedback-utils'

// Sub-components
import { SessionLayout } from '@/components/quiz/session/SessionLayout'
import { QuestionDisplay } from '@/components/quiz/session/QuestionDisplay'
import { SessionModals } from '@/components/quiz/session/SessionModals'

import { fetchSession, fetchAllQuestions, type SessionApiError } from '@/lib/modules/quiz/session-api'

export default function QuizSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const quizId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const sessionId = Array.isArray(params?.sessionId) ? params.sessionId[0] : params?.sessionId
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''
  const router = useRouter()

  // Early redirect for invalid session IDs
  useEffect(() => {
    if (!resolvedSessionId || resolvedSessionId === 'undefined') {
      if (resolvedQuizId) router.replace(`/quiz/${resolvedQuizId}`)
      else router.replace('/explore')
    }
  }, [resolvedSessionId, resolvedQuizId, router])

  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Avoid rendering heavy desktop hooks on mobile — the mobile page
  // runs its own independent set of queries and effects.
  if (isMobile === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F7]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5D7B6F] border-t-transparent" />
      </div>
    )
  }

  if (isMobile) return <QuizSessionMobilePage />

  return (
    <DesktopSessionContent
      quizId={quizId ?? ''}
      sessionId={sessionId ?? ''}
      resolvedQuizId={resolvedQuizId}
      resolvedSessionId={resolvedSessionId}
      setIsMobile={setIsMobile}
    />
  )
}

function DesktopSessionContent({
  quizId,
  sessionId,
  resolvedQuizId,
  resolvedSessionId,
  setIsMobile,
}: {
  quizId: string
  sessionId: string
  resolvedQuizId: string
  resolvedSessionId: string
  setIsMobile: (v: boolean) => void
}) {
  const router = useRouter()
  const { toast } = useToast()

  const {
    currentQuestionIndex,
    answeredQuestions,
    lastAnswerResult,
    resumeSession,
    navigateToQuestion,
    setLastAnswerResult,
  } = useQuizSessionStore()

  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [isHydratedFromServer, setIsHydratedFromServer] = useState(false)
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null)
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<number, QuestionFeedback>>({})
  const [preloadedQuestions, setPreloadedQuestions] = useState<SessionQuestion[] | null>(null)
  const sessionLoader = useSessionLoader()
  const lastSyncedQuestionIndexRef = useRef<number | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isReadyToRender = isHydratedFromServer && hydratedSessionId === resolvedSessionId

  useEffect(() => {
    setIsHydratedFromServer(false)
    setHydratedSessionId(null)
    setSelectedOptions([])
    setSubmitted(false)
    submittedRef.current = false
    lastSyncedQuestionIndexRef.current = null
    setFeedbackByQuestion({})
  }, [resolvedSessionId])

  const reportSessionActivity = useCallback((event: 'pause' | 'resume') => {
    if (!sessionId || sessionId === 'undefined') return
    const payload = JSON.stringify({ event, current_question_index: currentQuestionIndex })
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/activity`
    void fetch(url, {
      method: 'POST',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: payload,
      keepalive: true,
    })
  }, [sessionId, currentQuestionIndex])

  const {
    data: initialData,
    isLoading: isInitialLoading,
    isFetching: isInitialFetching,
    isError: isInitialError,
    error: initialError,
  } = useQuery<SessionData, Error>({
    queryKey: ['sessions', resolvedSessionId, 'initial'],
    queryFn: () => fetchSession(resolvedSessionId),
    enabled: resolvedSessionId.length > 0 && resolvedSessionId !== 'undefined',
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const data = query.state.data as SessionData | undefined
      if (data?.session.status === 'preparing') return 2000 // Check every 2s
      return false
    }
  })


  const {
    data: preloadData,
    isLoading: isPreloading,
    isError: isPreloadError,
  } = useQuery<PreloadedQuestions, Error>({
    queryKey: ['sessions', resolvedSessionId, 'all-questions'],
    queryFn: async () => {
      try {
        const cached = sessionStorage.getItem(`session_preload_${resolvedSessionId}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.questions?.length > 0) {
            sessionStorage.removeItem(`session_preload_${resolvedSessionId}`)
            return parsed as PreloadedQuestions
          }
        }
      } catch {}
      return fetchAllQuestions(resolvedSessionId)
    },
    enabled: resolvedSessionId.length > 0 &&
             resolvedSessionId !== 'undefined',
    staleTime: Infinity,
  })

  useEffect(() => {
    if (preloadData?.questions) setPreloadedQuestions(preloadData.questions)
  }, [preloadData])

  const clampedQuestionIndex = Math.min(
    Math.max(currentQuestionIndex, 0),
    Math.max((initialData?.session.totalQuestions ?? 1) - 1, 0)
  )

  const currentQuestion = preloadedQuestions?.[clampedQuestionIndex]

  const activeData: SessionData | undefined = initialData && currentQuestion ? {
    session: initialData.session,
    question: currentQuestion,
  } : initialData

  useEffect(() => {
    const err = initialError as SessionApiError | undefined
    if (!quizId || !err) return
    if (err.code !== 'SESSION_EXPIRED' && err.status !== 410) return
    router.replace(`/quiz/${quizId}?reason=session_expired`)
  }, [initialError, quizId, router])

  useEffect(() => {
    // Wait until server data is settled (not mid-refetch) before hydrating the store.
    // This prevents stale cached data from overwriting the store on remount within the
    // staleTime window — refetchOnMount ensures a background refetch, and isInitialFetching
    // blocks hydration until that refetch settles.
    if (!initialData || isHydratedFromServer || isInitialFetching) return
    const serverAnsweredSet = new Set<number>(
      initialData.session.user_answers.map((a) => a.question_index)
    )
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
  }, [initialData, isHydratedFromServer, isInitialFetching, resolvedQuizId, resolvedSessionId, resumeSession])

  useEffect(() => {
    if (!activeData?.session) return
    const previousQuestionIndex = lastSyncedQuestionIndexRef.current
    const isSameQuestionRender = previousQuestionIndex === currentQuestionIndex
    const existing = activeData.session.user_answers.find((a) => a.question_index === currentQuestionIndex)
    if (existing) {
      const restored = existing.answer_indexes && existing.answer_indexes.length > 0
        ? existing.answer_indexes : [existing.answer_index]
      setSelectedOptions(restored)
      setSubmitted(activeData.session.mode === 'immediate')
      submittedRef.current = activeData.session.mode === 'immediate'
      if (activeData.session.mode === 'immediate') {
        let feedback = feedbackByQuestion[currentQuestionIndex]
        if (!feedback && currentQuestion?.correct_answer !== undefined) {
          const correctAnswerIndexes = Array.isArray(currentQuestion.correct_answer)
            ? currentQuestion.correct_answer : [currentQuestion.correct_answer]
          feedback = {
            isCorrect: existing.is_correct,
            correctAnswer: correctAnswerIndexes[0],
            correctAnswers: correctAnswerIndexes,
            explanation: currentQuestion.explanation,
          }
          setFeedbackByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: feedback! }))
        }
        setLastAnswerResult(feedback ?? null)
      }
      lastSyncedQuestionIndexRef.current = currentQuestionIndex
    } else {
      const localFeedback = activeData.session.mode === 'immediate' ? feedbackByQuestion[currentQuestionIndex] : undefined
      if (localFeedback) {
        setSubmitted(true)
        submittedRef.current = true
        setLastAnswerResult(localFeedback)
        lastSyncedQuestionIndexRef.current = currentQuestionIndex
        return
      }
      if (isSameQuestionRender) return
      setSelectedOptions([])
      setSubmitted(false)
      submittedRef.current = false
      setLastAnswerResult(null)
      lastSyncedQuestionIndexRef.current = currentQuestionIndex
    }
  }, [activeData?.session, currentQuestionIndex, feedbackByQuestion, currentQuestion, setLastAnswerResult])

  useEffect(() => {
    if (!sessionId || sessionId === 'undefined') return
    reportSessionActivity('resume')
  }, [sessionId, reportSessionActivity])

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
    const handlePageHide = () => reportSessionActivity('pause')
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') reportSessionActivity('pause')
      else if (document.visibilityState === 'visible') reportSessionActivity('resume')
    }
    globalThis.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      globalThis.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [shouldWarnBeforeLeave, sessionId, currentQuestionIndex, reportSessionActivity])

  const { mutate: submitAnswer, isPending: isSubmitting } = useSubmitAnswer(resolvedSessionId)
  const finalizeMutation = useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error>({
    mutationFn: async () => {
      // Show loading overlay when submitting
      sessionLoader.open('Đang nộp bài và chấm điểm...')
      sessionLoader.advance(50, 'Đang phân tích kết quả...')

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) {
        if (res.status === 401) {
          const currentUrl = window.location.pathname + window.location.search
          window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
          throw new Error('Session expired. Redirecting to login...')
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Không thể nộp bài')
      }
      
      sessionLoader.advance(95, 'Đang chuẩn bị bảng kết quả...')
      return res.json()
    },
    onSuccess: (data) => {
      sessionLoader.complete()
      setTimeout(() => router.push(`/quiz/${quizId}/result/${sessionId}`), 300)
    },
    onError: (err) => {
      sessionLoader.close()
      // ... toast error handled elsewhere or can be added here
    }
  })

  function submitInImmediateMode(answerIndexes: number[]) {
    if (!activeData?.session || submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)

    // Compute feedback locally from preloaded questions when possible (best-effort:
    // only works when sessionStorage seeded the data with correct_answer included).
    const questionData = preloadedQuestions?.[currentQuestionIndex]
    const feedback = computeQuestionFeedback(
      questionData?.correct_answer,
      answerIndexes,
      questionData?.explanation,
    )
    if (feedback) {
      setFeedbackByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: feedback }))
      setLastAnswerResult(feedback)
    }

    // Fire API call to persist answer. The onSuccess populates feedbackByQuestion
    // from the server response so that navigating back to this question later
    // restores the correct feedback display (preloaded data strips correct_answer
    // for unanswered questions, so the client-side computation above is a best-effort
    // optimization that only fires when sessionStorage seeded the data).
    submitAnswer({ questionIndex: currentQuestionIndex, answerIndexes }, {
      onSuccess: (data) => {
        if ('isCorrect' in data) {
          setFeedbackByQuestion((prev) => ({
            ...prev,
            [currentQuestionIndex]: {
              isCorrect: data.isCorrect,
              correctAnswer: data.correctAnswer,
              correctAnswers: data.correctAnswers ?? [data.correctAnswer],
              explanation: data.explanation,
            },
          }))
        }
      },
      onError: () => {
        submittedRef.current = false
        setSubmitted(false)
      },
    })
  }

  const handleSelectOption = useCallback((idx: number) => {
    if (!activeData?.session || submitted || isSubmitting) return
    const required = Math.max(activeData.question.answer_selection_count ?? 1, 1)
    const exists = selectedOptions.includes(idx)
    let nextSelections: number[]
    if (required === 1 && activeData.session.mode === 'review') nextSelections = [idx]
    else if (exists) nextSelections = selectedOptions.filter((v) => v !== idx)
    else if (selectedOptions.length >= required) nextSelections = selectedOptions
    else nextSelections = [...selectedOptions, idx].sort((a, b) => a - b)

    if (JSON.stringify(nextSelections) === JSON.stringify(selectedOptions)) return
    setSelectedOptions(nextSelections)
    if (nextSelections.length === required) {
      if (activeData.session.mode === 'immediate') submitInImmediateMode(nextSelections)
      else submitAnswer({ questionIndex: currentQuestionIndex, answerIndexes: nextSelections })
    }
  }, [activeData?.session, activeData?.question, submitted, isSubmitting, selectedOptions, currentQuestionIndex, submitAnswer])

  // Stable callbacks for React.memo-wrapped children. setState dispatchers are
  // referentially stable across renders, so these useCallback wrappers create
  // function references that never change.
  const handleSubmit = useCallback(() => setConfirmOpen(true), [])
  const handleExit = useCallback(() => setExitConfirmOpen(true), [])

  if (isPreloadError || isInitialError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f3f3] font-sans">
        <div className="max-w-sm border-2 border-[#101010] bg-white p-6 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-[26px] font-bold text-[#111111]">Lỗi phòng thi</h2>
          <p className="mt-2 text-[16px] text-[#444444]">
            {((initialError || preloadData) as any)?.message || 'Không thể tải dữ liệu'}
          </p>
          <Button type="button" onClick={() => router.back()} className="mt-5 rounded-none border-2 border-[#101010] bg-[#efefef] text-[18px] font-semibold text-[#111111] hover:bg-white">Quay lại</Button>
        </div>
      </div>
    )
  }

  const isStillLoading = isPreloading || isInitialLoading || !isReadyToRender || !activeData || activeData.session.status === 'preparing'

  if (isStillLoading) {
    const statusMessage = activeData?.session.status === 'preparing'
      ? 'Đang trộn bộ đề, vui lòng chờ trong giây lát...'
      : (!isReadyToRender ? 'Sẵn sàng...' : 'Đang tải bộ câu hỏi...')
    const progressValue = activeData?.session.status === 'preparing'
      ? 45
      : (!isReadyToRender ? 95 : 60)
    return <QuizLoadingOverlay isOpen={true} progress={progressValue} status={statusMessage} />
  }

  const { session, question } = activeData
  const answeredCount = Math.max(answeredQuestions.size, new Set(session.user_answers.map(a => a.question_index)).size + (selectedOptions.length > 0 ? 1 : 0))

  return (
    <>
      <QuizLoadingOverlay 
        isOpen={sessionLoader.isOpen} 
        progress={sessionLoader.progress} 
        status={sessionLoader.status} 
      />
      <SessionLayout
      sessionData={activeData}
      currentQuestionIndex={currentQuestionIndex}
      answeredCount={answeredCount}
      selectedOptions={selectedOptions}
      submitted={submitted}
      isPending={isSubmitting || finalizeMutation.isPending}
      onSelectOption={handleSelectOption}
      onNavigate={navigateToQuestion}
      onSubmit={handleSubmit}
      onExit={handleExit}
    >
      <QuestionDisplay
        question={question}
        currentIndex={currentQuestionIndex}
        totalQuestions={session.totalQuestions}
        selectedOptions={selectedOptions}
        submitted={submitted}
        showImmediateFeedback={session.mode === 'immediate' && submitted && lastAnswerResult !== null}
        lastAnswerResult={lastAnswerResult}
        onSelectOption={handleSelectOption}
        isPending={isSubmitting || finalizeMutation.isPending}
        sessionMode={session.mode}
      />
      <SessionModals
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        exitConfirmOpen={exitConfirmOpen}
        setExitConfirmOpen={setExitConfirmOpen}
        answeredCount={answeredCount}
        totalQuestions={session.totalQuestions}
        isPending={finalizeMutation.isPending}
        onConfirmSubmit={() => { setConfirmOpen(false); finalizeMutation.mutate(); }}
        onConfirmExit={() => { setExitConfirmOpen(false); reportSessionActivity('pause'); router.push(session.is_temp ? '/explore' : `/quiz/${resolvedQuizId}`); }}
      />
    </SessionLayout>
  </>
)
}

// Note: QuizSessionPage (above) handles isMobile detection and delegates to
// either QuizSessionMobilePage or DesktopSessionContent. DesktopSessionContent
// only mounts on desktop, avoiding wasted hooks/network calls on mobile.

