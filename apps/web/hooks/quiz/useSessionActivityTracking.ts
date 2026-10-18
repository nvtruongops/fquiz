'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { SessionData } from '@/lib/modules/quiz/types/session'

interface UseSessionActivityTrackingParams {
  sessionId: string
  currentQuestionIndex: number
  activeData: SessionData | undefined
  resolvedQuizId: string
  canWrite: () => boolean
}

interface UseSessionActivityTrackingResult {
  shouldWarnBeforeLeave: boolean
  reportSessionActivity: (event: 'pause' | 'resume') => Promise<boolean>
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  inactivityPauseOpen: boolean
  setInactivityPauseOpen: (open: boolean) => void
  handleResumeInactivity: () => Promise<void>
  markExiting: () => void
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function useSessionActivityTracking({
  sessionId,
  currentQuestionIndex,
  activeData,
  canWrite,
}: UseSessionActivityTrackingParams): UseSessionActivityTrackingResult {
  const queryClient = useQueryClient()
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [inactivityPauseOpen, setInactivityPauseOpen] = useState(false)
  const isExitingRef = useRef(false)
  const currentQuestionIndexRef = useRef(currentQuestionIndex)
  currentQuestionIndexRef.current = currentQuestionIndex
  const lastReportRef = useRef<{ sessionId: string; event: 'pause' | 'resume' | null; sequence: number }>({ sessionId, event: null, sequence: 0 })
  const acceptedReportRef = useRef<{ sessionId: string; event: 'pause' | 'resume' | null; sequence: number }>({ sessionId, event: null, sequence: 0 })
  const reportSequenceRef = useRef(0)
  if (lastReportRef.current.sessionId !== sessionId) {
    lastReportRef.current = { sessionId, event: null, sequence: 0 }
    acceptedReportRef.current = { sessionId, event: null, sequence: 0 }
    reportSequenceRef.current += 1
  }

  const markExiting = useCallback(() => {
    isExitingRef.current = true
  }, [])

  const reportSessionActivity = useCallback(
    async (event: 'pause' | 'resume') => {
      if (!sessionId || !canWrite() || lastReportRef.current.event === event) return false
      const sequence = ++reportSequenceRef.current
      lastReportRef.current = { sessionId, event, sequence }

      const payload = JSON.stringify({ event, current_question_index: currentQuestionIndexRef.current })
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/activity`
      let accepted = false
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: payload,
          keepalive: true,
        })
        if (!response.ok) return false
        accepted = true
        if (acceptedReportRef.current.sessionId === sessionId && sequence > acceptedReportRef.current.sequence) {
          acceptedReportRef.current = { sessionId, event, sequence }
        }
        return true
      } catch (err) {
        console.error('Failed to report session activity', err)
        return false
      } finally {
        if (
          lastReportRef.current.sessionId === sessionId &&
          (lastReportRef.current.sequence === sequence || (accepted && lastReportRef.current.sequence < sequence))
        ) {
          lastReportRef.current = acceptedReportRef.current
        }
      }
    },
    [sessionId, canWrite],
  )

  const handleResumeInactivity = useCallback(async () => {
    if (!sessionId || !canWrite()) return

    // Await API POST activity call to guarantee DB removes paused_at
    const didReport = await reportSessionActivity('resume')
    if (!didReport) return
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`session_paused_at_${sessionId}`)
    }
    setInactivityPauseOpen(false)

    // Optimistically update TanStack Query cache to remove paused_at before invalidating
    queryClient.setQueryData(['sessions', sessionId, 'initial'], (old: SessionData | undefined) => {
      if (!old?.session) return old
      const newSession = { ...old.session }
      delete newSession.paused_at
      return {
        ...old,
        session: newSession,
      }
    })

    void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'initial'], exact: true })
  }, [sessionId, reportSessionActivity, queryClient, canWrite])

  // Resume activity on mount + check if stored pause time exceeded 5 mins
  useEffect(() => {
    if (!sessionId || !canWrite()) return

    let isPausedOver5Mins = false
    if (typeof window !== 'undefined') {
      const storedPause = localStorage.getItem(`session_paused_at_${sessionId}`)
      if (storedPause) {
        const pausedAt = parseInt(storedPause, 10)
        if (!isNaN(pausedAt) && Date.now() - pausedAt >= IDLE_TIMEOUT_MS) {
          isPausedOver5Mins = true
        }
      }
    }

    if (activeData?.session?.paused_at) {
      const serverPausedAt = new Date(activeData.session.paused_at).getTime()
      if (!isNaN(serverPausedAt) && Date.now() - serverPausedAt >= IDLE_TIMEOUT_MS) {
        isPausedOver5Mins = true
      }
    }

    if (isPausedOver5Mins) {
      setInactivityPauseOpen(true)
    } else {
      void reportSessionActivity('resume')
    }
  }, [sessionId, activeData?.session?.paused_at, reportSessionActivity, canWrite])

  const shouldWarnBeforeLeave = Boolean(
    activeData?.session && activeData.session.status !== 'completed',
  )

  // Popstate back-button guard & exit confirm timer pause sync
  const hasPushedStateRef = useRef(false)
  useEffect(() => {
    if (!shouldWarnBeforeLeave || !sessionId) return
    if (!hasPushedStateRef.current) {
      hasPushedStateRef.current = true
      const guardState = { quizSessionGuard: sessionId }
      globalThis.history.pushState(guardState, '', globalThis.location.href)
    }
    const handlePopState = () => {
      if (isExitingRef.current) return
      setExitConfirmOpen(true)
      const guardState = { quizSessionGuard: sessionId }
      globalThis.history.pushState(guardState, '', globalThis.location.href)
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [sessionId, shouldWarnBeforeLeave])

  // Sync pause state when manual exit confirm modal opens/closes
  useEffect(() => {
    if (!sessionId || !canWrite()) return
    if (exitConfirmOpen) {
      const now = Date.now()
      if (typeof window !== 'undefined') {
        localStorage.setItem(`session_paused_at_${sessionId}`, now.toString())
      }
      void reportSessionActivity('pause')
    } else {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`session_paused_at_${sessionId}`)
        if (stored) {
          localStorage.removeItem(`session_paused_at_${sessionId}`)
          if (!isExitingRef.current) {
            void reportSessionActivity('resume').then((didReport) => {
              if (didReport) {
                void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'initial'], exact: true })
              }
            })
          }
        }
      }
    }
  }, [exitConfirmOpen, sessionId, reportSessionActivity, queryClient, canWrite])

  // Visibility/pagehide/blur guard with 5-minute timeout check
  useEffect(() => {
    if (!shouldWarnBeforeLeave || !sessionId || isExitingRef.current) return

    let idleTimer: NodeJS.Timeout | null = null

    const handlePause = () => {
      if (isExitingRef.current || !canWrite()) return
      const now = Date.now()
      if (typeof window !== 'undefined') {
        localStorage.setItem(`session_paused_at_${sessionId}`, now.toString())
      }
      void reportSessionActivity('pause')

      // Schedule 5-minute inactivity pause modal trigger
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        if (!isExitingRef.current) setInactivityPauseOpen(true)
      }, IDLE_TIMEOUT_MS)
    }

    const handleResume = () => {
      if (isExitingRef.current || !canWrite()) return
      if (idleTimer) {
        clearTimeout(idleTimer)
        idleTimer = null
      }

      // Guard: do not re-trigger pause check if pause modal is already open
      if (inactivityPauseOpen) return

      if (typeof window !== 'undefined') {
        const storedPause = localStorage.getItem(`session_paused_at_${sessionId}`)
        if (storedPause) {
          const pausedAt = parseInt(storedPause, 10)
          if (!isNaN(pausedAt) && Date.now() - pausedAt >= IDLE_TIMEOUT_MS) {
            // Over 5 mins pause -> open pause modal
            setInactivityPauseOpen(true)
            return
          }
          localStorage.removeItem(`session_paused_at_${sessionId}`)
        }
      }

      void reportSessionActivity('resume').then((didReport) => {
        if (didReport) {
          void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'initial'], exact: true })
        }
      })
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
  }, [shouldWarnBeforeLeave, sessionId, inactivityPauseOpen, reportSessionActivity, queryClient, canWrite])

  // Per-question 5-minute inactivity timer (no user interaction for 5 minutes)
  useEffect(() => {
    if (!shouldWarnBeforeLeave || !sessionId || inactivityPauseOpen) return

    let questionIdleTimer: NodeJS.Timeout | null = null

    const resetQuestionIdleTimer = () => {
      if (questionIdleTimer) clearTimeout(questionIdleTimer)
      questionIdleTimer = setTimeout(() => {
        if (isExitingRef.current || !canWrite()) return
        // Paused due to 5 minutes of no user interaction on the question
        const now = Date.now()
        if (typeof window !== 'undefined') {
          localStorage.setItem(`session_paused_at_${sessionId}`, now.toString())
        }
        void reportSessionActivity('pause')
        setInactivityPauseOpen(true)
      }, IDLE_TIMEOUT_MS)
    }

    // Start timer on question change or mount
    resetQuestionIdleTimer()

    // Reset timer on user interaction
    const userActivityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const handleUserInteraction = () => {
      if (!inactivityPauseOpen && !isExitingRef.current) {
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
  }, [shouldWarnBeforeLeave, sessionId, currentQuestionIndex, inactivityPauseOpen, reportSessionActivity, canWrite])

  return {
    shouldWarnBeforeLeave,
    reportSessionActivity,
    exitConfirmOpen,
    setExitConfirmOpen,
    inactivityPauseOpen,
    setInactivityPauseOpen,
    handleResumeInactivity,
    markExiting,
  }
}

