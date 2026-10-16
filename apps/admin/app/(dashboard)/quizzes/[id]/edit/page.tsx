'use client'

import { use, useEffect, useState } from 'react'
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

async function fetchQuiz(id: string) {
  const res = await fetch(`/api/quizzes/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load quiz details')
  const data = await res.json()
  return data.quiz
}

export default function AdminEditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const quizId = resolvedParams.id

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data: quiz, isLoading: isLoadingQuiz, error } = useQuery({
    queryKey: ['admin', 'quiz', quizId],
    queryFn: () => fetchQuiz(quizId),
    enabled: !!quizId,
    staleTime: 60 * 1000,
  })

  if (isLoadingCategories || isLoadingQuiz) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Loading quiz details...</p>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="p-12 text-center text-destructive">
        Quiz not found or an error occurred while loading.
      </div>
    )
  }

  return (
    <QuizEditorWithQuestionBank
      categories={categories}
      initialData={quiz}
      quizId={quizId}
    />
  )
}
