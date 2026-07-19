'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import FlashcardViewer from '@/components/flashcard/FlashcardViewer'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Layers, RefreshCw, CheckCircle2, Loader2, Sparkles, Filter, Bookmark, BookOpen, Search, Globe, ChevronDown } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { Progress } from '@/components/shared/ui/progress'
import { cn } from '@/lib/core/utils/cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'

interface FlashcardItem {
  progressId: string
  front: string
  back: string
  loType: string
  learningObjectId: string
  version: number
  masteryLevel: number
  reviewCount: number
  nextReviewAt: string | null
  retrievability?: number
}

interface SavedItem {
  progressId: string
  learningObjectId: string
  loType: string
  front: string
  back: string
  examples?: string[]
  cefrLevel?: string
  masteryLevel: number
  reviewCount: number
  nextReviewAt: string | null
  createdAt: string
  updatedAt: string
}

const LO_FILTERS = [
  { key: 'all', label: 'Tất cả học liệu' },
  { key: 'vocabulary', label: 'Từ vựng' },
  { key: 'sentence', label: 'Mẫu câu' },
  { key: 'grammar', label: 'Ngữ pháp' },
]

const LANG_FILTERS = [
  { key: 'all', label: 'Tất cả ngôn ngữ' },
  { key: 'English', label: 'Tiếng Anh' },
  { key: 'Japanese', label: 'Tiếng Nhật' },
  { key: 'Mandarin Chinese', label: 'Tiếng Trung' },
  { key: 'Korean', label: 'Tiếng Hàn' },
  { key: 'French', label: 'Tiếng Pháp' },
  { key: 'German', label: 'Tiếng Đức' },
  { key: 'Spanish', label: 'Tiếng Tây Ban Nha' },
  { key: 'Vietnamese', label: 'Tiếng Việt' },
]

export default function FlashcardsPage() {
  const [viewTab, setViewTab] = useState<'srs' | 'notebook'>('srs')
  const [loFilter, setLoFilter] = useState<string>('all')
  const [langFilter, setLangFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Query 1: Due Flashcards for SRS Review
  const { data: dueData, isLoading: isDueLoading, refetch: refetchDue, isFetching: isDueFetching } = useQuery({
    queryKey: ['flashcards-due', loFilter, langFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (loFilter && loFilter !== 'all') params.set('loType', loFilter)
      if (langFilter && langFilter !== 'all') params.set('languageCode', langFilter)
      const res = await fetch(`/api/v1/learning/review/due?${params}`)
      if (!res.ok) throw new Error('Failed to fetch due flashcards')
      return res.json() as Promise<{ items: FlashcardItem[]; total: number }>
    },
    enabled: viewTab === 'srs',
  })

  // Query 2: Saved Items Notebook
  const { data: savedData, isLoading: isSavedLoading, refetch: refetchSaved, isFetching: isSavedFetching } = useQuery({
    queryKey: ['saved-items', loFilter, searchQuery, langFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' })
      if (loFilter && loFilter !== 'all') params.set('loType', loFilter)
      if (langFilter && langFilter !== 'all') params.set('languageCode', langFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/v1/learning/saved-items?${params}`)
      if (!res.ok) throw new Error('Failed to fetch saved items')
      return res.json() as Promise<{ items: SavedItem[]; total: number }>
    },
    enabled: viewTab === 'notebook',
  })

  const dueItems = dueData?.items ?? []
  const savedItems = savedData?.items ?? []

  return (
    <DevOnlyGuard featureName="Flashcards AI & Sổ Tay">
      <div className="w-full py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-2xl p-6 md:p-10 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/10 via-[#A4C3A2]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transform-gpu" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/10 text-[#5D7B6F] flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#5D7B6F]">FSRS Spaced Repetition</p>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Hệ Thống Ghi Nhớ & Sổ Bài Học</h1>
              </div>
            </div>

            {/* Main View Mode Selector Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 w-full sm:w-auto">
              <button
                onClick={() => setViewTab('srs')}
                className={cn(
                  "flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  viewTab === 'srs'
                    ? "bg-[#5D7B6F] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Thẻ cần ôn (SRS)
              </button>
              <button
                onClick={() => setViewTab('notebook')}
                className={cn(
                  "flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  viewTab === 'notebook'
                    ? "bg-[#5D7B6F] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Sổ tay đã lưu ({savedData?.total ?? 0})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewTab === 'srs' ? (
              <Badge className="bg-[#5D7B6F] text-white border-none px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-[#5D7B6F]/20">
                {dueItems.length} thẻ cần ôn ngay
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white border-none px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
                {savedItems.length} mục đã lưu
              </Badge>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => (viewTab === 'srs' ? refetchDue() : refetchSaved())}
              className="w-10 h-10 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-600"
              title="Làm mới"
            >
              <RefreshCw className={cn("w-4 h-4", (isDueFetching || isSavedFetching) && "animate-spin text-[#5D7B6F]")} />
            </Button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-6 border-t border-slate-100 mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Language Filter */}
            <Select value={langFilter} onValueChange={setLangFilter}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-2xl bg-white border border-slate-200/90 font-bold text-xs text-slate-800 shadow-xs focus:ring-2 focus:ring-[#5D7B6F]/20">
                <div className="flex items-center gap-1.5 truncate">
                  <Globe className="w-3.5 h-3.5 text-[#5D7B6F] shrink-0" />
                  <SelectValue placeholder="Tất cả ngôn ngữ" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                {LANG_FILTERS.map((l) => (
                  <SelectItem key={l.key} value={l.key} className="rounded-xl font-bold py-2 text-xs cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Learning Object Type Filter Select */}
            <Select value={loFilter} onValueChange={setLoFilter}>
              <SelectTrigger className="w-full sm:w-44 h-10 rounded-2xl bg-white border border-slate-200/90 font-bold text-xs text-slate-800 shadow-xs focus:ring-2 focus:ring-[#5D7B6F]/20">
                <SelectValue placeholder="Tất cả học liệu" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                {LO_FILTERS.map((f) => (
                  <SelectItem key={f.key} value={f.key} className="rounded-xl font-bold py-2 text-xs cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {viewTab === 'notebook' && (
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ vựng, câu mẫu..."
                className="pl-9 h-10 rounded-xl text-xs font-medium border-slate-200 focus:border-[#5D7B6F]"
              />
            </div>
          )}
        </div>
      </div>

      {/* View Tab 1: SRS Review Mode */}
      {viewTab === 'srs' && (
        <>
          {isDueLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <Loader2 className="w-10 h-10 text-[#5D7B6F] animate-spin" />
              <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải thẻ ghi nhớ đến hạn...</p>
            </div>
          ) : dueItems.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-sm max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hoàn thành đợt ôn tập!</h2>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                {langFilter && langFilter !== 'all'
                  ? `Không có thẻ ${langFilter} nào đến hạn ôn tập.`
                  : 'Hiện chưa có thẻ nào đến hạn lặp lại FSRS. Bạn có thể chuyển sang tab Sổ tay đã lưu để xem lại tất cả bài học.'}
              </p>
              <Button
                onClick={() => setViewTab('notebook')}
                className="rounded-2xl px-6 h-11 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#5D7B6F]/20"
              >
                Mở Sổ Tay Đã Lưu
              </Button>
            </div>
          ) : (
            <FlashcardViewer initialCards={dueItems} />
          )}
        </>
      )}

      {/* View Tab 2: Saved Notebook Mode */}
      {viewTab === 'notebook' && (
        <>
          {isSavedLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <Loader2 className="w-10 h-10 text-[#5D7B6F] animate-spin" />
              <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest">Đang tải sổ bài học đã lưu...</p>
            </div>
          ) : savedItems.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-sm max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sổ tay bài học trống</h2>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                {langFilter && langFilter !== 'all'
                  ? `Chưa có bài học nào được lưu cho ${langFilter}.`
                  : 'Bạn chưa lưu từ vựng hoặc mẫu câu nào. Hãy sử dụng Trợ lý AI để tự động biên soạn và bấm "Lưu vào Flashcard SRS".'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedItems.map((item) => (
                <div
                  key={item.progressId}
                  className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-emerald-50 text-[#5D7B6F] border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                        {item.loType === 'vocabulary' && 'Từ vựng'}
                        {item.loType === 'sentence' && 'Mẫu câu'}
                        {item.loType === 'grammar' && 'Ngữ pháp'}
                      </Badge>
                      {item.cefrLevel && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {item.cefrLevel}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                        {item.front}
                      </h3>
                      <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">
                        {item.back}
                      </p>
                    </div>

                    {item.examples && item.examples.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ví dụ:</span>
                        {item.examples.slice(0, 2).map((ex, idx) => (
                          <p key={idx} className="text-xs text-slate-700 italic">
                            "{ex}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Độ thành thạo</span>
                      <span className="text-[#5D7B6F]">{item.masteryLevel}%</span>
                    </div>
                    <Progress value={item.masteryLevel} className="h-2 bg-slate-100" />
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 pt-1">
                      <span>Đã ôn: {item.reviewCount} lần</span>
                      <span>
                        {item.nextReviewAt ? (
                          new Date(item.nextReviewAt) <= new Date() ? (
                            <strong className="text-amber-600 font-bold">Cần ôn ngay!</strong>
                          ) : (
                            `Ôn vào: ${new Date(item.nextReviewAt).toLocaleDateString('vi-VN')}`
                          )
                        ) : (
                          'Chưa xếp lịch'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </DevOnlyGuard>
  )
}
