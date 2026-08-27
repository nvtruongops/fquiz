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
  CheckCircle2,
  Zap,
  RotateCcw,
  Calendar,
  Search,
  GraduationCap,
  Shuffle,
  ChevronDown,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Trophy,
  History as HistoryIcon
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
  flashcard_stats?: Record<string, unknown>
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

type FilterStatus = 'all' | 'completed' | 'active'
type FilterMode = 'all' | 'immediate' | 'review' | 'flashcard'

async function fetchHistory(page: number): Promise<HistoryResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history?page=${page}&limit=20`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

function ModeBadge({ mode }: { mode: 'immediate' | 'review' | 'flashcard' }) {
  const config = {
    immediate: { label: 'Luyện tập', icon: Zap, bg: 'bg-primary/10 text-primary border-primary/20' },
    review: { label: 'Kiểm tra', icon: BookOpen, bg: 'bg-info-bg text-info-fg border-info-border' },
    flashcard: { label: 'Lật thẻ', icon: GraduationCap, bg: 'bg-accent/15 text-accent-foreground border-border' },
  }
  const { label, icon: Icon, bg } = config[mode] || { label: mode, icon: BookOpen, bg: 'bg-muted text-muted-foreground border-border' }
  
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shrink-0 flex items-center gap-1", bg)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  )
}

function HistoryContent() {
  const searchParams = useSearchParams()
  const searchFromUrl = searchParams.get('search') || ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchFromUrl)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [modeFilter, setModeFilter] = useState<FilterMode>('all')

  useEffect(() => {
    if (searchFromUrl) {
      setSearch(searchFromUrl)
    }
  }, [searchFromUrl])

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['history', page],
    queryFn: () => fetchHistory(page),
  })

  // Quick statistics calculation
  const stats = useMemo(() => {
    if (!data?.history) return { totalQuizzes: 0, totalAttempts: 0, completedCount: 0, perfectScores: 0 }
    const totalAttempts = data.history.length
    const completedCount = data.history.filter(h => h.status === 'completed').length
    const perfectScores = data.history.filter(h => h.status === 'completed' && h.total_questions > 0 && h.score >= h.total_questions).length
    const uniqueQuizzes = new Set(data.history.map(h => h.quiz_id || h.quiz_code)).size

    return { totalQuizzes: uniqueQuizzes, totalAttempts, completedCount, perfectScores }
  }, [data?.history])

  const dateGroups = useMemo(() => {
    if (!data?.history) return []

    const q = search.toLowerCase().trim()
    const groupsMap = new Map<string, Map<string, GroupedQuiz>>()

    data.history.forEach(item => {
      // Search text filter
      if (q) {
        const matchesCode = item.quiz_code?.toLowerCase().includes(q)
        const matchesCat = item.category_name?.toLowerCase().includes(q)
        const matchesTitle = item.quiz_title?.toLowerCase().includes(q)
        if (!matchesCode && !matchesCat && !matchesTitle) return
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return

      // Mode filter
      if (modeFilter !== 'all' && item.mode !== modeFilter) return

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
  }, [data?.history, search, statusFilter, modeFilter])

  return (
    <main className="min-h-screen pb-20 px-3 sm:px-6 max-w-6xl mx-auto space-y-6">
      {/* ── Page Header & Stats Strip ────────────────────────────────────────────────────────── */}
      <div className="pt-4 sm:pt-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-wider">
              <HistoryIcon className="w-3 h-3" />
              <span>Hành trình học tập</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Lịch sử làm bài
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Theo dõi tiến trình ôn luyện, điểm số đạt được và xem lại chi tiết từng lượt thi.
            </p>
          </div>

          {/* Quick Stats Pill Strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                {stats.totalQuizzes}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Bộ đề đã thi</p>
                <p className="text-xs font-black text-foreground">{stats.totalAttempts} lượt làm</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-success/15 text-success flex items-center justify-center font-black text-xs">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Điểm tối đa</p>
                <p className="text-xs font-black text-foreground">{stats.perfectScores} lượt 10/10</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls (Flat Segmented Bar, No jumpy translate) ────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Tìm kiếm mã môn, tên bài thi hoặc danh mục..." 
              className="pl-10 h-10 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary text-xs transition-all shadow-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Flat Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 shrink-0 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setModeFilter('all') }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0",
                statusFilter === 'all' && modeFilter === 'all'
                  ? "bg-card text-foreground shadow-2xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                statusFilter === 'completed'
                  ? "bg-card text-foreground shadow-2xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Hoàn thành</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                statusFilter === 'active'
                  ? "bg-card text-foreground shadow-2xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <AlertCircle className="w-3.5 h-3.5 text-warning-fg" />
              <span>Đang dở</span>
            </button>
            <button
              type="button"
              onClick={() => setModeFilter(modeFilter === 'flashcard' ? 'all' : 'flashcard')}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5",
                modeFilter === 'flashcard'
                  ? "bg-card text-foreground shadow-2xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Flashcard</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Activity Feed ──────────────────────────────────────────────────────── */}
      <div className="w-full">
        {isLoading ? (
          <HistorySkeleton />
        ) : isError ? (
          <div className="p-8 text-center bg-destructive/10 rounded-2xl border border-destructive/20 space-y-2">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm font-bold text-destructive">Đã xảy ra lỗi khi tải lịch sử làm bài.</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="rounded-xl text-xs font-black">
              Thử lại
            </Button>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="p-10 sm:p-16 text-center bg-card rounded-2xl sm:rounded-3xl border border-border shadow-2xs space-y-4">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-foreground">Không tìm thấy lịch sử phù hợp</h3>
              <p className="text-xs font-medium text-muted-foreground max-w-sm mx-auto">
                {search || statusFilter !== 'all' || modeFilter !== 'all'
                  ? 'Không có kết quả nào khớp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa tìm kiếm.'
                  : 'Bạn chưa tham gia bài thi hoặc luyện tập flashcard nào. Khám phá kho đề thi để bắt đầu ngay!'}
              </p>
            </div>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl px-6 h-10 text-xs font-black cursor-pointer shadow-md shadow-primary/20">
              <Link href="/explore">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Khám phá Đề thi ngay
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {dateGroups.map((dateGroup) => (
              <section key={dateGroup.title} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{dateGroup.title}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                <div className="grid grid-cols-1 gap-3.5">
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
          <div className="flex items-center justify-center gap-3 mt-10 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border-border hover:bg-muted shadow-2xs h-9 px-4 text-xs font-bold cursor-pointer"
            >
              <ChevronLeft size={14} className="mr-1" />
              Trang trước
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-primary px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">{page}</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">/ {data.totalPages}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-xl border-border hover:bg-muted shadow-2xs h-9 px-4 text-xs font-bold cursor-pointer"
            >
              Trang sau
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
  const maxScore = (quizGroup.bestScorePercentage / 10).toFixed(1)
  const isPerfect = hasCompletedAttempt && quizGroup.bestScorePercentage >= 100

  // Deduplicate display title
  const displayTitle = quizGroup.quiz_title && quizGroup.quiz_title !== quizGroup.quiz_code
    ? `${quizGroup.quiz_code} — ${quizGroup.quiz_title}`
    : (quizGroup.quiz_title || quizGroup.quiz_code)

  const latestSessionUrl = latestAttempt.status === 'active'
    ? latestAttempt.mode === 'flashcard'
      ? `/quiz/${latestAttempt.quiz_id}/session/${latestAttempt._id}/flashcard`
      : `/quiz/${latestAttempt.quiz_id}/session/${latestAttempt._id}`
    : `/quiz/${latestAttempt.quiz_id}/result/${latestAttempt._id}`

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Main Sleek Single Header Row */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Left Column: Icon & Quiz Details */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            {/* Status / Type Icon */}
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs mt-0.5 sm:mt-0",
              isPerfect
                ? "bg-success/15 text-success border-success/30"
                : quizGroup.is_mix
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                : "bg-primary/10 text-primary border-primary/20"
            )}>
              {isPerfect ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : quizGroup.is_mix ? (
                <Shuffle className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {quizGroup.category_name && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground font-black text-[9px] uppercase rounded-md px-2 py-0.5 border border-border shrink-0">
                    {quizGroup.category_name}
                  </Badge>
                )}
                <h3 className="text-sm font-black text-foreground truncate tracking-tight">
                  {displayTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1 font-bold text-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  Gần nhất: {format(new Date(latestAttempt.started_at), 'HH:mm')}
                </span>
                <span>•</span>
                <span className="font-semibold text-muted-foreground">
                  {attemptCount} lượt làm bài
                </span>
                <span>•</span>
                <ModeBadge mode={latestAttempt.mode} />
              </div>
            </div>
          </div>

          {/* Right Column: Score & Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            {/* Score Display */}
            <div className="text-left sm:text-right">
              {hasCompletedAttempt ? (
                <div className="flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-0">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-base sm:text-lg font-black text-primary leading-none">{maxScore}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">/10</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Điểm cao nhất</p>
                </div>
              ) : (
                <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                  Chưa hoàn thành
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {attemptCount > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className={cn(
                    "h-8 px-3 rounded-xl border-border text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer",
                    expanded && "bg-muted border-primary/40 text-primary"
                  )}
                >
                  <span>Chi tiết ({attemptCount})</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 ml-1 transition-transform duration-200", expanded && "rotate-180")} />
                </Button>
              )}

              <Button size="sm" className="h-8 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-xs shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5" asChild>
                <Link href={latestSessionUrl}>
                  <span>{latestAttempt.status === 'active' ? 'Làm tiếp' : 'Xem kết quả'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Attempts Section Container */}
        {expanded && (
          <div className="border-t border-border/70 bg-muted/20 p-3 sm:p-4 space-y-2 rounded-b-2xl animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Tiến trình các lượt làm bài ({attemptCount})
              </p>
              <span className="text-[10px] font-bold text-muted-foreground">Nhấp vào lượt thi để xem lại chi tiết</span>
            </div>

            <div className="space-y-1.5">
              {quizGroup.attempts.map((attempt, idx) => {
                const maxQuizQuestions = Math.max(...quizGroup.attempts.map(a => a.total_questions || 0))
                const isRetryWrong = attempt.total_questions < maxQuizQuestions
                const scoreOnTen = (attempt.score / Math.max(attempt.total_questions, 1)) * 10
                const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)
                const isLatest = idx === 0

                const attemptUrl = attempt.status === 'active'
                  ? attempt.mode === 'flashcard'
                    ? `/quiz/${attempt.quiz_id}/session/${attempt._id}/flashcard`
                    : `/quiz/${attempt.quiz_id}/session/${attempt._id}`
                  : `/quiz/${attempt.quiz_id}/result/${attempt._id}`

                return (
                  <Link
                    key={attempt._id}
                    href={attemptUrl}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/40 transition-all shadow-2xs cursor-pointer group"
                  >
                    {/* Left: Clean Single Attempt Tag & Details (No redundant duplicate badges) */}
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-black shrink-0 tracking-tight",
                        isLatest
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-muted text-muted-foreground font-bold border border-border/60"
                      )}>
                        Lượt {attemptCount - idx}
                      </span>

                      <ModeBadge mode={attempt.mode} />

                      {isRetryWrong && (
                        <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <RotateCcw className="w-2.5 h-2.5" /> Luyện câu sai
                        </Badge>
                      )}

                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(attempt.started_at), 'HH:mm')} • {attempt.duration_minutes || 0} phút
                      </span>
                    </div>

                    {/* Right: Score & Arrow */}
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {attempt.status === 'completed' ? (
                        <div className="text-right">
                          <span className={cn(
                            "text-xs sm:text-sm font-black",
                            scoreOnTen >= 8 ? "text-success" : scoreOnTen >= 5 ? "text-primary" : "text-foreground"
                          )}>
                            {formattedScore}/10
                          </span>
                          <p className="text-[9px] font-bold text-muted-foreground">{attempt.correct_count}/{attempt.total_questions} đúng</p>
                        </div>
                      ) : (
                        <div className="text-right flex flex-col items-end">
                          <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2 py-0.5 rounded-full">
                            Đang dở
                          </Badge>
                          <span className="text-[9px] font-bold text-warning-fg mt-0.5">
                            {attempt.answered_count ?? 0}/{attempt.total_questions} câu
                          </span>
                        </div>
                      )}

                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
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
