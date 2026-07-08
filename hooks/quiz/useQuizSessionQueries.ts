'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SessionData, PreloadedQuestions, SessionQuestion } from '@/lib/modules/quiz/types/session'
import { fetchSession, fetchAllQuestions } from '@/lib/modules/quiz/session-api'

interface UseQuizSessionQueriesResult {
  initialData: SessionData | undefined
  isInitialLoading: boolean
  isInitialFetching: boolean
  isInitialError: boolean
  initialError: Error | null
  preloadData: PreloadedQuestions | undefined
  isPreloading: boolean
  isPreloadError: boolean
  activeData: SessionData | undefined
  currentQuestion: SessionQuestion | undefined
  preloadedQuestions: SessionQuestion[] | null
  setPreloadedQuestions: (questions: SessionQuestion[] | null) => void
}

export function useQuizSessionQueries(
  resolvedSessionId: string,
  currentQuestionIndex: number,
): UseQuizSessionQueriesResult {
  const [preloadedQuestions, setPreloadedQuestions] = useState<SessionQuestion[] | null>(null)

  const {
    data: initialData,
    isLoading: isInitialLoading,
    isFetching: isInitialFetching,
    isError: isInitialError,
    error: initialError,
  } = useQuery<SessionData, Error>({
    queryKey: ['sessions', resolvedSessionId, 'initial'],
    queryFn: () => fetchSession(resolvedSessionId),
    enabled: resolvedSessionId.length > 0,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const data = query.state.data as SessionData | undefined
      if (data?.session.status === 'preparing') return 2000
      return false
    },
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
             resolvedSessionId !== 'undefined' &&
             initialData?.session.status !== 'preparing',
    staleTime: Infinity,
  })

  useEffect(() => {
    if (preloadData?.questions) setPreloadedQuestions(preloadData.questions)
  }, [preloadData])

  const clampedQuestionIndex = Math.min(
    Math.max(currentQuestionIndex, 0),
    Math.max((initialData?.session.totalQuestions ?? 1) - 1, 0),
  )

  const currentQuestion = preloadedQuestions?.[clampedQuestionIndex]

  const activeData: SessionData | undefined = initialData && currentQuestion
    ? { session: initialData.session, question: currentQuestion }
    : initialData

  return {
    initialData,
    isInitialLoading,
    isInitialFetching,
    isInitialError,
    initialError,
    preloadData,
    isPreloading,
    isPreloadError,
    activeData,
    currentQuestion,
    preloadedQuestions,
    setPreloadedQuestions,
  }
}
