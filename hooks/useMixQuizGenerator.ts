'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { MIX_QUIZ_MAX_SELECT } from '@/lib/modules/quiz/constants/mix-quiz'

export interface Category {
  id: string
  name: string
}

export interface QuizOption {
  id: string
  title: string
  course_code: string
  questionCount: number
  latestScoreOnTen: number | null
  latestCorrectCount: number | null
  latestTotalCount: number | null
  totalStudyMinutes: number | null
}

export interface ActiveMixSession {
  sessionId: string
  quizId: string
  title: string
  question_count: number
  mode: 'immediate' | 'review'
  status: string
}

const PAGE_SIZE = 10

async function fetchActiveMixSession(): Promise<{ hasActive: boolean; session?: ActiveMixSession }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix/active`)
  if (!res.ok) return { hasActive: false }
  return res.json()
}

async function fetchCategoriesForMix(): Promise<{ data: Category[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchQuizzesForCategory(
  categoryId: string,
  offset: number,
  limit: number
): Promise<{ data: QuizOption[]; hasMore: boolean }> {
  const p = new URLSearchParams({
    category_id: categoryId,
    sort: 'popular',
    limit: String(limit),
    offset: String(offset),
  })
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/explore/quizzes?${p}`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  const json = await res.json()
  const data: QuizOption[] = (json.data ?? []).map((q: any) => ({
    id: q.id,
    title: q.title,
    course_code: q.course_code,
    questionCount: q.questionCount,
    latestScoreOnTen: q.latestScoreOnTen ?? null,
    latestCorrectCount: q.latestCorrectCount ?? null,
    latestTotalCount: q.latestTotalCount ?? null,
    totalStudyMinutes: q.totalStudyMinutes ?? null,
  }))
  return { data, hasMore: data.length === limit }
}

export function useMixQuizGenerator(embedded?: boolean, onSessionCreated?: (quizId: string, sessionId: string) => void) {
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const categoryIdParam = searchParams.get('categoryId')
  const mixFrom = searchParams.get('mix_from')

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => categoryIdParam ?? '')
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [mode, setMode] = useState<'immediate' | 'review' | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [quotaErrorMsg, setQuotaErrorMsg] = useState<string | null>(null)
  const [poolWarning, setPoolWarning] = useState<string | null>(null)
  const [isPreloading, setIsPreloading] = useState(false)

  // Active Session Query
  const { data: activeSessionData, refetch: refetchActive } = useQuery({
    queryKey: ['mix', 'active-session'],
    queryFn: fetchActiveMixSession,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  // Categories Query
  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['mix', 'categories'],
    queryFn: fetchCategoriesForMix,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (categoryIdParam) {
      setSelectedCategoryId(categoryIdParam)
      setSelectedQuizIds(new Set())
    }
  }, [categoryIdParam])

  // Pre-load from mix_from
  useEffect(() => {
    if (!mixFrom || !catData) return

    const loadFromMix = async () => {
      setIsPreloading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${mixFrom}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.mix_config) {
          setSelectedCategoryId(data.mix_config.category_id)
          setSelectedQuizIds(new Set(data.mix_config.quiz_ids))
          setQuestionCount(data.mix_config.question_count)
          setMode(data.mix_config.mode)
        }
      } catch (err) {
        console.error('Failed to load from mix:', err)
      } finally {
        setIsPreloading(false)
      }
    }

    loadFromMix()
  }, [mixFrom, catData])

  const {
    data: quizPages,
    isLoading: quizzesLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<
    { data: QuizOption[]; hasMore: boolean },
    Error,
    { data: QuizOption[]; hasMore: boolean }[],
    ['mix', 'quizzes', string],
    number
  >({
    queryKey: ['mix', 'quizzes', selectedCategoryId],
    queryFn: ({ pageParam }) => fetchQuizzesForCategory(selectedCategoryId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((sum, p) => sum + p.data.length, 0)
    },
    select: (data) => data.pages,
    enabled: !!selectedCategoryId,
    staleTime: 2 * 60 * 1000,
  })

  const categories = catData?.data ?? []
  const quizzes = (quizPages ?? []).flatMap((p) => p.data)

  const totalPool = quizzes
    .filter((q) => selectedQuizIds.has(q.id))
    .reduce((sum, q) => sum + q.questionCount, 0)

  useEffect(() => {
    if (totalPool > 0 && questionCount !== null && questionCount > totalPool) {
      setQuestionCount(null)
    }
  }, [totalPool, questionCount])

  const toggleQuiz = useCallback((id: string) => {
    setSelectedQuizIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else if (next.size < MIX_QUIZ_MAX_SELECT) { next.add(id) }
      return next
    })
  }, [])

  const deleteActiveSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete active session')
      return res.json()
    },
    onSuccess: () => {
      refetchActive()
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategoryId || selectedQuizIds.size < 2 || questionCount === null || mode === null) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_ids: Array.from(selectedQuizIds),
          question_count: questionCount,
          mode,
          difficulty: 'random',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const err = new Error(data.error || 'Failed')
        ;(err as any).status = res.status
        ;(err as any).data = data
        throw err
      }
      return data
    },
    onSuccess: (data) => {
      if (data.actual_count && data.actual_count < (questionCount ?? 0)) {
        setPoolWarning(
          `Pool câu hỏi chỉ có ${data.actual_count} câu — đã lấy hết. Bắt đầu với ${data.actual_count} câu.`
        )
        setTimeout(() => {
          if (onSessionCreated) onSessionCreated(data.quizId, data.sessionId)
          else router.push(`/quiz/${data.quizId}/session/${data.sessionId}`)
        }, 1500)
      } else {
        if (onSessionCreated) onSessionCreated(data.quizId, data.sessionId)
        else router.push(`/quiz/${data.quizId}/session/${data.sessionId}`)
      }
    },
    onError: (err: any) => {
      if (err.status === 429) {
        const msg = `Bạn đã tạo quá ${err.data?.limit ?? 5} Quiz Trộn trong 1 giờ.`
        setRateLimitReset(err.data?.reset ?? null)
        setRateLimitMsg(msg)
        toast.error(msg)
      } else {
        toast.error(err.data?.message || err.message || 'Có lỗi xảy ra khi tạo bộ đề trộn')
      }
    },
  })

  const canStart = selectedQuizIds.size >= 2 && questionCount !== null && mode !== null && !rateLimitReset

  return {
    selectedCategoryId, setSelectedCategoryId,
    selectedQuizIds, setSelectedQuizIds,
    toggleQuiz,
    questionCount, setQuestionCount,
    mode, setMode,
    rateLimitMsg,
    poolWarning,
    quotaErrorMsg, setQuotaErrorMsg,
    activeSessionData,
    categories, catsLoading,
    quizzes, quizzesLoading,
    hasNextPage, isFetchingNextPage, fetchNextPage,
    totalPool,
    canStart,
    createMutation,
    deleteActiveSessionMutation,
  }
}
