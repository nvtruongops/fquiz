'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import CourseQuizList from '@/components/quiz/explore/CourseQuizList'
import { ArrowLeft, Shuffle, List, Bookmark, Loader2 } from 'lucide-react'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'
import { motion } from 'framer-motion'
import { cn } from '@/lib/core/utils/cn'

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
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#5D7B6F]/20 via-emerald-500/10 to-transparent blur-3xl opacity-50 transform-gpu" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Back Navigation & Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#5D7B6F] hover:text-[#4a6358] transition-colors group bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Quay lại khám phá
          </Link>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            FQuiz · Course Hub
          </span>
        </motion.div>

        {/* Clean Header section */}
        <motion.header 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#5D7B6F]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#5D7B6F]" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em]">Danh mục môn học</p>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {categoryName}
            </h1>
          </div>
        </motion.header>

        {/* Segmented Pill Tabs Bar */}
        <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => router.push(`/courses/${code}`)}
            className={cn(
              'flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer',
              currentTab === 'list'
                ? 'bg-white text-[#5D7B6F] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <List className="w-4 h-4" />
            <span>Danh sách đề ({totalQuizzes})</span>
          </button>

          <button
            onClick={() => {
              const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
              router.push(`/courses/${code}?tab=mix${categoryParam}`)
            }}
            className={cn(
              'flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer',
              currentTab === 'mix'
                ? 'bg-white text-[#5D7B6F] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <Shuffle className="w-4 h-4 text-emerald-600" />
            <span>Trộn bộ đề</span>
          </button>

          <button
            onClick={() => router.push(`/courses/${code}?tab=pinned`)}
            className={cn(
              'flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer',
              currentTab === 'pinned'
                ? 'bg-white text-[#5D7B6F] shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Câu hỏi đã ghim</span>
            {pinnedQuestions.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full font-black bg-amber-100 text-amber-700">
                {pinnedQuestions.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Tab Content */}
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pt-1"
        >
          {currentTab === 'mix' ? (
            <MixQuizTab embedded categoryId={categoryId || data?.categoryId} />
          ) : currentTab === 'pinned' ? (
            <PinnedQuestionsTab courseCode={code} />
          ) : (
            <CourseQuizList code={code} onCategoryLoaded={handleCategoryLoaded} />
          )}
        </motion.div>
      </div>
    </div>
  )
}

