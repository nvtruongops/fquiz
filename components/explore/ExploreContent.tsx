'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
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
import { CategorySidebar } from './CategorySidebar'
import { QuizDisplayArea } from './QuizDisplayArea'

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

const PAGE_SIZE = 12 // Increased page size for wider layout

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
    <div className="group block relative h-full">
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
            <h4 className="text-[15px] font-black text-slate-900 mb-1 leading-tight group-hover:text-[#5D7B6F] transition-colors break-words">
              {(quiz.title || quiz.course_code).replaceAll('_', '_\u200B')}
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

// ── SearchResults ──────────────────────────────────────────────────────────

function SearchResults({ search, isLoggedIn }: { search: string; isLoggedIn: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const previewQuery = useQuery({
    queryKey: ['explore', 'search-preview', isLoggedIn, search],
    queryFn: () => fetchQuizzes({ search, isLoggedIn, limit: 12 }),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-52 rounded-[20px] bg-white border border-slate-100 animate-pulse" />)}
      </div>
    )
  }

  return (
    <QuizDisplayArea 
      isLoading={previewQuery.isLoading}
      isEmpty={quizzes.length === 0}
      title={`Kết quả cho "${search}"`}
      searchMode={true}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />)}
        {infiniteQuery.isFetchingNextPage && [1, 2, 3, 4].map(i => (
          <div key={i} className="h-52 rounded-[20px] bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
      {quizzes.length >= 12 && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" onClick={() => setExpanded(v => !v)} className="text-[#5D7B6F] font-black text-xs uppercase tracking-widest h-9 px-6 rounded-xl border border-[#5D7B6F]/10 hover:bg-[#5D7B6F]/5">
            {expanded ? <><ChevronUp className="w-3.5 h-3.5 mr-1.5" />Thu gọn</> : <><ChevronDown className="w-3.5 h-3.5 mr-1.5" />Xem thêm</>}
          </Button>
        </div>
      )}
      {expanded && <div ref={loadMoreRef} className="h-1" />}
    </QuizDisplayArea>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ExploreContent() {
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'explore' | 'mix'>('explore')
  const debouncedSearch = useDebounce(search, 300)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'mix') setActiveTab('mix')
    else setActiveTab('explore')
  }, [searchParams])

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
      toast.success(data.pinned ? 'Đã ghim môn học' : 'Đã bỏ ghim môn học')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const categories = useMemo(() => {
    const list = (catData?.data ?? []).filter(c => 
      !['Tư tưởng HCM', 'Triết học', 'Kinh tế chính trị'].includes(c.name)
    )
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [catData])

  const pinnedIds = useMemo(() => new Set(pinnedData?.pinnedCategories ?? []), [pinnedData])

  const { data: categoryQuizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['explore', 'quizzes', selectedCategoryId, !!user],
    queryFn: () => fetchQuizzes({ 
      categoryId: selectedCategoryId!, 
      isLoggedIn: !!user,
      limit: 48 // Fetch more for the wide display
    }),
    enabled: !!selectedCategoryId && !debouncedSearch,
  })

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id)
    setSearch('')
    // Scroll to top of content on mobile or just to emphasize selection
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name

  return (
    <div className="w-full py-6 pb-28 md:pb-20 space-y-8 animate-in fade-in duration-500">
      
      {/* Dynamic Header & Search Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white/50 backdrop-blur-xl p-6 rounded-[32px] border border-white shadow-xl shadow-slate-200/50">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F] flex items-center justify-center text-white shadow-lg shadow-[#5D7B6F]/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                Thư viện <span className="text-[#5D7B6F]">Học tập</span>
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 px-0.5">Khám phá hàng ngàn bộ đề trắc nghiệm</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100/50 rounded-2xl p-1 w-fit mt-4">
            <button
              onClick={() => setActiveTab('explore')}
              className={cn(
                'flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all',
                activeTab === 'explore'
                  ? 'bg-white text-[#5D7B6F] shadow-sm'
                  : 'text-slate-400 hover:text-[#5D7B6F]'
              )}
            >
              Khám phá
            </button>
            <button
              onClick={() => setActiveTab('mix')}
              className={cn(
                'flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all',
                activeTab === 'mix'
                  ? 'bg-white text-[#5D7B6F] shadow-sm'
                  : 'text-slate-400 hover:text-[#5D7B6F]'
              )}
            >
              Trộn bộ đề
            </button>
          </div>
        </div>

        {activeTab === 'explore' && (
          <div className="w-full lg:max-w-md">
            <div className="flex items-center gap-3 bg-white px-5 rounded-2xl shadow-sm border border-slate-100 focus-within:border-[#5D7B6F]/40 transition-all group h-14">
              <Search className="w-5 h-5 text-slate-300 group-focus-within:text-[#5D7B6F] shrink-0" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bộ đề, mã môn học..."
                className="h-full border-none focus-visible:ring-0 text-[15px] font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-3 py-1.5 bg-slate-50 rounded-xl shrink-0">
                  Xóa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'mix' ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <MixQuizTab />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar - Master Panel */}
          <aside className="lg:col-span-3 xl:col-span-3">
            <CategorySidebar 
              categories={categories}
              pinnedIds={pinnedIds}
              selectedCategoryId={selectedCategoryId}
              onSelect={handleCategorySelect}
              onPin={(id) => pinMutation.mutate(id)}
              isLoading={catsLoading}
            />
          </aside>

          {/* Main Content - Detail Panel */}
          <main ref={contentRef} className="lg:col-span-9 xl:col-span-9 min-h-[600px]">
            {debouncedSearch ? (
              <SearchResults search={debouncedSearch} isLoggedIn={!!user} />
            ) : selectedCategoryId ? (
              <QuizDisplayArea
                isLoading={quizzesLoading}
                isEmpty={!categoryQuizzes?.data?.length}
                title={selectedCategoryName || 'Chi tiết môn học'}
                subtitle={''}
                searchMode={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {categoryQuizzes?.data.map(quiz => (
                    <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={!!user} />
                  ))}
                </div>
              </QuizDisplayArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-24 h-24 rounded-[32px] bg-[#5D7B6F]/5 flex items-center justify-center text-[#5D7B6F]/20">
                  <SearchCode className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase">Chào mừng đến với thư viện FQuiz</h3>
                  <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">
                    Chọn một môn học ở danh sách bên trái hoặc tìm kiếm bộ đề để bắt đầu ôn luyện ngay hôm nay.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
