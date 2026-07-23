'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Shuffle, SearchCode, Loader2, ChevronDown, ChevronUp, Download, Users, Clock3, ArrowRight } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import Link from 'next/link'
import MixQuizTab from '@/components/quiz/explore/MixQuizTab'
import { CategorySidebar } from '@/components/quiz/explore/CategorySidebar'
import { QuizDisplayArea } from '@/components/quiz/explore/QuizDisplayArea'
import { useExploreQuizzes, QuizMeta } from '@/hooks/useExploreQuizzes'
import { API_ROUTES } from '@/lib/core/constants/api-routes'
import { formatStudyDuration } from '@/lib/core/utils/format'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

const PAGE_SIZE = 12

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
  const endpoint = params.isLoggedIn ? API_ROUTES.STUDENT.EXPLORE_QUIZZES : API_ROUTES.PUBLIC.QUIZZES
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
                    {formatStudyDuration(totalStudyMinutes, true)}
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

export default function ExploreContent() {
  const {
    search, setSearch,
    selectedCategoryId, setSelectedCategoryId,
    activeTab, setActiveTab,
    debouncedSearch,
    user,
    categories, catsLoading,
    pinnedIds,
    pinMutation,
    categoryQuizzes,
    quizzesLoading,
  } = useExploreQuizzes()

  const currentCategory = categories.find(c => c.id === selectedCategoryId)

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'explore' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Khám phá Đề thi
          </button>
          <button
            onClick={() => setActiveTab('mix')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'mix' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" /> Quiz Trộn
          </button>
        </div>

        {activeTab === 'explore' && (
          <div className="relative w-full sm:w-72">
            <SearchCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm môn học / mã đề..."
              className="pl-10 h-10 rounded-2xl border-slate-200 text-xs font-semibold"
            />
          </div>
        )}
      </div>

      {activeTab === 'mix' ? (
        <MixQuizTab />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Category Sidebar */}
          <div className="lg:col-span-1">
            <CategorySidebar
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={(id: string) => setSelectedCategoryId(id)}
              pinnedIds={pinnedIds}
              onPin={(id: string) => pinMutation.mutate(id)}
              isLoading={catsLoading}
            />
          </div>

          {/* Quiz Display Area */}
          <div className="lg:col-span-3">
            {debouncedSearch ? (
              <SearchResults search={debouncedSearch} isLoggedIn={!!user} />
            ) : (
              <QuizDisplayArea
                isLoading={quizzesLoading}
                isEmpty={categoryQuizzes.length === 0}
                title={currentCategory?.name || 'Khám phá Đề thi'}
                subtitle={currentCategory?.id}
                searchMode={false}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryQuizzes.map(quiz => (
                    <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={!!user} />
                  ))}
                </div>
              </QuizDisplayArea>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
