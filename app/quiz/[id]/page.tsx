'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  HelpCircle,
  PlayCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Users,
  Shuffle,
  AlignJustify,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'
import { cn } from '@/lib/utils'
import { useQuizLoader, QuizLoadingOverlay } from '@/components/quiz/QuizLoader'

interface QuizDetail {
  _id: string
  title: string
  description: string
  category_id: { name: string }
  course_code: string
  num_questions: number
  num_attempts: number
  created_at: string
}

interface CreateSessionResponse {
  sessionId?: string
  mode?: string
  difficulty?: 'sequential' | 'random'
  resumed?: boolean
  currentQuestionIndex?: number
  totalQuestions?: number
}

interface ActiveSessionPayload {
  sessionId: string
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty: 'sequential' | 'random'
  current_question_index: number
  totalQuestions: number
  answeredCount: number
  started_at: string
}

type StartAction = 'continue' | 'restart'

type StartSessionRequest = {
  mode: 'immediate' | 'review' | 'flashcard'
  difficulty: 'sequential' | 'random'
  action?: StartAction
}

type StartSessionError = Error & {
  status?: number
  code?: string
  activeSession?: ActiveSessionPayload
}

type QuizDetailApiError = Error & {
  status?: number
  code?: string
  hint?: string
}

interface QuizComment {
  _id: string
  user_id: {
    username: string
    avatar_url: string | null
    avatarUrl?: string | null
    name?: string
    _id?: string
  }
  content: string
  created_at: string
}

async function fetchQuizDetail(id: string): Promise<QuizDetail> {
  // First try authenticated student API (for own quizzes)
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
    }
  }

  // Fallback to public API (for public quizzes from explore)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/quizzes/${id}`)
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; hint?: string }
    const error = new Error(
      res.status === 404
        ? 'Bộ đề này không tồn tại hoặc đã bị xóa.'
        : res.status === 403
          ? 'Bộ đề này là riêng tư. Bạn không có quyền truy cập.'
          : res.status === 401
            ? 'Bạn cần đăng nhập để xem bộ đề này.'
            : data.error || 'Không thể tải thông tin đề thi.'
    ) as QuizDetailApiError
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
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

async function fetchComments(quizId: string): Promise<QuizComment[]> {
  const res = await fetch(`/api/v1/public/quizzes/${quizId}/comments`)
  if (!res.ok) throw new Error('Failed to fetch comments')
  return res.json()
}

async function postComment({ quizId, content }: { quizId: string, content: string }): Promise<QuizComment> {
  const csrfToken = getCookie('csrf-token')
  const res = await fetch(`/api/v1/public/quizzes/${quizId}/comments`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken || '',
    },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to post comment')
  }
  return res.json()
}

async function deleteComment({ quizId, commentId }: { quizId: string, commentId: string }): Promise<void> {
  const csrfToken = getCookie('csrf-token')
  const res = await fetch(`/api/v1/public/quizzes/${quizId}/comments?commentId=${commentId}`, {
    method: 'DELETE',
    headers: {
      'x-csrf-token': csrfToken || '',
    },
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete comment')
  }
}

export default function QuizDetailPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const params = useParams<{ id?: string | string[] }>()
  const rawQuizId = params?.id
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const resolvedQuizId = quizId ?? ''
  const { toast } = useToast()
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false)
  const [modeSelectOpen, setModeSelectOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<'immediate' | 'review' | null>(null)
  const [pendingDifficulty, setPendingDifficulty] = useState<'sequential' | 'random' | null>(null)
  const [activeSessionInfo, setActiveSessionInfo] = useState<ActiveSessionPayload | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Use professional QuizLoader hook
  const { loadingOverlay, startLoading, completeLoading, stopLoading } = useQuizLoader()
  
  // Dropdown states
  const [selectedMode, setSelectedMode] = useState<'immediate' | 'review' | 'flashcard'>('immediate')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'sequential' | 'random'>('sequential')

  useEffect(() => {
    if (searchParams.get('reason') !== 'session_expired') return
    toast.error('Phiên làm bài đã hết hiệu lực. Vui lòng bắt đầu phiên mới.')
  }, [searchParams, toast])

  const { data: quiz, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuizDetail(resolvedQuizId),
    enabled: resolvedQuizId.length > 0,
  })

  // Pre-check active session when page loads (authenticated users only)
  const { data: activeSessionData } = useQuery({
    queryKey: ['active-session', quizId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions?quiz_id=${quizId}`)
      if (!res.ok) return { assessmentSession: null, learningSession: null }
      return res.json() as Promise<{ 
        assessmentSession: ActiveSessionPayload | null
        learningSession: ActiveSessionPayload | null 
      }>
    },
    enabled: resolvedQuizId.length > 0,
    staleTime: 0,
  })

  const startSessionMutation = useMutation({
    mutationFn: async ({ mode, difficulty, action }: StartSessionRequest) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quiz_id: quizId, mode, difficulty, ...(action ? { action } : {}) }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
          activeSession?: ActiveSessionPayload
        }
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

      if (!nextSessionId) {
        // Restart step 1 completed (old session deleted).
        // Step 2 (create new session) will be triggered by handleRestartSession.
        // Keep loading state — do NOT stopLoading here.
        return
      }
      // Clear pending state and close dialog
      setPendingMode(null)
      setPendingDifficulty(null)
      setActiveSessionInfo(null)
      setResumeDialogOpen(false)
      
      if (!nextSessionId || nextSessionId === 'undefined') {
        toast.error('Không tìm thấy phiên thi hợp lệ. Vui lòng thử lại.')
        stopLoading()
        return
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const targetUrl = data.mode === 'flashcard' 
        ? (isMobile ? `/quiz/${quizId}/session/${nextSessionId}/flashcard/mobile` : `/quiz/${quizId}/session/${nextSessionId}/flashcard`)
        : `/quiz/${quizId}/session/${nextSessionId}`

      // Preload the target page's data to eliminate double loading
      Promise.all([
        data.mode === 'flashcard' 
          ? Promise.all([
              // Prefetch session data
              queryClient.prefetchQuery({
                queryKey: ['flashcard-session', nextSessionId],
                queryFn: async () => {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${nextSessionId}`)
                  return res.json()
                }
              }),
              // Prefetch all questions to prevent second loading screen
              queryClient.prefetchQuery({
                queryKey: ['flashcard-session', nextSessionId, 'all-questions'],
                queryFn: async () => {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${nextSessionId}/questions`)
                  return res.json()
                }
              })
            ])
          : Promise.all([
              queryClient.prefetchQuery({
                queryKey: ['sessions', nextSessionId, 'initial'],
                queryFn: async () => {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${nextSessionId}`)
                  return res.json()
                }
              }),
              queryClient.prefetchQuery({
                queryKey: ['sessions', nextSessionId, 'all-questions'],
                queryFn: async () => {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${nextSessionId}/questions`)
                  return res.json()
                }
              })
            ])
      ]).then(() => {
        // Slide loading to 100% after API data is fully cached
        completeLoading()
        
        setTimeout(() => {
          router.push(targetUrl)
        }, 300)
      }).catch((e) => {
        console.error("Prefetch failed", e)
        // Fallback to push anyway
        completeLoading()
        setTimeout(() => {
          router.push(targetUrl)
        }, 300)
      })
    },
    onError: (error: StartSessionError, variables) => {
      stopLoading() // stop loading on error

      if (error.status === 401) {
        toast.error('Bạn cần đăng nhập để làm bài quiz này')
        setTimeout(() => {
          router.push(`/login?redirect=/quiz/${quizId}`)
        }, 1500)
        return
      }

      // 409 shouldn't happen now since we pre-check, but handle gracefully
      if (error.status === 409 && error.code === 'ACTIVE_SESSION_EXISTS') {
        if (error.activeSession) {
          setActiveSessionInfo(error.activeSession)
          setResumeDialogOpen(true)
        }
        return
      }

      toast.error(error.message)
    },
  })

  // Comments logic
  const [commentContent, setCommentContent] = useState('')
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['quiz-comments', quizId],
    queryFn: () => fetchComments(quizId!),
    enabled: !!quizId,
  })

  const postCommentMutation = useMutation({
    mutationFn: postComment,
    onSuccess: () => {
      setCommentContent('')
      queryClient.invalidateQueries({ queryKey: ['quiz-comments', quizId] })
      toast.success('Đã gửi bình luận')
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })

  const handlePostComment = () => {
    if (!commentContent.trim()) return
    postCommentMutation.mutate({ quizId: quizId!, content: commentContent })
  }

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      const data = await res.json()
      return data.user || data
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-comments', quizId] })
      toast.success('Đã xóa bình luận')
      setIsDeleteDialogOpen(false)
      setCommentToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })

  function handleSelectMode(mode: 'immediate' | 'review' | 'flashcard', difficulty: 'sequential' | 'random') {
    const LEARNING_MODES = ['flashcard']
    const selectedModeGroup = LEARNING_MODES.includes(mode) ? 'learning' : 'assessment'
    
    // Save selected mode and difficulty for potential restart
    setPendingMode(mode === 'flashcard' ? null : mode)
    setPendingDifficulty(difficulty)
    setSelectedMode(mode)
    setSelectedDifficulty(difficulty)
    
    // Check if there's an active session in the selected mode's group
    const existingInGroup = selectedModeGroup === 'learning' 
      ? activeSessionData?.learningSession 
      : activeSessionData?.assessmentSession
    
    if (existingInGroup) {
      // Show resume dialog for existing session in this group
      setModeSelectOpen(false)
      setActiveSessionInfo(existingInGroup)
      setResumeDialogOpen(true)
    } else {
      // No conflict, create new session
      setModeSelectOpen(false)
      startLoading('Đang tải dữ liệu bộ câu hỏi...')
      startSessionMutation.mutate({ mode, difficulty })
    }
  }

  // "Chọn chế độ học" click - show mode selection directly (no pre-check)
  function handleStartClick() {
    setModeSelectOpen(true)
  }

  function handleContinueSession() {
    if (!activeSessionInfo?.sessionId) return
    setResumeDialogOpen(false)
    startLoading('Đang kết nối lại phiên học...')
    // Call continue action to get questions preloaded
    startSessionMutation.mutate({
      mode: activeSessionInfo.mode,
      difficulty: activeSessionInfo.difficulty,
      action: 'continue',
    })
  }

  function handleRestartSession() {
    if (!activeSessionInfo) return

    const targetMode = selectedMode
    const targetDifficulty = selectedDifficulty

    setResumeDialogOpen(false)
    startLoading('Đang làm mới tiến trình...')

    // Step 1: delete old session
    startSessionMutation.mutateAsync({
      mode: activeSessionInfo.mode,
      difficulty: activeSessionInfo.difficulty,
      action: 'restart',
    }).then(() => {
      // Step 2: create new session with the chosen mode
      startSessionMutation.mutate({ mode: targetMode, difficulty: targetDifficulty })
    }).catch((error) => {
      console.error('Restart failed:', error)
      stopLoading()
      toast.error('Không thể làm mới session')
    })
  }

  function handleCloseResumeDialog() {
    // Close resume dialog and go back to mode selection
    setResumeDialogOpen(false)
    setActiveSessionInfo(null)
    // Small delay to ensure resume dialog is closed
    setTimeout(() => {
      setModeSelectOpen(true)
    }, 100)
  }

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#EAE7D6]/30">
        <Loader2 className="h-10 w-10 animate-spin text-[#5D7B6F]" />
      </div>
    )

  if (!quizId)
    return (
      <div className="h-screen bg-[#EAE7D6]/30 p-4 text-center">
        <div className="mx-auto mt-24 max-w-md rounded-2xl border-2 border-gray-100 bg-white p-10 shadow-xl">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-black uppercase">ID không hợp lệ</h2>
          <p className="mb-8 font-bold text-gray-400">Không tìm thấy mã đề thi hợp lệ trong đường dẫn.</p>
          <Button onClick={() => router.back()} className="w-full bg-[#5D7B6F] py-6 text-white">
            Quay lại
          </Button>
        </div>
      </div>
    )

  if (isError)
    return (
      <div className="h-screen bg-[#EAE7D6]/30 p-4 text-center">
        <div className="mx-auto mt-24 max-w-md rounded-2xl border-2 border-gray-100 bg-white p-10 shadow-xl">
          {(error as QuizDetailApiError)?.status === 403 ? (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <ShieldCheck className="h-8 w-8 text-orange-400" />
            </div>
          ) : (error as QuizDetailApiError)?.status === 404 ? (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
              <HelpCircle className="h-8 w-8 text-gray-400" />
            </div>
          ) : (
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          )}

          <h2 className="mb-2 text-xl font-black uppercase tracking-tight">
            {(error as QuizDetailApiError)?.status === 403
              ? 'Không có quyền truy cập'
              : (error as QuizDetailApiError)?.status === 404
                ? 'Không tìm thấy bộ đề'
                : (error as QuizDetailApiError)?.code === 'QUIZ_SOURCE_LOCKED'
                  ? 'Không thể làm lại quiz này'
                  : 'Đã xảy ra lỗi'}
          </h2>

          <p className="mb-8 font-medium text-gray-500">
            {(error as Error | undefined)?.message || 'Không thể tải thông tin đề thi này.'}
          </p>

          {(error as QuizDetailApiError | undefined)?.hint && (
            <p className="mb-6 text-sm text-gray-400">{(error as QuizDetailApiError).hint}</p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(error as QuizDetailApiError)?.code === 'QUIZ_SOURCE_LOCKED' ? (
              <>
                <Button asChild className="bg-[#5D7B6F] py-6 text-white">
                  <Link href="/my-quizzes">Về Bộ đề của tôi</Link>
                </Button>
                <Button asChild variant="outline" className="py-6">
                  <Link href="/history">Xem Lịch sử</Link>
                </Button>
              </>
            ) : (error as QuizDetailApiError)?.status === 403 ? (
              <>
                <Button asChild className="bg-[#5D7B6F] py-6 text-white">
                  <Link href="/explore">Khám phá bộ đề</Link>
                </Button>
                <Button asChild variant="outline" className="py-6">
                  <Link href="/my-quizzes">Bộ đề của tôi</Link>
                </Button>
              </>
            ) : (
              <Button onClick={() => router.back()} className="col-span-2 w-full bg-[#5D7B6F] py-6 text-white">
                Quay lại
              </Button>
            )}
          </div>
        </div>
      </div>
    )

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFDFB] font-sans">
      {/* Premium Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-[#5D7B6F]/3 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-[#A4C3A2]/5 blur-[100px]" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-4 py-6 pb-28 md:pb-10">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-8">
            {/* Main Quiz Header Card */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#5D7B6F]/5 blur-2xl" />
              
              <div className="relative space-y-6">
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-[#5D7B6F] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-[#5D7B6F]/20">
                    {quiz?.category_id?.name || 'Chung'}
                  </span>
                  <div className="h-4 w-px bg-gray-100" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    ID: {resolvedQuizId.slice(-8).toUpperCase()}
                  </span>
                </div>

                <h1 className="text-3xl font-normal leading-tight tracking-tight text-gray-900 lg:text-4xl">{quiz?.course_code}</h1>

                {quiz?.description && (
                  <div className="max-w-2xl border-l-3 border-[#A4C3A2] py-1 pl-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5D7B6F] mb-2 opacity-60">Mô tả bộ đề</p>
                    <p className="text-[13px] font-medium leading-relaxed text-gray-500/90 whitespace-pre-wrap">{quiz.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="group flex items-center gap-5 rounded-2xl border border-gray-50 bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.01)] transition-all hover:shadow-xl hover:shadow-[#5D7B6F]/5 hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50/50 text-blue-500 ring-1 ring-blue-100 transition-all group-hover:scale-110 group-hover:bg-blue-50">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Quy mô nội dung</p>
                  <p className="text-xl font-normal text-gray-900 tracking-tight">{quiz?.num_questions} <span className="text-[10px] font-bold text-gray-300">CÂU HỎI</span></p>
                </div>
              </div>

              <div className="group flex items-center gap-5 rounded-2xl border border-gray-50 bg-white p-5 shadow-[0_4px_20px_rgb(0,0,0,0.01)] transition-all hover:shadow-xl hover:shadow-[#5D7B6F]/5 hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50/50 text-green-500 ring-1 ring-green-100 transition-all group-hover:scale-110 group-hover:bg-green-50">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Độ phổ biến</p>
                  <p className="text-xl font-normal text-gray-900 tracking-tight">{quiz?.num_attempts ?? 0} <span className="text-[10px] font-bold text-gray-300">LƯỢT THI</span></p>
                </div>
              </div>
            </div>

            {/* Comments Section moved here to avoid whitespace issues */}
            <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D7B6F]/5 text-[#5D7B6F]">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.1em] text-gray-900">Thảo luận cộng đồng</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{comments.length} đóng góp</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Comment Input */}
              <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all focus-within:shadow-md focus-within:border-[#5D7B6F]/30">
                <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                  <Avatar className="h-8 w-8 border border-gray-100 shadow-sm">
                    <AvatarImage src={currentUser?.avatarUrl || currentUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#5D7B6F] text-white text-[10px] font-black">
                      {(currentUser?.username || currentUser?.name || '??').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#5D7B6F]">Viết bình luận của bạn</p>
                </div>
                
                <div className="space-y-4">
                  <Textarea 
                    placeholder="Chia sẻ suy nghĩ hoặc thắc mắc của bạn về bộ đề này..." 
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="min-h-[80px] w-full resize-none border-none bg-transparent p-0 text-[14px] font-medium text-gray-700 placeholder:text-gray-300 focus-visible:ring-0 focus:outline-none"
                  />
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Tối đa 1000 ký tự</p>
                    <Button 
                      onClick={handlePostComment}
                      disabled={postCommentMutation.isPending || !commentContent.trim()}
                      className="bg-[#5D7B6F] h-9 px-5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-[#5D7B6F]/10 hover:bg-[#4a6358] hover:translate-y-[-1px] active:translate-y-0 transition-all"
                    >
                      {postCommentMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-2">
                          Gửi bình luận <Send className="h-3 w-3" />
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-8 mt-2">
                {isCommentsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-200" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-200">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium text-gray-400 italic">Chưa có bình luận nào cho bộ đề này.</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mt-2">Hãy là người đầu tiên chia sẻ cảm nghĩ!</p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    // Handle deleted user case
                    const user = comment.user_id || { username: 'Người dùng đã xóa', name: 'Người dùng đã xóa', avatar_url: null, avatarUrl: null }
                    
                    return (
                      <div key={comment._id} className="group flex gap-4 animate-in fade-in duration-500">
                        <Avatar className="h-8 w-8 shrink-0 border-2 border-white shadow-sm ring-1 ring-gray-100">
                          <AvatarImage src={user.avatar_url || user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#5D7B6F]/10 text-[#5D7B6F] text-[10px] font-black uppercase">
                            {(user.username || user.name || '??').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-gray-900">{user.username || user.name || 'Thành viên'}</span>
                              <span className="h-1 w-1 rounded-full bg-gray-200" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: vi })}
                              </span>
                            </div>
                            {currentUser && comment.user_id && String(currentUser._id) === String((comment.user_id as any)._id) && (
                              <button 
                                onClick={() => {
                                  setCommentToDelete(comment._id)
                                  setIsDeleteDialogOpen(true)
                                }}
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all p-1.5 rounded-lg"
                                title="Xóa bình luận"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="relative rounded-sm bg-gray-50/50 p-3.5 transition-colors group-hover:bg-gray-50">
                            <p className="text-[13px] leading-relaxed text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                            <div className="absolute -left-1 top-3 h-2.5 w-2.5 rotate-45 bg-gray-50/50 group-hover:bg-gray-50" />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4 order-2 lg:order-none">
            <div className="sticky top-10 space-y-5">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="mb-6 border-b border-gray-50 pb-5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#5D7B6F]">Tùy chọn học tập</h3>
                  <p className="mt-2 text-[10px] font-medium text-gray-400 uppercase">Cấu hình phiên làm bài của bạn</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-[#5D7B6F]">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-900">Auto-Grading</p>
                      <p className="text-[8px] font-medium text-gray-400 uppercase">Chấm điểm tự động 100%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-amber-500">
                      <Zap className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-900">Instant Feedback</p>
                      <p className="text-[8px] font-medium text-gray-400 uppercase">Phản hồi kết quả tức thì</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm text-blue-500">
                      <LayoutDashboard className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-900">Standard UI</p>
                      <p className="text-[8px] font-medium text-gray-400 uppercase">Phòng thi chuẩn cấu trúc</p>
                    </div>
                  </div>
                </div>

                <Dialog open={modeSelectOpen} onOpenChange={setModeSelectOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={handleStartClick}
                      className="group relative flex h-11 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#5D7B6F] text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-[#5D7B6F]/30 transition-all hover:bg-[#4a6358] hover:translate-y-[-2px] active:translate-y-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      BẮT ĐẦU NGAY <PlayCircle className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[650px] max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <ScrollArea className="flex-1 overflow-y-auto px-6 py-4">
                      <DialogHeader className="pb-4">
                        <DialogTitle className="text-center text-xl sm:text-2xl font-black uppercase tracking-[0.1em] text-[#5D7B6F]">
                          Chọn chế độ làm bài
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-center text-sm text-gray-500 font-medium">
                          Chọn chế độ và độ khó phù hợp với mục tiêu học tập của bạn
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-5 py-4">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                            1. Phương thức học tập
                          </label>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div 
                              onClick={() => setSelectedMode('immediate')}
                              className={cn(
                                "relative group cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300",
                                selectedMode === 'immediate' 
                                  ? "border-green-500 bg-green-50/50 ring-4 ring-green-500/10" 
                                  : "border-gray-100 bg-white hover:border-green-200 hover:shadow-lg hover:-translate-y-1"
                              )}
                            >
                              <div className={cn(
                                "mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500",
                                selectedMode === 'immediate' ? "bg-green-500 text-white shadow-lg shadow-green-200" : "bg-green-50 text-green-500 group-hover:scale-110"
                              )}>
                                <Zap className="h-5 w-5" />
                              </div>
                              <h3 className="font-black text-[13px] text-gray-900 uppercase tracking-tight">Luyện tập</h3>
                              <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-gray-500">Xem đáp án & giải thích ngay sau mỗi câu</p>
                              {selectedMode === 'immediate' && (
                                <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                              )}
                            </div>

                            <div 
                              onClick={() => setSelectedMode('review')}
                              className={cn(
                                "relative group cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300",
                                selectedMode === 'review' 
                                  ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10" 
                                  : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg hover:-translate-y-1"
                              )}
                            >
                              <div className={cn(
                                "mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500",
                                selectedMode === 'review' ? "bg-blue-500 text-white shadow-lg shadow-blue-200" : "bg-blue-50 text-blue-500 group-hover:scale-110"
                              )}>
                                <BookOpen className="h-5 w-5" />
                              </div>
                              <h3 className="font-black text-[13px] text-gray-900 uppercase tracking-tight">Kiểm tra</h3>
                              <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-gray-500">Thi thử chuẩn cấu trúc, chấm điểm sau khi nộp</p>
                              {selectedMode === 'review' && (
                                <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse" />
                              )}
                            </div>

                            <div 
                              onClick={() => setSelectedMode('flashcard')}
                              className={cn(
                                "relative group cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300",
                                selectedMode === 'flashcard' 
                                  ? "border-purple-500 bg-purple-50/50 ring-4 ring-purple-500/10" 
                                  : "border-gray-100 bg-white hover:border-purple-200 hover:shadow-lg hover:-translate-y-1"
                              )}
                            >
                              <div className={cn(
                                "mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500",
                                selectedMode === 'flashcard' ? "bg-purple-500 text-white shadow-lg shadow-purple-200" : "bg-purple-50 text-purple-500 group-hover:scale-110"
                              )}>
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <rect x="2" y="6" width="20" height="12" rx="2" />
                                  <path d="M12 6v12" />
                                </svg>
                              </div>
                              <h3 className="font-black text-[13px] text-gray-900 uppercase tracking-tight">Lật thẻ</h3>
                              <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-gray-500">Phương pháp ghi nhớ chủ động (Flashcard)</p>
                              {selectedMode === 'flashcard' && (
                                <div className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                            2. Cấu hình nội dung
                          </label>
                          <div className="flex p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                            <button
                              onClick={() => setSelectedDifficulty('sequential')}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                selectedDifficulty === 'sequential' 
                                  ? "bg-white text-[#5D7B6F] shadow-sm border border-gray-100" 
                                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                              )}
                            >
                              <AlignJustify className="h-3.5 w-3.5" />
                              Hiển thị theo thứ tự
                            </button>
                            <button
                              onClick={() => setSelectedDifficulty('random')}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                selectedDifficulty === 'random' 
                                  ? "bg-white text-[#5D7B6F] shadow-sm border border-gray-100" 
                                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                              )}
                            >
                              <Shuffle className="h-3.5 w-3.5" />
                              Xáo trộn ngẫu nhiên
                            </button>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 pt-2 bg-gray-50/50 border-t border-gray-100">
                      <Button
                        onClick={() => handleSelectMode(selectedMode, selectedDifficulty)}
                        disabled={startSessionMutation.isPending}
                        className="w-full h-12 text-sm bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl shadow-lg shadow-[#5D7B6F]/20"
                      >
                        {startSessionMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Đang khởi tạo...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="mr-2 h-5 w-5" />
                            Bắt đầu
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
                  <DialogContent className="w-[calc(100vw-2rem)] border-none bg-transparent p-0 sm:max-w-[500px]">
                    <div className="rounded-sm border border-gray-100 bg-white px-6 py-6 shadow-2xl sm:px-8 sm:py-8">
                      <DialogHeader className="mb-4">
                        <div className="flex items-center justify-between">
                          <DialogTitle className="text-xl font-normal uppercase tracking-[0.15em] text-[#5D7B6F]">
                            Bài quiz chưa hoàn thành
                          </DialogTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={handleCloseResumeDialog}
                          >
                            <span className="text-xl text-gray-400 hover:text-gray-600">×</span>
                          </Button>
                        </div>
                        <DialogDescription asChild>
                          <div className="pt-3 space-y-3">
                            <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                              <p className="text-2xl font-black text-[#5D7B6F]">
                                {activeSessionInfo?.answeredCount ?? 0}
                                <span className="text-base font-bold text-gray-400">/{activeSessionInfo?.totalQuestions ?? 0} câu</span>
                              </p>
                              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-[#5D7B6F] transition-all"
                                  style={{
                                    width: `${activeSessionInfo?.totalQuestions
                                      ? Math.round(((activeSessionInfo.answeredCount) / activeSessionInfo.totalQuestions) * 100)
                                      : 0}%`
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg border border-gray-100 px-3 py-2">
                                <p className="font-black uppercase tracking-wider text-gray-400">Chế độ</p>
                                <div className="mt-1 flex items-center gap-1.5 font-bold text-gray-700">
                                  {activeSessionInfo?.mode === 'immediate' ? (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-600">
                                        <Zap className="h-3 w-3" />
                                      </div>
                                      Luyện tập
                                    </>
                                  ) : activeSessionInfo?.mode === 'flashcard' ? (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-purple-600">
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="2" y="6" width="20" height="12" rx="2" />
                                          <path d="M12 6v12" />
                                        </svg>
                                      </div>
                                      Lật thẻ
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600">
                                        <BookOpen className="h-3 w-3" />
                                      </div>
                                      Kiểm tra
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-100 px-3 py-2">
                                <p className="font-black uppercase tracking-wider text-gray-400">Độ khó</p>
                                <div className="mt-1 flex items-center gap-1.5 font-bold text-gray-700">
                                  {activeSessionInfo?.mode === 'immediate' && activeSessionInfo?.difficulty === 'sequential' && (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-600">
                                        <Zap className="h-3 w-3" />
                                      </div>
                                      Học nhanh
                                    </>
                                  )}
                                  {activeSessionInfo?.mode === 'immediate' && activeSessionInfo?.difficulty === 'random' && (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-600">
                                        <Shuffle className="h-3 w-3" />
                                      </div>
                                      Học sâu
                                    </>
                                  )}
                                  {activeSessionInfo?.mode === 'review' && activeSessionInfo?.difficulty === 'sequential' && (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600">
                                        <AlignJustify className="h-3 w-3" />
                                      </div>
                                      Chế độ dễ
                                    </>
                                  )}
                                  {activeSessionInfo?.mode === 'review' && activeSessionInfo?.difficulty === 'random' && (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600">
                                        <Shuffle className="h-3 w-3" />
                                      </div>
                                      Chế độ khó
                                    </>
                                  )}
                                  {activeSessionInfo?.mode === 'flashcard' && activeSessionInfo?.difficulty === 'sequential' && (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-purple-600">
                                        <AlignJustify className="h-3 w-3" />
                                      </div>
                                      Theo thứ tự
                                    </>
                                  )}
                                  {activeSessionInfo?.mode === 'flashcard' && activeSessionInfo?.difficulty === 'random' && (
                                    <>
                                      <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-purple-600">
                                        <Shuffle className="h-3 w-3" />
                                      </div>
                                      Ngẫu nhiên
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className="text-center text-sm text-gray-500">
                              Bạn muốn tiếp tục bài đang làm hay làm mới từ đầu?
                            </p>
                          </div>
                        </DialogDescription>
                      </DialogHeader>

                      <DialogFooter className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button
                          type="button"
                          onClick={handleContinueSession}
                          disabled={startSessionMutation.isPending}
                          className="bg-[#5D7B6F] text-white hover:bg-[#4a6358]"
                        >
                          {startSessionMutation.isPending ? 'Đang tải...' : 'Tiếp tục làm'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRestartSession}
                          disabled={startSessionMutation.isPending}
                        >
                          Làm mới (xóa bài cũ)
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>

                <p className="mt-6 text-center text-[9px] uppercase tracking-widest leading-loose text-gray-300">
                  Đề thi được cung cấp bởi <br /> FQuiz Educational Platform
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <QuizLoadingOverlay
        isOpen={loadingOverlay.isOpen}
        progress={loadingOverlay.progress}
        status={loadingOverlay.status}
      />

      {/* Professional Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[400px] border-none p-0 overflow-hidden shadow-2xl">
          <div className="bg-white p-6 sm:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2 className="h-8 w-8" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-900">
                  Xác nhận xóa
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-500 pt-2 leading-relaxed">
                  Bạn có chắc chắn muốn xóa bình luận này? <br/>Hành động này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 h-11 text-[10px] font-black uppercase tracking-widest border-gray-100 hover:bg-gray-50 text-gray-400"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={() => {
                  if (commentToDelete) {
                    deleteCommentMutation.mutate({ quizId: quizId!, commentId: commentToDelete })
                  }
                }}
                disabled={deleteCommentMutation.isPending}
                className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20"
              >
                {deleteCommentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Xác nhận xóa'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
