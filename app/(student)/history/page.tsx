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
  Play,
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
    immediate: { bg: 'bg-green-50', text: 'text-green-600', label: 'Luyện tập', icon: Zap },
    review: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Kiểm tra', icon: BookOpen },
    flashcard: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Lật thẻ', icon: GraduationCap },
  }
  const { bg, text, label, icon: Icon } = config[mode]
  
  return (
    <Badge variant="secondary" className={cn("rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-none", bg, text)}>
      <Icon className="w-2.5 h-2.5 mr-1" />
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
        <div className="w-full py-4 sm:py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
            <div className="space-y-0.5 sm:space-y-2">
              <p className="text-[10px] sm:text-[11px] font-extrabold text-primary uppercase tracking-[0.3em]">Hành trình của bạn</p>
              <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                Lịch sử làm bài
              </h1>
            </div>
            
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Tìm mã môn hoặc danh mục..." 
                className="pl-10 h-10 sm:h-12 rounded-xl sm:rounded-2xl border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-primary text-xs sm:text-sm transition-all shadow-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-4 sm:mt-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Đang tải lịch sử...</p>
          </div>
        ) : isError ? (
          <div className="p-4 sm:p-8 text-center bg-destructive/10 rounded-2xl border border-destructive/20">
             <p className="text-xs sm:text-sm font-bold text-destructive">Đã xảy ra lỗi khi tải lịch sử. Vui lòng thử lại.</p>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="p-8 sm:p-20 text-center bg-card rounded-2xl sm:rounded-[40px] border border-border shadow-xl">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-muted rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Calendar className="w-7 h-7 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-base sm:text-xl font-extrabold text-foreground">Trống trơn!</h3>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">Bạn chưa có hoạt động nào phù hợp với tìm kiếm.</p>
            <Button asChild className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 h-10 text-xs font-bold">
               <Link href="/">Bắt đầu học ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-12">
            {dateGroups.map((dateGroup) => (
              <section key={dateGroup.title} className="space-y-3 sm:space-y-6">
                <div className="flex items-center gap-3">
                   <h2 className="text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.3em] whitespace-nowrap">{dateGroup.title}</h2>
                   <div className="h-px w-full bg-border" />
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
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
          <div className="flex items-center justify-center gap-4 mt-16">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border-border hover:bg-muted shadow-sm h-10 px-4"
            >
              <ChevronLeft size={16} className="mr-2" />
              Trước
            </Button>
            <div className="flex items-center gap-1">
               <span className="text-xs font-black text-primary px-3 py-2 bg-primary/10 rounded-lg">{page}</span>
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">trên {data.totalPages}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-xl border-border hover:bg-muted shadow-sm h-10 px-4"
            >
              Sau
              <ChevronRight size={16} className="ml-2" />
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
  const maxScoreDisplay = hasCompletedAttempt ? (quizGroup.bestScorePercentage / 10).toFixed(1) : '--'

  return (
    <Card className="rounded-2xl sm:rounded-[32px] border border-border bg-card shadow-xs hover:shadow-md hover:border-ring transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        {/* Card Main Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-6 p-3.5 sm:p-6 md:p-7">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0 bg-primary/10 text-primary border border-primary/20">
              {quizGroup.is_mix ? <Shuffle className="w-4 h-4 sm:w-7 sm:h-7" /> : <CheckCircle className="w-4 h-4 sm:w-7 sm:h-7" />}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-black text-[9px] uppercase rounded-full px-2.5 py-0.5">
                  {quizGroup.category_name}
                </Badge>
                <h3 className="text-xs sm:text-lg font-extrabold text-foreground truncate uppercase tracking-tight">
                  {quizGroup.quiz_code}
                </h3>
                {attemptCount > 1 && (
                  <Badge className="bg-warning-bg text-warning-fg border border-warning-border font-bold text-[9px] uppercase rounded-full px-2 py-0.5">
                    {attemptCount} lượt làm bài
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-muted-foreground truncate">
                {quizGroup.quiz_title || quizGroup.source_label}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-0.5 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Điểm cao nhất: <strong className="text-primary font-black">{hasCompletedAttempt ? `${maxScoreDisplay}/10` : 'Chưa có'}</strong></span>
                <span>• Gần nhất: {format(new Date(latestAttempt.started_at), 'HH:mm')}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 justify-between md:justify-end border-t md:border-t-0 border-border pt-2.5 md:pt-0">
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="h-8 sm:h-9 px-3 rounded-xl border-border text-primary font-bold text-[10px] sm:text-[11px] uppercase tracking-wider hover:bg-muted transition-all cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
              {attemptCount > 1 ? `${attemptCount} Lượt thi` : 'Chi tiết'}
            </Button>

            <Button size="icon" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-xs transition-colors cursor-pointer shrink-0" asChild>
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

        {/* Expanded Attempts Timeline List */}
        {expanded && (
          <div className="border-t border-border bg-muted/40 p-3.5 sm:p-6 space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tiến trình các lượt làm bài ({attemptCount})</p>
            <div className="space-y-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {quizGroup.attempts.map((attempt, idx) => {
                const maxQuizQuestions = Math.max(...quizGroup.attempts.map(a => a.total_questions || 0))
                const isRetryWrong = attempt.total_questions < maxQuizQuestions
                const scoreOnTen = (attempt.score / Math.max(attempt.total_questions, 1)) * 10
                const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)

                return (
                  <div key={attempt._id} className="relative pl-8 flex items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs hover:border-ring transition-colors">
                    {/* Circle Node */}
                    <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-card border-2 border-primary flex items-center justify-center -translate-x-1/2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="text-xs font-black text-foreground">Lượt {attemptCount - idx}</span>
                      <ModeBadge mode={attempt.mode} />
                      {isRetryWrong && (
                        <Badge className="bg-warning-bg text-warning-fg border border-warning-border font-bold text-[8.5px] uppercase px-1.5 py-0">
                          <RotateCcw className="w-2.5 h-2.5 mr-1 inline" /> Luyện câu sai
                        </Badge>
                      )}
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {format(new Date(attempt.started_at), 'HH:mm')} ({attempt.duration_minutes} phút)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {attempt.status === 'completed' ? (
                        <div className="text-right">
                          <span className="text-sm font-black text-primary">{formattedScore}/10</span>
                          <p className="text-[9px] font-bold text-muted-foreground">{attempt.correct_count}/{attempt.total_questions} đúng</p>
                        </div>
                      ) : (
                        <div className="text-right flex flex-col items-end">
                          <Badge className="bg-warning-bg text-warning-fg border border-warning-border font-bold text-[9px] uppercase px-2 py-0.5">
                            Chưa hoàn thành
                          </Badge>
                          <span className="text-[9px] font-extrabold text-warning-fg">Đã làm {attempt.answered_count ?? 0}/{attempt.total_questions} câu</span>
                        </div>
                      )}

                      <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" asChild>
                        <Link href={
                          attempt.status === 'active'
                            ? attempt.mode === 'flashcard'
                              ? `/quiz/${attempt.quiz_id}/session/${attempt._id}/flashcard`
                              : `/quiz/${attempt.quiz_id}/session/${attempt._id}`
                            : `/quiz/${attempt.quiz_id}/result/${attempt._id}`
                        }>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
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
    <React.Suspense fallback={
      <div className="py-20 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    }>
      <HistoryContent />
    </React.Suspense>
  )
}
