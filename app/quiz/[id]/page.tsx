'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useQuizLoader, QuizLoadingOverlay } from '@/components/quiz/shared/QuizLoader'
import { useAuth } from '@/hooks/auth/useAuth'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

// Sub-components
import { QuizDetailHeader } from '@/components/quiz/detail/QuizDetailHeader'
import { QuizStats } from '@/components/quiz/detail/QuizStats'
import { QuizHistory } from '@/components/quiz/detail/QuizHistory'
import { QuizActionCard } from '@/components/quiz/detail/QuizActionCard'
import { QuizDetailErrorView } from '@/components/quiz/detail/QuizDetailErrorView'
import { QuizDetailSkeleton } from '@/components/quiz/detail/QuizDetailSkeleton'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

interface QuizDetail {
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

interface CreateSessionResponse {
  sessionId?: string
  mode?: string
  difficulty?: 'sequential' | 'random'
  resumed?: boolean
}

interface ActiveSessionPayload {
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

type QuizDetailApiError = Error & { status?: number; code?: string; hint?: string }
type StartSessionError = Error & { status?: number; code?: string; activeSession?: ActiveSessionPayload }

async function fetchQuizDetail(id: string): Promise<QuizDetail> {
  const studentDetail = await fetchStudentQuizDetail(id)
  if (studentDetail) return studentDetail
  return fetchPublicQuizDetail(id)
}

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
        category_id: { name: q.category_id?.name || q.categoryName || 'Chung' },
        course_code: q.course_code,
        num_questions: q.num_questions ?? q.questionCount ?? q.questions?.length ?? 0,
        num_attempts: q.num_attempts ?? q.studentCount ?? 0,
        created_at: q.created_at ?? q.createdAt,
        is_temp: q.is_temp,
      }
    }
    
    if (studentRes.status === 401 || studentRes.status === 404) {
      console.warn(`Student API returned ${studentRes.status}, falling back to public API`)
      return null
    }

    const data = (await studentRes.json().catch(() => ({}))) as { error?: string; code?: string; hint?: string }
    const error = new Error(data.error || `Bạn không có quyền truy cập bộ đề này (Lỗi ${studentRes.status}).`) as QuizDetailApiError
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
    const error = new Error(data.error || 'Không thể tải thông tin đề thi.') as QuizDetailApiError
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
    category_id: { name: publicQuiz.categoryName || 'Chung' },
    course_code: publicQuiz.course_code,
    num_questions: publicQuiz.questionCount || 0,
    num_attempts: publicQuiz.studentCount || 0,
    created_at: publicQuiz.createdAt,
    is_temp: publicQuiz.is_temp,
  }
}

export default function QuizDetailPage() {
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
        toast.error('Phiên làm bài đã hết hiệu lực. Vui lòng bắt đầu phiên mới.')
      } else if (reason === 'idle_timeout') {
        toast.error('Phiên làm bài đã tự động kết thúc do bạn tạm dừng hoặc rời trang quá 5 phút.')
      } else if (reason === 'session_not_found') {
        toast.error('Phiên làm bài không tồn tại hoặc đã bị xóa. Vui lòng bắt đầu phiên mới.')
      }
    }
    if (searchParams.get('selectMode') === 'true') {
      setModeSelectOpen(true)
    }
    if (searchParams.get('mode') === 'flashcard') {
      setSelectedMode('flashcard')
    }
  }, [searchParams, toast])

  const { data: quiz, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuizDetail(resolvedQuizId),
    enabled: resolvedQuizId.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, err: any) => {
      if (err?.status === 404 || err?.status === 403) return false
      return failureCount < 1
    },
  })

  const { data: authData, isLoading: isUserLoading } = useAuth()
  const currentUser = authData?.user ?? null

  const { data: activeSessionData } = useQuery({
    queryKey: ['active-session', quizId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}?quiz_id=${quizId}`)
      if (!res.ok) return { assessmentSession: null, learningSession: null }
      return res.json()
    },
    enabled: resolvedQuizId.length > 0 && !!currentUser?._id && !isError,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['quiz-history-detail', quizId],
    queryFn: async () => {
      const res = await fetch(`/api/history/${resolvedQuizId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: resolvedQuizId.length > 0 && !!currentUser?._id && !isError,
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
        const startError = new Error(data.error || 'Không thể khởi tạo phiên thi') as StartSessionError
        startError.status = res.status
        startError.code = data.code
        startError.activeSession = data.activeSession
        throw startError
      }
      const sessionData = await res.json()
      
      // PRE-LOAD QUESTIONS AND SESSION BEFORE REDIRECTING
      if (sessionData.sessionId) {
        try {
          updateStatus('Đang chuẩn bị bộ câu hỏi...')
          const [qRes, sRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.QUESTIONS(sessionData.sessionId)}`),
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}/${sessionData.sessionId}`)
          ])

          if (qRes.ok) {
            const qData = await qRes.json()
            sessionStorage.setItem(`session_preload_${sessionData.sessionId}`, JSON.stringify(qData))
          }
          if (sRes.ok) {
            const sData = await sRes.json()
            sessionStorage.setItem(`session_initial_preload_${sessionData.sessionId}`, JSON.stringify(sData))
          }
        } catch (e) {
          console.warn('Pre-load failed', e)
        }
      }
      
      return sessionData as CreateSessionResponse
    },
    onSuccess: (data) => {
      const nextSessionId = data.sessionId
      if (!nextSessionId) return // Old session deleted, wait for new one

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const targetUrl = data.mode === 'flashcard' 
        ? (isMobile ? `/quiz/${quizId}/session/${nextSessionId}/flashcard/mobile` : `/quiz/${quizId}/session/${nextSessionId}/flashcard`)
        : `/quiz/${quizId}/session/${nextSessionId}`

      // Show 100%, wait for it to display, then navigate
      // The quiz loader suppression flag keeps the global PageTransitionLoader from firing
      completeLoading()
      setTimeout(() => router.push(targetUrl), 400)
    },
    onError: (error: StartSessionError) => {
      stopLoading()
      if (error.status === 401) {
        toast.error('Bạn cần đăng nhập để làm bài quiz này')
        setTimeout(() => router.push(`/login?redirect=/quiz/${quizId}`), 1500)
        return
      }
      if (error.status === 409 && error.activeSession) {
        setActiveSessionInfo(error.activeSession)
        setResumeDialogOpen(true)
        return
      }
      toast.error(error.message)
    },
  })

  function handleStart() {
    const isLearning = selectedMode === 'flashcard'
    const conflict = isLearning ? activeSessionData?.learningSession : activeSessionData?.assessmentSession
    
    if (conflict) {
      setModeSelectOpen(false)
      setActiveSessionInfo(conflict)
      setResumeDialogOpen(true)
    } else {
      setModeSelectOpen(false)
      startLoading('Đang tải dữ liệu bộ câu hỏi...')
      startSessionMutation.mutate({ mode: selectedMode, difficulty: selectedDifficulty })
    }
  }

  const handleResumeSession = useCallback((sessionId: string) => {
    if (!sessionId) return
    const isLearning = activeSessionData?.learningSession?.sessionId === sessionId
    const activeMode = isLearning ? 'flashcard' : (activeSessionData?.assessmentSession?.mode || 'immediate')
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const targetUrl = activeMode === 'flashcard'
      ? (isMobile ? `/quiz/${resolvedQuizId}/session/${sessionId}/flashcard/mobile` : `/quiz/${resolvedQuizId}/session/${sessionId}/flashcard`)
      : `/quiz/${resolvedQuizId}/session/${sessionId}`

    startLoading('Đang tiếp tục bài làm...')
    completeLoading()
    setTimeout(() => router.push(targetUrl), 400)
  }, [activeSessionData, resolvedQuizId, startLoading, completeLoading, router])

  if (isLoading) return <QuizDetailSkeleton />

  if (isError) return <QuizDetailErrorView error={error as any} router={router} />

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <QuizLoadingOverlay {...loadingOverlay} />
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-emerald-500/5 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-3 sm:px-6 py-4 sm:py-8 pb-40 md:pb-32 max-w-7xl mx-auto w-full">
        {/* Back Navigation Bar */}
        {(() => {
          const rawCode = quiz?.course_code || ''
          const baseCourseCode = rawCode ? rawCode.split('_')[0].toLowerCase() : ''
          const displayCourseCode = rawCode ? rawCode.split('_')[0].toUpperCase() : ''

          return (
            <div className="w-full mb-4 sm:mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (baseCourseCode) {
                    router.push(`/courses/${baseCourseCode}`)
                  } else if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back()
                  } else {
                    router.push('/explore')
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-card hover:bg-muted text-foreground border border-border shadow-xs text-xs font-bold transition-all hover:-translate-x-1 active:translate-x-0 cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span>Quay lại</span>
              </button>

              {baseCourseCode && (
                <Link
                  href={`/courses/${baseCourseCode}`}
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-muted-foreground bg-muted border border-border transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Môn học:</span>
                  <span className="font-extrabold text-foreground uppercase">{displayCourseCode}</span>
                </Link>
              )}
            </div>
          )
        })()}

        <GsapStaggerContainer selector=".quiz-detail-section" stagger={0.08} y={16} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
          
          {/* Header & Comments Column (Mobile order 1 & 3) */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-8 order-1 lg:order-1">
            <div className="quiz-detail-section">
              <QuizDetailHeader quiz={quiz ?? null} resolvedQuizId={resolvedQuizId} />
            </div>

            {/* Hidden on mobile, shown on desktop here to keep side-by-side */}
            <div className="quiz-detail-section hidden lg:block">
              <QuizHistory 
                quizId={resolvedQuizId}
                numQuestions={quiz?.num_questions ?? 0}
                historyData={historyData}
                isLoading={isHistoryLoading}
                currentUser={currentUser}
                onResumeSession={handleResumeSession}
                onAuthRequired={() => {
                  const safeCallback = encodeURIComponent(`/quiz/${resolvedQuizId}`)
                  router.push(`/login?callbackUrl=${safeCallback}`)
                }}
              />
            </div>
          </div>

          {/* Action Card & Stats Column (Mobile order 2 & 4) */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-8 lg:sticky lg:top-24 h-fit order-2 lg:order-2">
            <div className="quiz-detail-section">
              <QuizActionCard 
                quizId={resolvedQuizId}
                selectedMode={selectedMode}
                selectedDifficulty={selectedDifficulty}
                onModeChange={setSelectedMode}
                onDifficultyChange={setSelectedDifficulty}
                onStart={handleStart}
                isStarting={startSessionMutation.isPending}
                modeSelectOpen={modeSelectOpen}
                setModeSelectOpen={setModeSelectOpen}
                resumeDialogOpen={resumeDialogOpen}
                setResumeDialogOpen={setResumeDialogOpen}
                activeSessionInfo={activeSessionInfo}
                onContinue={() => {
                  setResumeDialogOpen(false)
                  const resumeSessionId = activeSessionInfo?.sessionId
                  const resumeMode = activeSessionInfo?.mode || selectedMode

                  if (activeSessionInfo?.cardsUnknown && activeSessionInfo?.cardsUnknown > 0 && resumeSessionId) {
                    startLoading('Đang chuẩn bị bộ câu hỏi chưa nhớ...')
                    fetch(`/api/sessions/${resumeSessionId}/flashcard-review`, {
                      method: 'POST',
                      headers: withCsrfHeaders(),
                    })
                      .then(async (res) => {
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'Failed to restart review')

                        if (data.sessionId) {
                          try {
                            updateStatus('Đang tải câu hỏi ôn tập...')
                            const [qRes, sRes] = await Promise.all([
                              fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.QUESTIONS(data.sessionId)}`),
                              fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}/${data.sessionId}`)
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
                        setTimeout(() => router.push(targetUrl), 400)
                      })
                      .catch((err) => {
                        stopLoading()
                        toast.error(err.message || 'Lỗi khi mở lại phiên ôn tập')
                      })
                  } else if (resumeSessionId) {
                    startLoading('Đang kết nối lại phiên học...')
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                    const targetUrl = resumeMode === 'flashcard'
                      ? (isMobile ? `/quiz/${quizId}/session/${resumeSessionId}/flashcard/mobile` : `/quiz/${quizId}/session/${resumeSessionId}/flashcard`)
                      : `/quiz/${quizId}/session/${resumeSessionId}`

                    Promise.all([
                      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.QUESTIONS(resumeSessionId)}`),
                      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.SESSIONS.BASE}/${resumeSessionId}`)
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
                        setTimeout(() => router.push(targetUrl), 400)
                      })
                  } else {
                    startLoading('Đang kết nối lại...')
                    startSessionMutation.mutate({ mode: resumeMode, difficulty: activeSessionInfo?.difficulty || selectedDifficulty, action: 'continue' })
                  }
                }}
                onRestart={() => {
                  setResumeDialogOpen(false)
                  startLoading('Đang làm mới...')
                  startSessionMutation.mutateAsync({ mode: activeSessionInfo?.mode, difficulty: activeSessionInfo?.difficulty, action: 'restart' })
                    .then(() => startSessionMutation.mutate({ mode: selectedMode, difficulty: selectedDifficulty }))
                }}
                onCloseResumeDialog={() => { setResumeDialogOpen(false); setModeSelectOpen(true); }}
                currentUser={currentUser}
                hasHistory={Boolean(historyData?.completed_at)}
                latestSessionId={historyData?.attempts?.[0]?.session_id ?? historyData?._id}
              />
            </div>

            <div className="quiz-detail-section order-4">
              <QuizStats numQuestions={quiz?.num_questions ?? 0} numAttempts={quiz?.num_attempts ?? 0} />
            </div>
          </div>

          {/* Quiz History for Mobile Only (order 3) */}
          <div className="lg:hidden order-3">
            <QuizHistory 
              quizId={resolvedQuizId}
              numQuestions={quiz?.num_questions ?? 0}
              historyData={historyData}
              isLoading={isHistoryLoading}
              currentUser={currentUser}
              onResumeSession={handleResumeSession}
              onAuthRequired={() => {
                const safeCallback = encodeURIComponent(`/quiz/${resolvedQuizId}`)
                router.push(`/login?callbackUrl=${safeCallback}`)
              }}
            />
          </div>

        </GsapStaggerContainer>
      </main>
    </div>
  )
}
