'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/quiz/useSubmitAnswer'
import { useQuizSessionQueries } from '@/hooks/quiz/useQuizSessionQueries'
import { useSessionAnswerSync } from '@/hooks/quiz/useSessionAnswerSync'
import { useSessionActivityTracking } from '@/hooks/quiz/useSessionActivityTracking'
import { useSessionHydration } from '@/hooks/quiz/useSessionHydration'
import { useSessionFinalize } from '@/hooks/quiz/useSessionFinalize'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'
import { useSessionLoader, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'

function triggerVibration() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(30) } catch {}
  }
}

export function useMobileQuizSessionController() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''
  const router = useRouter()

  const storeSessionId = useQuizSessionStore((s) => s.sessionId)
  const currentQuestionIndex = useQuizSessionStore((s) => s.currentQuestionIndex)
  const answeredQuestions = useQuizSessionStore((s) => s.answeredQuestions)
  const lastAnswerResult = useQuizSessionStore((s) => s.lastAnswerResult)
  const navigateToQuestion = useQuizSessionStore((s) => s.navigateToQuestion)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [questionMapOpen, setQuestionMapOpen] = useState(false)
  const sessionLoader = useSessionLoader()

  const {
    initialData,
    isInitialLoading,
    isInitialFetching,
    isInitialError,
    initialError,
    activeData,
    currentQuestion,
    preloadedQuestions,
    isPreloading,
    isPreloadError,
  } = useQuizSessionQueries(resolvedSessionId, currentQuestionIndex)

  const { isReadyToRender, isHydratedFromServer } = useSessionHydration({
    resolvedSessionId,
    resolvedQuizId,
    quizId: resolvedQuizId,
    sessionId: resolvedSessionId,
    initialData,
    isInitialFetching,
    initialError,
  })

  const { finalizeMutation } = useSessionFinalize({
    sessionId: resolvedSessionId,
    quizId: resolvedQuizId,
  })

  const submitMutation = useSubmitAnswer(resolvedSessionId)

  const {
    selectedOptions,
    setSelectedOptions,
    submitted,
    feedbackByQuestion,
    handleSelectOption,
  } = useSessionAnswerSync({
    activeData,
    currentQuestionIndex,
    currentQuestion,
    preloadedQuestions,
    submitAnswer: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
  })

  const {
    exitConfirmOpen,
    setExitConfirmOpen,
    reportSessionActivity,
    inactivityPauseOpen,
    setInactivityPauseOpen,
    handleResumeInactivity,
    markExiting,
  } = useSessionActivityTracking({
    sessionId: resolvedSessionId,
    currentQuestionIndex,
    activeData,
    resolvedQuizId,
  })

  const courseCode = activeData?.session?.courseCode
  const { pinnedQuestions, togglePinMutation } = usePinnedQuestions(courseCode)
  const [isRightHanded, setIsRightHanded] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fquiz_mobile_handedness')
      if (saved === 'right') {
        setIsRightHanded(true)
      }
    }
  }, [])

  const toggleHandedness = useCallback(() => {
    setIsRightHanded((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('fquiz_mobile_handedness', next ? 'right' : 'left')
      }
      return next
    })
  }, [])

  const sessionLoaderStartedRef = useRef(false)

  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    offsetX: 0,
    isDragging: false,
  })

  useEffect(() => {
    if (!sessionLoaderStartedRef.current) {
      sessionLoaderStartedRef.current = true
      if (!isQuizLoaderActive()) {
        sessionLoader.open('Đang tải bộ câu hỏi...')
      }
    }
  }, [sessionLoader])

  const isStillLoading = isPreloading || isInitialLoading || !isReadyToRender || !activeData || activeData?.session.status === 'preparing'

  useEffect(() => {
    if (!sessionLoaderStartedRef.current || !sessionLoader.isOpen) return
    if (isInitialError) {
      sessionLoader.close()
    } else if (activeData?.session.status === 'preparing') {
      sessionLoader.setStatus('Đang trộn bộ đề, vui lòng chờ trong giây lát...')
    } else if (!isReadyToRender) {
      sessionLoader.setStatus('Đang chuẩn bị giao diện...')
    } else if (!isStillLoading) {
      sessionLoader.complete()
    }
  }, [isStillLoading, isReadyToRender, isInitialError, activeData?.session.status, sessionLoader])

  useEffect(() => {
    setTouchState({ startX: 0, startY: 0, offsetX: 0, isDragging: false })
  }, [currentQuestionIndex])

  const handleSubmit = useCallback(() => {
    if (!activeData?.session) return
    setConfirmOpen(true)
  }, [activeData?.session])

  const handleConfirmSubmit = useCallback(() => {
    if (!activeData?.session || finalizeMutation.isPending || submitMutation.isPending) {
      setConfirmOpen(false)
      return
    }

    setConfirmOpen(false)
    sessionLoader.open('Đang nộp bài và tổng hợp kết quả...')
    finalizeMutation.mutate()
  }, [activeData?.session, finalizeMutation, submitMutation.isPending, sessionLoader])

  const handleConfirmExitQuiz = useCallback(() => {
    markExiting()
    void reportSessionActivity('pause')
    setExitConfirmOpen(false)
    sessionLoader.open('Đang lưu tiến trình và thoát phòng thi...')
    const targetQuizId = (activeData?.session as any)?.quiz_id || (activeData?.session as any)?.quizId || resolvedQuizId
    const targetUrl = activeData?.session?.is_temp || !targetQuizId || targetQuizId === 'undefined' ? '/' : `/quiz/${targetQuizId}`
    sessionLoader.completeAndNavigate(() => {
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl
      } else {
        router.push(targetUrl)
      }
    })
  }, [markExiting, reportSessionActivity, setExitConfirmOpen, sessionLoader, activeData?.session, resolvedQuizId, router])

  const handleNavigate = useCallback((index: number) => {
    if (!isHydratedFromServer) return
    const effectiveTotal = activeData?.session.totalQuestions || 0
    if (index < 0 || index >= effectiveTotal) return
    
    navigateToQuestion(index)
    setQuestionMapOpen(false)
  }, [isHydratedFromServer, activeData?.session.totalQuestions, navigateToQuestion])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    setTouchState({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      offsetX: 0,
      isDragging: true,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.isDragging || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - touchState.startX
    const dy = e.touches[0].clientY - touchState.startY

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setTouchState((prev) => ({
        ...prev,
        offsetX: dx,
      }))
    }
  }

  const handleTouchEnd = () => {
    if (!touchState.isDragging) return
    const { offsetX } = touchState
    const threshold = 50
    const effectiveTotal = activeData?.session?.totalQuestions || 0

    if (offsetX < -threshold && currentQuestionIndex < effectiveTotal - 1) {
      triggerVibration()
      handleNavigate(currentQuestionIndex + 1)
    } else if (offsetX > threshold && currentQuestionIndex > 0) {
      triggerVibration()
      handleNavigate(currentQuestionIndex - 1)
    }

    setTouchState({ startX: 0, startY: 0, offsetX: 0, isDragging: false })
  }

  return {
    resolvedQuizId,
    resolvedSessionId,
    router,
    sessionLoader,
    storeSessionId,
    currentQuestionIndex,
    answeredQuestions,
    lastAnswerResult,
    confirmOpen,
    setConfirmOpen,
    questionMapOpen,
    setQuestionMapOpen,
    initialError,
    isInitialError,
    isPreloadError,
    activeData,
    isStillLoading,
    isHydratedFromServer,
    finalizeMutation,
    submitMutation,
    selectedOptions,
    submitted,
    feedbackByQuestion,
    handleSelectOption,
    exitConfirmOpen,
    setExitConfirmOpen,
    inactivityPauseOpen,
    handleResumeInactivity,
    pinnedQuestions,
    togglePinMutation,
    isRightHanded,
    toggleHandedness,
    touchState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleSubmit,
    handleConfirmSubmit,
    handleConfirmExitQuiz,
    handleNavigate,
  }
}
