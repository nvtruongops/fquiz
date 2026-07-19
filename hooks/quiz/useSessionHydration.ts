'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { SessionData } from '@/lib/modules/quiz/types/session'
import { SessionApiError } from '@/lib/modules/quiz/session-api'

interface UseSessionHydrationParams {
  resolvedSessionId: string
  resolvedQuizId: string
  quizId: string
  sessionId: string
  initialData: SessionData | undefined
  isInitialFetching: boolean
  initialError: Error | null
}

interface UseSessionHydrationResult {
  isReadyToRender: boolean
  isHydratedFromServer: boolean
  hydratedSessionId: string | null
}

export function useSessionHydration({
  resolvedSessionId,
  resolvedQuizId,
  quizId,
  sessionId,
  initialData,
  isInitialFetching,
  initialError,
}: UseSessionHydrationParams): UseSessionHydrationResult {
  const router = useRouter()
  const { resumeSession } = useQuizSessionStore()
  const [isHydratedFromServer, setIsHydratedFromServer] = useState(false)
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null)

  const isReadyToRender = isHydratedFromServer && hydratedSessionId === resolvedSessionId

  // Reset hydration on session change
  useEffect(() => {
    setIsHydratedFromServer(false)
    setHydratedSessionId(null)
  }, [resolvedSessionId])

  // Hydrate store from server data (wait until we have data, ignore background refetches)
  useEffect(() => {
    if (!initialData || isHydratedFromServer) return
    const serverAnsweredSet = new Set<number>(
      initialData.session.user_answers.map((a) => a.question_index),
    )
    resumeSession(
      resolvedSessionId,
      resolvedQuizId,
      initialData.session.mode,
      initialData.session.totalQuestions,
      initialData.session.current_question_index,
      serverAnsweredSet,
    )
    setIsHydratedFromServer(true)
    setHydratedSessionId(resolvedSessionId)
  }, [initialData, isHydratedFromServer, resolvedQuizId, resolvedSessionId, resumeSession])

  // Session expired redirect
  useEffect(() => {
    const err = initialError as SessionApiError | undefined
    if (!quizId || !err) return
    if (err.code !== 'SESSION_EXPIRED' && err.status !== 410) return
    router.replace(`/quiz/${quizId}?reason=session_expired`)
  }, [initialError, quizId, router])

  // Session completed redirect
  useEffect(() => {
    if (initialData?.session.status === 'completed') {
      router.push(`/quiz/${quizId}/result/${sessionId}`)
    }
  }, [initialData?.session.status, quizId, router, sessionId])

  return { isReadyToRender, isHydratedFromServer, hydratedSessionId }
}
