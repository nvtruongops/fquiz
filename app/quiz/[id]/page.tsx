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
import Navbar from '@/components/Navbar'

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
  current_question_index: number
  totalQuestions: number
  answeredCount: number
  started_at: string
}

type StartAction = 'continue' | 'restart'

type StartSessionRequest = {
  mode: 'immediate' | 'review'
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
  const res = await fetch(`/api/student/quizzes/${id}`)
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; hint?: string }
    const error = new Error(data.error || 'Không thể tải thông tin đề thi') as QuizDetailApiError
    error.status = res.status

    const isGenericOwnershipForbidden =
      res.status === 403 &&
      typeof data.error === 'string' &&
      /forbidden: you do not own this resource/i.test(data.error)

    if (isGenericOwnershipForbidden) {
      error.code = 'QUIZ_SOURCE_LOCKED'
      error.message = 'Không thể làm lại vì bộ đề gốc đã bị ẩn.'
      error.hint = 'Bạn vẫn có thể xem lại kết quả tại mục Lịch sử hoặc chọn một bộ đề khác.'
    } else {
      error.code = data.code
      error.hint = data.hint
    }

    throw error
  }
  return res.json()
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
    mutationFn: async ({ mode, action }: StartSessionRequest) => {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quiz_id: quizId, mode, ...(action ? { action } : {}) }),
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
      router.push(`/quiz/${quizId}/session/${nextSessionId}`)
    },
    onError: (error: StartSessionError, variables) => {
      if (error.status === 409 && error.code === 'ACTIVE_SESSION_EXISTS') {
        setPendingMode(variables.mode)
        setActiveSessionInfo(
          error.activeSession ?? {
            sessionId: '',
            mode: variables.mode,
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

  function handleSelectMode(mode: 'immediate' | 'review') {
    startSessionMutation.mutate({ mode })
  }

  function handleContinueSession() {
    if (!pendingMode) return
    startSessionMutation.mutate({ mode: pendingMode, action: 'continue' })
    setResumeDialogOpen(false)
  }

  function handleRestartSession() {
    if (!pendingMode) return
    startSessionMutation.mutate({ mode: pendingMode, action: 'restart' })
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
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-black uppercase">
            {(error as QuizDetailApiError | undefined)?.code === 'QUIZ_SOURCE_LOCKED'
              ? 'Không thể làm lại quiz này'
              : 'Lỗi hệ thống'}
          </h2>
          <p className="mb-8 font-bold text-gray-400">
            {(error as Error | undefined)?.message || 'Không thể tìm thấy thông tin đề thi này. Quý khách vui lòng kiểm tra lại.'}
          </p>
          {(error as QuizDetailApiError | undefined)?.hint && (
            <p className="mb-6 text-sm text-gray-500">{(error as QuizDetailApiError).hint}</p>
          )}

          {(error as QuizDetailApiError | undefined)?.code === 'QUIZ_SOURCE_LOCKED' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button asChild className="bg-[#5D7B6F] py-6 text-white">
                <Link href="/my-quizzes">Về Bộ đề của tôi</Link>
              </Button>
              <Button asChild variant="outline" className="py-6">
                <Link href="/history">Xem Lịch sử</Link>
              </Button>
            </div>
          ) : (
            <Button onClick={() => router.back()} className="w-full bg-[#5D7B6F] py-6 text-white">
              Quay lại
            </Button>
          )}
        </div>
      </div>
    )

  return (
    <div className="flex min-h-screen flex-col bg-[#F9F9F7] font-sans">
      <Navbar />

      <main className="flex flex-1 flex-col px-6 py-12">
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

                <h1 className="text-4xl font-normal leading-tight tracking-tight text-gray-900">{quiz?.title}</h1>

                <p className="max-w-2xl border-l-2 border-[#A4C3A2] py-2 pl-6 text-[15px] font-normal leading-relaxed text-gray-500">
                  {quiz?.description ||
                    'Chưa có mô tả chi tiết cho đề thi này. Hãy chuẩn bị tinh thần để bắt đầu thử thách kiến thức của bạn.'}
                </p>
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
                <DialogContent className="border-none bg-transparent p-0 sm:max-w-[500px]">
                  <div className="rounded-sm border border-gray-100 bg-white p-10 shadow-2xl">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="border-b pb-4 text-center text-2xl font-normal uppercase tracking-[0.2em] text-[#5D7B6F]">
                        Chọn chế độ thi
                      </DialogTitle>
                      <DialogDescription className="pt-2 text-center text-[12px] font-normal text-gray-400">
                        Hãy chọn phong cách làm bài phù hợp với mục tiêu ôn tập của bạn
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                      <Button
                        variant="outline"
                        onClick={() => handleSelectMode('immediate')}
                        disabled={startSessionMutation.isPending}
                        className="group flex h-20 items-center justify-between rounded-sm border border-gray-100 px-6 transition-all hover:border-[#A4C3A2] hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-green-50 text-green-500 transition-transform group-hover:scale-110">
                            <Zap className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <span className="block text-[14px] font-normal text-gray-800">Chế độ luyện tập</span>
                            <span className="block text-[10px] font-normal uppercase tracking-widest text-gray-400">
                              Xem đáp án & giải thích ngay
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-[#5D7B6F]" />
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleSelectMode('review')}
                        disabled={startSessionMutation.isPending}
                        className="group flex h-20 items-center justify-between rounded-sm border border-gray-100 px-6 transition-all hover:border-[#A4C3A2] hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-50 text-blue-500 transition-transform group-hover:scale-110">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <span className="block text-[14px] font-normal text-gray-800">Chế độ kiểm tra</span>
                            <span className="block text-[10px] font-normal uppercase tracking-widest text-gray-400">
                              Chấm điểm sau khi nộp bài
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-200 transition-all group-hover:translate-x-1 group-hover:text-[#5D7B6F]" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
                <DialogContent className="border-none bg-transparent p-0 sm:max-w-[500px]">
                  <div className="rounded-sm border border-gray-100 bg-white p-8 shadow-2xl">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-center text-xl font-normal uppercase tracking-[0.15em] text-[#5D7B6F]">
                        Bài quiz chưa hoàn thành
                      </DialogTitle>
                      <DialogDescription className="pt-2 text-center text-sm text-gray-500">
                        Bạn đã làm {activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalQuestions ?? 0} câu.
                        Bạn muốn tiếp tục bài đang làm hay làm mới từ đầu?
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        onClick={handleContinueSession}
                        disabled={startSessionMutation.isPending}
                        className="bg-[#5D7B6F] text-white hover:bg-[#4a6358]"
                      >
                        Tiếp tục làm
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
