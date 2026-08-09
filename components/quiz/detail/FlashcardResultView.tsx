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

  const gradeColor = percentage >= 80 ? 'text-success-fg' : percentage >= 50 ? 'text-primary' : 'text-warning-fg'
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
      <div className="relative overflow-hidden rounded-2xl bg-card backdrop-blur-xl shadow-2xs border border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-black ${gradeColor} tracking-tight`}>{percentage}%</span>
              <span className="text-xs font-black text-muted-foreground">nhớ bài</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-xs font-black text-primary uppercase tracking-wider">{gradeLabel}</p>
              <p className="text-[11px] font-bold text-muted-foreground">
                Đã nhớ <strong className="text-success-fg">{flashcard_stats.cards_known}</strong>/{flashcard_stats.total_cards} thẻ · Cần ôn lại <strong className="text-incorrect-fg">{flashcard_stats.cards_unknown}</strong> thẻ · {completedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground border-none px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-2xs">
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
                  className="h-8 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-[11px] uppercase tracking-wider shadow-2xs transition-all active:scale-95"
                >
                  {loadingUnknown || loadingAll ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Ôn lại
                </Button>

                <Link href="/dashboard">
                  <Button variant="outline" className="h-8 px-3 rounded-xl border-border text-muted-foreground font-black text-[11px] uppercase tracking-wider hover:bg-muted transition-all active:scale-95">
                    <LayoutDashboard className="mr-1 h-3.5 w-3.5" /> Dashboard
                  </Button>
                </Link>
                <Link href="/history">
                  <Button variant="outline" className="h-8 px-3 rounded-xl border-border text-muted-foreground font-black text-[11px] uppercase tracking-wider hover:bg-muted transition-all active:scale-95">
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
        <div className="grid grid-cols-3 gap-4 p-6 bg-card rounded-2xl border border-border">
          <div className="text-center p-4 bg-muted/80 rounded-2xl border border-border">
            <p className="text-2xl sm:text-3xl font-black text-foreground">{flashcard_stats.total_cards}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-black uppercase tracking-wider">Tổng thẻ</p>
          </div>
          <div className="text-center p-4 bg-success-bg rounded-2xl border border-success-border">
            <p className="text-2xl sm:text-3xl font-black text-success-fg">{flashcard_stats.cards_known}</p>
            <p className="text-[10px] text-success-fg mt-1 font-black uppercase tracking-wider">Đã nhớ</p>
          </div>
          <div className="text-center p-4 bg-incorrect-bg rounded-2xl border border-incorrect-border">
            <p className="text-2xl sm:text-3xl font-black text-incorrect-fg">{flashcard_stats.cards_unknown}</p>
            <p className="text-[10px] text-incorrect-fg mt-1 font-black uppercase tracking-wider">Cần ôn lại</p>
          </div>
        </div>
      )}
    </div>
  )
}
