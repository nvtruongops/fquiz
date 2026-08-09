'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { 
  History, 
  Trophy, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  BookOpen, 
  GraduationCap, 
  Play, 
  Loader2, 
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'

interface QuizAttemptItem {
  session_id: string
  score: number
  correct_count?: number
  mode: 'immediate' | 'review' | 'flashcard'
  completed_at?: string | null
  started_at: string
  total_questions: number
}

interface QuizHistoryData {
  _id?: string
  quiz_id?: string
  total_study_minutes?: number
  attempts?: QuizAttemptItem[]
  has_active_session?: boolean
  active_session_id?: string | null
  active_answered_count?: number
  active_total_count?: number
  active_started_at?: string | null
  mode?: 'immediate' | 'review' | 'flashcard'
}

interface QuizHistoryProps {
  quizId: string
  numQuestions: number
  historyData: QuizHistoryData | null | undefined
  isLoading: boolean
  currentUser: any
  onAuthRequired: () => void
  onResumeSession?: (sessionId: string) => void
  className?: string
}

function ModeBadge({ mode }: { mode: 'immediate' | 'review' | 'flashcard' }) {
  const config = {
    immediate: { bg: 'bg-primary/10 text-primary border-primary/20', label: 'Luyện tập', icon: Zap },
    review: { bg: 'bg-muted text-foreground border-border', label: 'Kiểm tra', icon: BookOpen },
    flashcard: { bg: 'bg-muted text-foreground border-border', label: 'Lật thẻ', icon: GraduationCap },
  }
  /* eslint-disable-next-line security/detect-object-injection */
  const item = config[mode] ?? config.immediate
  const Icon = item.icon

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider gap-1 border shadow-2xs", item.bg)}>
      <Icon className="w-3 h-3" />
      <span>{item.label}</span>
    </Badge>
  )
}

const ITEMS_PER_PAGE = 5

export function QuizHistory({
  quizId,
  numQuestions,
  historyData,
  isLoading,
  currentUser,
  onAuthRequired,
  onResumeSession,
  className,
}: QuizHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1)

  if (!currentUser) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-card backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-border shadow-xs mb-6", className)}>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-foreground">Lịch sử làm bài</h3>
        <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-4">
          Đăng nhập để xem lịch sử làm bài thi và theo dõi tiến trình học tập của bạn.
        </p>
        <Button 
          onClick={onAuthRequired} 
          className="rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold px-5 h-9"
        >
          <LogIn className="w-3.5 h-3.5 mr-1.5" />
          Đăng nhập ngay
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 bg-card backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-border shadow-xs gap-3 mb-6", className)}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-xs font-extrabold text-primary uppercase tracking-wider">Đang tải lịch sử...</p>
      </div>
    )
  }

  const attempts = historyData?.attempts ?? []
  const hasActive = Boolean(historyData?.has_active_session && historyData?.active_session_id)
  const activeSessionId = historyData?.active_session_id

  // Calculate highest score
  let maxScoreOnTen = 0
  let hasCompletedAttempt = false

  attempts.forEach((a) => {
    hasCompletedAttempt = true
    const total = a.total_questions > 0 ? a.total_questions : numQuestions
    const correct = a.correct_count ?? a.score ?? 0
    const pct = total > 0 ? (correct / total) * 10 : 0
    if (pct > maxScoreOnTen) {
      maxScoreOnTen = pct
    }
  })

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(attempts.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const displayedAttempts = attempts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div className={cn("flex flex-col gap-5 sm:gap-6 bg-card backdrop-blur-md border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-7 shadow-xs mb-8", className)}>
      {/* ── Section Title ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">Lịch sử làm bài</h2>
            <p className="text-[11px] font-bold text-muted-foreground">Theo dõi tiến trình & kết quả các lần luyện tập của bạn</p>
          </div>
        </div>

        {hasCompletedAttempt && (
          <div className="flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-black">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            <span>Cao nhất: {maxScoreOnTen.toFixed(1)}/10</span>
          </div>
        )}
      </div>

      {/* ── Active Session Alert Card ─────────────────────────────────────── */}
      {hasActive && activeSessionId && (
        <div className="p-4 sm:p-5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-foreground">Bạn có 1 bài làm dở chưa hoàn thành</p>
              <p className="text-[11px] font-bold text-muted-foreground">Nhấn vào đây để tiếp tục câu làm dở của bạn.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onResumeSession?.(activeSessionId)}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-black px-4 h-9 shadow-xs shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            Tiếp tục làm bài
          </Button>
        </div>
      )}

      {/* ── Main Attempt History Table / Cards ───────────────────────────── */}
      {attempts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground space-y-2">
          <History className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="text-xs font-bold">Chưa có lịch sử làm bài cho bộ đề này.</p>
          <p className="text-[11px] text-muted-foreground">Hãy nhấn "Bắt đầu làm bài" ở trên để thực hiện lần thi đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2.5">
            {displayedAttempts.map((attempt, idx) => {
              const attemptIndexInTotal = startIndex + idx
              const attemptNumber = attempts.length - attemptIndexInTotal
              const totalQ = attempt.total_questions > 0 ? attempt.total_questions : numQuestions
              const isRetryWrong = numQuestions > 0 && totalQ < numQuestions
              const correctCount = attempt.correct_count ?? attempt.score ?? 0
              const scoreOnTen = (correctCount / Math.max(totalQ, 1)) * 10
              const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)

              return (
                <div 
                  key={attempt.session_id || attemptIndexInTotal}
                  className="bg-card p-2.5 sm:p-3.5 rounded-2xl border border-border shadow-xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {/* Left Content */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                      <span className="text-xs font-black text-foreground">Lượt {attemptNumber}</span>
                      <ModeBadge mode={attempt.mode} />
                      {isRetryWrong && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-none font-extrabold text-[9px] uppercase px-2 py-0.5 gap-1 rounded-full">
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Luyện câu sai</span>
                        </Badge>
                      )}
                    </div>

                    <p className="text-[10px] font-bold text-muted-foreground pl-4">
                      {format(new Date(attempt.started_at), 'HH:mm — dd/MM/yyyy')}
                    </p>
                  </div>

                  {/* Right Content */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span className="text-sm sm:text-base font-black text-primary">{formattedScore}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">/10</span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        {correctCount}/{totalQ} câu đúng
                      </p>
                    </div>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 px-2.5 rounded-xl text-foreground hover:text-primary hover:bg-primary/10 text-xs font-bold cursor-pointer" 
                      asChild
                    >
                      <Link href={`/quiz/${quizId}/result/${attempt.session_id}`}>
                        <span>Xem kết quả</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Prominent Footer Pagination & Link Bar ─────────────────── */}
          <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/50 -mx-4 -mb-4 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 rounded-b-2xl sm:rounded-b-[32px]">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-9 px-3.5 rounded-xl text-xs font-black border-border bg-card hover:bg-muted disabled:opacity-40 shadow-xs cursor-pointer text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1 text-primary" />
                <span>Trang trước</span>
              </Button>

              <div className="flex items-center gap-1 bg-card px-3 py-1.5 rounded-xl border border-border shadow-xs">
                <span className="text-xs font-black text-primary">Trang {safePage}</span>
                <span className="text-[11px] font-bold text-muted-foreground">/ {totalPages}</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-9 px-3.5 rounded-xl text-xs font-black border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 shadow-xs cursor-pointer"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4 ml-1 text-[#5D7B6F]" />
              </Button>
            </div>

            <Link 
              href="/history" 
              className="font-black text-[#5D7B6F] hover:text-[#4a6359] inline-flex items-center gap-1.5 text-xs bg-[#5D7B6F]/10 hover:bg-[#5D7B6F]/20 px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              <span>Xem tất cả lịch sử</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
