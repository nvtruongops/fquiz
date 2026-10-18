'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useQuizLoader } from '@/components/quiz/shared/QuizLoader'
import { useAuth } from '@/hooks/auth/useAuth'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

export interface QuizDetail {
  _id: string
  title: string
  description: string
  category_id: { name: string }
  course_code: string
  num_questions: number
  num_attempts: number
  created_at: string
  is_temp?: boolean
}

export interface CreateSessionResponse {
  sessionId?: string
  mode?: string
  difficulty?: 'sequential' | 'random'
  resumed?: boolean
  initialData?: any
  preloadData?: any
}

export interface ActiveSessionPayload {
  sessionId: string
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty?: 'sequential' | 'random'
  answeredCount?: number
  totalQuestions?: number
  cardsKnown?: number
  cardsUnknown?: number
  totalCards?: number
  started_at?: string
}

export type QuizDetailApiError = Error & { status?: number; code?: string; hint?: string }
export type StartSessionError = Error & { status?: number; code?: string; activeSession?: ActiveSessionPayload }

async function fetchStudentQuizDetail(id: string): Promise<QuizDetail | null> {
  try {
    const studentRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.STUDENT.QUIZZES(id)}`)

    if (studentRes.ok) {
      const data = await studentRes.json()
      const q = data.quiz ?? data
      return {
        _id: q._id,
        title: q.title,
        description: q.description || '',
        category_id: { name: q.category_id?.name || q.categoryName || 'General' },
        course_code: q.course_code,
        num_questions: q.num_questions ?? q.questionCount ?? q.questions?.length ?? 0,
        num_attempts: q.num_attempts ?? q.studentCount ?? 0,
        created_at: q.created_at ?? q.createdAt,
        is_temp: q.is_temp,
      }
    }

    if (studentRes.status === 401 || studentRes.status === 404) {
      return null
    }

    const data = (await studentRes.json().catch(() => ({}))) as { error?: string; code?: string; hint?: string }
    const error = new Error(data.error || `You do not have permission to access this quiz (Error ${studentRes.status}).`) as QuizDetailApiError
    error.status = studentRes.status
    error.code = data.code
    error.hint = data.hint
    throw error
  } catch (e) {
    if ((e as QuizDetailApiError).status && (e as QuizDetailApiError).status !== 401 && (e as QuizDetailApiError).status !== 404) {
      throw e
    }
    return null
  }
}

async function fetchPublicQuizDetail(id: string): Promise<QuizDetail> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.PUBLIC.QUIZ_DETAIL(id)}`)
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; hint?: string }
    const error = new Error(data.error || 'Unable to load quiz details.') as QuizDetailApiError
    error.status = res.status
    error.code = data.code
    error.hint = data.hint
    throw error
  }

  const response = await res.json()
  const publicQuiz = response.data
  return {
    _id: publicQuiz.id,
    title: publicQuiz.title,
    description: publicQuiz.description || '',
    category_id: { name: publicQuiz.categoryName || 'General' },
    course_code: publicQuiz.course_code,
    num_questions: publicQuiz.questionCount || 0,
    num_attempts: publicQuiz.studentCount || 0,
    created_at: publicQuiz.createdAt,
    is_temp: publicQuiz.is_temp,
  }
}

function hasCookieToken(): boolean {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)(?:auth-token|token)=/.test(document.cookie)
}

async function fetchQuizDetail(id: string, isAuth?: boolean): Promise<QuizDetail> {
  const hasToken = Boolean(isAuth) || hasCookieToken()

  if (hasToken) {
    const studentDetail = await fetchStudentQuizDetail(id).catch(() => null)
    if (studentDetail) return studentDetail
  }

  try {
    return await fetchPublicQuizDetail(id)
  } catch (publicErr: any) {
    // If public call returns 404 or fails, fallback to student API smoothly without unhandled errors
    if (!hasToken) {
      const studentDetail = await fetchStudentQuizDetail(id).catch(() => null)
      if (studentDetail) return studentDetail
    }
    throw publicErr
  }
}

export function useQuizDetailState() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const params = useParams<{ id?: string | string[] }>()
  const quizId = Array.isArray(params?.id) ? params?.id[0] : params?.id
  const resolvedQuizId = quizId ?? ''
  const { toast } = useToast()

  const [resumeDialogOpen, setResumeDialogOpen] = useState(false)
  const [modeSelectOpen, setModeSelectOpen] = useState(() => searchParams.get('selectMode') === 'true')
  const [activeSessionInfo, setActiveSessionInfo] = useState<ActiveSessionPayload | null>(null)
  const [selectedMode, setSelectedMode] = useState<'immediate' | 'review' | 'flashcard'>(
    () => (searchParams.get('mode') === 'flashcard' ? 'flashcard' : 'immediate')
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState<'sequential' | 'random'>('sequential')

  const { loadingOverlay, startLoading, completeLoading, stopLoading, updateStatus } = useQuizLoader()
  const shownReasonRef = useRef<string | null>(null)

  useEffect(() => {
    const reason = searchParams.get('reason')
    if (reason && shownReasonRef.current !== reason) {
      shownReasonRef.current = reason
      if (reason === 'session_expired') {
        toast.error('Your exam session has expired. Please start a new session.')
      } else if (reason === 'idle_timeout') {
        toast.error('Exam session was automatically ended due to inactivity or leaving for over 5 minutes.')
      } else if (reason === 'session_not_found') {
        toast.error('Exam session does not exist or has been deleted. Please start a new session.')
      }
    }
    if (searchParams.get('selectMode') === 'true') {
      setModeSelectOpen(true)
    }
    if (searchParams.get('mode') === 'flashcard') {
      setSelectedMode('flashcard')
    }
  }, [searchParams, toast])

  const { data: authData } = useAuth()
  const currentUser = authData?.user ?? null

  const { data: quiz, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', resolvedQuizId],
    queryFn: () => fetchQuizDetail(resolvedQuizId, Boolean(currentUser?._id)),
    enabled: Boolean(resolvedQuizId && resolvedQuizId !== 'undefined'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, err: any) => {
      if (err?.status === 404 || err?.status === 403) return false
      return failureCount < 1
    },
  })

  const { data: activeSessionData } = useQuery({
    queryKey: ['active-session', resolvedQuizId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}?quiz_id=${resolvedQuizId}`)
      if (!res.ok) return { assessmentSession: null, learningSession: null }
      return res.json()
    },
    enabled: Boolean(resolvedQuizId && resolvedQuizId !== 'undefined') && Boolean(currentUser?._id) && Boolean(quiz) && !isError,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['quiz-history-detail', resolvedQuizId],
    queryFn: async () => {
      const res = await fetch(`/api/history/${resolvedQuizId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: Boolean(resolvedQuizId && resolvedQuizId !== 'undefined') && Boolean(currentUser?._id) && Boolean(quiz) && !isError,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const startSessionMutation = useMutation({
    mutationFn: async ({ mode, difficulty, action }: any) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quiz_id: quizId, mode, difficulty, ...(action ? { action } : {}) }),
      })
      if (!res.ok) {
        const data = await res.json()
        const startError = new Error(data.error || 'Failed to initialize exam session') as StartSessionError
        startError.status = res.status
        startError.code = data.code
        startError.activeSession = data.activeSession
        throw startError
      }
      const sessionData = await res.json()

      if (sessionData.sessionId) {
        if (sessionData.initialData) {
          queryClient.setQueryData(['sessions', sessionData.sessionId, 'initial'], sessionData.initialData)
          try {
            sessionStorage.setItem(`session_initial_preload_${sessionData.sessionId}`, JSON.stringify(sessionData.initialData))
          } catch (_storageErr) {
            // Ignore sessionStorage quota or access errors in private browsing
          }
        }
        if (sessionData.preloadData) {
          queryClient.setQueryData(['sessions', sessionData.sessionId, 'all-questions'], sessionData.preloadData)
          try {
            sessionStorage.setItem(`session_preload_${sessionData.sessionId}`, JSON.stringify(sessionData.preloadData))
          } catch (_storageErr) {
            // Ignore sessionStorage quota or access errors in private browsing
          }
        }
      }

      return sessionData as CreateSessionResponse
    },
    onSuccess: (data: any) => {
      const nextSessionId = data.sessionId
      if (!nextSessionId) return

      if (data.initialData) {
        queryClient.setQueryData(['sessions', nextSessionId, 'initial'], data.initialData)
        try {
          sessionStorage.setItem(`session_initial_preload_${nextSessionId}`, JSON.stringify(data.initialData))
        } catch (_storageErr) {
          // Ignore sessionStorage quota or access errors in private browsing
        }
      }
      if (data.preloadData) {
        queryClient.setQueryData(['sessions', nextSessionId, 'all-questions'], data.preloadData)
        try {
          sessionStorage.setItem(`session_preload_${nextSessionId}`, JSON.stringify(data.preloadData))
        } catch (_storageErr) {
          // Ignore sessionStorage quota or access errors in private browsing
        }
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const targetUrl =
        data.mode === 'flashcard'
          ? isMobile
            ? `/quiz/${quizId}/session/${nextSessionId}/flashcard/mobile`
            : `/quiz/${quizId}/session/${nextSessionId}/flashcard`
          : `/quiz/${quizId}/session/${nextSessionId}`

      completeLoading()
      router.push(targetUrl)
    },
    onError: (err: StartSessionError) => {
      stopLoading()
      if (err.status === 401) {
        toast.error('You must sign in to attempt this quiz')
        setTimeout(() => router.push(`/login?redirect=/quiz/${quizId}`), 1500)
        return
      }
      if (err.status === 409 && err.activeSession) {
        setActiveSessionInfo(err.activeSession)
        setResumeDialogOpen(true)
        return
      }
      toast.error(err.message)
    },
  })

  const handleStart = useCallback(() => {
    const isLearning = selectedMode === 'flashcard'
    const conflict = isLearning ? activeSessionData?.learningSession : activeSessionData?.assessmentSession

    if (conflict) {
      setModeSelectOpen(false)
      setActiveSessionInfo(conflict)
      setResumeDialogOpen(true)
    } else {
      setModeSelectOpen(false)
      startLoading('Loading question set...')
      startSessionMutation.mutate({ mode: selectedMode, difficulty: selectedDifficulty })
    }
  }, [selectedMode, activeSessionData, selectedDifficulty, startLoading, startSessionMutation])

  const handleResumeSession = useCallback(
    (sessionId: string) => {
      if (!sessionId) return
      const isLearning = activeSessionData?.learningSession?.sessionId === sessionId
      const activeMode = isLearning ? 'flashcard' : activeSessionData?.assessmentSession?.mode || 'immediate'
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const targetUrl =
        activeMode === 'flashcard'
          ? isMobile
            ? `/quiz/${resolvedQuizId}/session/${sessionId}/flashcard/mobile`
            : `/quiz/${resolvedQuizId}/session/${sessionId}/flashcard`
          : `/quiz/${resolvedQuizId}/session/${sessionId}`

      startLoading('Resuming session...')
      completeLoading()
      setTimeout(() => router.push(targetUrl), 200)
    },
    [activeSessionData, resolvedQuizId, startLoading, completeLoading, router]
  )

  const handleContinueActiveSession = useCallback(() => {
    setResumeDialogOpen(false)
    const resumeSessionId = activeSessionInfo?.sessionId
    const resumeMode = activeSessionInfo?.mode || selectedMode

    if (activeSessionInfo?.cardsUnknown && activeSessionInfo?.cardsUnknown > 0 && resumeSessionId) {
      startLoading('Preparing unmemorized questions...')
      fetch(`/api/sessions/${resumeSessionId}/flashcard-review`, {
        method: 'POST',
        headers: withCsrfHeaders(),
      })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to restart review')

          if (data.sessionId) {
            try {
              updateStatus('Loading review questions...')
              const [qRes, sRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.QUESTIONS(data.sessionId)}`),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}/${data.sessionId}`),
              ])

              if (qRes.ok) {
                const qData = await qRes.json()
                sessionStorage.setItem(`session_preload_${data.sessionId}`, JSON.stringify(qData))
              }
              if (sRes.ok) {
                const sData = await sRes.json()
                sessionStorage.setItem(`session_initial_preload_${data.sessionId}`, JSON.stringify(sData))
              }
            } catch (e) {
              console.warn('Pre-load failed', e)
            }
          }

          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          const targetUrl = isMobile
            ? `/quiz/${quizId}/session/${data.sessionId}/flashcard/mobile`
            : `/quiz/${quizId}/session/${data.sessionId}/flashcard`
          completeLoading()
          setTimeout(() => router.push(targetUrl), 200)
        })
        .catch((err) => {
          stopLoading()
          toast.error(err.message || 'Error resuming review session')
        })
    } else if (resumeSessionId) {
      startLoading('Reconnecting to study session...')
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const targetUrl =
        resumeMode === 'flashcard'
          ? isMobile
            ? `/quiz/${quizId}/session/${resumeSessionId}/flashcard/mobile`
            : `/quiz/${quizId}/session/${resumeSessionId}/flashcard`
          : `/quiz/${quizId}/session/${resumeSessionId}`

      Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.QUESTIONS(resumeSessionId)}`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}/${resumeSessionId}`),
      ])
        .then(async ([qRes, sRes]) => {
          if (qRes.ok) {
            const qData = await qRes.json()
            sessionStorage.setItem(`session_preload_${resumeSessionId}`, JSON.stringify(qData))
          }
          if (sRes.ok) {
            const sData = await sRes.json()
            sessionStorage.setItem(`session_initial_preload_${resumeSessionId}`, JSON.stringify(sData))
          }
        })
        .catch((e) => console.warn('Pre-load failed', e))
        .finally(() => {
          completeLoading()
          setTimeout(() => router.push(targetUrl), 200)
        })
    } else {
      startLoading('Reconnecting...')
      startSessionMutation.mutate({
        mode: resumeMode,
        difficulty: activeSessionInfo?.difficulty || selectedDifficulty,
        action: 'continue',
      })
    }
  }, [
    activeSessionInfo,
    selectedMode,
    startLoading,
    quizId,
    completeLoading,
    router,
    stopLoading,
    toast,
    startSessionMutation,
    selectedDifficulty,
    updateStatus,
  ])

  const handleRestartActiveSession = useCallback(() => {
    setResumeDialogOpen(false)
    startLoading('Restarting...')
    startSessionMutation
      .mutateAsync({
        mode: activeSessionInfo?.mode,
        difficulty: activeSessionInfo?.difficulty,
        action: 'restart',
      })
      .then(() => startSessionMutation.mutate({ mode: selectedMode, difficulty: selectedDifficulty }))
  }, [activeSessionInfo, selectedMode, selectedDifficulty, startLoading, startSessionMutation])

  return {
    router,
    quizId,
    resolvedQuizId,
    quiz,
    isLoading,
    isError,
    error,
    currentUser,
    historyData,
    isHistoryLoading,
    selectedMode,
    setSelectedMode,
    selectedDifficulty,
    setSelectedDifficulty,
    modeSelectOpen,
    setModeSelectOpen,
    resumeDialogOpen,
    setResumeDialogOpen,
    activeSessionInfo,
    loadingOverlay,
    isStarting: startSessionMutation.isPending,
    handleStart,
    handleResumeSession,
    handleContinueActiveSession,
    handleRestartActiveSession,
  }
}
