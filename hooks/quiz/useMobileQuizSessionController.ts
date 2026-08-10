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
    try { navigator.vibrate(30) } catch (_vibErr) { /* ignore vibration error */ }
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

  const cardContainerRef = useRef<HTMLDivElement | null>(null)
  const touchCoordsRef = useRef({
    startX: 0,
    startY: 0,
    dx: 0,
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
    touchCoordsRef.current = { startX: 0, startY: 0, dx: 0, isDragging: false }
    if (cardContainerRef.current) {
      cardContainerRef.current.style.transform = ''
      cardContainerRef.current.style.transition = 'transform 0.2s ease-out'
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
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

  const rafRef = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    touchCoordsRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      dx: 0,
      isDragging: true,
    }
    if (cardContainerRef.current) {
      cardContainerRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchCoordsRef.current.isDragging || e.touches.length !== 1) return
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const dx = currentX - touchCoordsRef.current.startX
    const dy = currentY - touchCoordsRef.current.startY

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      touchCoordsRef.current.dx = dx
      if (rafRef.current !== null) return

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (cardContainerRef.current) {
          cardContainerRef.current.style.transform = `translate3d(${touchCoordsRef.current.dx}px, 0, 0)`
        }
      })
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchCoordsRef.current.isDragging) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const { dx } = touchCoordsRef.current
    touchCoordsRef.current.isDragging = false
    const threshold = 50
    const effectiveTotal = activeData?.session?.totalQuestions || 0

    if (cardContainerRef.current) {
      cardContainerRef.current.style.transition = 'transform 0.2s ease-out'
      cardContainerRef.current.style.transform = ''
    }

    if (dx < -threshold && currentQuestionIndex < effectiveTotal - 1) {
      triggerVibration()
      handleNavigate(currentQuestionIndex + 1)
    } else if (dx > threshold && currentQuestionIndex > 0) {
      triggerVibration()
      handleNavigate(currentQuestionIndex - 1)
    }
  }, [activeData?.session?.totalQuestions, currentQuestionIndex, handleNavigate])

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
    cardContainerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleSubmit,
    handleConfirmSubmit,
    handleConfirmExitQuiz,
    handleNavigate,
  }
}
