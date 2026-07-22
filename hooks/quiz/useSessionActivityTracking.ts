'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { SessionData } from '@/lib/modules/quiz/types/session'

interface UseSessionActivityTrackingParams {
  sessionId: string
  currentQuestionIndex: number
  activeData: SessionData | undefined
  resolvedQuizId: string
}

interface UseSessionActivityTrackingResult {
  shouldWarnBeforeLeave: boolean
  reportSessionActivity: (event: 'pause' | 'resume') => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  inactivityPauseOpen: boolean
  setInactivityPauseOpen: (open: boolean) => void
  handleResumeInactivity: () => void
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function useSessionActivityTracking({
  sessionId,
  currentQuestionIndex,
  activeData,
  resolvedQuizId,
}: UseSessionActivityTrackingParams): UseSessionActivityTrackingResult {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [inactivityPauseOpen, setInactivityPauseOpen] = useState(false)

  const reportSessionActivity = useCallback(
    (event: 'pause' | 'resume') => {
      if (!sessionId) return
      const payload = JSON.stringify({ event, current_question_index: currentQuestionIndex })
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/activity`
      void fetch(url, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: payload,
        keepalive: true,
      })
    },
    [sessionId, currentQuestionIndex],
  )

  const handleAutoExit = useCallback(() => {
    if (!sessionId) return
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`session_paused_at_${sessionId}`)
    }
    reportSessionActivity('pause')
    const target = resolvedQuizId ? `/quiz/${resolvedQuizId}?reason=idle_timeout` : '/dashboard?reason=idle_timeout'
    router.push(target)
  }, [sessionId, resolvedQuizId, reportSessionActivity, router])

  const handleResumeInactivity = useCallback(() => {
    if (!sessionId) return
    if (typeof window !== 'undefined') {
      const storedPause = localStorage.getItem(`session_paused_at_${sessionId}`)
      if (storedPause) {
        const pausedAt = parseInt(storedPause, 10)
        localStorage.removeItem(`session_paused_at_${sessionId}`)
        if (!isNaN(pausedAt) && Date.now() - pausedAt >= IDLE_TIMEOUT_MS) {
          handleAutoExit()
          return
        }
      }
    }
    setInactivityPauseOpen(false)
    reportSessionActivity('resume')
    void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] })
  }, [sessionId, reportSessionActivity, handleAutoExit, queryClient])

  // Resume activity on mount + check if stored pause time exceeded 5 mins
  useEffect(() => {
    if (!sessionId) return

    if (typeof window !== 'undefined') {
      const storedPause = localStorage.getItem(`session_paused_at_${sessionId}`)
      if (storedPause) {
        const pausedAt = parseInt(storedPause, 10)
        if (!isNaN(pausedAt) && Date.now() - pausedAt >= IDLE_TIMEOUT_MS) {
          handleAutoExit()
          return
        }
      }
    }

    reportSessionActivity('resume')
  }, [sessionId, reportSessionActivity, handleAutoExit])

  const shouldWarnBeforeLeave = Boolean(
    activeData?.session && activeData.session.status !== 'completed',
  )

  // Popstate back-button guard
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

  // Visibility/pagehide/blur guard with 5-minute timeout check
  useEffect(() => {
    if (!shouldWarnBeforeLeave || !sessionId) return

    let idleTimer: NodeJS.Timeout | null = null

    const handlePause = () => {
      const now = Date.now()
      if (typeof window !== 'undefined') {
        localStorage.setItem(`session_paused_at_${sessionId}`, now.toString())
      }
      reportSessionActivity('pause')

      // Schedule 5-minute auto-exit timer
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        handleAutoExit()
      }, IDLE_TIMEOUT_MS)
    }

    const handleResume = () => {
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = null
      }

      if (typeof window !== 'undefined') {
        const storedPause = localStorage.getItem(`session_paused_at_${sessionId}`)
        if (storedPause) {
          const pausedAt = parseInt(storedPause, 10)
          localStorage.removeItem(`session_paused_at_${sessionId}`)
          if (!isNaN(pausedAt) && Date.now() - pausedAt >= IDLE_TIMEOUT_MS) {
            handleAutoExit()
            return
          }
        }
      }

      reportSessionActivity('resume')
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] })
    }

    const handlePageHide = () => handlePause()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePause()
      } else if (document.visibilityState === 'visible') {
        handleResume()
      }
    }

    const handleWindowBlur = () => handlePause()
    const handleWindowFocus = () => handleResume()

    globalThis.addEventListener('pagehide', handlePageHide)
    globalThis.addEventListener('blur', handleWindowBlur)
    globalThis.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (idleTimer) clearTimeout(idleTimer)
      globalThis.removeEventListener('pagehide', handlePageHide)
      globalThis.removeEventListener('blur', handleWindowBlur)
      globalThis.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [shouldWarnBeforeLeave, sessionId, currentQuestionIndex, reportSessionActivity, handleAutoExit, queryClient])

  // Per-question 5-minute inactivity timer (no user interaction for 5 minutes)
  useEffect(() => {
    if (!shouldWarnBeforeLeave || !sessionId || inactivityPauseOpen) return

    let questionIdleTimer: NodeJS.Timeout | null = null

    const resetQuestionIdleTimer = () => {
      if (questionIdleTimer) clearTimeout(questionIdleTimer)
      questionIdleTimer = setTimeout(() => {
        // Paused due to 5 minutes of no user interaction on the question
        const now = Date.now()
        if (typeof window !== 'undefined') {
          localStorage.setItem(`session_paused_at_${sessionId}`, now.toString())
        }
        reportSessionActivity('pause')
        setInactivityPauseOpen(true)
      }, IDLE_TIMEOUT_MS)
    }

    // Start timer on question change or mount
    resetQuestionIdleTimer()

    // Reset timer on user interaction
    const userActivityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handleUserInteraction = () => {
      if (!inactivityPauseOpen) {
        resetQuestionIdleTimer()
      }
    }

    userActivityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true })
    })

    return () => {
      if (questionIdleTimer) clearTimeout(questionIdleTimer)
      userActivityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction)
      })
    }
  }, [shouldWarnBeforeLeave, sessionId, currentQuestionIndex, inactivityPauseOpen, reportSessionActivity])

  return {
    shouldWarnBeforeLeave,
    reportSessionActivity,
    exitConfirmOpen,
    setExitConfirmOpen,
    inactivityPauseOpen,
    setInactivityPauseOpen,
    handleResumeInactivity,
  }
}
