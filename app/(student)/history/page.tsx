'use client'

import React, { useState, useMemo } from 'react'
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
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { cn } from '@/lib/core/utils/cn'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { vi } from 'date-fns/locale'

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

interface HistoryResponse {
  history: HistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function fetchHistory(page: number): Promise<HistoryResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history?page=${page}&limit=10`)
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

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['history', page],
    queryFn: () => fetchHistory(page),
  })

  const groupedHistory = useMemo(() => {
    if (!data?.history) return []

    const filtered = data.history.filter(item => 
      item.quiz_code.toLowerCase().includes(search.toLowerCase()) ||
      item.category_name.toLowerCase().includes(search.toLowerCase())
    )

    const groups: { title: string; items: HistoryItem[] }[] = []
    
    filtered.forEach(item => {
      const date = new Date(item.started_at)
      let groupTitle = format(date, 'dd/MM/yyyy')
      
      if (isToday(date)) groupTitle = 'Hôm nay'
      else if (isYesterday(date)) groupTitle = 'Hôm qua'
      
      const existingGroup = groups.find(g => g.title === groupTitle)
      if (existingGroup) {
        existingGroup.items.push(item)
      } else {
        groups.push({ title: groupTitle, items: [item] })
      }
    })

    return groups
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
        ) : groupedHistory.length === 0 ? (
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
            {groupedHistory.map((group) => (
              <section key={group.title} className="space-y-3 sm:space-y-6">
                <div className="flex items-center gap-3">
                   <h2 className="text-[10px] sm:text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.3em] whitespace-nowrap">{group.title}</h2>
                   <div className="h-px w-full bg-gray-100" />
                </div>
                
                <div className="grid grid-cols-1 gap-2.5 sm:gap-4">
                  {group.items.map((item) => (
                    <HistoryItemCard key={item._id} item={item} />
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

function HistoryItemCard({ item }: { item: HistoryItem }) {
  return (
    <Card className="rounded-2xl sm:rounded-[32px] border border-white/90 bg-white/80 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(93,123,111,0.14)] hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-6 p-3.5 sm:p-6 md:p-7">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105 mt-0.5 sm:mt-0",
              item.is_mix ? "bg-[#5D7B6F]/10 text-[#5D7B6F] border border-[#5D7B6F]/20" :
              item.status === 'completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50" : "bg-orange-50 text-orange-600 border border-orange-200/50"
            )}>
              {item.is_mix ? <Shuffle className="w-4 h-4 sm:w-7 sm:h-7" /> : item.status === 'completed' ? <CheckCircle className="w-4 h-4 sm:w-7 sm:h-7" /> : <Play className="w-4 h-4 sm:w-7 sm:h-7" />}
            </div>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h3 className="text-xs sm:text-lg font-extrabold text-slate-900 truncate uppercase tracking-tight group-hover:text-[#5D7B6F] transition-colors">
                  {item.quiz_code}
                </h3>
                <ModeBadge mode={item.mode} />
                {item.is_mix && (
                  <Badge variant="secondary" className="bg-[#5D7B6F]/10 text-[#5D7B6F] border-none font-extrabold text-[8px] sm:text-[9px] uppercase rounded-full px-2 py-0.5">
                    <Shuffle className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-1" />
                    Quiz Trộn
                  </Badge>
                )}
                {item.status === 'active' && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none font-extrabold text-[8px] sm:text-[9px] uppercase px-2 py-0.5">Đang làm</Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-400">
                {item.category_name} • {format(new Date(item.started_at), 'HH:mm')}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-0.5">
                 <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#5D7B6F]" />
                    {item.duration_minutes} phút học
                 </div>
                 <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#5D7B6F]" />
                    {item.source_label}
                 </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8 justify-between md:justify-end border-t md:border-t-0 border-slate-100/80 pt-2.5 md:pt-0">
            <div className="text-left md:text-right">
              {item.mode === 'flashcard' ? (
                item.status === 'active' ? (
                  <>
                    <p className="text-xl sm:text-3xl font-black leading-none tracking-tighter text-slate-300">--</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {item.flashcard_stats
                        ? `${item.flashcard_stats.cards_known + item.flashcard_stats.cards_unknown}/${item.total_questions} THẺ`
                        : `0/${item.total_questions} THẺ`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl sm:text-3xl font-black leading-none tracking-tighter text-purple-600">
                      {item.flashcard_stats?.cards_known ?? 0}
                      <span className="text-sm sm:text-lg text-purple-300">/{item.flashcard_stats?.total_cards ?? item.total_questions}</span>
                    </p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      THẺ ĐÃ BIẾT
                      {item.flashcard_stats && (item.flashcard_stats.cards_known + item.flashcard_stats.cards_unknown < item.flashcard_stats.total_cards) && (
                        <span className="text-orange-500 ml-1">• {item.flashcard_stats.total_cards - item.flashcard_stats.cards_known - item.flashcard_stats.cards_unknown} chưa làm</span>
                      )}
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className={cn(
                    "text-xl sm:text-3xl font-black leading-none tracking-tighter",
                    item.status === 'active' ? "text-slate-300" : "text-[#5D7B6F]"
                  )}>
                    {item.status === 'active'
                      ? '--'
                      : `${Math.min(10, Math.max(0, (item.score / Math.max(item.total_questions, 1)) * 10)).toFixed(1)}/10`}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {item.status === 'active'
                      ? `${item.answered_count}/${item.total_questions} ĐÃ LÀM`
                      : `${item.correct_count}/${item.total_questions} CÂU ĐÚNG`}
                  </p>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl hover:bg-[#5D7B6F]/10 text-[#5D7B6F] text-[10px] font-extrabold uppercase tracking-widest cursor-pointer" 
                  asChild
                >
                  <Link href={item.mode === 'flashcard' ? `/quiz/${item.quiz_id}?selectMode=true&mode=flashcard` : `/quiz/${item.quiz_id}`}>
                    Làm lại
                  </Link>
                </Button>
                {item.is_mix && (
                  <Button 
                    variant="outline" 
                    className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl border-[#5D7B6F]/20 hover:bg-[#5D7B6F] hover:text-white text-[#5D7B6F] text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer" 
                    asChild
                  >
                    <Link href={`/?tab=mix&mix_from=${item.quiz_id}`}>
                      Làm mới
                    </Link>
                  </Button>
                )}
              </div>

              <Button size="icon" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 hover:bg-[#5D7B6F] text-white shadow-md transition-colors cursor-pointer shrink-0" asChild>
                <Link href={
                  item.status === 'active'
                    ? item.mode === 'flashcard'
                      ? `/quiz/${item.quiz_id}/session/${item._id}/flashcard`
                      : `/quiz/${item.quiz_id}/session/${item._id}`
                    : `/quiz/${item.quiz_id}/result/${item._id}`
                }>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
