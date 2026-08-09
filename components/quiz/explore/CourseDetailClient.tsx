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
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-hidden px-4 sm:px-6 md:px-10 pt-4 pb-12">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-primary/10 to-transparent blur-3xl opacity-50 transform-gpu" />
      </div>

      <GsapStaggerContainer selector=".course-section" stagger={0.08} y={14} className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Back Navigation & Breadcrumb */}
        <div className="course-section flex items-center justify-between">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors group bg-card/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Quay lại khám phá
          </Link>

          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            FQuiz · Course Hub
          </span>
        </div>

        {/* Clean Header section */}
        <header className="course-section flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-primary">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em]">Danh mục môn học</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-none uppercase">
                {categoryName}
              </h1>
              {(categoryId || data?.categoryId) && (
                <button
                  type="button"
                  onClick={handleTogglePinCategory}
                  disabled={isPinningCategory}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-2xs active:scale-95',
                    isCategoryPinned
                      ? 'bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border shadow-xs scale-105'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border'
                  )}
                  title={isCategoryPinned ? 'Bỏ ghim môn học này' : 'Ghim môn học này lên đầu trang Khám phá & Dashboard'}
                >
                  {isPinningCategory ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Pin className={cn('w-3.5 h-3.5', isCategoryPinned && 'fill-current')} />
                  )}
                  <span>{isCategoryPinned ? 'Đã ghim môn' : 'Ghim môn học'}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Segmented Pill Tabs Bar (Fixed 3-column Grid, No Scroll) */}
        <div className="course-section bg-muted/60 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl border border-border grid grid-cols-3 gap-1">
          <button
            onClick={() => router.push(`/courses/${code}`)}
            className={cn(
              'w-full flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
              currentTab === 'list'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Danh sách đề ({totalQuizzes})</span>
          </button>

          <button
            onClick={() => {
              const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
              router.push(`/courses/${code}?tab=mix${categoryParam}`)
            }}
            className={cn(
              'w-full flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
              currentTab === 'mix'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success shrink-0" />
            <span className="truncate">Trộn bộ đề</span>
          </button>

          <button
            onClick={() => router.push(`/courses/${code}?tab=pinned`)}
            className={cn(
              'w-full flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-tight transition-all cursor-pointer select-none text-center',
              currentTab === 'pinned'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
            )}
          >
            <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning-bg shrink-0" />
            <span className="truncate">Quiz ghim</span>
            {pinnedQuestions.length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-full font-black bg-warning-bg/20 text-foreground shrink-0">
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

