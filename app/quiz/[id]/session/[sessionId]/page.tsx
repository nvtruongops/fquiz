'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuizSessionStore } from '@/store/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/useSubmitAnswer'
import QuizSessionMobilePage from './mobile/page'
import { QuizLoadingOverlay, useSessionLoader } from '@/components/quiz/QuizLoader'
import { withCsrfHeaders } from '@/lib/csrf'
import { SessionData, PreloadedQuestions, QuestionFeedback, SessionQuestion } from '@/types/session'

// Sub-components
import { SessionLayout } from '@/components/quiz/session/SessionLayout'
import { QuestionDisplay } from '@/components/quiz/session/QuestionDisplay'
import { SessionModals } from '@/components/quiz/session/SessionModals'

type SessionApiError = Error & {
  status?: number
  code?: string
}

async function fetchSession(sessionId: string): Promise<SessionData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}`)
  if (!res.ok) {
    if (res.status === 401) {
      const currentUrl = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
      throw new Error('Session expired. Redirecting to login...')
    }
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
    if (res.status === 401) {
      const currentUrl = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}&reason=session_expired`
      throw new Error('Session expired. Redirecting to login...')
    }
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
  const quizId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const sessionId = Array.isArray(params?.sessionId) ? params.sessionId[0] : params?.sessionId
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''
  const router = useRouter()

  useEffect(() => {
    if (!resolvedSessionId || resolvedSessionId === 'undefined') {
      if (resolvedQuizId) router.replace(`/quiz/${resolvedQuizId}`)
      else router.replace('/explore')
    }
  }, [resolvedSessionId, resolvedQuizId, router])

  const {
    currentQuestionIndex,
    answeredQuestions,
    lastAnswerResult,
    resumeSession,
    navigateToQuestion,
    setLastAnswerResult,
  } = useQuizSessionStore()

  const [isMobile, setIsMobile] = useState(false)
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
  const sessionLoaderStartedRef = useRef(false)
  const lastSyncedQuestionIndexRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sessionLoaderStartedRef.current) {
      sessionLoaderStartedRef.current = true
      sessionLoader.open('Đang tải bộ câu hỏi...')
    }
  }, [sessionLoader])

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
    data: preloadData,
    isLoading: isPreloading,
    isError: isPreloadError,
    isSuccess: isPreloadSuccess,
  } = useQuery<PreloadedQuestions, Error>({
    queryKey: ['sessions', resolvedSessionId, 'all-questions'],
    queryFn: async () => {
      try {
        const cached = sessionStorage.getItem(`session_preload_${resolvedSessionId}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.questions?.length > 0) {
            sessionStorage.removeItem(`session_preload_${resolvedSessionId}`)
            sessionLoader.complete()
            return parsed as PreloadedQuestions
          }
        }
      } catch {}
      sessionLoader.setStatus('Đang tải bộ câu hỏi...')
      const data = await fetchAllQuestions(resolvedSessionId)
      sessionLoader.advance(85, 'Đang xử lý câu hỏi...')
      return data
    },
    enabled: resolvedSessionId.length > 0 && resolvedSessionId !== 'undefined',
    staleTime: Infinity,
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
    enabled: resolvedSessionId.length > 0 && resolvedSessionId !== 'undefined',
    staleTime: 0,
    refetchOnMount: 'always',
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
    if (!initialData || isHydratedFromServer) return
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
  }, [initialData, isHydratedFromServer, resolvedQuizId, resolvedSessionId, resumeSession])

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

  const submitMutation = useSubmitAnswer(resolvedSessionId)
  const finalizeMutation = useMutation<{ completed: boolean; score: number; totalQuestions: number }, Error>({
    mutationFn: async () => {
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
      return res.json()
    },
    onSuccess: () => router.push(`/quiz/${quizId}/result/${sessionId}`),
  })

  function submitInImmediateMode(answerIndexes: number[]) {
    if (!activeData?.session || submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    if (currentQuestion?.correct_answer !== undefined) {
      const correctAnswerIndexes = Array.isArray(currentQuestion.correct_answer)
        ? [...new Set(currentQuestion.correct_answer)].sort((a, b) => a - b)
        : [currentQuestion.correct_answer as number]
      const submittedSorted = [...new Set(answerIndexes)].sort((a, b) => a - b)
      const isCorrect = submittedSorted.length === correctAnswerIndexes.length && submittedSorted.every((v, i) => v === correctAnswerIndexes[i])
      const feedback: QuestionFeedback = {
        isCorrect,
        correctAnswer: correctAnswerIndexes[0],
        correctAnswers: correctAnswerIndexes,
        explanation: currentQuestion.explanation,
      }
      setFeedbackByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: feedback }))
      setLastAnswerResult(feedback)
    }
    submitMutation.mutate({ questionIndex: currentQuestionIndex, answerIndexes }, {
      onError: () => {
        submittedRef.current = false
        setSubmitted(false)
      },
    })
  }

  function handleSelectOption(idx: number) {
    if (!activeData?.session || submitted || submitMutation.isPending) return
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
      else submitMutation.mutate({ questionIndex: currentQuestionIndex, answerIndexes: nextSelections })
    }
  }

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

  if (isPreloading || isInitialLoading || !activeData) {
    return <QuizLoadingOverlay isOpen={true} progress={sessionLoader.progress} status={sessionLoader.status || 'Đang tải bộ câu hỏi...'} />
  }

  if (isMobile) return <QuizSessionMobilePage />
  if (!isReadyToRender) return <QuizLoadingOverlay isOpen={true} progress={95} status="Sẵn sàng..." />

  const { session, question } = activeData
  const answeredCount = Math.max(answeredQuestions.size, new Set(session.user_answers.map(a => a.question_index)).size + (selectedOptions.length > 0 ? 1 : 0))

  return (
    <SessionLayout
      sessionData={activeData}
      currentQuestionIndex={currentQuestionIndex}
      answeredCount={answeredCount}
      selectedOptions={selectedOptions}
      submitted={submitted}
      isPending={submitMutation.isPending || finalizeMutation.isPending}
      onSelectOption={handleSelectOption}
      onNavigate={navigateToQuestion}
      onSubmit={() => setConfirmOpen(true)}
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
        isPending={submitMutation.isPending || finalizeMutation.isPending}
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
  )
}
