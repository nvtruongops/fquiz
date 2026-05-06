'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'
import { useQuizLoader, QuizLoadingOverlay } from '@/components/quiz/QuizLoader'

// Sub-components
import { QuizDetailHeader } from '@/components/quiz/QuizDetailHeader'
import { QuizStats } from '@/components/quiz/QuizStats'
import { QuizComments } from '@/components/quiz/QuizComments'
import { QuizActionCard } from '@/components/quiz/QuizActionCard'
import { QuizDetailErrorView } from '@/components/quiz/QuizDetailErrorView'

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
  difficulty: 'sequential' | 'random'
  answeredCount: number
  totalQuestions: number
  started_at: string
}

type QuizDetailApiError = Error & { status?: number; code?: string; hint?: string }
type StartSessionError = Error & { status?: number; code?: string; activeSession?: ActiveSessionPayload }

async function fetchQuizDetail(id: string): Promise<QuizDetail> {
  // Always try the student API first because `auth-token` is httpOnly and cannot be read via document.cookie
  try {
    const studentRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${id}`)
    
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
      // 401 = Guest user, 404 = Not in student's library. Fallback to public API.
      console.warn(`Student API returned ${studentRes.status}, falling back to public API`)
    } else {
      // 403 Forbidden or 500 Server Error should be thrown to the user
      const data = (await studentRes.json().catch(() => ({}))) as { error?: string; code?: string; hint?: string }
      const error = new Error(data.error || `Bạn không có quyền truy cập bộ đề này (Lỗi ${studentRes.status}).`) as QuizDetailApiError
      error.status = studentRes.status
      error.code = data.code
      error.hint = data.hint
      throw error
    }
  } catch (e) {
    if ((e as QuizDetailApiError).status && (e as QuizDetailApiError).status !== 401 && (e as QuizDetailApiError).status !== 404) {
      throw e
    }
    // Network errors or 401/404 fall through to public API
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/quizzes/${id}`)
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
    _id: publicQuiz._id,
    title: publicQuiz.title,
    description: publicQuiz.description || '',
    category_id: { name: publicQuiz.category_id?.name || 'Chung' },
    course_code: publicQuiz.course_code,
    num_questions: publicQuiz.questionCount || 0,
    num_attempts: publicQuiz.studentCount || 0,
    created_at: publicQuiz.created_at || publicQuiz.createdAt,
    is_temp: publicQuiz.is_temp,
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
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
  const [modeSelectOpen, setModeSelectOpen] = useState(false)
  const [activeSessionInfo, setActiveSessionInfo] = useState<ActiveSessionPayload | null>(null)
  const [authRequiredDialogOpen, setAuthRequiredDialogOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'immediate' | 'review' | 'flashcard'>('immediate')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'sequential' | 'random'>('sequential')
  
  const { loadingOverlay, startLoading, completeLoading, stopLoading } = useQuizLoader()

  useEffect(() => {
    if (searchParams.get('reason') !== 'session_expired') return
    toast.error('Phiên làm bài đã hết hiệu lực. Vui lòng bắt đầu phiên mới.')
  }, [searchParams, toast])

  const { data: quiz, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuizDetail(resolvedQuizId),
    enabled: resolvedQuizId.length > 0,
  })

  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      const data = await res.json()
      return data.user || data
    },
  })

  const { data: activeSessionData } = useQuery({
    queryKey: ['active-session', quizId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions?quiz_id=${quizId}`)
      if (!res.ok) return { assessmentSession: null, learningSession: null }
      return res.json()
    },
    enabled: resolvedQuizId.length > 0 && !!currentUser?._id,
  })

  const startSessionMutation = useMutation({
    mutationFn: async ({ mode, difficulty, action }: any) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions`, {
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
      return (await res.json()) as CreateSessionResponse
    },
    onSuccess: (data) => {
      const nextSessionId = data.sessionId
      if (!nextSessionId) return // Old session deleted, wait for new one

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const targetUrl = data.mode === 'flashcard' 
        ? (isMobile ? `/quiz/${quizId}/session/${nextSessionId}/flashcard/mobile` : `/quiz/${quizId}/session/${nextSessionId}/flashcard`)
        : `/quiz/${quizId}/session/${nextSessionId}`

      completeLoading()
      setTimeout(() => router.push(targetUrl), 300)
    },
    onError: (error: StartSessionError) => {
      stopLoading()
      if (error.status === 401) {
        toast.error('Bạn cần đăng nhập để làm bài quiz này')
        setTimeout(() => router.push(`/login?redirect=/quiz/${quizId}`), 1500)
        return
      }
      toast.error(error.message)
    },
  })

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['quiz-comments', quizId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/public/quizzes/${quizId}/comments`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      return res.json()
    },
    enabled: !!quizId,
  })


  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/v1/public/quizzes/${quizId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCookie('csrf-token') || '' },
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
      const res = await fetch(`/api/v1/public/quizzes/${quizId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCookie('csrf-token') || '' },
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
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-[#5D7B6F]/3 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-[#A4C3A2]/5 blur-[100px]" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-4 py-6 pb-28 md:pb-10">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-8">
            <QuizDetailHeader quiz={quiz ?? null} resolvedQuizId={resolvedQuizId} />
            <QuizStats numQuestions={quiz?.num_questions ?? 0} numAttempts={quiz?.num_attempts ?? 0} />
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
              startLoading('Đang kết nối lại...')
              startSessionMutation.mutate({ mode: activeSessionInfo?.mode, difficulty: activeSessionInfo?.difficulty, action: 'continue' })
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
          />
        </div>
      </main>
    </div>
  )
}
