'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  Search, Users, Clock3, Download, AlertCircle, ArrowRight, ChevronDown, ChevronUp,
  Pin, PinOff, Shuffle, SearchCode, BookOpen, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/store/toast-store'
import { withCsrfHeaders } from '@/lib/csrf'
import MixQuizTab from '@/components/explore/MixQuizTab'

// ── Types ──────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  publishedQuizCount?: number
}

interface QuizMeta {
  id: string
  title: string
  course_code: string
  source_label: string
  source_creator_name?: string | null
  questionCount: number
  studentCount: number
  categoryId: string
  categoryName: string
  latestCorrectCount?: number | null
  latestTotalCount?: number | null
  latestScoreOnTen?: number | null
  totalStudyMinutes?: number | null
}

const PAGE_SIZE = 8 // quizzes per page inside a category dropdown

function formatStudyDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
}

// ── API ────────────────────────────────────────────────────────────────────

async function fetchCategories(): Promise<{ data: Category[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchPinnedCategories(): Promise<{ pinnedCategories: string[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-categories`)
  if (!res.ok) return { pinnedCategories: [] }
  return res.json()
}

async function togglePinCategory(categoryId: string): Promise<{ pinned: boolean; pinnedCategories: string[]; error?: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-categories`, {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ categoryId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to pin category')
  return data
}

async function fetchQuizzes(params: {
  categoryId?: string
  search?: string
  isLoggedIn: boolean
  limit?: number
  offset?: number
}): Promise<{ data: QuizMeta[] }> {
  const p = new URLSearchParams()
  if (params.categoryId) p.set('category_id', params.categoryId)
  if (params.search) p.set('search', params.search)
  p.set('sort', 'popular')
  if (params.limit) p.set('limit', String(params.limit))
  if (params.offset) p.set('offset', String(params.offset))
  const endpoint = params.isLoggedIn ? '/api/v1/explore/quizzes' : '/api/v1/public/quizzes'
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${endpoint}?${p}`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

// ── QuizCard ───────────────────────────────────────────────────────────────

function QuizCard({ quiz, isLoggedIn }: { quiz: QuizMeta; isLoggedIn: boolean }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const hasAttempt = typeof quiz.latestCorrectCount === 'number'
  const scoreOnTen = quiz.latestScoreOnTen ?? 0
  const isPassed = scoreOnTen >= 5
  const totalStudyMinutes = Number(quiz.totalStudyMinutes ?? 0)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/save-quiz`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ quizId: quiz.id }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || `Đã lưu ${quiz.course_code}!`)
      queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const normTitle = (quiz.title || '').trim().toLowerCase()
  const normCode = (quiz.course_code || '').trim().toLowerCase()
  const showCourseCodeBadge = quiz.course_code && normTitle !== normCode

  return (
    <div className="group block relative">
      <Card className="h-full rounded-[20px] bg-white border border-gray-100 group-hover:border-[#5D7B6F]/40 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#5D7B6F]/10">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start justify-between mb-2">
            <div className="flex flex-col gap-1 min-h-[3rem]">
              <Badge className="bg-slate-100 text-slate-500 border-none px-1.5 py-0 rounded-md text-[8px] font-black tracking-widest uppercase w-fit">
                {quiz.categoryName}
              </Badge>
              {showCourseCodeBadge && (
                <div className="flex items-center gap-1 px-1.5 py-0 bg-[#5D7B6F]/10 rounded-md w-fit">
                  <SearchCode className="w-2.5 h-2.5 text-[#5D7B6F]" />
                  <span className="text-[9px] font-black text-[#5D7B6F] uppercase tracking-wider">{quiz.course_code}</span>
                </div>
              )}
            </div>
            {isLoggedIn && (
              <Button
                variant="ghost" size="icon"
                disabled={saveMutation.isPending}
                onClick={(e) => { e.stopPropagation(); saveMutation.mutate() }}
                className={cn('w-7 h-7 rounded-xl bg-slate-50 text-slate-400 hover:bg-[#5D7B6F] hover:text-white transition-all shadow-sm active:scale-90', saveMutation.isPending && 'animate-pulse')}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <Link href={`/quiz/${quiz.id}`} className="flex-1 flex flex-col">
            <h4 className="text-[15px] font-black text-slate-900 mb-1 leading-tight group-hover:text-[#5D7B6F] transition-colors line-clamp-2 min-h-[2.5rem]">
              {quiz.title || quiz.course_code}
            </h4>

            <p className="mb-3 text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              {quiz.source_label}{quiz.source_creator_name ? ` • ${quiz.source_creator_name}` : ''}
            </p>

            {hasAttempt && (
              <div className={cn(
                'mb-3 p-2 rounded-xl border',
                isPassed ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-red-50/50 border-red-100 text-red-700'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-sm font-black leading-none">{scoreOnTen.toFixed(1)}/10</p>
                    <p className="text-[8px] font-bold opacity-60">({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})</p>
                  </div>
                  <p className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider opacity-60">
                    <Clock3 className="h-2.5 w-2.5" />
                    {formatStudyDuration(totalStudyMinutes)}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-900 leading-none">{quiz.questionCount}</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Câu hỏi</span>
                  </div>
                  <div className="w-px h-5 bg-slate-100" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-900 leading-none">{quiz.studentCount}</span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Lượt luyện</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:bg-[#5D7B6F] transition-colors shadow-lg shadow-slate-900/10">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

// ── CategoryRow — collapsed by default, paginated quiz list on expand ─────

function CategoryRow({ category, isLoggedIn, isPinned, onPin }: {
  category: Category
  isLoggedIn: boolean
  isPinned: boolean
  onPin: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0) // 0-indexed

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['explore', 'cat-page', category.id, isLoggedIn, page],
    queryFn: () => fetchQuizzes({
      categoryId: category.id,
      isLoggedIn,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev, // keep previous page data while fetching next
  })

  const quizzes = data?.data ?? []
  const total = category.publishedQuizCount ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  // Reset to page 0 when closing
  const handleToggle = () => {
    setOpen(v => !v)
    if (open) setPage(0)
  }

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-300',
      open ? 'bg-white border-[#5D7B6F]/20 shadow-md' : 'bg-white border-slate-100 hover:border-[#5D7B6F]/20 hover:shadow-sm'
    )}>
      {/* Header row — always visible */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
            isPinned ? 'bg-[#5D7B6F] text-white' : 'bg-slate-50 text-[#5D7B6F]'
          )}>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 leading-none truncate">{category.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{total} bộ đề</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Pin button */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onPin(category.id) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onPin(category.id) } }}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-all border',
              isPinned
                ? 'bg-[#5D7B6F] text-white border-[#5D7B6F]'
                : 'bg-slate-50 text-slate-300 border-slate-100 hover:text-[#5D7B6F] hover:border-[#5D7B6F]/30'
            )}
            title={isPinned ? 'Bỏ ghim' : 'Ghim môn học'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </span>

          {/* Expand chevron */}
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-slate-50 text-slate-400',
            open && 'bg-[#5D7B6F]/10 text-[#5D7B6F]'
          )}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded quiz list */}
      {open && (
        <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px bg-slate-100" />

          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold">Đang tải...</span>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold">Chưa có bộ đề nào</div>
          ) : (
            <>
              <div className={cn(
                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200',
                isFetching && 'opacity-50'
              )}>
                {quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />)}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={!hasPrev || isFetching}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border',
                      hasPrev && !isFetching
                        ? 'bg-white text-[#5D7B6F] border-[#5D7B6F]/20 hover:bg-[#5D7B6F]/5'
                        : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Trước
                  </button>

                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isFetching
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                      : `Trang ${page + 1} / ${totalPages}`
                    }
                  </span>

                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNext || isFetching}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border',
                      hasNext && !isFetching
                        ? 'bg-white text-[#5D7B6F] border-[#5D7B6F]/20 hover:bg-[#5D7B6F]/5'
                        : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                    )}
                  >
                    Tiếp
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── SearchResults ──────────────────────────────────────────────────────────

function SearchResults({ search, isLoggedIn }: { search: string; isLoggedIn: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const previewQuery = useQuery({
    queryKey: ['explore', 'search-preview', isLoggedIn, search],
    queryFn: () => fetchQuizzes({ search, isLoggedIn, limit: 8 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!search,
  })

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['explore', 'search-infinite', isLoggedIn, search],
    queryFn: ({ pageParam = 0 }) => fetchQuizzes({ search, isLoggedIn, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0)
      return lastPage.data.length === PAGE_SIZE ? loaded : undefined
    },
    enabled: expanded && !!search,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!expanded || !loadMoreRef.current) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
        infiniteQuery.fetchNextPage()
      }
    }, { threshold: 0, rootMargin: '400px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [expanded, infiniteQuery])

  const quizzes = expanded
    ? infiniteQuery.data?.pages.flatMap(p => p.data) ?? []
    : previewQuery.data?.data ?? []

  if (previewQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-52 rounded-[20px] bg-white border border-slate-100 animate-pulse" />)}
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-dashed border-slate-200">
        <AlertCircle className="w-8 h-8 text-slate-200 mx-auto" />
        <p className="text-sm font-black text-slate-500">Không tìm thấy kết quả cho &ldquo;{search}&rdquo;</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />)}
        {infiniteQuery.isFetchingNextPage && [1, 2, 3, 4].map(i => (
          <div key={i} className="h-52 rounded-[20px] bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
      {quizzes.length >= 8 && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setExpanded(v => !v)} className="text-[#5D7B6F] font-black text-xs uppercase tracking-widest h-9 px-6 rounded-xl border border-[#5D7B6F]/10 hover:bg-[#5D7B6F]/5">
            {expanded ? <><ChevronUp className="w-3.5 h-3.5 mr-1.5" />Thu gọn</> : <><ChevronDown className="w-3.5 h-3.5 mr-1.5" />Xem thêm</>}
          </Button>
        </div>
      )}
      {expanded && <div ref={loadMoreRef} className="h-1" />}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ExploreContent() {
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'explore' | 'mix'>('explore')
  const debouncedSearch = useDebounce(search, 300)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/me`)
      .then(res => res.ok ? res.json().then(d => setUser(d.user)) : setUser(null))
      .catch(() => setUser(null))
  }, [])

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: fetchCategories,
  })

  const { data: pinnedData } = useQuery({
    queryKey: ['student', 'pinned-categories'],
    queryFn: fetchPinnedCategories,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const pinMutation = useMutation({
    mutationFn: (categoryId: string) => togglePinCategory(categoryId),
    onSuccess: (data) => {
      queryClient.setQueryData(['student', 'pinned-categories'], { pinnedCategories: data.pinnedCategories })
      toast.success(data.pinned ? 'Đã ghim' : 'Đã bỏ ghim')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const categories = useMemo(() => {
    const list = catData?.data ?? []
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [catData])

  const pinnedIds = new Set(pinnedData?.pinnedCategories ?? [])
  const pinnedCats = categories.filter(c => pinnedIds.has(c.id))
  const unpinnedCats = categories.filter(c => !pinnedIds.has(c.id))

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-20 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            Khám phá <span className="text-[#5D7B6F]">Môn học</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Chọn môn để xem bộ đề</p>
        </div>

        {/* Trộn Quiz button */}
        <button
          onClick={() => setActiveTab(activeTab === 'mix' ? 'explore' : 'mix')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border',
            activeTab === 'mix'
              ? 'bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-lg shadow-[#5D7B6F]/20'
              : 'bg-white text-slate-500 border-slate-200 hover:border-[#5D7B6F]/30 hover:text-[#5D7B6F]'
          )}
        >
          <Shuffle className="w-3.5 h-3.5" />
          Trộn Quiz
        </button>
      </div>

      {/* Mix Quiz panel */}
      {activeTab === 'mix' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <MixQuizTab />
        </div>
      )}

      {/* Search bar — always visible */}
      {activeTab === 'explore' && (
        <div className="flex items-center gap-3 bg-white px-4 rounded-2xl shadow-sm border border-slate-100 focus-within:border-[#5D7B6F]/40 transition-all group">
          <Search className="w-4 h-4 text-slate-300 group-focus-within:text-[#5D7B6F] shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã môn: MLN111, FRS401C..."
            className="h-11 border-none focus-visible:ring-0 text-sm font-bold text-[#5D7B6F] placeholder:text-slate-300 placeholder:font-medium"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded-lg shrink-0">
              Xóa
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === 'explore' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {debouncedSearch ? (
            /* Search results */
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Kết quả cho &ldquo;{debouncedSearch}&rdquo;
              </p>
              <SearchResults search={debouncedSearch} isLoggedIn={!!user} />
            </div>
          ) : (
            /* Category list */
            <>
              {catsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-14 rounded-2xl bg-white border border-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Pinned categories first */}
                  {pinnedCats.length > 0 && (
                    <>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] px-1">Đã ghim</p>
                      {pinnedCats.map(cat => (
                        <CategoryRow
                          key={cat.id}
                          category={cat}
                          isLoggedIn={!!user}
                          isPinned={true}
                          onPin={(id) => pinMutation.mutate(id)}
                        />
                      ))}
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] px-1 pt-2">Tất cả môn học</p>
                    </>
                  )}
                  {unpinnedCats.map(cat => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      isLoggedIn={!!user}
                      isPinned={false}
                      onPin={(id) => pinMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
