import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { isToday, isYesterday, format } from 'date-fns'
import { useAuth } from '@/hooks/auth/useAuth'
import { useDebounce } from '@/hooks/shared/useDebounce'

const MAX_HISTORY_SEARCH_LENGTH = 100

interface HistoryStats {
  totalQuizzes: number
  totalAttempts: number
  completedCount: number
  perfectScores: number
}

const EMPTY_STATS: HistoryStats = {
  totalQuizzes: 0,
  totalAttempts: 0,
  completedCount: 0,
  perfectScores: 0,
}

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

interface HistoryResponse {
  history: HistoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats: HistoryStats
}

export interface DateGroup {
  title: string
  quizzes: GroupedQuiz[]
}

export type FilterStatus = 'all' | 'completed' | 'active'
export type FilterMode = 'all' | 'immediate' | 'review' | 'flashcard'

async function fetchHistory(
  page: number,
  search: string,
  status: FilterStatus,
  mode: FilterMode,
  signal?: AbortSignal,
): Promise<HistoryResponse> {
  const params = buildHistoryParams(page, search, status, mode)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history?${params.toString()}`, { signal })
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

function getHistorySearchFromUrl(searchParams: { get(name: string): string | null }) {
  return searchParams.get('search') || ''
}

function normalizeHistorySearch(search: string) {
  return search.trim().slice(0, MAX_HISTORY_SEARCH_LENGTH)
}

function hasHistoryUser(authData: { user?: unknown } | null | undefined) {
  return Boolean(authData?.user)
}

function getHistoryStats(stats: HistoryStats | undefined) {
  return stats ?? EMPTY_STATS
}

function buildHistoryParams(page: number, search: string, status: FilterStatus, mode: FilterMode) {
  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  if (status !== 'all') params.set('status', status)
  if (mode !== 'all') params.set('mode', mode)
  return params
}

function getHistoryDateTitle(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd/MM/yyyy')
}

function getOrCreateDateQuizMap(groups: Map<string, Map<string, GroupedQuiz>>, title: string) {
  const existing = groups.get(title)
  if (existing) return existing
  const quizzes = new Map<string, GroupedQuiz>()
  groups.set(title, quizzes)
  return quizzes
}

function getOrCreateQuizGroup(quizzes: Map<string, GroupedQuiz>, item: HistoryItem, key: string) {
  const existing = quizzes.get(key)
  if (existing) return existing
  const group: GroupedQuiz = {
    key,
    quiz_id: item.quiz_id,
    quiz_code: item.quiz_code,
    quiz_title: item.quiz_title,
    category_name: item.category_name,
    source_label: item.source_label,
    is_mix: item.is_mix,
    bestScorePercentage: 0,
    attempts: [],
  }
  quizzes.set(key, group)
  return group
}

function addHistoryAttempt(group: GroupedQuiz, item: HistoryItem) {
  group.attempts.push(item)
  if (item.status === 'completed' && item.total_questions > 0) {
    group.bestScorePercentage = Math.max(group.bestScorePercentage, (item.score / item.total_questions) * 100)
  }
}

function groupHistoryByDate(history: HistoryItem[]): DateGroup[] {
  const groupsMap = new Map<string, Map<string, GroupedQuiz>>()
  history.forEach((item) => {
    const title = getHistoryDateTitle(new Date(item.started_at))
    const quizzes = getOrCreateDateQuizMap(groupsMap, title)
    const key = item.quiz_id || `${item.quiz_code}_${item.category_name}`
    addHistoryAttempt(getOrCreateQuizGroup(quizzes, item, key), item)
  })
  return Array.from(groupsMap.entries()).map(([title, quizzes]) => ({
    title,
    quizzes: Array.from(quizzes.values()),
  }))
}

export function useStudentHistory() {
  const searchParams = useSearchParams()
  const searchFromUrl = getHistorySearchFromUrl(searchParams)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchFromUrl)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [modeFilter, setModeFilter] = useState<FilterMode>('all')
  const { data: authData } = useAuth()

  useEffect(() => {
    setSearch(searchFromUrl.slice(0, MAX_HISTORY_SEARCH_LENGTH))
    setPage(1)
  }, [searchFromUrl])

  const normalizedSearch = normalizeHistorySearch(search)
  const debouncedSearch = useDebounce(normalizedSearch, 300)
  const updateSearch = (value: string) => {
    setSearch(value.slice(0, MAX_HISTORY_SEARCH_LENGTH))
    setPage(1)
  }
  const updateStatusFilter = (value: FilterStatus) => {
    setStatusFilter(value)
    setPage(1)
  }
  const updateModeFilter = (value: FilterMode) => {
    setModeFilter(value)
    setPage(1)
  }

  const { data, isLoading, isError, refetch } = useQuery<HistoryResponse>({
    queryKey: ['history', page, debouncedSearch, statusFilter, modeFilter],
    queryFn: ({ signal }) => fetchHistory(page, debouncedSearch, statusFilter, modeFilter, signal),
    enabled: hasHistoryUser(authData),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const stats = getHistoryStats(data?.stats)

  const dateGroups: DateGroup[] = useMemo(() => groupHistoryByDate(data?.history ?? []), [data?.history])

  return {
    page,
    setPage,
    search,
    setSearch: updateSearch,
    statusFilter,
    setStatusFilter: updateStatusFilter,
    modeFilter,
    setModeFilter: updateModeFilter,
    data,
    isLoading,
    isError,
    retry: () => { void refetch() },
    stats,
    dateGroups,
  }
}
