'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  BookOpen, 
  CheckCircle,
  Zap,
  RotateCcw,
  Calendar,
  Search,
  Loader2,
  GraduationCap,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Target,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { cn } from '@/lib/core/utils/cn'
import { HistorySkeleton } from '@/components/history/HistorySkeleton'
import { isToday, isYesterday, format } from 'date-fns'

interface HistoryItem {
  _id: string
  quiz_id: string
  quiz_title: string
  quiz_code: string
  category_name: string
  source_type: string
  source_label: string
  source_creator_name: string | null
  score: number
  total_questions: number
  answered_count: number
  correct_count: number
  mode: 'immediate' | 'review' | 'flashcard'
  status: 'active' | 'completed'
  completed_at?: string
  started_at: string
  duration_minutes: number
  flashcard_stats?: any
  is_mix?: boolean
}

interface GroupedQuiz {
  key: string
  quiz_id: string
  quiz_code: string
  quiz_title: string
  category_name: string
  source_label: string
  is_mix?: boolean
  bestScorePercentage: number
  attempts: HistoryItem[]
}

interface HistoryResponse {
  history: HistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function fetchHistory(page: number): Promise<HistoryResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history?page=${page}&limit=20`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

function ModeBadge({ mode }: { mode: 'immediate' | 'review' | 'flashcard' }) {
  const config = {
    immediate: { label: 'Luyện tập', icon: Zap },
    review: { label: 'Kiểm tra', icon: BookOpen },
    flashcard: { label: 'Lật thẻ', icon: GraduationCap },
  }
  const { label, icon: Icon } = config[mode] || { label: mode, icon: BookOpen }
  
  return (
    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-border bg-muted text-muted-foreground flex items-center shrink-0">
      <Icon className="w-2.5 h-2.5 mr-1 text-primary" />
      {label}
    </Badge>
  )
}

function HistoryContent() {
  const searchParams = useSearchParams()
  const searchFromUrl = searchParams.get('search') || ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchFromUrl)

  useEffect(() => {
    if (searchFromUrl) {
      setSearch(searchFromUrl)
    }
  }, [searchFromUrl])

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['history', page],
    queryFn: () => fetchHistory(page),
  })

  const dateGroups = useMemo(() => {
    if (!data?.history) return []

    const q = search.toLowerCase()
    const groupsMap = new Map<string, Map<string, GroupedQuiz>>()

    data.history.forEach(item => {
      if (q && !(item.quiz_code?.toLowerCase().includes(q) || item.category_name?.toLowerCase().includes(q) || item.quiz_title?.toLowerCase().includes(q))) {
        return
      }

      const date = new Date(item.started_at)
      const dateTitle = isToday(date) ? 'Hôm nay' : isYesterday(date) ? 'Hôm qua' : format(date, 'dd/MM/yyyy')
      if (!groupsMap.has(dateTitle)) groupsMap.set(dateTitle, new Map())

      const quizMap = groupsMap.get(dateTitle)!
      const quizKey = item.quiz_id || `${item.quiz_code}_${item.category_name}`
      if (!quizMap.has(quizKey)) {
        quizMap.set(quizKey, {
          key: quizKey,
          quiz_id: item.quiz_id,
          quiz_code: item.quiz_code,
          quiz_title: item.quiz_title,
          category_name: item.category_name,
          source_label: item.source_label,
          is_mix: item.is_mix,
          bestScorePercentage: 0,
          attempts: [],
        })
      }

      const quizGroup = quizMap.get(quizKey)!
      quizGroup.attempts.push(item)

      if (item.status === 'completed' && item.total_questions > 0) {
        quizGroup.bestScorePercentage = Math.max(quizGroup.bestScorePercentage, (item.score / item.total_questions) * 100)
      }
    })

    return Array.from(groupsMap.entries()).map(([title, quizMap]) => ({
      title,
      quizzes: Array.from(quizMap.values()),
    }))
  }, [data?.history, search])

  return (
    <main className="min-h-screen pb-20 px-3 sm:px-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-card/80 backdrop-blur-2xl border-b border-border -mx-3 sm:-mx-6 px-3 sm:px-6">
        <div className="w-full py-4 sm:py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-[10px] sm:text-[11px] font-black text-primary uppercase tracking-[0.3em]">Hành trình của bạn</p>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-foreground tracking-tight leading-tight">
                Lịch sử làm bài
              </h1>
            </div>
            
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Tìm mã môn hoặc danh mục..." 
                className="pl-10 h-10 rounded-xl border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary text-xs transition-all shadow-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-4 sm:mt-8">
        {isLoading ? (
          <HistorySkeleton />
        ) : isError ? (
          <div className="p-4 sm:p-8 text-center bg-destructive/10 rounded-2xl border border-destructive/20">
             <p className="text-xs sm:text-sm font-bold text-destructive">Đã xảy ra lỗi khi tải lịch sử. Vui lòng thử lại.</p>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="p-8 sm:p-16 text-center bg-card rounded-2xl sm:rounded-3xl border border-border shadow-md">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-foreground">Trống trơn!</h3>
            <p className="text-xs font-bold text-muted-foreground mt-1">Bạn chưa có hoạt động nào phù hợp với tìm kiếm.</p>
            <Button asChild className="mt-4 bg-primary text-primary-foreground rounded-xl px-5 h-9 text-xs font-black">
               <Link href="/">Bắt đầu học ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {dateGroups.map((dateGroup) => (
              <section key={dateGroup.title} className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-3">
                   <h2 className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] whitespace-nowrap">{dateGroup.title}</h2>
                   <div className="h-px w-full bg-border" />
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {dateGroup.quizzes.map((groupedQuiz) => (
                    <GroupedQuizTimelineCard key={groupedQuiz.key} quizGroup={groupedQuiz} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border-border hover:bg-muted shadow-2xs h-9 px-3.5 text-xs font-black"
            >
              <ChevronLeft size={14} className="mr-1" />
              Trước
            </Button>
            <div className="flex items-center gap-1">
               <span className="text-xs font-black text-primary px-3 py-1.5 bg-primary/10 rounded-lg">{page}</span>
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">trên {data.totalPages}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-xl border-border hover:bg-muted shadow-2xs h-9 px-3.5 text-xs font-black"
            >
              Sau
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

function GroupedQuizTimelineCard({ quizGroup }: { quizGroup: GroupedQuiz }) {
  const [expanded, setExpanded] = useState(false)
  const latestAttempt = quizGroup.attempts[0]
  const attemptCount = quizGroup.attempts.length
  const hasCompletedAttempt = quizGroup.attempts.some(a => a.status === 'completed')
  const maxScoreDisplay = hasCompletedAttempt ? (quizGroup.bestScorePercentage / 10).toFixed(1) : 'CHƯA CÓ'

  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Main Sleek Single Header Row */}
        <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 flex-wrap">
            {/* Left Checkmark Icon */}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-success/15 text-success border border-success/20 shadow-2xs">
              {quizGroup.is_mix ? <Shuffle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </div>

            {/* Category Name Pill Badge */}
            <Badge variant="secondary" className="bg-muted text-muted-foreground font-black text-[9px] uppercase rounded-md px-2 py-0.5 border border-border shrink-0">
              {quizGroup.category_name}
            </Badge>

            {/* Quiz Title */}
            <h3 className="text-xs sm:text-sm font-black text-foreground truncate uppercase tracking-tight">
              {quizGroup.quiz_code}
            </h3>

            {/* Optional Attempts Count Badge */}
            {attemptCount > 1 && (
              <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase rounded-full px-2.5 py-0.5 tracking-wider shadow-2xs shrink-0">
                {attemptCount} lượt làm bài
              </Badge>
            )}

            {/* Inline Score & Timestamp Info */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 ml-auto">
              <span>Điểm cao nhất: <strong className={cn('font-black', hasCompletedAttempt ? 'text-primary' : 'text-muted-foreground')}>{hasCompletedAttempt ? `${maxScoreDisplay}/10` : 'CHƯA CÓ'}</strong></span>
              <span>• Gần nhất: {format(new Date(latestAttempt.started_at), 'HH:mm')}</span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {attemptCount > 1 && (
              <Button
                variant="outline"
                onClick={() => setExpanded(!expanded)}
                className="h-7 px-2.5 rounded-full border-border text-foreground font-black text-[9px] uppercase tracking-wider hover:bg-muted transition-all cursor-pointer bg-muted/40"
              >
                {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {attemptCount} Lượt thi
              </Button>
            )}

            <Button size="icon" className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-2xs transition-transform cursor-pointer shrink-0 active:scale-95" asChild>
              <Link href={
                latestAttempt.status === 'active'
                  ? latestAttempt.mode === 'flashcard'
                    ? `/quiz/${latestAttempt.quiz_id}/session/${latestAttempt._id}/flashcard`
                    : `/quiz/${latestAttempt.quiz_id}/session/${latestAttempt._id}`
                  : `/quiz/${latestAttempt.quiz_id}/result/${latestAttempt._id}`
              }>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile-only inline score & timestamp if screen is small */}
        <div className="flex sm:hidden items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pb-2.5 pt-0.5 border-t border-border/40">
          <span>Điểm cao nhất: <strong className={cn('font-black', hasCompletedAttempt ? 'text-primary' : 'text-muted-foreground')}>{hasCompletedAttempt ? `${maxScoreDisplay}/10` : 'CHƯA CÓ'}</strong></span>
          <span>• Gần nhất: {format(new Date(latestAttempt.started_at), 'HH:mm')}</span>
        </div>

        {/* Expanded Attempts Section Container */}
        {expanded && (
          <div className="border-t border-border/70 bg-muted/20 p-3.5 sm:p-5 space-y-3 rounded-b-2xl sm:rounded-b-3xl animate-in fade-in-50 duration-200">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-0.5">
              Tiến trình các lượt làm bài ({attemptCount})
            </p>

            <div className="space-y-2 relative">
              {quizGroup.attempts.map((attempt, idx) => {
                const isLast = idx === quizGroup.attempts.length - 1
                const maxQuizQuestions = Math.max(...quizGroup.attempts.map(a => a.total_questions || 0))
                const isRetryWrong = attempt.total_questions < maxQuizQuestions
                const scoreOnTen = (attempt.score / Math.max(attempt.total_questions, 1)) * 10
                const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)

                return (
                  <div key={attempt._id} className="relative flex items-center gap-2.5 group">
                    {!isLast && (
                      <div className="absolute left-[11px] top-[14px] bottom-[-10px] w-[1.5px] bg-border/70 pointer-events-none z-0" />
                    )}

                    <div className="w-6 h-6 rounded-full bg-card border border-primary/40 text-primary flex items-center justify-center shrink-0 z-10 shadow-2xs">
                      <Target className="w-3 h-3 text-primary" />
                    </div>

                    <Link
                      href={
                        attempt.status === 'active'
                          ? attempt.mode === 'flashcard'
                            ? `/quiz/${attempt.quiz_id}/session/${attempt._id}/flashcard`
                            : `/quiz/${attempt.quiz_id}/session/${attempt._id}`
                          : `/quiz/${attempt.quiz_id}/result/${attempt._id}`
                      }
                      className="flex-1 min-w-0 flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/40 transition-colors shadow-2xs cursor-pointer group/item relative z-10"
                    >
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-black text-foreground">Lượt {attemptCount - idx}</span>
                        <ModeBadge mode={attempt.mode} />
                        {isRetryWrong && (
                          <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[8.5px] uppercase px-1.5 py-0 rounded-full">
                            <RotateCcw className="w-2.5 h-2.5 mr-1 inline" /> Luyện câu sai
                          </Badge>
                        )}
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {format(new Date(attempt.started_at), 'HH:mm')} ({attempt.duration_minutes} phút)
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 ml-2">
                        {attempt.status === 'completed' ? (
                          <div className="text-right">
                            <span className="text-xs sm:text-sm font-black text-primary">{formattedScore}/10</span>
                            <p className="text-[9px] font-bold text-muted-foreground">{attempt.correct_count}/{attempt.total_questions} đúng</p>
                          </div>
                        ) : (
                          <div className="text-right flex flex-col items-end">
                            <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2 py-0.5 rounded-full">
                              Chưa hoàn thành
                            </Badge>
                            <span className="text-[9px] font-extrabold text-warning-fg mt-0.5">Đã làm {attempt.answered_count ?? 0}/{attempt.total_questions} câu</span>
                          </div>
                        )}

                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/item:text-foreground group-hover/item:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function HistoryPage() {
  return (
    <React.Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </React.Suspense>
  )
}
