import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { isToday, isYesterday, format } from 'date-fns'
import { useAuth } from '@/hooks/auth/useAuth'

export interface HistoryItem {
  _id: string
  quiz_id: string
  quiz_title: string
  quiz_code: string
  category_name: string
  source_type: string
  source_label: string
  source_creator_name: string | null
  score: number
  total_questions: number
  answered_count: number
  correct_count: number
  mode: 'immediate' | 'review' | 'flashcard'
  status: 'active' | 'completed'
  completed_at?: string
  started_at: string
  duration_minutes: number
  flashcard_stats?: Record<string, unknown>
  is_mix?: boolean
}

export interface GroupedQuiz {
  key: string
  quiz_id: string
  quiz_code: string
  quiz_title: string
  category_name: string
  source_label: string
  is_mix?: boolean
  bestScorePercentage: number
  attempts: HistoryItem[]
}

export interface HistoryResponse {
  history: HistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DateGroup {
  title: string
  quizzes: GroupedQuiz[]
}

export type FilterStatus = 'all' | 'completed' | 'active'
export type FilterMode = 'all' | 'immediate' | 'review' | 'flashcard'

async function fetchHistory(page: number): Promise<HistoryResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history?page=${page}&limit=20`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export function useStudentHistory() {
  const searchParams = useSearchParams()
  const searchFromUrl = searchParams.get('search') || ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchFromUrl)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [modeFilter, setModeFilter] = useState<FilterMode>('all')
  const { data: authData } = useAuth()

  useEffect(() => {
    if (searchFromUrl) {
      setSearch(searchFromUrl)
    }
  }, [searchFromUrl])

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['history', page],
    queryFn: () => fetchHistory(page),
    enabled: Boolean(authData?.user),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  // Quick statistics calculation
  const stats = useMemo(() => {
    if (!data?.history) return { totalQuizzes: 0, totalAttempts: 0, completedCount: 0, perfectScores: 0 }
    const totalAttempts = data.history.length
    const completedCount = data.history.filter((h) => h.status === 'completed').length
    const perfectScores = data.history.filter((h) => h.status === 'completed' && h.total_questions > 0 && h.score >= h.total_questions).length
    const uniqueQuizzes = new Set(data.history.map((h) => h.quiz_id || h.quiz_code)).size

    return { totalQuizzes: uniqueQuizzes, totalAttempts, completedCount, perfectScores }
  }, [data?.history])

  const dateGroups: DateGroup[] = useMemo(() => {
    if (!data?.history) return []

    const q = search.toLowerCase().trim()
    const groupsMap = new Map<string, Map<string, GroupedQuiz>>()

    data.history.forEach((item) => {
      // Search text filter
      if (q) {
        const matchesCode = item.quiz_code?.toLowerCase().includes(q)
        const matchesCat = item.category_name?.toLowerCase().includes(q)
        const matchesTitle = item.quiz_title?.toLowerCase().includes(q)
        if (!matchesCode && !matchesCat && !matchesTitle) return
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return

      // Mode filter
      if (modeFilter !== 'all' && item.mode !== modeFilter) return

      const date = new Date(item.started_at)
      const dateTitle = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'dd/MM/yyyy')
      if (!groupsMap.has(dateTitle)) groupsMap.set(dateTitle, new Map())

      const quizMap = groupsMap.get(dateTitle)!
      const quizKey = item.quiz_id || `${item.quiz_code}_${item.category_name}`
      if (!quizMap.has(quizKey)) {
        quizMap.set(quizKey, {
          key: quizKey,
          quiz_id: item.quiz_id,
          quiz_code: item.quiz_code,
          quiz_title: item.quiz_title,
          category_name: item.category_name,
          source_label: item.source_label,
          is_mix: item.is_mix,
          bestScorePercentage: 0,
          attempts: [],
        })
      }

      const quizGroup = quizMap.get(quizKey)!
      quizGroup.attempts.push(item)

      if (item.status === 'completed' && item.total_questions > 0) {
        quizGroup.bestScorePercentage = Math.max(quizGroup.bestScorePercentage, (item.score / item.total_questions) * 100)
      }
    })

    return Array.from(groupsMap.entries()).map(([title, quizMap]) => ({
      title,
      quizzes: Array.from(quizMap.values()),
    }))
  }, [data?.history, search, statusFilter, modeFilter])

  return {
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    data,
    isLoading,
    isError,
    stats,
    dateGroups,
  }
}
