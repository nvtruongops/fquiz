'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/store/shared/toast-store'
import { useDebounce } from '@/hooks/shared/useDebounce'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useCreateCategory } from '@/hooks/quiz/useCreateCategory'

export interface Category {
  _id: string
  name: string
  type: 'private' | 'public'
  is_from_saved?: boolean
  ownQuizCount?: number
  savedQuizCount?: number
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
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const initialTabParam = searchParams.get('tab')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'saved' | 'mix'>(
    initialTabParam === 'saved' ? 'saved' : initialTabParam === 'mix' ? 'mix' : 'personal'
  )

  const [search, setSearch] = useState('')
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  // 1. Fetch Categories
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

  const categories: Category[] = catData?.categories || []
  const privateCategories = useMemo(
    () => categories.filter((c) => c.type === 'private'),
    [categories]
  )
  const privateCategoryCount = privateCategories.length

  // 2. Fetch Quizzes
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

  const allQuizzes: Quiz[] = quizData?.quizzes || []
  const ownQuizTotal = useMemo(() => allQuizzes.filter((q) => !q.is_saved_from_explore && !q.is_temp).length, [allQuizzes])
  const savedQuizTotal = useMemo(() => allQuizzes.filter((q) => q.is_saved_from_explore).length, [allQuizzes])
  const mixQuizTotal = useMemo(() => allQuizzes.filter((q) => q.is_temp).length, [allQuizzes])

  // 3. Filter Quizzes based on Tab and Search
  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz: Quiz) => {
      let isCorrectTab = false
      if (activeTab === 'personal') isCorrectTab = !quiz.is_saved_from_explore && !quiz.is_temp
      else if (activeTab === 'saved') isCorrectTab = Boolean(quiz.is_saved_from_explore)
      else if (activeTab === 'mix') isCorrectTab = Boolean(quiz.is_temp)

      if (!isCorrectTab) return false

      return !debouncedSearch ||
        quiz.course_code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        quiz.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    })
  }, [allQuizzes, activeTab, debouncedSearch])

  // 4. Mutations
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
      toast.success('Đã xóa bộ đề khỏi kho lưu trữ!')
    },
    onError: (err: any) => {
      toast.error(err.message)
    },
  })

  const createCatMutation = useCreateCategory()

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id, name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể cập nhật danh mục')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      setEditingCategoryId(null)
      toast.success('Category updated')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/categories?id=${id}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể xóa danh mục')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      toast.success('Danh mục đã xóa')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const moveQuizCategoryMutation = useMutation({
    mutationFn: async ({ quizId, categoryId }: { quizId: string; categoryId: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ category_id: categoryId || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Không thể chuyển quiz sang danh mục khác')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'categories'] })
      toast.success('Đã chuyển quiz sang danh mục mới')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const handleMoveCategory = useCallback(async (quizId: string, categoryId: string) => {
    return moveQuizCategoryMutation.mutateAsync({ quizId, categoryId })
  }, [moveQuizCategoryMutation])

  return {
    selectedCategoryId, setSelectedCategoryId,
    activeTab, setActiveTab,
    search, setSearch,
    isManageCategoriesOpen, setIsManageCategoriesOpen,
    confirmDeleteCatId, setConfirmDeleteCatId,
    newCategoryName, setNewCategoryName,
    editingCategoryId, setEditingCategoryId,
    editingCategoryName, setEditingCategoryName,
    categories,
    privateCategories,
    privateCategoryCount,
    catsLoading,
    quizzesLoading,
    allQuizzes,
    filteredQuizzes,
    ownQuizTotal,
    savedQuizTotal,
    mixQuizTotal,
    deleteQuizMutation,
    createCatMutation,
    updateCatMutation,
    deleteCatMutation,
    moveQuizCategoryMutation,
    handleMoveCategory,
  }
}
