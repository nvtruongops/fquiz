'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
}

export function useSessionActivityTracking({
  sessionId,
  currentQuestionIndex,
  activeData,
  resolvedQuizId,
}: UseSessionActivityTrackingParams): UseSessionActivityTrackingResult {
  const router = useRouter()
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

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

  // Resume activity on mount
  useEffect(() => {
    if (!sessionId) return
    reportSessionActivity('resume')
  }, [sessionId, reportSessionActivity])

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

  // Visibility/pagehide guard
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

  return { shouldWarnBeforeLeave, reportSessionActivity, exitConfirmOpen, setExitConfirmOpen }
}
