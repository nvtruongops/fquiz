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
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const dueItems = dueData?.items ?? []
  const savedItems = savedData?.items ?? []

  return (
    <DevOnlyGuard featureName="Flashcards AI & Sổ Tay">
      <div className="w-full py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-card backdrop-blur-2xl p-6 md:p-10 border border-border shadow-xs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transform-gpu" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">FSRS Spaced Repetition</p>
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Hệ Thống Ghi Nhớ & Sổ Bài Học</h1>
              </div>
            </div>

            {/* Main View Mode Selector Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-muted border border-border w-full sm:w-auto">
              <button
                onClick={() => setViewTab('srs')}
                className={cn(
                  "flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  viewTab === 'srs'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Thẻ cần ôn (SRS)
              </button>
              <button
                onClick={() => setViewTab('notebook')}
                className={cn(
                  "flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  viewTab === 'notebook'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sổ tay đã lưu ({savedData?.total ?? 0})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {viewTab === 'srs' ? (
              <Badge className="bg-primary text-primary-foreground border-none px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20">
                {dueItems.length} thẻ cần ôn ngay
              </Badge>
            ) : (
              <Badge className="bg-success-fg text-white border-none px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
                {savedItems.length} mục đã lưu
              </Badge>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => (viewTab === 'srs' ? refetchDue() : refetchSaved())}
              className="w-10 h-10 rounded-2xl border-border hover:bg-muted text-muted-foreground"
              title="Làm mới"
            >
              <RefreshCw className={cn("w-4 h-4", (isDueFetching || isSavedFetching) && "animate-spin text-primary")} />
            </Button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-6 border-t border-border mt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Language Filter */}
            <Select value={langFilter} onValueChange={setLangFilter}>
              <SelectTrigger className="w-full sm:w-48 h-10 rounded-2xl bg-card border border-input font-bold text-xs text-foreground shadow-xs focus:ring-2 focus:ring-primary/20">
                <div className="flex items-center gap-1.5 truncate">
                  <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Tất cả ngôn ngữ" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border bg-card shadow-2xl p-1.5 z-50">
                {LANG_FILTERS.map((l) => (
                  <SelectItem key={l.key} value={l.key} className="rounded-xl font-bold py-2 text-xs cursor-pointer hover:bg-primary/10 focus:bg-primary/10 focus:text-primary text-foreground">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Learning Object Type Filter Select */}
            <Select value={loFilter} onValueChange={setLoFilter}>
              <SelectTrigger className="w-full sm:w-44 h-10 rounded-2xl bg-card border border-input font-bold text-xs text-foreground shadow-xs focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Tất cả học liệu" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border bg-card shadow-2xl p-1.5 z-50">
                {LO_FILTERS.map((f) => (
                  <SelectItem key={f.key} value={f.key} className="rounded-xl font-bold py-2 text-xs cursor-pointer hover:bg-primary/10 focus:bg-primary/10 focus:text-primary text-foreground">
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
            <div className="text-center py-16 px-4 bg-card backdrop-blur-2xl rounded-[32px] border border-border shadow-sm max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm border border-primary/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Hoàn thành đợt ôn tập!</h2>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                {langFilter && langFilter !== 'all'
                  ? `Không có thẻ ${langFilter} nào đến hạn ôn tập.`
                  : 'Hiện chưa có thẻ nào đến hạn lặp lại FSRS. Bạn có thể chuyển sang tab Sổ tay đã lưu để xem lại tất cả bài học.'}
              </p>
              <Button
                onClick={() => setViewTab('notebook')}
                className="rounded-2xl px-6 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20"
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
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-xs font-black text-primary uppercase tracking-widest">Đang tải sổ bài học đã lưu...</p>
            </div>
          ) : savedItems.length === 0 ? (
            <div className="text-center py-16 px-4 bg-card backdrop-blur-2xl rounded-[32px] border border-border shadow-sm max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-muted text-muted-foreground flex items-center justify-center mx-auto shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Sổ tay bài học trống</h2>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed">
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
                  className="bg-card backdrop-blur-xl border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-wider">
                        {item.loType === 'vocabulary' && 'Từ vựng'}
                        {item.loType === 'sentence' && 'Mẫu câu'}
                        {item.loType === 'grammar' && 'Ngữ pháp'}
                      </Badge>
                      {item.cefrLevel && (
                        <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                          {item.cefrLevel}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-foreground tracking-tight leading-snug">
                        {item.front}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                        {item.back}
                      </p>
                    </div>

                    {item.examples && item.examples.length > 0 && (
                      <div className="bg-muted/80 p-3 rounded-2xl border border-border space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Ví dụ:</span>
                        {item.examples.slice(0, 2).map((ex, idx) => (
                          <p key={idx} className="text-xs text-foreground italic">
                            "{ex}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>Độ thành thạo</span>
                      <span className="text-primary">{item.masteryLevel}%</span>
                    </div>
                    <Progress value={item.masteryLevel} className="h-2 bg-muted" />
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-1">
                      <span>Đã ôn: {item.reviewCount} lần</span>
                      <span>
                        {item.nextReviewAt ? (
                          new Date(item.nextReviewAt) <= new Date() ? (
                            <strong className="text-amber-400 font-bold">Cần ôn ngay!</strong>
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
