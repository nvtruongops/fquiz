'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { QuizEditor } from '@/components/quiz/QuizEditor'
import { motion } from 'framer-motion'

interface Category {
  _id: string
  name: string
}

export default function StudentCreateQuizPage() {
  const searchParams = useSearchParams()
  const quizId = searchParams.get('id') || undefined

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['student', 'categories'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json() as Promise<{ categories: Category[] }>
    },
  })

  const { data: quizData, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ['student', 'quiz', quizId],
    queryFn: async () => {
      if (!quizId) return null
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${quizId}`)
      if (!res.ok) throw new Error('Failed to fetch quiz data')
      return res.json()
    },
    enabled: Boolean(quizId),
  })

  const categories = categoriesData?.categories ?? []
  const isLoading = isLoadingCategories || (Boolean(quizId) && isLoadingQuiz)

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-8 text-slate-500 font-semibold gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#5D7B6F]" />
        <span className="text-xs font-bold text-slate-400">Đang chuẩn bị trình soạn thảo...</span>
      </div>
    )
  }

  const initialData = quizData
    ? {
        description: quizData.description || '',
        category_id: quizData.category_id || '',
        course_code: quizData.course_code || '',
        questions: (quizData.questions || []).map((q: any) => ({
          text: q.text || '',
          options: q.options || [],
          correct_answers: Array.isArray(q.correct_answer)
            ? q.correct_answer
            : Array.isArray(q.correct_answers)
            ? q.correct_answers
            : [q.correct_answer].filter((a: any) => a != null),
          explanation: q.explanation || '',
          image_url: q.image_url || '',
        })),
      }
    : undefined

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-hidden px-4 sm:px-6 pt-3 pb-8">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#5D7B6F]/10 via-emerald-500/5 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <div className="max-w-5xl mx-auto space-y-4 relative z-10">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between border-b border-slate-200/80 pb-3"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[#5D7B6F]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#5D7B6F]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">FQuiz · Soạn đề</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {quizId ? 'Chỉnh sửa bộ đề thi' : 'Tạo bộ đề thi mới'}
            </h1>
          </div>
        </motion.div>

        {/* Quiz Editor Component */}
        <QuizEditor
          key={quizId || 'new'}
          mode="student"
          quizId={quizId}
          initialData={initialData}
          categories={categories.map((c) => ({ _id: c._id, name: c.name }))}
          allowDraft={false}
          enableAutosave={false}
          createEndpoint={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes`}
          updateEndpointBuilder={(id) => `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${id}`}
          redirectOnPublish="/my-quizzes"
          cancelPath="/my-quizzes"
        />
      </div>
    </div>
  )
}
