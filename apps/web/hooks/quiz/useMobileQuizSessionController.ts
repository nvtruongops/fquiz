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
import { useExamTabLease } from '@/hooks/quiz/useExamTabLease'
import { getSessionSubmitAvailability, isQuestionNavigationReady, isSessionQuestionReady } from '@/hooks/quiz/session-rendering'

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
  const sessionLoader = useSessionLoader(true)

  const {
    initialData,
    isInitialLoading,
    isInitialFetching,
    isInitialError,
    initialError,
    refetchInitial,
    activeData,
    currentQuestion,
    preloadedQuestions,
    isPreloadError,
    preloadError,
    refetchPreload,
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

  const { isReadOnlyTab, takeOverLease, canWrite } = useExamTabLease(resolvedSessionId)
  const submitMutation = useSubmitAnswer(resolvedSessionId, canWrite)

  const {
    selectedOptions,
    submitted,
    handleSelectOption,
    saveStatus,
    retryFailedAnswer,
    hasUnsavedAnswers,
    acknowledgedQuestions,
  } = useSessionAnswerSync({
    activeData,
    currentQuestionIndex,
    currentQuestion,
    preloadedQuestions,
    submitAnswer: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    canWrite,
  })

  const canFinalize = useCallback(() => canWrite() && !submitMutation.isPending && !hasUnsavedAnswers(), [canWrite, submitMutation.isPending, hasUnsavedAnswers])
  const { finalizeMutation } = useSessionFinalize({ sessionId: resolvedSessionId, quizId: resolvedQuizId, canFinalize })
  const submitAvailability = getSessionSubmitAvailability({
    isReadOnlyTab,
    isAnswerSavePending: submitMutation.isPending,
    hasUnsavedAnswers: hasUnsavedAnswers(),
    isFinalizing: finalizeMutation.isPending,
  })
  const submitDisabled = submitAvailability.submitActionDisabled

  const {
    exitConfirmOpen,
    setExitConfirmOpen,
    reportSessionActivity,
    inactivityPauseOpen,
    handleResumeInactivity,
    markExiting,
  } = useSessionActivityTracking({
    sessionId: resolvedSessionId,
    currentQuestionIndex,
    activeData,
    resolvedQuizId,
    canWrite,
  })

  const courseCode = activeData?.session?.courseCode
  const { pinnedQuestions, togglePinMutation } = usePinnedQuestions(courseCode, {
    enabled: Boolean(courseCode),
  })
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
        sessionLoader.open('Loading question set...')
      }
    }
  }, [sessionLoader])

  const isStillLoading = !isSessionQuestionReady({
    isInitialLoading,
    isReadyToRender,
    sessionStatus: activeData?.session.status,
  })

  useEffect(() => {
    if (!sessionLoaderStartedRef.current || !sessionLoader.isOpen) return
    if (isInitialError) {
      sessionLoader.close()
    } else if (activeData?.session.status === 'preparing') {
      sessionLoader.setStatus('Shuffling questions, please wait a moment...')
    } else if (!isReadyToRender) {
      sessionLoader.setStatus('Preparing interface...')
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
    if (!activeData?.session || submitDisabled) return
    setConfirmOpen(true)
  }, [activeData?.session, submitDisabled])

  const handleConfirmSubmit = useCallback(() => {
    if (!activeData?.session || finalizeMutation.isPending || !canFinalize()) return

    setConfirmOpen(false)
    finalizeMutation.mutate()
  }, [activeData?.session, finalizeMutation, canFinalize])

  const handleConfirmExitQuiz = useCallback(() => {
    markExiting()
    void reportSessionActivity('pause')
    setExitConfirmOpen(false)
    sessionLoader.open('Saving progress and exiting exam session...')
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

  const canNavigateQuestions = isQuestionNavigationReady(
    preloadedQuestions?.length,
    activeData?.session.totalQuestions ?? 0,
  )

  const handleNavigate = useCallback((index: number) => {
    if (!isHydratedFromServer || !canNavigateQuestions) return
    const effectiveTotal = activeData?.session.totalQuestions || 0
    if (index < 0 || index >= effectiveTotal) return
    
    navigateToQuestion(index)
    setQuestionMapOpen(false)
  }, [isHydratedFromServer, canNavigateQuestions, activeData?.session.totalQuestions, navigateToQuestion])

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
    refetchInitial,
    preloadError,
    refetchPreload,
    activeData,
    isStillLoading,
    navigationDisabled: !canNavigateQuestions,
    isHydratedFromServer,
    finalizeMutation,
    submitMutation,
    selectedOptions,
    submitted,
    handleSelectOption,
    isReadOnlyTab,
    takeOverLease,
    submitDisabled,
    confirmSubmitDisabled: submitAvailability.confirmationDisabled,
    saveStatus,
    retryFailedAnswer,
    acknowledgedQuestions,
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
