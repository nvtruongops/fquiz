'use client'

import { useQuery } from '@tanstack/react-query'

export interface QuizItem {
  _id: string
  title: string
  questionCount: number
  bestScore: number | null
}

export interface CourseQuizzesResponse {
  categoryId?: string | null
  categoryName: string
  quizzes: QuizItem[]
  savedQuizIds?: string[]
  pinnedQuizIds?: string[]
  isCategoryPinned?: boolean
}

export async function fetchCourseQuizzes(code: string): Promise<CourseQuizzesResponse> {
  const normalizedCode = (code || '').toUpperCase()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/courses/${encodeURIComponent(normalizedCode)}/quizzes`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  return res.json()
}

export function useCourseQuizzes(code: string) {
  const normalizedCode = (code || '').toUpperCase()
  return useQuery<CourseQuizzesResponse>({
    queryKey: ['courseQuizzes', normalizedCode],
    queryFn: () => fetchCourseQuizzes(normalizedCode),
    enabled: Boolean(code),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
