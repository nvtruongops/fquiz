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
  Filter,
  Search,
  Loader2,
  GraduationCap,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
    <main className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-[11px] font-black text-[#5D7B6F] uppercase tracking-[0.3em]">Hành trình của bạn</p>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Lịch sử làm bài
              </h1>
            </div>
            
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5D7B6F] transition-colors" />
              <Input 
                placeholder="Tìm mã môn hoặc danh mục..." 
                className="pl-11 h-12 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white transition-all shadow-sm group-hover:border-gray-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-[#5D7B6F] animate-spin" />
            <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải lịch sử...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-50 rounded-3xl border border-red-100">
             <p className="text-sm font-bold text-red-600">Đã xảy ra lỗi khi tải lịch sử. Vui lòng thử lại.</p>
          </div>
        ) : groupedHistory.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/20">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-200">
              <Calendar className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-gray-800">Trống trơn!</h3>
            <p className="text-sm font-bold text-gray-400 mt-2">Bạn chưa có hoạt động nào phù hợp với tìm kiếm.</p>
            <Button asChild className="mt-8 bg-[#5D7B6F] rounded-xl px-8 h-12">
               <Link href="/explore">Bắt đầu học ngay</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedHistory.map((group) => (
              <section key={group.title} className="space-y-6">
                <div className="flex items-center gap-4">
                   <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] whitespace-nowrap">{group.title}</h2>
                   <div className="h-px w-full bg-gray-100" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {group.items.map((item) => (
                    <Card key={item._id} className="rounded-[28px] border-none bg-white shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-[#5D7B6F]/5 transition-all group overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                            item.status === 'completed' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                          )}>
                            {item.status === 'completed' ? <CheckCircle className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-black text-gray-900 truncate uppercase tracking-tight group-hover:text-[#5D7B6F] transition-colors">
                                {item.quiz_code}
                              </h3>
                              <ModeBadge mode={item.mode} />
                              {item.status === 'active' && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none font-black text-[9px] uppercase">Đang làm</Badge>
                              )}
                            </div>
                            <p className="text-xs font-bold text-gray-400">
                              {item.category_name} • {format(new Date(item.started_at), 'HH:mm')}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                               <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase">
                                  <Clock className="w-3 h-3" />
                                  {item.duration_minutes} phút học
                               </div>
                               <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase">
                                  <RotateCcw className="w-3 h-3" />
                                  {item.source_label}
                               </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8 justify-between md:justify-end">
                            <div className="text-right">
                              {item.mode === 'flashcard' ? (
                                item.status === 'active' ? (
                                  <>
                                    <p className="text-3xl font-black leading-none tracking-tighter text-gray-300">--</p>
                                    <p className="text-[10px] font-black text-gray-300 uppercase mt-1">
                                      {item.flashcard_stats
                                        ? `${item.flashcard_stats.cards_known + item.flashcard_stats.cards_unknown}/${item.total_questions} THẺ`
                                        : `0/${item.total_questions} THẺ`}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-3xl font-black leading-none tracking-tighter text-purple-500">
                                      {item.flashcard_stats?.cards_known ?? 0}
                                      <span className="text-lg text-purple-300">/{item.flashcard_stats?.total_cards ?? item.total_questions}</span>
                                    </p>
                                    <p className="text-[10px] font-black text-gray-300 uppercase mt-1">
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
                                    "text-3xl font-black leading-none tracking-tighter",
                                    item.status === 'active' ? "text-gray-300" : "text-[#5D7B6F]"
                                  )}>
                                    {item.status === 'active' ? '--' : `${item.score}/10`}
                                  </p>
                                  <p className="text-[10px] font-black text-gray-300 uppercase mt-1">
                                    {item.correct_count}/{item.total_questions} CÂU ĐÚNG
                                  </p>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-[#5D7B6F]/5 text-[#5D7B6F]" asChild>
                                  <Link href={`/quiz/${item.quiz_id}`}>
                                     <RotateCcw className="w-4 h-4" />
                                  </Link>
                               </Button>
                               <Button size="icon" className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg" asChild>
                                  <Link href={
                                    item.status === 'active'
                                      ? item.mode === 'flashcard'
                                        ? `/quiz/${item.quiz_id}/session/${item._id}/flashcard`
                                        : `/quiz/${item.quiz_id}/session/${item._id}`
                                      : `/history/${item.quiz_id}/${item._id}`
                                  }>
                                     <ChevronRight className="w-5 h-5" />
                                  </Link>
                               </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
