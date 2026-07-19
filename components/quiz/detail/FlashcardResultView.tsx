'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RotateCcw, LayoutDashboard, BookOpen, Sparkles, Loader2, RefreshCw, X, Layers, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import ExitMixQuizButton from '@/components/quiz/detail/ExitMixQuizButton'
import { InteractiveFlashcardResultViewer } from '@/components/quiz/detail/InteractiveFlashcardResultViewer'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

interface ResultQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
  submitted_answer: number | number[] | null
  is_correct: boolean
}

interface ResultData {
  sessionId: string
  quizId: string
  mode: 'immediate' | 'review' | 'flashcard'
  score: number
  totalQuestions: number
  completed_at: string
  user_answers: Array<{ question_index: number; answer_index: number; is_correct: boolean }>
  questions: ResultQuestion[]
  is_temp?: boolean
  flashcard_stats?: {
    total_cards: number
    cards_known: number
    cards_unknown: number
    time_spent_ms: number
    current_round: number
  }
}

export function FlashcardResultView({ quizId, sessionId, data }: { quizId: string; sessionId: string; data: ResultData }) {
  const router = useRouter()
  const { toast } = useToast()

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [loadingUnknown, setLoadingUnknown] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)

  const { flashcard_stats, completed_at, is_temp, questions } = data
  if (!flashcard_stats) return null

  const percentage = Math.round((flashcard_stats.cards_known / flashcard_stats.total_cards) * 100)
  const completedDate = new Date(completed_at).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const gradeColor = percentage >= 80 ? 'text-[#5D7B6F]' : percentage >= 50 ? 'text-blue-600' : 'text-amber-500'
  const gradeLabel = percentage >= 80 ? 'Xuất sắc!' : percentage >= 50 ? 'Khá tốt!' : 'Cần ôn luyện thêm!'

  // Handle Reviewing Only Unknown Cards
  const handleReviewUnknown = async () => {
    setLoadingUnknown(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}/flashcard-review`,
        {
          method: 'POST',
          headers: withCsrfHeaders(),
        }
      )
      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Không thể tạo phiên ôn lại câu chưa nhớ')
      }
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const reviewUrl = isMobile
        ? `/quiz/${quizId}/session/${resData.sessionId}/flashcard/mobile`
        : `/quiz/${quizId}/session/${resData.sessionId}/flashcard`
      
      router.push(reviewUrl)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi mở phiên ôn tập')
    } finally {
      setLoadingUnknown(false)
      setShowReviewModal(false)
    }
  }

  // Handle Reviewing All Cards from Scratch
  const handleReviewAll = async () => {
    setLoadingAll(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_id: quizId,
          mode: 'flashcard',
        }),
      })
      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Không thể tạo phiên học lật thẻ mới')
      }
      const newSessionId = resData.session?._id || resData.session?.id || resData.sessionId
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const reviewUrl = isMobile
        ? `/quiz/${quizId}/session/${newSessionId}/flashcard/mobile`
        : `/quiz/${quizId}/session/${newSessionId}/flashcard`

      router.push(reviewUrl)
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo phiên học mới')
    } finally {
      setLoadingAll(false)
      setShowReviewModal(false)
    }
  }

  // Click handler for top "Ôn lại" button
  const handleOnClickReview = () => {
    if (flashcard_stats.cards_unknown > 0) {
      setShowReviewModal(true)
    } else {
      handleReviewAll()
    }
  }

  return (
    <div className="w-full max-w-full h-full flex flex-col gap-3 overflow-hidden relative">
      {/* Top Header Card Summary Toolbar */}
      <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl shadow-xs border border-slate-200/80 px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-black ${gradeColor} tracking-tight`}>{percentage}%</span>
              <span className="text-xs font-black text-slate-400">nhớ bài</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-wider">{gradeLabel}</p>
              <p className="text-[11px] font-bold text-slate-500">
                Đã nhớ <strong className="text-emerald-700">{flashcard_stats.cards_known}</strong>/{flashcard_stats.total_cards} thẻ · Cần ôn lại <strong className="text-rose-600">{flashcard_stats.cards_unknown}</strong> thẻ · {completedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-[#5D7B6F] text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
              Học Lật Thẻ (Flashcard)
            </Badge>
            {is_temp ? (
              <ExitMixQuizButton sessionId={sessionId} />
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleOnClickReview}
                  disabled={loadingUnknown || loadingAll}
                  className="h-8 px-3 rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-[11px] uppercase tracking-wider shadow-xs transition-all active:scale-[0.98]"
                >
                  {loadingUnknown || loadingAll ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Ôn lại
                </Button>

                <Link href="/dashboard">
                  <Button variant="outline" className="h-8 px-3 rounded-xl border-slate-200 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-[0.98]">
                    <LayoutDashboard className="mr-1 h-3.5 w-3.5" /> Dashboard
                  </Button>
                </Link>
                <Link href="/history">
                  <Button variant="outline" className="h-8 px-3 rounded-xl border-slate-200 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-[0.98]">
                    <BookOpen className="mr-1 h-3.5 w-3.5" /> Lịch sử
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Interactive Flashcard Question Matrix & Detail Viewer */}
      {questions && questions.length > 0 ? (
        <InteractiveFlashcardResultViewer questions={questions} />
      ) : (
        <div className="grid grid-cols-3 gap-4 p-6 bg-white rounded-2xl border border-slate-200/80">
          <div className="text-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
            <p className="text-2xl sm:text-3xl font-black text-slate-800">{flashcard_stats.total_cards}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-wider">Tổng thẻ</p>
          </div>
          <div className="text-center p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">{flashcard_stats.cards_known}</p>
            <p className="text-[10px] text-emerald-600/80 mt-1 font-black uppercase tracking-wider">Đã nhớ</p>
          </div>
          <div className="text-center p-4 bg-rose-50/80 rounded-2xl border border-rose-100">
            <p className="text-2xl sm:text-3xl font-black text-rose-500">{flashcard_stats.cards_unknown}</p>
            <p className="text-[10px] text-rose-500/80 mt-1 font-black uppercase tracking-wider">Cần ôn lại</p>
          </div>
        </div>
      )}

      {/* Review Options Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 relative animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#5D7B6F]">
                <RotateCcw className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black text-slate-900">Ôn tập bài Học Lật Thẻ</h3>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-1">
                Với Quiz này ở chế độ <strong className="text-[#5D7B6F]">Học Lật Thẻ (Flashcard)</strong>, bạn vẫn còn <strong className="text-rose-600 font-bold">{flashcard_stats.cards_unknown}/{flashcard_stats.total_cards} câu chưa nhớ</strong>. Bạn có muốn học tiếp hay làm mới?
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Review Only Unknown Cards */}
              <button
                type="button"
                onClick={handleReviewUnknown}
                disabled={loadingUnknown || loadingAll}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-xs group-hover:text-rose-700 transition-colors">
                      Học tiếp (Ôn lại {flashcard_stats.cards_unknown} câu chưa nhớ)
                    </span>
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none text-[9px] font-bold px-1.5 py-0">
                      Khuyên dùng
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Luyện tập tập trung các thẻ chưa ghi nhớ
                  </p>
                </div>
                {loadingUnknown ? (
                  <Loader2 className="w-4 h-4 text-rose-600 animate-spin shrink-0" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-rose-500 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
                )}
              </button>

              {/* Option 2: Review All Cards From Scratch */}
              <button
                type="button"
                onClick={handleReviewAll}
                disabled={loadingUnknown || loadingAll}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-0.5">
                  <span className="font-black text-slate-900 text-xs group-hover:text-[#5D7B6F] transition-colors">
                    Làm mới (Bắt đầu lại tất cả {flashcard_stats.total_cards} câu)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Bắt đầu lại bộ thẻ từ câu đầu tiên
                  </p>
                </div>
                {loadingAll ? (
                  <Loader2 className="w-4 h-4 text-[#5D7B6F] animate-spin shrink-0" />
                ) : (
                  <Layers className="w-4 h-4 text-slate-400 group-hover:text-[#5D7B6F] transition-colors shrink-0" />
                )}
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
