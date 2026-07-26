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
  className?: string
}

function ModeBadge({ mode }: { mode: 'immediate' | 'review' | 'flashcard' }) {
  const config = {
    immediate: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', label: 'Luyện tập', icon: Zap },
    review: { bg: 'bg-blue-50 text-blue-700 border-blue-200/80', label: 'Kiểm tra', icon: BookOpen },
    flashcard: { bg: 'bg-purple-50 text-purple-700 border-purple-200/80', label: 'Lật thẻ', icon: GraduationCap },
  }
  /* eslint-disable-next-line security/detect-object-injection */
  const item = config[mode] ?? config.immediate
  const Icon = item.icon

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider gap-1 border shadow-xs", item.bg)}>
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
  className,
}: QuizHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1)

  if (!currentUser) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-white/70 backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-[#5D7B6F]/10 shadow-xs mb-6", className)}>
        <div className="w-12 h-12 rounded-2xl bg-[#5D7B6F]/10 flex items-center justify-center text-[#5D7B6F] mb-3">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">Lịch sử làm bài</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
          Đăng nhập để xem lịch sử làm bài thi và theo dõi tiến trình học tập của bạn.
        </p>
        <Button 
          onClick={onAuthRequired} 
          className="rounded-xl bg-[#5D7B6F] hover:bg-[#4a6359] text-white text-xs font-bold px-5 h-9"
        >
          <LogIn className="w-3.5 h-3.5 mr-1.5" />
          Đăng nhập ngay
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 bg-white/70 backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-[#5D7B6F]/10 shadow-xs gap-3 mb-6", className)}>
        <Loader2 className="w-6 h-6 text-[#5D7B6F] animate-spin" />
        <p className="text-xs font-extrabold text-[#5D7B6F] uppercase tracking-wider">Đang tải lịch sử...</p>
      </div>
    )
  }

  const attempts = historyData?.attempts ?? []
  const hasActive = Boolean(historyData?.has_active_session && historyData?.active_session_id)
  const activeSessionId = historyData?.active_session_id
  const totalStudyMinutes = historyData?.total_study_minutes ?? 0

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
    <div className={cn("flex flex-col gap-5 sm:gap-6 bg-white/70 backdrop-blur-md border border-[#5D7B6F]/10 rounded-2xl sm:rounded-[32px] p-4 sm:p-7 shadow-xs mb-8", className)}>
      {/* ── Section Title ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center shadow-xs">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Lịch sử làm bài</h2>
            <p className="text-[11px] font-bold text-slate-400">Theo dõi tiến trình & kết quả các lần luyện tập của bạn</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-extrabold text-xs px-3 py-1 rounded-full">
          {attempts.length} lượt thi
        </Badge>
      </div>

      {/* ── Summary Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl sm:rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[#5D7B6F] mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Điểm cao nhất</span>
          </div>
          <p className="text-base sm:text-xl font-black text-slate-900">
            {hasCompletedAttempt ? `${maxScoreOnTen.toFixed(1)}/10` : '--'}
          </p>
        </div>

        <div className="bg-blue-50/70 border border-blue-100/80 rounded-xl sm:rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-700 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Tổng lượt làm</span>
          </div>
          <p className="text-base sm:text-xl font-black text-slate-900">
            {attempts.length}
          </p>
        </div>

        <div className="bg-purple-50/70 border border-purple-100/80 rounded-xl sm:rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-purple-700 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Đã luyện tập</span>
          </div>
          <p className="text-base sm:text-xl font-black text-slate-900">
            {totalStudyMinutes > 0 ? `${totalStudyMinutes} phút` : '< 1 phút'}
          </p>
        </div>
      </div>

      {/* ── Active Session Banner ─────────────────────────────────────────── */}
      {hasActive && activeSessionId && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="inline-block text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Phiên đang làm dở</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Đã làm <strong className="text-amber-700">{historyData?.active_answered_count ?? 0}/{historyData?.active_total_count ?? numQuestions}</strong> câu
              </p>
            </div>
          </div>
          <Button size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-4 w-full sm:w-auto" asChild>
            <Link href={historyData?.mode === 'flashcard' ? `/quiz/${quizId}/session/${activeSessionId}/flashcard` : `/quiz/${quizId}/session/${activeSessionId}`}>
              Tiếp tục làm
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* ── List of Attempts ──────────────────────────────────────────────── */}
      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="text-xs font-extrabold text-slate-700">Chưa có lịch sử làm bài</p>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">Bạn chưa hoàn thành bài thi này lần nào. Hãy bấm &quot;Bắt đầu làm bài&quot; ở góc phải!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Các lượt thi gần nhất ({startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, attempts.length)} / {attempts.length})
            </p>
          </div>

          <div className="space-y-2.5">
            {displayedAttempts.map((attempt, index) => {
              const attemptIndexInTotal = startIndex + index
              const attemptNumber = attempts.length - attemptIndexInTotal
              const totalQ = attempt.total_questions > 0 ? attempt.total_questions : numQuestions
              const isRetryWrong = numQuestions > 0 && totalQ < numQuestions
              const correctCount = attempt.correct_count ?? attempt.score ?? 0
              const scoreOnTen = (correctCount / Math.max(totalQ, 1)) * 10
              const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)

              return (
                <div 
                  key={attempt.session_id || attemptIndexInTotal}
                  className="bg-white/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-100/90 shadow-xs hover:border-[#5D7B6F]/40 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  {/* Left Content */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5D7B6F] shrink-0" />
                      <span className="text-xs font-black text-slate-900">Lượt {attemptNumber}</span>
                      <ModeBadge mode={attempt.mode} />
                      {isRetryWrong && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none font-extrabold text-[9px] uppercase px-2 py-0.5 gap-1 rounded-full">
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Luyện câu sai</span>
                        </Badge>
                      )}
                    </div>

                    <p className="text-[10px] font-bold text-slate-400 pl-4">
                      {format(new Date(attempt.started_at), 'HH:mm — dd/MM/yyyy')}
                    </p>
                  </div>

                  {/* Right Content */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span className="text-sm sm:text-base font-black text-[#5D7B6F]">{formattedScore}</span>
                        <span className="text-[10px] font-bold text-slate-400">/10</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">
                        {correctCount}/{totalQ} câu đúng
                      </p>
                    </div>

                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 px-2.5 rounded-xl text-slate-600 hover:text-[#5D7B6F] hover:bg-[#5D7B6F]/5 text-xs font-bold cursor-pointer" 
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
          <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/90 -mx-4 -mb-4 sm:-mx-7 sm:-mb-7 p-4 sm:p-5 rounded-b-2xl sm:rounded-b-[32px]">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-9 px-3.5 rounded-xl text-xs font-black border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1 text-[#5D7B6F]" />
                <span>Trang trước</span>
              </Button>

              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-black text-[#5D7B6F]">Trang {safePage}</span>
                <span className="text-[11px] font-bold text-slate-400">/ {totalPages}</span>
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
