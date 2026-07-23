'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { useToast } from '@/store/shared/toast-store'

export interface PinnedQuestionItem {
  _id: string
  student_id: string
  question_id?: string
  quiz_id?: string
  quiz_title?: string
  course_code: string
  text: string
  options: string[]
  correct_answer: number[]
  explanation?: string
  image_url?: string
  created_at?: string
}

export function usePinnedQuestions(courseCode?: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const normalizedCode = courseCode?.trim().toUpperCase()

  // Query pinned questions
  const {
    data: pinnedQuestions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PinnedQuestionItem[]>({
    queryKey: ['student', 'pinned-questions', normalizedCode || 'all'],
    queryFn: async () => {
      const param = normalizedCode ? `?course_code=${encodeURIComponent(normalizedCode)}` : ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-questions${param}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.pinnedQuestions ?? []
    },
    staleTime: 30_000,
  })

  // Toggle pin question mutation
  const togglePinMutation = useMutation({
    mutationFn: async (payload: {
      question_id?: string
      quiz_id?: string
      quiz_title?: string
      course_code: string
      text: string
      options: string[]
      correct_answer: number[]
      explanation?: string
      image_url?: string
    }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-questions`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Không thể thực hiện thao tác ghim.')
      }
      return res.json()
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'pinned-questions'] })
      if (data.pinned) {
        toast.success('Đã ghim câu hỏi thành công')
      } else {
        toast.info('Đã bỏ ghim câu hỏi')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Lỗi thao tác ghim câu hỏi')
    },
  })

  // Delete single pinned question mutation
  const deletePinMutation = useMutation({
    mutationFn: async (pinnedId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-questions/${pinnedId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders({}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Không thể xóa câu ghim.')
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'pinned-questions'] })
      toast.success('Đã xóa câu hỏi khỏi danh sách ghim')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Không thể xóa câu ghim')
    },
  })

  // Clear all pinned questions for course mutation
  const clearAllPinsMutation = useMutation({
    mutationFn: async (code?: string) => {
      const targetCode = code || normalizedCode
      const param = targetCode ? `?course_code=${encodeURIComponent(targetCode)}` : ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-questions${param}`, {
        method: 'DELETE',
        headers: withCsrfHeaders({}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Không thể xóa tất cả câu ghim.')
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'pinned-questions'] })
      toast.success('Đã xóa tất cả câu hỏi ghim')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Lỗi khi xóa câu ghim')
    },
  })

  // Create quiz from pinned questions mutation
  const createQuizFromPinnedMutation = useMutation({
    mutationFn: async (params: { course_code: string; title?: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/from-pinned`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) {
        throw {
          message: data.error || 'Không thể tạo bài kiểm tra từ câu ghim.',
          quotaExceeded: Boolean(data.quotaExceeded),
          status: res.status,
        }
      }
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'quizzes'] })
      toast.success(data.message || 'Đã tạo bài kiểm tra từ câu ghim thành công!')
    },
  })

  return {
    pinnedQuestions,
    isLoading,
    isError,
    refetch,
    togglePinMutation,
    deletePinMutation,
    clearAllPinsMutation,
    createQuizFromPinnedMutation,
  }
}
