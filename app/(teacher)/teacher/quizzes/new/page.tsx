'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { QuizEditor } from '@/components/quiz/QuizEditor'

interface Category {
  _id: string
  name: string
}

export default function TeacherCreateQuizPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher', 'categories'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json() as Promise<{ categories: Category[] }>
    },
  })

  const categories = data?.categories ?? []

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-slate-500 font-semibold">
        <Loader2 className="w-5 h-5 animate-spin text-[#5D7B6F]" />
        Đang tải danh mục môn học...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <QuizEditor
        mode="admin"
        categories={categories.map((c) => ({ _id: c._id, name: c.name }))}
        allowDraft={false}
        enableAutosave={false}
        createEndpoint={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes`}
        redirectOnPublish="/teacher/quizzes"
        cancelPath="/teacher/quizzes"
      />
    </div>
  )
}
