'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/store/shared/toast-store'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export interface Category {
  _id: string
  name: string
  type: 'private' | 'public'
  totalQuizCount?: number
}

export interface Quiz {
  _id: string
  title: string
  course_code: string
  questionCount: number
  latestCorrectCount?: number | null
  latestTotalCount?: number | null
  latestScoreOnTen?: number | null
  latestSessionId?: string | null
  totalStudyMinutes?: number | null
  is_public: boolean
  is_saved_from_explore?: boolean
  is_temp?: boolean
  original_quiz_id?: string
  sourceStatus?: 'available' | 'source_locked' | 'not_applicable'
  status: string
  category_id: string | { _id: string; name: string } | null
}

export function useMyQuizzes() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // 1. Fetch Categories for filtering
  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['student', 'categories'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`)
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const categories: Category[] = useMemo(() => catData?.categories || [], [catData?.categories])

  // 2. Fetch Saved Quizzes
  const { data: quizData, isLoading: quizzesLoading } = useQuery({
    queryKey: ['student', 'quizzes', selectedCategoryId],
    queryFn: async () => {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? globalThis.location.origin}/api/student/quizzes`)
      if (selectedCategoryId) url.searchParams.append('categoryId', selectedCategoryId)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Failed to fetch quizzes')
      return res.json()
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const allQuizzes: Quiz[] = useMemo(() => quizData?.quizzes || [], [quizData?.quizzes])
  const savedQuizTotal = allQuizzes.length

  // 3. Filter Quizzes based on Search
  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz: Quiz) => {
      if (!debouncedSearch) return true
      return (
        quiz.course_code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        quiz.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    })
  }, [allQuizzes, debouncedSearch])

  // 4. Delete / Unsave Mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Lỗi khi xóa bộ đề')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      toast.success('Đã xóa bộ đề khỏi kho lưu trữ!')
    },
    onError: (err: any) => {
      toast.error(err.message)
    },
  })

  return {
    selectedCategoryId,
    setSelectedCategoryId,
    search,
    setSearch,
    categories,
    catsLoading,
    quizzesLoading,
    allQuizzes,
    filteredQuizzes,
    savedQuizTotal,
    deleteQuizMutation,
  }
}
