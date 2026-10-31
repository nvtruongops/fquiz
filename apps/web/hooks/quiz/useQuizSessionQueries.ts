'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SessionData, PreloadedQuestions, SessionQuestion } from '@/lib/modules/quiz/types/session'
import { fetchSession, fetchAllQuestions, SessionApiError } from '@/lib/modules/quiz/session-api'
import { useAuth } from '@/hooks/auth/useAuth'
import { getSessionPreloadStorageKey } from '@/lib/core/utils/cache-invalidation'

interface UseQuizSessionQueriesResult {
  initialData: SessionData | undefined
  isInitialLoading: boolean
  isInitialFetching: boolean
  isInitialError: boolean
  initialError: SessionApiError | null
  refetchInitial: () => Promise<unknown>
  preloadData: PreloadedQuestions | undefined
  isPreloading: boolean
  isPreloadError: boolean
  preloadError: SessionApiError | null
  refetchPreload: () => Promise<unknown>
  activeData: SessionData | undefined
  currentQuestion: SessionQuestion | undefined
  preloadedQuestions: SessionQuestion[] | null
  setPreloadedQuestions: (questions: SessionQuestion[] | null) => void
}

function getSessionOwnerId(authData: ReturnType<typeof useAuth>['data']): string | undefined {
  return authData?.user?._id
}

function shouldLoadAllQuestions(sessionId: string, initialData: SessionData | undefined): boolean {
  return sessionId.length > 0 &&
    sessionId !== 'undefined' &&
    (initialData ? initialData.session.status !== 'preparing' : true)
}

export function useQuizSessionQueries(
  resolvedSessionId: string,
  currentQuestionIndex: number,
): UseQuizSessionQueriesResult {
  const { data: authData } = useAuth()
  const ownerId = getSessionOwnerId(authData)
  const [preloadedQuestions, setPreloadedQuestions] = useState<SessionQuestion[] | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const key = getSessionPreloadStorageKey('questions', resolvedSessionId, ownerId)
        const cached = key ? sessionStorage.getItem(key) : null
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions
          }
        }
      }
    } catch (_storageErr) {
      // Ignore sessionStorage access errors
    }
    return null
  })

  const {
    data: initialData,
    isLoading: isInitialLoading,
    isFetching: isInitialFetching,
    isError: hasInitialError,
    error: initialError,
    refetch: refetchInitial,
  } = useQuery<SessionData, SessionApiError>({
    queryKey: ['sessions', resolvedSessionId, 'initial'],
    queryFn: async () => {
      try {
        const key = getSessionPreloadStorageKey('initial', resolvedSessionId, ownerId)
        const cached = key ? sessionStorage.getItem(key) : null
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.session) {
            sessionStorage.removeItem(key!)
            return parsed as SessionData
          }
        }
      } catch (_cacheErr) {
        /* ignore cache read error */
      }
      return fetchSession(resolvedSessionId)
    },
    enabled: resolvedSessionId.length > 0 && resolvedSessionId !== 'undefined',
    staleTime: 30_000,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      const err = error as SessionApiError
      if (err?.status === 404 || err?.status === 410 || err?.status === 401) {
        return false
      }
      return failureCount < 2
    },
    refetchInterval: (query) => {
      const data = query.state.data as SessionData | undefined
      if (data?.session.status === 'preparing') return 2000
      return false
    },
  })

  const {
    data: preloadData,
    isLoading: isPreloading,
    isError: hasPreloadError,
    error: preloadError,
    refetch: refetchPreload,
  } = useQuery<PreloadedQuestions, SessionApiError>({
    queryKey: ['sessions', resolvedSessionId, 'all-questions'],
    queryFn: async () => {
      try {
        const key = getSessionPreloadStorageKey('questions', resolvedSessionId, ownerId)
        const cached = key ? sessionStorage.getItem(key) : null
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.questions?.length > 0) {
            sessionStorage.removeItem(key!)
            return parsed as PreloadedQuestions
          }
        }
      } catch (_cacheErr) {
        /* ignore cache read error */
      }
      return fetchAllQuestions(resolvedSessionId)
    },
    enabled: shouldLoadAllQuestions(resolvedSessionId, initialData),
    staleTime: Infinity,
    retry: (failureCount, error) => {
      const err = error as SessionApiError
      if (err?.status === 404 || err?.status === 410 || err?.status === 401) {
        return false
      }
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (preloadData?.questions) setPreloadedQuestions(preloadData.questions)
  }, [preloadData])

  const effectiveQuestions = preloadedQuestions || preloadData?.questions || (initialData?.question ? [initialData.question] : null)

  const clampedQuestionIndex = Math.min(
    Math.max(currentQuestionIndex, 0),
    Math.max((initialData?.session.totalQuestions ?? effectiveQuestions?.length ?? 1) - 1, 0),
  )

  const currentQuestion = effectiveQuestions?.[clampedQuestionIndex] || initialData?.question
  const isInitialError = hasInitialError && !initialData
  const isPreloadError = hasPreloadError && !preloadData

  const activeData: SessionData | undefined = initialData
    ? { session: initialData.session, question: currentQuestion || initialData.question }
    : undefined

  return {
    initialData,
    isInitialLoading,
    isInitialFetching,
    isInitialError,
    initialError,
    refetchInitial,
    preloadData,
    isPreloading,
    isPreloadError,
    preloadError,
    refetchPreload,
    activeData,
    currentQuestion,
    preloadedQuestions,
    setPreloadedQuestions,
  }
}
