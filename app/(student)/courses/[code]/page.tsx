'use client'

import { use, useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import CourseQuizList from '@/components/quiz/explore/CourseQuizList'
import MixQuizTab from '@/components/quiz/explore/MixQuizTab'
import { ArrowLeft, Shuffle, List, Bookmark } from 'lucide-react'
import PinnedQuestionsTab from '@/components/quiz/explore/PinnedQuestionsTab'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'
import { motion } from 'framer-motion'
import { cn } from '@/lib/core/utils/cn'

async function fetchCourseQuizzes(code: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/courses/${code}/quizzes`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

function CourseDetailContent({ code }: { code: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'list'
  const categoryIdParam = searchParams.get('categoryId')
  
  const [categoryName, setCategoryName] = useState(code.toUpperCase())
  const [categoryId, setCategoryId] = useState<string | null>(null)

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

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative overflow-hidden px-4 sm:px-6 md:px-10 pt-3.5 md:pt-5 pb-8">
      {/* Background Mesh Glow */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#5D7B6F]/15 via-[#A4C3A2]/10 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 relative z-10">
        {/* Back navigation */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#5D7B6F]/70 hover:text-[#5D7B6F] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Quay lại khám phá
          </Link>
        </motion.div>

        {/* Header section */}
        <motion.header 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-2"
        >
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-2 text-[#5D7B6F]/60">
              <div className="h-1 w-1 rounded-full bg-[#5D7B6F]/60" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Danh mục môn học</p>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-gray-900 tracking-tight leading-none uppercase">
              {categoryName}
            </h1>
          </div>
        </motion.header>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200/80 gap-3 sm:gap-6 pt-1 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => router.push(`/courses/${code}`)}
            className={cn(
              "flex items-center gap-1.5 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative cursor-pointer",
              currentTab === 'list'
                ? "border-[#5D7B6F] text-[#5D7B6F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <List className="w-3.5 h-3.5" />
            Danh sách đề thi
            {currentTab === 'list' && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5D7B6F] rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
              router.push(`/courses/${code}?tab=mix${categoryParam}`)
            }}
            className={cn(
              "flex items-center gap-1.5 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative cursor-pointer",
              currentTab === 'mix'
                ? "border-[#5D7B6F] text-[#5D7B6F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Shuffle className="w-3.5 h-3.5" />
            Trộn bộ đề
            {currentTab === 'mix' && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5D7B6F] rounded-full" />
            )}
          </button>

          <button
            onClick={() => router.push(`/courses/${code}?tab=pinned`)}
            className={cn(
              "flex items-center gap-1.5 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative cursor-pointer",
              currentTab === 'pinned'
                ? "border-[#5D7B6F] text-[#5D7B6F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Ghim
            {pinnedQuestions.length > 0 && (
              <span className={cn(
                "px-1.5 py-0.2 text-[10px] rounded-full font-bold ml-0.5",
                currentTab === 'pinned' ? "bg-[#5D7B6F] text-white" : "bg-slate-200 text-slate-600"
              )}>
                {pinnedQuestions.length}
              </span>
            )}
            {currentTab === 'pinned' && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5D7B6F] rounded-full" />
            )}
          </button>
        </div>

        {/* Active Tab Content */}
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pt-2"
        >
          {currentTab === 'mix' ? (
            <MixQuizTab embedded />
          ) : currentTab === 'pinned' ? (
            <PinnedQuestionsTab courseCode={code} />
          ) : (
            <CourseQuizList
              code={code}
              onCategoryLoaded={(name, id) => {
                setCategoryName(name)
                setCategoryId(id)
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5D7B6F] border-t-transparent" />
      </div>
    }>
      <CourseDetailContent code={code} />
    </Suspense>
  )
}
