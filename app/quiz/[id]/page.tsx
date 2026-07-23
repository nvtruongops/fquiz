'use client'

import { useEffect, useState } from 'react'
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
import { QuizComments } from '@/components/quiz/detail/QuizComments'
import { QuizActionCard } from '@/components/quiz/detail/QuizActionCard'
import { QuizDetailErrorView } from '@/components/quiz/detail/QuizDetailErrorView'

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
  const [authRequiredDialogOpen, setAuthRequiredDialogOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'immediate' | 'review' | 'flashcard'>(
    () => (searchParams.get('mode') === 'flashcard' ? 'flashcard' : 'immediate')
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState<'sequential' | 'random'>('sequential')
  
  const { loadingOverlay, startLoading, completeLoading, stopLoading, updateStatus } = useQuizLoader()

  useEffect(() => {
    if (searchParams.get('reason') === 'session_expired') {
      toast.error('Phiên làm bài đã hết hiệu lực. Vui lòng bắt đầu phiên mới.')
    } else if (searchParams.get('reason') === 'idle_timeout') {
      toast.error('Phiên làm bài đã tự động kết thúc do bạn tạm dừng hoặc rời trang quá 5 phút.')
    } else if (searchParams.get('reason') === 'session_not_found') {
      toast.error('Phiên làm bài không tồn tại hoặc đã bị xóa. Vui lòng bắt đầu phiên mới.')
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
    enabled: resolvedQuizId.length > 0 && !!currentUser?._id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: historyData } = useQuery({
    queryKey: ['quiz-history-detail', quizId],
    queryFn: async () => {
      const res = await fetch(`/api/history/${resolvedQuizId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: resolvedQuizId.length > 0 && !!currentUser?._id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['quiz-comments', quizId],
    queryFn: async () => {
      const res = await fetch(API_ROUTES.PUBLIC.QUIZ_COMMENTS(resolvedQuizId))
      if (!res.ok) throw new Error('Failed to fetch comments')
      return res.json()
    },
    enabled: !!quizId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })


  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(API_ROUTES.PUBLIC.QUIZ_COMMENTS(resolvedQuizId), {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to post comment')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-comments', quizId] })
      toast.success('Đã gửi bình luận')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`${API_ROUTES.PUBLIC.QUIZ_COMMENTS(resolvedQuizId)}?commentId=${commentId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete comment')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-comments', quizId] })
      toast.success('Đã xóa bình luận')
    },
    onError: (err: any) => toast.error(err.message)
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

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-[#EAE7D6]/30">
      <Loader2 className="h-10 w-10 animate-spin text-[#5D7B6F]" />
    </div>
  )

  if (isError) return <QuizDetailErrorView error={error as any} router={router} />

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] font-sans">
      <QuizLoadingOverlay {...loadingOverlay} />
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#5D7B6F]/10 via-[#A4C3A2]/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-7xl mx-auto w-full">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-xs text-xs font-bold transition-all hover:-translate-x-1 active:translate-x-0 cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 transition-colors" />
                <span>Quay lại</span>
              </button>

              {baseCourseCode && (
                <Link
                  href={`/courses/${baseCourseCode}`}
                  className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Môn học:</span>
                  <span className="font-extrabold text-slate-800 uppercase">{displayCourseCode}</span>
                </Link>
              )}
            </div>
          )
        })()}

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
          
          {/* Header & Comments Column (Mobile order 1 & 3) */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-8 order-1 lg:order-1">
            <div className="bg-white/40 backdrop-blur-md border border-[#5D7B6F]/10 rounded-2xl sm:rounded-[32px] p-0.5 sm:p-1 shadow-xs">
              <QuizDetailHeader quiz={quiz ?? null} resolvedQuizId={resolvedQuizId} />
            </div>

            {/* Hidden on mobile, shown on desktop here to keep side-by-side */}
            <div className="hidden lg:block bg-white/40 backdrop-blur-md border border-[#5D7B6F]/10 rounded-[32px] p-6 shadow-xs">
              <QuizComments 
                quizId={resolvedQuizId}
                comments={comments}
                isLoading={isCommentsLoading}
                currentUser={currentUser}
                onPostComment={(c) => postCommentMutation.mutate(c)}
                onDeleteComment={(id) => deleteCommentMutation.mutate(id)}
                isPosting={postCommentMutation.isPending}
                isDeleting={deleteCommentMutation.isPending}
                onAuthRequired={() => setAuthRequiredDialogOpen(true)}
              />
            </div>
          </div>

          {/* Action Card & Stats Column (Mobile order 2 & 4) */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-8 lg:sticky lg:top-28 order-2 lg:order-2">
            <div className="bg-white/40 backdrop-blur-md border border-[#5D7B6F]/10 rounded-2xl sm:rounded-[32px] p-0.5 sm:p-1 shadow-xs">
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
                  if (activeSessionInfo?.cardsUnknown && activeSessionInfo?.cardsUnknown > 0 && activeSessionInfo?.sessionId) {
                    startLoading('Đang chuẩn bị bộ câu hỏi chưa nhớ...')
                    fetch(`/api/sessions/${activeSessionInfo.sessionId}/flashcard-review`, {
                      method: 'POST',
                      headers: withCsrfHeaders(),
                    })
                      .then(async (res) => {
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'Failed to restart review')

                        // PRE-LOAD QUESTIONS AND SESSION FOR REVIEW
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
                  } else {
                    startLoading('Đang kết nối lại...')
                    startSessionMutation.mutate({ mode: activeSessionInfo?.mode, difficulty: activeSessionInfo?.difficulty, action: 'continue' })
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
                authRequiredDialogOpen={authRequiredDialogOpen}
                setAuthRequiredDialogOpen={setAuthRequiredDialogOpen}
                hasHistory={Boolean(historyData?.completed_at)}
                latestSessionId={historyData?.attempts?.[0]?.session_id ?? historyData?._id}
              />
            </div>

            <div className="bg-white/40 backdrop-blur-md border border-[#5D7B6F]/10 rounded-2xl sm:rounded-[32px] p-0.5 sm:p-1 shadow-xs overflow-hidden order-4">
              <QuizStats numQuestions={quiz?.num_questions ?? 0} numAttempts={quiz?.num_attempts ?? 0} />
            </div>
          </div>

          {/* Comments for Mobile Only (order 3) */}
          <div className="lg:hidden order-3 bg-white/40 backdrop-blur-md border border-[#5D7B6F]/10 rounded-2xl sm:rounded-[32px] p-0.5 sm:p-1 shadow-xs overflow-hidden">
            <QuizComments 
              quizId={resolvedQuizId}
              comments={comments}
              isLoading={isCommentsLoading}
              currentUser={currentUser}
              onPostComment={(c) => postCommentMutation.mutate(c)}
              onDeleteComment={(id) => deleteCommentMutation.mutate(id)}
              isPosting={postCommentMutation.isPending}
              isDeleting={deleteCommentMutation.isPending}
              onAuthRequired={() => setAuthRequiredDialogOpen(true)}
            />
          </div>

        </div>
      </main>
    </div>
  )
}
