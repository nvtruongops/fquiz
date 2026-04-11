'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  Search, GraduationCap, Users, Clock3,
  Download, AlertCircle, ArrowRight, ChevronDown, ChevronUp, Pin, PinOff,
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
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours} giờ` : `${hours} giờ ${rem} phút`
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

// ── Quiz Card ──────────────────────────────────────────────────────────────

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

  return (
    <div className="group block relative">
      <Card className="h-full rounded-[24px] bg-white border-2 border-[#A4C3A2]/10 group-hover:border-[#5D7B6F]/40 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#5D7B6F]/10">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <Badge className="bg-[#D7F9FA] text-[#5D7B6F] border-none px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
              {quiz.categoryName}
            </Badge>
            {isLoggedIn && (
              <Button
                variant="ghost" size="icon"
                disabled={saveMutation.isPending}
                onClick={(e) => { e.stopPropagation(); saveMutation.mutate() }}
                className={cn('w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:bg-[#5D7B6F] hover:text-white transition-all shadow-sm active:scale-90', saveMutation.isPending && 'animate-pulse')}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Link href={`/quiz/${quiz.id}`} className="flex-1 flex flex-col">
            <h4 className="text-base font-black text-gray-900 mb-3 leading-tight group-hover:text-[#5D7B6F] transition-colors line-clamp-2 min-h-[2.5rem]">
              {quiz.course_code}
            </h4>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {quiz.source_label}{quiz.source_creator_name ? ` • ${quiz.source_creator_name}` : ''}
            </p>

            {hasAttempt && (
              <div className={`mb-2 ${isPassed ? 'text-[#166534]' : 'text-[#B91C1C]'}`}>
                <p className="text-[10px] uppercase tracking-widest font-black">Đã làm</p>
                <p className="text-sm font-black leading-tight">
                  {scoreOnTen.toFixed(2)}/10
                  <span className="text-[10px] font-bold text-gray-400 ml-1">({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-gray-500">
                  <Clock3 className="h-3 w-3 text-[#5D7B6F]" />
                  {formatStudyDuration(totalStudyMinutes)}
                </p>
              </div>
            )}

            <div className="mt-auto relative min-h-[40px]">
              <div className="flex items-center gap-4 py-2 border-t border-[#A4C3A2]/10 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-1">
                <div className="flex items-center gap-1 text-gray-400">
                  <GraduationCap className="w-3.5 h-3.5 text-[#A4C3A2]" />
                  <span className="text-[10px] uppercase tracking-widest">{quiz.questionCount} câu</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Users className="w-3.5 h-3.5 text-[#A4C3A2]" />
                  <span className="text-[10px] uppercase tracking-widest">{quiz.studentCount} luyện</span>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center gap-2 bg-[#5D7B6F] text-white px-5 py-2 rounded-xl shadow-lg font-black uppercase tracking-[0.15em] text-[10px]">
                  Ôn tập ngay <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Category Section with expand + infinite scroll ─────────────────────────

function CategorySection({
  category, isLoggedIn, isPinned, onPin,
}: {
  category: Category
  isLoggedIn: boolean
  isPinned: boolean
  onPin: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const previewQuery = useQuery({
    queryKey: ['explore', 'cat-preview', category.id, isLoggedIn],
    queryFn: () => fetchQuizzes({ categoryId: category.id, isLoggedIn, limit: PREVIEW_COUNT }),
    staleTime: 5 * 60 * 1000,
  })

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['explore', 'cat-infinite', category.id, isLoggedIn],
    queryFn: ({ pageParam = 0 }) =>
      fetchQuizzes({ categoryId: category.id, isLoggedIn, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((s, p) => s + p.data.length, 0)
      return lastPage.data.length === PAGE_SIZE ? loaded : undefined
    },
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  })

  // Infinite scroll observer - trigger when sentinel is visible (2 rows before end)
  useEffect(() => {
    if (!expanded || !loadMoreRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
          infiniteQuery.fetchNextPage()
        }
      },
      { threshold: 0, rootMargin: '400px' } // trigger 400px before sentinel is visible
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [expanded, infiniteQuery])

  const previewQuizzes = previewQuery.data?.data ?? []
  const allQuizzes = expanded
    ? infiniteQuery.data?.pages.flatMap(p => p.data) ?? []
    : previewQuizzes

  const total = category.publishedQuizCount ?? 0
  if (total === 0 && !previewQuery.isLoading) return null

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-5 rounded-full', isPinned ? 'bg-[#5D7B6F]' : 'bg-[#A4C3A2]')} />
          <h3 className="text-lg font-black text-[#5D7B6F]">{category.name}</h3>
          {total > 0 && (
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {total} bộ đề
            </span>
          )}
          {isPinned && (
            <span className="text-[10px] font-black text-[#5D7B6F] bg-[#5D7B6F]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Đã ghim
            </span>
          )}
        </div>
        <button
          onClick={() => onPin(category.id)}
          title={isPinned ? 'Bỏ ghim' : 'Ghim danh mục này lên đầu'}
          className={cn(
            'flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all',
            isPinned
              ? 'text-[#5D7B6F] bg-[#5D7B6F]/10 hover:bg-[#5D7B6F]/20'
              : 'text-gray-400 hover:text-[#5D7B6F] hover:bg-[#5D7B6F]/5'
          )}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          {isPinned ? 'Bỏ ghim' : 'Ghim'}
        </button>
      </div>

      {/* Quiz grid */}
      {previewQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 rounded-[24px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : allQuizzes.length === 0 ? null : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allQuizzes.map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />
          ))}
          {/* Skeleton cards while loading next page */}
          {infiniteQuery.isFetchingNextPage && [1, 2, 3, 4].map(i => (
            <div key={`sk-${i}`} className="h-40 rounded-[24px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel - placed inside grid area */}
      {expanded && <div ref={loadMoreRef} className="h-1" />

      {/* Expand / Collapse button */}
      {total > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-[#5D7B6F] font-black text-sm hover:text-[#4a6358] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-4 h-4" /> Thu gọn</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Xem thêm {total - PREVIEW_COUNT} bộ đề</>
          )}
        </button>
      )}
    </section>
  )
}

// ── Popular Section ────────────────────────────────────────────────────────

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
    queryFn: ({ pageParam = 0 }) =>
      fetchQuizzes({ search, isLoggedIn, limit: PAGE_SIZE, offset: pageParam }),
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
          infiniteQuery.fetchNextPage()
        }
      },
      { threshold: 0, rootMargin: '400px' }
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [expanded, infiniteQuery])

  const previewQuizzes = previewQuery.data?.data ?? []
  const allQuizzes = expanded
    ? infiniteQuery.data?.pages.flatMap(p => p.data) ?? []
    : previewQuizzes

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-5 bg-[#5D7B6F] rounded-full" />
        <h3 className="text-lg font-black text-[#5D7B6F]">
          {search ? `Kết quả cho "${search}"` : 'Bộ đề phổ biến'}
        </h3>
        {previewQuizzes.length > 0 && !expanded && (
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {previewQuizzes.length}+ bộ đề
          </span>
        )}
      </div>

      {previewQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 rounded-[24px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : allQuizzes.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-white/40 rounded-[40px] border-2 border-dashed border-red-100">
          <AlertCircle className="w-10 h-10 text-red-300 mx-auto" />
          <p className="text-xl font-black text-gray-400">Không tìm thấy bộ đề nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allQuizzes.map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} isLoggedIn={isLoggedIn} />
          ))}
          {infiniteQuery.isFetchingNextPage && [1, 2, 3, 4].map(i => (
            <div key={`sk-${i}`} className="h-40 rounded-[24px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      )}

      {expanded && <div ref={loadMoreRef} className="h-1" />

      {previewQuizzes.length >= PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-[#5D7B6F] font-black text-sm hover:text-[#4a6358] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-4 h-4" /> Thu gọn</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Xem thêm</>
          )}
        </button>
      )}
    </section>
  )
}

// ── Main ExploreContent ────────────────────────────────────────────────────

export default function ExploreContent() {
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined)
  const debouncedSearch = useDebounce(search, 300)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/me`)
      .then(res => { if (res.ok) res.json().then(d => setUser(d.user)); else setUser(null) })
      .catch(() => setUser(null))
  }, [])

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['public', 'categories'],
    queryFn: fetchCategories,
  })

  const isLoggedIn = !!user
  const userLoaded = user !== undefined

  // Fetch pinned categories (only when logged in)
  const { data: pinnedData } = useQuery({
    queryKey: ['student', 'pinned-categories'],
    queryFn: fetchPinnedCategories,
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  })

  const pinnedCategoryIds = new Set<string>(pinnedData?.pinnedCategories ?? [])

  const pinMutation = useMutation({
    mutationFn: (categoryId: string) => togglePinCategory(categoryId),
    onSuccess: (data) => {
      queryClient.setQueryData(['student', 'pinned-categories'], { pinnedCategories: data.pinnedCategories })
      toast.success(data.pinned ? 'Đã ghim danh mục' : 'Đã bỏ ghim danh mục')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handlePin = (categoryId: string) => {
    if (!isLoggedIn) {
      toast.error('Vui lòng đăng nhập để ghim danh mục')
      return
    }
    pinMutation.mutate(categoryId)
  }

  const categories = useMemo(() => {
    const list = catData?.data ?? []
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [catData])

  // Split: pinned first, then rest A-Z
  const { pinnedCategories, unpinnedCategories } = useMemo(() => {
    const pinned = categories.filter(c => pinnedCategoryIds.has(c.id))
    const unpinned = categories.filter(c => !pinnedCategoryIds.has(c.id))
    return { pinnedCategories: pinned, unpinnedCategories: unpinned }
  }, [categories, pinnedCategoryIds])

  const isSearching = debouncedSearch.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-10 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Khám phá <span className="text-[#5D7B6F]">Thư viện</span>
        </h1>
        <p className="text-gray-500 max-w-xl font-medium">
          Tìm kiếm và chinh phục những mã đề thi chất lượng từ cộng đồng FQuiz.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white px-4 rounded-[28px] shadow-xl shadow-[#5D7B6F]/5 border border-[#A4C3A2]/10">
        <Search className="w-5 h-5 text-gray-300 shrink-0" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nhập tên quiz hoặc mã đề..."
          className="h-14 border-none focus-visible:ring-0 text-base font-bold text-[#5D7B6F] bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 shrink-0 text-sm font-bold">
            Xóa
          </button>
        )}
      </div>

      {!userLoaded ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-[24px] bg-gray-50 animate-pulse" />)}
        </div>
      ) : isSearching ? (
        // Search mode: show popular results only
        <PopularSection isLoggedIn={isLoggedIn} search={debouncedSearch} />
      ) : (
        // Browse mode: popular + categories A-Z
        <div className="space-y-10">
          <PopularSection isLoggedIn={isLoggedIn} search="" />

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Theo môn học</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Categories A-Z */}
          {catsLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-3">
                  <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(j => <div key={j} className="h-40 rounded-[24px] bg-gray-50 animate-pulse" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {/* Pinned categories first */}
              {pinnedCategories.length > 0 && (
                <>
                  <div className="space-y-10">
                    {pinnedCategories.map(cat => (
                      <CategorySection
                        key={cat.id}
                        category={cat}
                        isLoggedIn={isLoggedIn}
                        isPinned={true}
                        onPin={handlePin}
                      />
                    ))}
                  </div>
                  {unpinnedCategories.length > 0 && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tất cả môn học</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                </>
              )}
              {/* Remaining A-Z */}
              {unpinnedCategories.map(cat => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  isLoggedIn={isLoggedIn}
                  isPinned={false}
                  onPin={handlePin}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
