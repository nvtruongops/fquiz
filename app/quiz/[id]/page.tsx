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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'
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
        // Restart completed (old session deleted)
        // Don't open mode select - the restart handler will create new session
        setResumeDialogOpen(false)
        setActiveSessionInfo(null)
        return
      }
      // Clear pending state and close dialog
      setPendingMode(null)
      setPendingDifficulty(null)
      setActiveSessionInfo(null)
      setResumeDialogOpen(false)
      
      const targetUrl = data.mode === 'flashcard' 
        ? `/quiz/${quizId}/session/${nextSessionId}/flashcard`
        : `/quiz/${quizId}/session/${nextSessionId}`

      // Preload the target page's data to eliminate double loading
      Promise.all([
        data.mode === 'flashcard' 
          ? queryClient.prefetchQuery({
              queryKey: ['flashcard-session', nextSessionId],
              queryFn: async () => {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${nextSessionId}`)
                return res.json()
              }
            })
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
    // Save the selected mode and difficulty before restarting
    if (!activeSessionInfo) return
    
    // Store the mode and difficulty we want to create after restart
    const targetMode = selectedMode
    const targetDifficulty = selectedDifficulty
    
    setResumeDialogOpen(false)
    startLoading('Đang làm mới tiến trình...')
    
    // First delete the old session using mutateAsync
    startSessionMutation.mutateAsync({
      mode: activeSessionInfo.mode,
      difficulty: activeSessionInfo.difficulty,
      action: 'restart',
    }).then((data) => {
      // After restart completes (session deleted), create new session with selected mode
      if (!data.sessionId) {
        // Session deleted successfully, now create new one
        startSessionMutation.mutate({
          mode: targetMode,
          difficulty: targetDifficulty,
        })
      }
    }).catch((error) => {
      console.error('Restart failed:', error)
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

              <Dialog open={modeSelectOpen} onOpenChange={setModeSelectOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleStartClick}
                    className="flex h-14 w-full items-center gap-3 rounded-sm bg-[#5D7B6F] text-[11px] font-normal uppercase tracking-[0.25em] text-white shadow-lg shadow-[#5D7B6F]/20 transition-all hover:bg-[#4a6358] active:scale-[0.98]"
                  >
                    Chọn chế độ học <PlayCircle className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-normal uppercase tracking-[0.15em] text-[#5D7B6F]">
                      Chọn chế độ làm bài
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-center text-sm text-gray-500">
                      Chọn chế độ và độ khó phù hợp với mục tiêu học tập của bạn
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-6">
                    {/* Mode Selection */}
                    <div className="space-y-3">
                      <label className="text-base font-semibold text-gray-700">
                        Chế độ
                      </label>
                      <Select
                        value={selectedMode}
                        onValueChange={(value) => setSelectedMode(value as 'immediate' | 'review' | 'flashcard')}
                      >
                        <SelectTrigger className="h-14 text-base">
                          <SelectValue placeholder="Chọn chế độ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate" className="py-4">
                            <div className="flex items-center gap-3">
                              <Zap className="h-5 w-5 text-green-600" />
                              <div>
                                <div className="font-semibold text-base">Chế độ luyện tập</div>
                                <div className="text-sm text-gray-500">Xem đáp án ngay sau mỗi câu</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="review" className="py-4">
                            <div className="flex items-center gap-3">
                              <BookOpen className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-semibold text-base">Chế độ kiểm tra</div>
                                <div className="text-sm text-gray-500">Chấm điểm sau khi nộp bài</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="flashcard" className="py-4">
                            <div className="flex items-center gap-3">
                              <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="6" width="20" height="12" rx="2" />
                                <path d="M12 6v12" />
                              </svg>
                              <div>
                                <div className="font-semibold text-base">Chế độ lật thẻ</div>
                                <div className="text-sm text-gray-500">Học theo phương pháp flashcard</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="space-y-3">
                      <label className="text-base font-semibold text-gray-700">
                        Độ khó
                      </label>
                      <Select
                        value={selectedDifficulty}
                        onValueChange={(value) => setSelectedDifficulty(value as 'sequential' | 'random')}
                      >
                        <SelectTrigger className="h-14 text-base">
                          <SelectValue placeholder="Chọn độ khó" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequential" className="py-4">
                            <div className="flex items-center gap-3">
                              <AlignJustify className="h-5 w-5" />
                              <div>
                                <div className="font-semibold text-base">Theo thứ tự</div>
                                <div className="text-sm text-gray-500">Câu hỏi hiển thị theo thứ tự</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="random" className="py-4">
                            <div className="flex items-center gap-3">
                              <Shuffle className="h-5 w-5" />
                              <div>
                                <div className="font-semibold text-base">Ngẫu nhiên</div>
                                <div className="text-sm text-gray-500">Câu hỏi được xáo trộn</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setModeSelectOpen(false)
                        handleSelectMode(selectedMode, selectedDifficulty)
                      }}
                      disabled={startSessionMutation.isPending}
                      className="w-full h-14 text-base bg-[#5D7B6F] hover:bg-[#4a6358]"
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
      </main>

      {/* Professional 0-100% Loading Overlay */}
      <QuizLoadingOverlay 
        isOpen={loadingOverlay.isOpen} 
        progress={loadingOverlay.progress} 
        status={loadingOverlay.status} 
      />
    </div>
  )
}
