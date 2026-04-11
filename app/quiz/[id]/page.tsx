'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'

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
  session?: { _id?: string }
}

interface ActiveSessionPayload {
  sessionId: string
  mode: 'immediate' | 'review'
  difficulty: 'sequential' | 'random'
  current_question_index: number
  totalQuestions: number
  answeredCount: number
  started_at: string
}

type StartAction = 'continue' | 'restart'

type StartSessionRequest = {
  mode: 'immediate' | 'review'
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
      num_questions: q.questionCount ?? q.questions?.length ?? 0,
      num_attempts: q.studentCount ?? 0,
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
    _id: publicQuiz.id,
    title: publicQuiz.title,
    description: publicQuiz.description || '',
    category_id: { name: publicQuiz.categoryName },
    course_code: publicQuiz.course_code,
    num_questions: publicQuiz.questionCount,
    num_attempts: publicQuiz.studentCount,
    created_at: publicQuiz.createdAt,
  }
}

export default function QuizDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id?: string | string[] }>()
  const rawQuizId = params?.id
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const resolvedQuizId = quizId ?? ''
  const { toast } = useToast()
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<'immediate' | 'review' | null>(null)
  const [pendingDifficulty, setPendingDifficulty] = useState<'sequential' | 'random' | null>(null)
  const [activeSessionInfo, setActiveSessionInfo] = useState<ActiveSessionPayload | null>(null)

  useEffect(() => {
    if (searchParams.get('reason') !== 'session_expired') return
    toast.error('Phiên làm bài đã hết hiệu lực. Vui lòng bắt đầu phiên mới.')
  }, [searchParams, toast])

  const { data: quiz, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => fetchQuizDetail(resolvedQuizId),
    enabled: resolvedQuizId.length > 0,
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
      const nextSessionId = data.sessionId ?? data.session?._id
      
      if (!nextSessionId) {
        toast.error('Không nhận được mã phiên thi từ hệ thống. Vui lòng thử lại.')
        return
      }
      // Clear pending state and close dialog
      setPendingMode(null)
      setPendingDifficulty(null)
      setActiveSessionInfo(null)
      setResumeDialogOpen(false)
      
      const targetUrl = `/quiz/${quizId}/session/${nextSessionId}`
      
      // Use window.location.href for hard navigation to avoid cache issues
      window.location.href = targetUrl
    },
    onError: (error: StartSessionError, variables) => {
      // Handle 401 Unauthorized - show clear message and redirect to login
      if (error.status === 401) {
        toast.error('Bạn cần đăng nhập để làm bài quiz này')
        setTimeout(() => {
          router.push(`/login?redirect=/quiz/${quizId}`)
        }, 1500)
        return
      }
      
      if (error.status === 409 && error.code === 'ACTIVE_SESSION_EXISTS') {
        setPendingMode(variables.mode)
        setPendingDifficulty(variables.difficulty)
        setActiveSessionInfo(
          error.activeSession ?? {
            sessionId: '',
            mode: variables.mode,
            difficulty: variables.difficulty,
            current_question_index: 0,
            totalQuestions: 0,
            answeredCount: 0,
            started_at: new Date().toISOString(),
          }
        )
        setResumeDialogOpen(true)
        return
      }

      toast.error(error.message)
    },
  })

  function handleSelectMode(mode: 'immediate' | 'review', difficulty: 'sequential' | 'random') {
    startSessionMutation.mutate({ mode, difficulty })
  }

  function handleContinueSession() {
    if (!pendingMode || !pendingDifficulty) return
    startSessionMutation.mutate({ mode: pendingMode, difficulty: pendingDifficulty, action: 'continue' })
    setResumeDialogOpen(false)
  }

  function handleRestartSession() {
    if (!pendingMode || !pendingDifficulty) return
    startSessionMutation.mutate({ mode: pendingMode, difficulty: pendingDifficulty, action: 'restart' })
    setResumeDialogOpen(false)
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
    <div className="flex min-h-screen flex-col bg-[#F9F9F7] font-sans">
      <main className="flex flex-1 flex-col px-6 py-12 pb-28 md:pb-12">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-8">
            <div className="relative overflow-hidden rounded-sm border border-gray-100 bg-white p-10 shadow-sm">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#5D7B6F]/5 blur-3xl" />

              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-sm bg-[#5D7B6F]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#5D7B6F]">
                    {quiz?.category_id?.name || 'Chung'}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                    ID: {quizId.slice(-8).toUpperCase()}
                  </span>
                </div>

                <h1 className="text-4xl font-normal leading-tight tracking-tight text-gray-900">{quiz?.course_code}</h1>

                {quiz?.description && (
                  <div className="max-w-2xl border-l-2 border-[#A4C3A2] py-2 pl-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Mô tả quiz</p>
                    <p className="text-[15px] font-normal leading-relaxed text-gray-500 whitespace-pre-wrap">{quiz.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="group flex items-center gap-4 rounded-sm border border-gray-100 bg-white p-6 shadow-sm transition-colors hover:border-[#A4C3A2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-blue-50 text-blue-500 transition-transform group-hover:scale-110">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-widest text-gray-400">Số câu hỏi</p>
                  <p className="text-xl font-normal text-gray-800">{quiz?.num_questions} CÂU</p>
                </div>
              </div>

              <div className="group flex items-center gap-4 rounded-sm border border-gray-100 bg-white p-6 shadow-sm transition-colors hover:border-[#A4C3A2]">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-green-50 text-green-500 transition-transform group-hover:scale-110">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase leading-none tracking-widest text-gray-400">Số lần làm quiz</p>
                  <p className="text-xl font-normal text-gray-800">{quiz?.num_attempts ?? 0} LẦN</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="sticky top-8 rounded-sm border border-gray-100 bg-white p-8 shadow-xl">
              <h3 className="mb-6 border-b pb-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Tùy chọn bắt đầu</h3>

              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3 py-1 text-sm font-normal text-gray-500">
                  <ShieldCheck className="h-4 w-4 text-[#5D7B6F]" />
                  <span>Hệ thống chấm điểm tự động</span>
                </div>
                <div className="flex items-center gap-3 py-1 text-sm font-normal text-gray-500">
                  <Zap className="h-4 w-4 text-[#5D7B6F]" />
                  <span>Phản hồi kết quả tức thì</span>
                </div>
                <div className="flex items-center gap-3 py-1 text-sm font-normal text-gray-500">
                  <LayoutDashboard className="h-4 w-4 text-[#5D7B6F]" />
                  <span>Giao diện phòng thi chuẩn mã</span>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex h-14 w-full items-center gap-3 rounded-sm bg-[#5D7B6F] text-[11px] font-normal uppercase tracking-[0.25em] text-white shadow-lg shadow-[#5D7B6F]/20 transition-all hover:bg-[#4a6358] active:scale-[0.98]">
                    Bắt đầu ngay <PlayCircle className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] border-none bg-transparent p-0 sm:max-w-[600px]">
                  <div className="rounded-sm border border-gray-100 bg-white px-6 py-6 shadow-2xl sm:px-10 sm:py-10">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="border-b pb-4 text-center text-2xl font-normal uppercase tracking-[0.2em] text-[#5D7B6F]">
                        Chọn chế độ làm bài
                      </DialogTitle>
                      <DialogDescription className="pt-2 text-center text-[12px] font-normal text-gray-400">
                        Chọn chế độ và độ khó phù hợp với mục tiêu học tập của bạn
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6">
                      {/* Immediate Mode */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 border-b pb-2">
                          <Zap className="h-5 w-5 text-green-500" />
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5D7B6F]">
                            Chế độ luyện tập
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500">Xem đáp án và giải thích ngay sau mỗi câu</p>
                        
                        <div className="grid gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSelectMode('immediate', 'sequential')}
                            disabled={startSessionMutation.isPending}
                            className="group flex h-14 items-center justify-start gap-4 rounded-sm border border-gray-200 px-4 transition-all hover:border-green-400 hover:bg-green-50"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-green-100 text-green-600 transition-transform group-hover:scale-110">
                              <Zap className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">Học nhanh</span>
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => handleSelectMode('immediate', 'random')}
                            disabled={startSessionMutation.isPending}
                            className="group flex h-14 items-center justify-start gap-4 rounded-sm border border-gray-200 px-4 transition-all hover:border-green-400 hover:bg-green-50"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-green-100 text-green-600 transition-transform group-hover:scale-110">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-800">Học sâu</span>
                          </Button>
                        </div>
                      </div>

                      {/* Review Mode */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 border-b pb-2">
                          <BookOpen className="h-5 w-5 text-blue-500" />
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5D7B6F]">
                            Chế độ kiểm tra
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500">Chấm điểm sau khi nộp bài</p>
                        
                        <div className="grid gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSelectMode('review', 'sequential')}
                            disabled={startSessionMutation.isPending}
                            className="group flex h-14 items-center justify-start gap-4 rounded-sm border border-gray-200 px-4 transition-all hover:border-blue-400 hover:bg-blue-50"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-100 text-blue-600 transition-transform group-hover:scale-110">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-800">Chế độ dễ</span>
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => handleSelectMode('review', 'random')}
                            disabled={startSessionMutation.isPending}
                            className="group flex h-14 items-center justify-start gap-4 rounded-sm border border-gray-200 px-4 transition-all hover:border-blue-400 hover:bg-blue-50"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-100 text-blue-600 transition-transform group-hover:scale-110">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                                <path d="M6 16l-2 2m14-14l2-2M8 8L6 6m12 12l2 2" strokeLinecap="round" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-800">Chế độ khó</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] border-none bg-transparent p-0 sm:max-w-[500px]">
                  <div className="rounded-sm border border-gray-100 bg-white px-6 py-6 shadow-2xl sm:px-8 sm:py-8">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-center text-xl font-normal uppercase tracking-[0.15em] text-[#5D7B6F]">
                        Bài quiz chưa hoàn thành
                      </DialogTitle>
                      <DialogDescription asChild>
                        <div className="pt-3 space-y-3">
                          {/* Progress */}
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

                          {/* Mode details */}
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
                                {activeSessionInfo?.difficulty === 'random' ? (
                                  <>
                                    <div className="flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-600">
                                      <Shuffle className="h-3 w-3" />
                                    </div>
                                    Ngẫu nhiên
                                  </>
                                ) : (
                                  <>
                                    <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600">
                                      <AlignJustify className="h-3 w-3" />
                                    </div>
                                    Tuần tự
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
      </main>
    </div>
  )
}
