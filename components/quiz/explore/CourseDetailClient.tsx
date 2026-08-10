'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import CourseQuizList from '@/components/quiz/explore/CourseQuizList'
import { ArrowLeft, Shuffle, List, Bookmark, Loader2, Pin } from 'lucide-react'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { motion } from 'framer-motion'
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
  const queryClient = useQueryClient()
  const { toast } = useToast()

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
      const json = await res.json()
      if (!res.ok) {
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

  const totalQuizzes = data?.quizzes?.length ?? 0
  const completedCount = data?.quizzes?.filter((q: any) => q.bestScore !== null).length ?? 0

  const handleFastSprint = () => {
    const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
    router.push(`/courses/${code}?tab=mix${categoryParam}`)
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-x-clip px-4 sm:px-6 md:px-10 pt-4 pb-12">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-indigo-500/5 to-transparent blur-3xl opacity-50 transform-gpu" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30 transform-gpu" />
      </div>

      <GsapStaggerContainer selector=".course-section" stagger={0.06} y={12} className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header Hero Cockpit */}
        <div className="course-section bg-card/70 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-60 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-3.5">
              {/* Navigation Breadcrumb & Tag */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors group/btn bg-primary/10 hover:bg-primary/15 px-3.5 py-1.5 rounded-full border border-primary/20"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-x-1" />
                  Khám phá môn học
                </Link>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-xs font-bold uppercase tracking-wider border border-border">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Danh mục môn học</span>
                </div>

                <span className="text-[10px] font-black tracking-widest text-primary/80 uppercase px-2.5 py-1 rounded-full bg-primary/10 border border-primary/15">
                  FQuiz · Course Hub
                </span>
              </div>

              {/* Title & Pin Action */}
              <div className="flex items-center gap-3.5 flex-wrap">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-none uppercase drop-shadow-2xs">
                  {categoryName}
                </h1>

                {(categoryId || data?.categoryId) && (
                  <button
                    type="button"
                    onClick={handleTogglePinCategory}
                    disabled={isPinningCategory}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer border shadow-2xs active:scale-95',
                      isCategoryPinned
                        ? 'bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border shadow-xs scale-105 ring-2 ring-question-flagged-border/50'
                        : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border hover:border-primary/40'
                    )}
                    title={isCategoryPinned ? 'Bỏ ghim môn học này' : 'Ghim môn học này lên đầu trang Khám phá & Dashboard'}
                  >
                    {isPinningCategory ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Pin className={cn('w-3.5 h-3.5 transition-transform', isCategoryPinned && 'fill-current rotate-45')} />
                    )}
                    <span>{isCategoryPinned ? 'Đã ghim môn' : 'Ghim môn học'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats Pill */}
            {totalQuizzes > 0 && (
              <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-2xl border border-border shrink-0 self-start md:self-auto">
                <div className="text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Tiến độ hoàn thành</p>
                  <p className="text-sm font-black text-foreground">
                    <span className="text-primary">{completedCount}</span> / {totalQuizzes} bộ đề
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center font-black text-xs text-primary shadow-2xs">
                  {Math.round((completedCount / totalQuizzes) * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Segmented Pill Tabs Bar (3 Fixed Columns) */}
        <div className="course-section bg-card/80 backdrop-blur-xl p-1.5 rounded-2xl border border-border/80 grid grid-cols-3 gap-1.5 shadow-sm">
          <button
            onClick={() => router.push(`/courses/${code}`)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
              currentTab === 'list'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <List className={cn("w-4 h-4 shrink-0", currentTab === 'list' ? "text-primary-foreground" : "text-primary")} />
            <span className="truncate">Danh sách đề ({totalQuizzes})</span>
          </button>

          <button
            onClick={() => {
              const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
              router.push(`/courses/${code}?tab=mix${categoryParam}`)
            }}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
              currentTab === 'mix'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Shuffle className={cn("w-4 h-4 shrink-0", currentTab === 'mix' ? "text-primary-foreground" : "text-success-fg")} />
            <span className="truncate">Trộn bộ đề</span>
          </button>

          <button
            onClick={() => router.push(`/courses/${code}?tab=pinned`)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
              currentTab === 'pinned'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Bookmark className={cn("w-4 h-4 shrink-0", currentTab === 'pinned' ? "text-primary-foreground" : "text-warning-fg")} />
            <span className="truncate">Quiz ghim</span>
            {pinnedQuestions.length > 0 && (
              <span className={cn(
                "px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 border",
                currentTab === 'pinned'
                  ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                  : "bg-warning-bg/40 text-warning-fg border-warning-border"
              )}>
                {pinnedQuestions.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Tab Content */}
        <div className="course-section pt-1">
          {currentTab === 'mix' ? (
            <MixQuizTab embedded categoryId={categoryId || data?.categoryId} />
          ) : currentTab === 'pinned' ? (
            <PinnedQuestionsTab courseCode={code} />
          ) : (
            <CourseQuizList code={code} onCategoryLoaded={handleCategoryLoaded} />
          )}
        </div>
      </GsapStaggerContainer>
    </div>
  )
}

