'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  Search, Users, Clock3, Download, AlertCircle, ArrowRight, ChevronDown, ChevronUp, 
  Pin, PinOff, Shuffle, Sparkles, SearchCode, BookOpen
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

const PREVIEW_COUNT = 4
const PAGE_SIZE = 20

function formatStudyDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
}

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
                "mb-3 p-2 rounded-xl border",
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

function CategorySection({ category, isLoggedIn, isPinned, onPin }: { category: Category; isLoggedIn: boolean; isPinned: boolean; onPin: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const previewQuery = useQuery({
    queryKey: ['explore', 'cat-preview', category.id, isLoggedIn],
    queryFn: () => fetchQuizzes({ categoryId: category.id, isLoggedIn, limit: PREVIEW_COUNT }),
    staleTime: 5 * 60 * 1000,
  })

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['explore', 'cat-infinite', category.id, isLoggedIn],
    queryFn: ({ pageParam = 0 }) => fetchQuizzes({ categoryId: category.id, isLoggedIn, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0)
      return lastPage.data.length === PAGE_SIZE ? loaded : undefined
    },
    enabled: expanded,
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

  const quizzes = expanded ? infiniteQuery.data?.pages.flatMap(p => p.data) ?? [] : previewQuery.data?.data ?? []
  const total = category.publishedQuizCount ?? 0
  if (total === 0 && !previewQuery.isLoading) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-sm', isPinned ? 'bg-[#5D7B6F] text-white' : 'bg-white text-[#5D7B6F] border border-slate-100')}>
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
             <h3 className="text-base font-black text-slate-900 leading-none">{category.name}</h3>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{total} bộ đề</p>
          </div>
        </div>
        <button
          onClick={() => onPin(category.id)}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border',
            isPinned 
              ? 'bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-[#5D7B6F]/20' 
              : 'bg-white text-slate-400 border-slate-100 hover:text-[#5D7B6F] hover:border-[#5D7B6F]/30 hover:shadow-md'
          )}
          title={isPinned ? 'Bỏ ghim danh mục' : 'Ghim danh mục'}
        >
          {isPinned ? <PinOff className="w-4.5 h-4.5" /> : <Pin className="w-4.5 h-4.5" />}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />)}
        {infiniteQuery.isFetchingNextPage && [1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-[32px] bg-white border border-slate-100 animate-pulse" />)}
      </div>

      {total > PREVIEW_COUNT && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={() => setExpanded(v => !v)} className="text-[#5D7B6F] font-black text-xs uppercase tracking-widest h-10 px-8 rounded-xl border border-[#5D7B6F]/10 hover:bg-[#5D7B6F]/5">
            {expanded ? <><ChevronUp className="w-4 h-4 mr-2" /> Thu gọn</> : <><ChevronDown className="w-4 h-4 mr-2" /> Xem thêm {total - PREVIEW_COUNT}</>}
          </Button>
        </div>
      )}
      {expanded && <div ref={loadMoreRef} className="h-1" />}
    </section>
  )
}

function PopularSection({ isLoggedIn, search }: { isLoggedIn: boolean; search: string }) {
  const [expanded, setExpanded] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const previewQuery = useQuery({
    queryKey: ['explore', 'popular-preview', isLoggedIn, search],
    queryFn: () => fetchQuizzes({ search, isLoggedIn, limit: PREVIEW_COUNT }),
    staleTime: 5 * 60 * 1000,
  })

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['explore', 'popular-infinite', isLoggedIn, search],
    queryFn: ({ pageParam = 0 }) => fetchQuizzes({ search, isLoggedIn, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0)
      return lastPage.data.length === PAGE_SIZE ? loaded : undefined
    },
    enabled: expanded,
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

  const quizzes = expanded ? infiniteQuery.data?.pages.flatMap(p => p.data) ?? [] : previewQuery.data?.data ?? []

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
        <div>
           <h3 className="text-base font-black text-slate-900 leading-none">{search ? `Kết quả cho "${search}"` : 'Bộ đề phổ biến'}</h3>
           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Xu hướng học tập</p>
        </div>
      </div>

      {previewQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-[32px] bg-white border border-slate-100 animate-pulse" />)}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white rounded-[40px] border border-dashed border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-200 mx-auto" />
          <p className="text-lg font-black text-slate-800">Không tìm thấy kết quả</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />)}
        </div>
      )}

      {quizzes.length >= PREVIEW_COUNT && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setExpanded(v => !v)} className="text-[#5D7B6F] font-black text-xs uppercase tracking-widest h-10 px-8 rounded-xl border border-[#5D7B6F]/10 hover:bg-[#5D7B6F]/5">
            {expanded ? 'Thu gọn' : 'Xem tất cả'}
          </Button>
        </div>
      )}
      {expanded && <div ref={loadMoreRef} className="h-1" />}
    </section>
  )
}

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

  const quickSearchTags = [
    { label: 'MLN111', icon: BookOpen },
    { label: 'FRS401C', icon: SearchCode },
    { label: 'GTDVH', icon: SearchCode },
    { label: 'MLN122', icon: BookOpen },
    { label: 'Văn hóa', icon: Sparkles },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-20 space-y-10 animate-in fade-in duration-500">
      <section className="flex flex-col items-center text-center space-y-6 pt-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none">
            Khám phá <span className="text-[#5D7B6F]">Thư viện</span>
          </h1>
          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Tìm kiếm môn học của bạn</p>
        </div>

        <div className="w-full max-w-xl space-y-4">
          <div className="flex items-center gap-3 bg-white px-5 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 focus-within:border-[#5D7B6F]/40 transition-all group">
            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-[#5D7B6F] shrink-0" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ví dụ: MLN111, FRS401C..."
              className="h-12 md:h-14 border-none focus-visible:ring-0 text-sm md:text-base font-black text-[#5D7B6F] placeholder:text-slate-300 placeholder:font-bold"
            />
            {search && <button onClick={() => setSearch('')} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded-lg">Xóa</button>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mr-1">Gợi ý:</span>
            {quickSearchTags.map(tag => (
              <button key={tag.label} onClick={() => setSearch(tag.label)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[9px] font-black text-slate-500 transition-all border border-slate-100 hover:border-[#5D7B6F]/30 uppercase tracking-widest shadow-sm">
                <tag.icon className="w-3 h-3 text-[#5D7B6F]/60" />
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit shadow-inner">
          <button onClick={() => setActiveTab('explore')} className={cn('flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all', activeTab === 'explore' ? 'bg-white text-[#5D7B6F] shadow-md' : 'text-slate-400 hover:text-slate-600')}>
            <Search className="w-3.5 h-3.5" /> Thư viện
          </button>
          <button onClick={() => setActiveTab('mix')} className={cn('flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all', activeTab === 'mix' ? 'bg-white text-[#5D7B6F] shadow-md' : 'text-slate-400 hover:text-slate-600')}>
            <Shuffle className="w-3.5 h-3.5" /> Trộn Quiz
          </button>
        </div>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-700">
        {activeTab === 'mix' ? <MixQuizTab /> : (
          <div className="space-y-10">
            <PopularSection isLoggedIn={!!user} search={debouncedSearch} />
            {!debouncedSearch && (
              <div className="space-y-10">
                <div className="flex items-center gap-6"><div className="flex-1 h-px bg-slate-100" /><h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] whitespace-nowrap">Danh mục học phần</h4><div className="flex-1 h-px bg-slate-100" /></div>
                {catsLoading ? <div className="h-40 bg-slate-50 rounded-3xl animate-pulse" /> : (
                  <div className="space-y-10">
                    {pinnedCats.map(cat => <CategorySection key={cat.id} category={cat} isLoggedIn={!!user} isPinned={true} onPin={(id) => pinMutation.mutate(id)} />)}
                    {pinnedCats.length > 0 && <div className="flex items-center gap-6"><div className="flex-1 h-px bg-slate-100" /><h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] whitespace-nowrap">Tất cả môn học</h4><div className="flex-1 h-px bg-slate-100" /></div>}
                    {unpinnedCats.map(cat => <CategorySection key={cat.id} category={cat} isLoggedIn={!!user} isPinned={false} onPin={(id) => pinMutation.mutate(id)} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
