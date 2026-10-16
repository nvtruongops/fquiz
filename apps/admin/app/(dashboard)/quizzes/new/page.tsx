'use client'

import { useQuery } from '@tanstack/react-query'
import { QuizEditorWithQuestionBank, type Category } from '@/components/quiz/QuizEditorWithQuestionBank'
import { Loader2 } from 'lucide-react'

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories', { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load categories')
  const data = await res.json()
  return (data.categories || []).map((c: any) => ({
    _id: String(c._id),
    name: c.name,
  }))
}

export default function AdminNewQuizPage() {
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading categories and initializing editor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 text-center text-destructive">
        Unable to connect to the server to load categories.
      </div>
    )
  }

  return <QuizEditorWithQuestionBank categories={categories} />
}
