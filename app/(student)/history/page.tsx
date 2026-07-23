'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
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

import { useSearchParams } from 'next/navigation'

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

    const filtered = data.history.filter(item => 
      (item.quiz_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.category_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.quiz_title || '').toLowerCase().includes(search.toLowerCase())
    )

    const groupsByDate: { title: string; quizzes: GroupedQuiz[] }[] = []

    filtered.forEach(item => {
      const date = new Date(item.started_at)
      let dateTitle = format(date, 'dd/MM/yyyy')
      if (isToday(date)) dateTitle = 'Hôm nay'
      else if (isYesterday(date)) dateTitle = 'Hôm qua'

      let dateGroup = groupsByDate.find(g => g.title === dateTitle)
      if (!dateGroup) {
        dateGroup = { title: dateTitle, quizzes: [] }
        groupsByDate.push(dateGroup)
      }

      const quizKey = item.quiz_id || `${item.quiz_code}_${item.category_name}`
      let quizGroup = dateGroup.quizzes.find(q => q.key === quizKey)

      if (!quizGroup) {
        quizGroup = {
          key: quizKey,
          quiz_id: item.quiz_id,
          quiz_code: item.quiz_code,
          quiz_title: item.quiz_title,
          category_name: item.category_name,
          source_label: item.source_label,
          is_mix: item.is_mix,
          bestScorePercentage: 0,
          attempts: [],
        }
        dateGroup.quizzes.push(quizGroup)
      }

      quizGroup.attempts.push(item)

      const pct = item.total_questions > 0 ? (item.score / item.total_questions) * 100 : 0
      if (pct > quizGroup.bestScorePercentage) {
        quizGroup.bestScorePercentage = pct
      }
    })

    return groupsByDate
  }, [data?.history, search])

  return (
    <main className="min-h-screen bg-[#F9F9F7] pb-20 px-3 sm:px-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-2xl border-b border-gray-100/80 -mx-3 sm:-mx-6 px-3 sm:px-6">
        <div className="w-full py-4 sm:py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
            <div className="space-y-0.5 sm:space-y-2">
              <p className="text-[10px] sm:text-[11px] font-extrabold text-[#5D7B6F] uppercase tracking-[0.3em]">Hành trình của bạn</p>
              <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Lịch sử làm bài
              </h1>
            </div>
            
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5D7B6F] transition-colors" />
              <Input 
                placeholder="Tìm mã môn hoặc danh mục..." 
                className="pl-10 h-10 sm:h-12 rounded-xl sm:rounded-2xl border-gray-100 bg-gray-50 focus:bg-white text-xs sm:text-sm transition-all shadow-xs group-hover:border-gray-200"
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
            <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
            <p className="text-xs font-bold text-[#5D7B6F] uppercase tracking-widest">Đang tải lịch sử...</p>
          </div>
        ) : isError ? (
          <div className="p-4 sm:p-8 text-center bg-red-50 rounded-2xl border border-red-100">
             <p className="text-xs sm:text-sm font-bold text-red-600">Đã xảy ra lỗi khi tải lịch sử. Vui lòng thử lại.</p>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="p-8 sm:p-20 text-center bg-white rounded-2xl sm:rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/20">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-200">
              <Calendar className="w-7 h-7 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-base sm:text-xl font-extrabold text-gray-800">Trống trơn!</h3>
            <p className="text-xs sm:text-sm font-medium text-gray-400 mt-1">Bạn chưa có hoạt động nào phù hợp với tìm kiếm.</p>
            <Button asChild className="mt-6 bg-[#5D7B6F] rounded-xl px-6 h-10 text-xs font-bold">
               <Link href="/">Bắt đầu học ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-12">
            {dateGroups.map((dateGroup) => (
              <section key={dateGroup.title} className="space-y-3 sm:space-y-6">
                <div className="flex items-center gap-3">
                   <h2 className="text-[10px] sm:text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.3em] whitespace-nowrap">{dateGroup.title}</h2>
                   <div className="h-px w-full bg-gray-100" />
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
              className="rounded-xl border-gray-100 hover:bg-white shadow-sm h-10 px-4"
            >
              <ChevronLeft size={16} className="mr-2" />
              Trước
            </Button>
            <div className="flex items-center gap-1">
               <span className="text-xs font-black text-[#5D7B6F] px-3 py-2 bg-[#5D7B6F]/5 rounded-lg">{page}</span>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">trên {data.totalPages}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-xl border-gray-100 hover:bg-white shadow-sm h-10 px-4"
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
  const maxScoreDisplay = (quizGroup.bestScorePercentage / 10).toFixed(1)

  return (
    <Card className="rounded-2xl sm:rounded-[32px] border border-white/90 bg-white/80 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(93,123,111,0.14)] transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        {/* Card Main Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-6 p-3.5 sm:p-6 md:p-7">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0",
              quizGroup.is_mix ? "bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20" : "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
            )}>
              {quizGroup.is_mix ? <Shuffle className="w-4 h-4 sm:w-7 sm:h-7" /> : <CheckCircle className="w-4 h-4 sm:w-7 sm:h-7" />}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Badge variant="secondary" className="bg-[#5D7B6F]/10 text-[#5D7B6F] border-none font-black text-[9px] uppercase rounded-full px-2.5 py-0.5">
                  {quizGroup.category_name}
                </Badge>
                <h3 className="text-xs sm:text-lg font-extrabold text-slate-900 truncate uppercase tracking-tight">
                  {quizGroup.quiz_code}
                </h3>
                {attemptCount > 1 && (
                  <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[9px] uppercase rounded-full px-2 py-0.5">
                    {attemptCount} lượt làm bài
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">
                {quizGroup.quiz_title || quizGroup.source_label}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-0.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Điểm cao nhất: <strong className="text-[#5D7B6F] font-black">{maxScoreDisplay}/10</strong></span>
                <span>• Gần nhất: {format(new Date(latestAttempt.started_at), 'HH:mm')}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 justify-between md:justify-end border-t md:border-t-0 border-slate-100/80 pt-2.5 md:pt-0">
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="h-8 sm:h-9 px-3 rounded-xl border-slate-200 text-[#5D7B6F] font-bold text-[10px] sm:text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
              {attemptCount > 1 ? `${attemptCount} Lượt thi` : 'Chi tiết'}
            </Button>

            <Button size="icon" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 hover:bg-[#5D7B6F] text-white shadow-xs transition-colors cursor-pointer shrink-0" asChild>
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
          <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 sm:p-6 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tiến trình các lượt làm bài ({attemptCount})</p>
            <div className="space-y-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {quizGroup.attempts.map((attempt, idx) => {
                const maxQuizQuestions = Math.max(...quizGroup.attempts.map(a => a.total_questions || 0))
                const isRetryWrong = attempt.total_questions < maxQuizQuestions
                const scoreOnTen = (attempt.score / Math.max(attempt.total_questions, 1)) * 10
                const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)

                return (
                  <div key={attempt._id} className="relative pl-8 flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100/80 shadow-xs hover:border-slate-200 transition-colors">
                    {/* Circle Node */}
                    <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#5D7B6F] flex items-center justify-center -translate-x-1/2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5D7B6F]" />
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="text-xs font-black text-slate-700">Lượt {attemptCount - idx}</span>
                      <ModeBadge mode={attempt.mode} />
                      {isRetryWrong && (
                        <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[8.5px] uppercase px-1.5 py-0">
                          <RotateCcw className="w-2.5 h-2.5 mr-1 inline" /> Luyện câu sai
                        </Badge>
                      )}
                      <span className="text-[10px] font-bold text-slate-400">
                        {format(new Date(attempt.started_at), 'HH:mm')} ({attempt.duration_minutes} phút)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#5D7B6F]">{formattedScore}/10</span>
                        <p className="text-[9px] font-bold text-slate-400">{attempt.correct_count}/{attempt.total_questions} đúng</p>
                      </div>

                      <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" asChild>
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
