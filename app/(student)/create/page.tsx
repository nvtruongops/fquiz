'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { QuizEditor } from '@/components/quiz/QuizEditor'

interface Category {
  _id: string
  name: string
}

export default function StudentCreateQuizPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'categories'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json() as Promise<{ categories: Category[] }>
    },
  })

  const categories = data?.categories ?? []

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải danh mục...
      </div>
    )
  }

  return (
    <QuizEditor
      mode="student"
      categories={categories.map((c) => ({ _id: c._id, name: c.name }))}
      allowDraft={false}
      enableAutosave={false}
      createEndpoint={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes`}
      redirectOnPublish="/my-quizzes"
      cancelPath="/my-quizzes"
    />
  )
}
