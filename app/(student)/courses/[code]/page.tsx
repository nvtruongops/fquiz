'use client'

import { use, useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import CourseQuizList from '@/components/quiz/explore/CourseQuizList'
import MixQuizTab from '@/components/quiz/explore/MixQuizTab'
import { ArrowLeft, Shuffle, List } from 'lucide-react'
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
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F9F7] relative overflow-hidden px-6 md:px-10 py-10">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] right-[10%] w-[45%] h-[45%] bg-gradient-to-br from-[#5D7B6F]/10 to-transparent blur-[120px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[20%] left-[5%] w-[35%] h-[35%] bg-gradient-to-tr from-[#A4C3A2]/20 to-transparent blur-[100px] rounded-full mix-blend-multiply" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Back navigation */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#5D7B6F]/70 hover:text-[#5D7B6F] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Quay lại
          </Link>
        </motion.div>

        {/* Header section */}
        <motion.header 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#5D7B6F]/60">
              <div className="h-1 w-1 rounded-full bg-[#5D7B6F]/60" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Danh mục môn học</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight uppercase">
              {categoryName}
            </h1>
          </div>

        </motion.header>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200/80 gap-6 pt-2">
          <button
            onClick={() => router.push(`/courses/${code}`)}
            className={cn(
              "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative",
              currentTab === 'list'
                ? "border-[#5D7B6F] text-[#5D7B6F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <List className="w-4 h-4" />
            Danh sách đề thi
            {currentTab === 'list' && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5D7B6F] rounded-full" />
            )}
          </button>
          <button
            onClick={() => router.push(`/courses/${code}?tab=mix${categoryId ? `&categoryId=${categoryId}` : ''}`)}
            className={cn(
              "flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative",
              currentTab === 'mix'
                ? "border-[#5D7B6F] text-[#5D7B6F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Shuffle className="w-4 h-4" />
            Trộn bộ đề
            {currentTab === 'mix' && (
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
