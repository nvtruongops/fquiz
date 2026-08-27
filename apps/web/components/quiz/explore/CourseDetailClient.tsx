'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import CourseQuizList from '@/components/quiz/explore/CourseQuizList'
import { ArrowLeft, Shuffle, List, Bookmark, Loader2, Pin, Search, Sparkles } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'
import { useToast } from '@/store/shared/toast-store'
import { useAuthPrompt } from '@/store/shared/auth-prompt-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

const MixQuizTab = dynamic(() => import('@/components/quiz/explore/MixQuizTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
  ssr: false,
})

const PinnedQuestionsTab = dynamic(() => import('@/components/quiz/explore/PinnedQuestionsTab'), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
  ssr: false,
})

async function fetchCourseQuizzes(code: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/courses/${code}/quizzes`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

export default function CourseDetailClient({ code }: { code: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'list'
  const categoryIdParam = searchParams.get('categoryId')

  const [categoryName, setCategoryName] = useState(code.toUpperCase())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isPinningCategory, setIsPinningCategory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState<number | 'all'>(8)
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredCount, setFilteredCount] = useState<number | null>(null)

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { openAuthPrompt } = useAuthPrompt()

  const handleCategoryLoaded = useCallback((name: string, id: string | null) => {
    setCategoryName(name)
    setCategoryId(id)
  }, [])

  const { pinnedQuestions } = usePinnedQuestions(code)

  const { data } = useQuery({
    queryKey: ['courseQuizzes', code],
    queryFn: () => fetchCourseQuizzes(code),
    staleTime: 1000 * 60 * 2,
  })

  const isCategoryPinned = data?.isCategoryPinned ?? false

  const handleTogglePinCategory = async () => {
    const targetCatId = categoryId || data?.categoryId
    if (!targetCatId) return
    setIsPinningCategory(true)
    try {
      const res = await fetch('/api/student/pinned-categories', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ categoryId: targetCatId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          openAuthPrompt({
            featureName: 'Ghim môn học',
            title: 'Đăng nhập để ghim môn học',
            description: 'Ghim môn học giúp bạn nhanh chóng truy cập và theo dõi tiến độ các bộ đề yêu thích.',
            targetUrl: `/courses/${code}`,
          })
          return
        }
        toast.error(json.error || 'Không thể ghim môn học')
      } else {
        toast.success(json.pinned ? 'Đã ghim môn học lên đầu' : 'Đã bỏ ghim môn học')
        queryClient.invalidateQueries({ queryKey: ['courseQuizzes', code] })
        queryClient.invalidateQueries({ queryKey: ['student', 'pinned-categories'] })
      }
    } catch {
      toast.error('Có lỗi khi ghim môn học')
    } finally {
      setIsPinningCategory(false)
    }
  }

  // Sync category state from React Query cache
  useEffect(() => {
    if (data?.categoryName) {
      setCategoryName(data.categoryName)
      if (data.categoryId) {
        setCategoryId(data.categoryId)
      }
    }
  }, [data])

  // Automatically append categoryId to query string if on mix tab but param is missing
  useEffect(() => {
    if (currentTab === 'mix' && !categoryIdParam && data?.categoryId) {
      router.replace(`/courses/${code}?tab=mix&categoryId=${data.categoryId}`)
    }
  }, [currentTab, categoryIdParam, data?.categoryId, code, router])

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalQuizzes = data?.quizzes?.length ?? 0
  const completedCount = data?.quizzes?.filter((q: any) => q.bestScore !== null).length ?? 0
  const effectiveFilteredCount = filteredCount ?? totalQuizzes
  const startIndex = pageSize === 'all' ? 1 : (currentPage - 1) * (pageSize as number) + 1
  const endIndex = pageSize === 'all' ? effectiveFilteredCount : Math.min(currentPage * (pageSize as number), effectiveFilteredCount)

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-x-clip px-3 sm:px-6 md:px-8 pt-3 pb-12">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-indigo-500/5 to-transparent blur-3xl opacity-50 transform-gpu" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30 transform-gpu" />
      </div>

      <GsapStaggerContainer selector=".course-section" stagger={0.06} y={12} className="max-w-7xl mx-auto space-y-5 relative z-10">
        {/* 1 CONSOLIDATED BENTO COCKPIT HEADER CARD */}
        <div className="course-section bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xs relative overflow-hidden space-y-2.5 sm:space-y-3.5 group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-60 pointer-events-none" />

          {/* Row 1: Header Identity */}
          <div className="relative z-10 flex items-center justify-between gap-2.5">
            {/* Left: Back Arrow + Course Title + Pin Button */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/explore"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                title="Quay lại Khám phá môn học"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-foreground uppercase tracking-tight truncate drop-shadow-2xs">
                {categoryName}
              </h1>

              {(categoryId || data?.categoryId) && (
                <button
                  type="button"
                  onClick={handleTogglePinCategory}
                  disabled={isPinningCategory}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs shrink-0 active:scale-95',
                    isCategoryPinned
                      ? 'bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border shadow-xs ring-1 ring-question-flagged-border/50'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border hover:border-primary/40'
                  )}
                  title={isCategoryPinned ? 'Bỏ ghim môn học này' : 'Ghim môn học này'}
                >
                  {isPinningCategory ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Pin className={cn('w-3 h-3 transition-transform', isCategoryPinned && 'fill-current rotate-45')} />
                  )}
                  <span className="hidden sm:inline">{isCategoryPinned ? 'Đã ghim' : 'Ghim môn'}</span>
                </button>
              )}
            </div>

            {/* Right: Compact Stats Chip */}
            {totalQuizzes > 0 && (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-muted/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-border text-xs shrink-0">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hidden md:inline">Tiến độ:</span>
                <span className="font-black text-foreground text-xs sm:text-sm">
                  <span className="text-primary">{completedCount}</span>/{totalQuizzes}
                  <span className="hidden sm:inline text-muted-foreground font-normal text-xs"> bộ đề</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-lg bg-card font-black text-[10px] sm:text-[11px] text-primary border border-border shadow-2xs">
                  {Math.round((completedCount / totalQuizzes) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Tabs (Grid on mobile / Flex on desktop) + Search & Filter Toolbar */}
          <div className="relative z-10 pt-2.5 sm:pt-3 border-t border-border/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
            {/* Segmented Tabs Bar: 3-column equal grid on mobile with no overflow */}
            <div className="grid grid-cols-3 sm:inline-flex p-1 rounded-xl bg-muted/60 border border-border/60 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => router.push(`/courses/${code}`)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
                  currentTab === 'list'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <List className={cn("w-3.5 h-3.5 shrink-0 hidden xs:inline-block", currentTab === 'list' ? "text-primary-foreground" : "text-primary")} />
                <span className="truncate">Đề thi ({totalQuizzes})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
                  router.push(`/courses/${code}?tab=mix${categoryParam}`)
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
                  currentTab === 'mix'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Shuffle className={cn("w-3.5 h-3.5 shrink-0 hidden xs:inline-block", currentTab === 'mix' ? "text-primary-foreground" : "text-success-fg")} />
                <span className="truncate">Trộn đề</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/courses/${code}?tab=pinned`)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
                  currentTab === 'pinned'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Bookmark className={cn("w-3.5 h-3.5 shrink-0 hidden xs:inline-block", currentTab === 'pinned' ? "text-primary-foreground" : "text-warning-fg")} />
                <span className="truncate">Đã ghim</span>
                {pinnedQuestions.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.2 text-[10px] rounded-full font-black",
                    currentTab === 'pinned' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-warning-bg text-warning-fg"
                  )}>
                    {pinnedQuestions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search & Filter Toolbar (Only when on list tab) */}
            {currentTab === 'list' && (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="relative flex-1 min-w-0 max-w-full lg:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bộ đề..."
                    className="pl-8 h-9 rounded-xl border-border/80 text-xs bg-card font-medium text-foreground focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Page size chips (hidden on tiny mobile, visible sm+) & Counter */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="hidden sm:flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl text-[11px] font-bold border border-border/60">
                    {[8, 20, 'all'].map((size) => (
                      <button
                        key={String(size)}
                        type="button"
                        onClick={() => {
                          setPageSize(size as any)
                          setCurrentPage(1)
                        }}
                        className={cn(
                          'px-2 py-1 rounded-lg transition-all font-bold cursor-pointer select-none text-[11px]',
                          pageSize === size
                            ? 'bg-primary text-primary-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {size === 'all' ? 'Tất cả' : size}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-1 bg-muted/40 py-1 px-2 sm:px-2.5 rounded-xl border border-border/60 shrink-0 h-8.5 sm:h-auto">
                    <Sparkles className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-primary font-black">
                      {effectiveFilteredCount > 0 ? `${startIndex}-${endIndex}` : 0}
                    </span>
                    <span>/{totalQuizzes}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Tab Content */}
        <div className="course-section pt-1">
          {currentTab === 'mix' ? (
            <MixQuizTab embedded categoryId={categoryId || data?.categoryId} />
          ) : currentTab === 'pinned' ? (
            <PinnedQuestionsTab courseCode={code} />
          ) : (
            <CourseQuizList
              code={code}
              searchQuery={searchQuery}
              pageSize={pageSize}
              currentPage={currentPage}
              onCurrentPageChange={setCurrentPage}
              onFilteredCountChange={setFilteredCount}
              onCategoryLoaded={handleCategoryLoaded}
            />
          )}
        </div>
      </GsapStaggerContainer>
    </div>
  )
}

