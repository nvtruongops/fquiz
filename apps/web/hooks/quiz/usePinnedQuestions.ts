'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export interface UsePinnedQuestionsOptions {
  enabled?: boolean
}

interface PinnedQuestionsPage {
  pinnedQuestions: PinnedQuestionItem[]
  nextCursor: string | null
}

export function usePinnedQuestions(
  courseCode?: string,
  options?: UsePinnedQuestionsOptions
) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const normalizedCode = courseCode?.trim().toUpperCase()

  // Query pinned questions
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PinnedQuestionsPage>({
    queryKey: ['student', 'pinned-questions', normalizedCode || 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (normalizedCode) params.set('course_code', normalizedCode)
      if (typeof pageParam === 'string') params.set('cursor', pageParam)
      const query = params.size ? `?${params.toString()}` : ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/pinned-questions${query}`)
      if (!res.ok) return { pinnedQuestions: [], nextCursor: null }
      const data = await res.json()
      return { pinnedQuestions: data.pinnedQuestions ?? [], nextCursor: data.nextCursor ?? null }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
  const pinnedQuestions = data?.pages.flatMap((page) => page.pinnedQuestions) ?? []

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
        if (res.status === 401) {
          throw new Error('Please sign in to pin and save questions for review.')
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Unable to pin or unpin question.')
      }
      return res.json()
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'pinned-questions'] })
      if (data.pinned) {
        toast.success('Question pinned successfully')
      } else {
        toast.info('Question unpinned')
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to pin/unpin question')
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
        if (res.status === 401) {
          throw new Error('Please sign in to perform this action.')
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete pinned question.')
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'pinned-questions'] })
      toast.success('Question removed from pinned list')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete pinned question')
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
        if (res.status === 401) {
          throw new Error('Please sign in to perform this action.')
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete all pinned questions.')
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'pinned-questions'] })
      toast.success('All pinned questions cleared')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error clearing pinned questions')
    },
  })

  const isQuestionPinned = (questionId?: string, text?: string) => {
    return pinnedQuestions.some(
      (p) => (questionId && p.question_id === questionId) || (text && p.text === text)
    )
  }

  return {
    pinnedQuestions,
    isQuestionPinned,
    isLoading,
    isError,
    refetch,
    loadMore: () => fetchNextPage(),
    hasMore: Boolean(hasNextPage),
    isLoadingMore: isFetchingNextPage,
    togglePinMutation,
    deletePinMutation,
    clearAllPinsMutation,
  }
}
