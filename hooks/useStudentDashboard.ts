import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/auth/useAuth'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

export interface ActivityItem {
  id: string
  quizId: string
  activeSessionId?: string
  quizTitle: string
  quizCode: string
  status: string
  mode: string
  score?: number | null
  maxScore?: number
  quizDeleted?: boolean
  completedAt?: string
  activityAt?: string
  categoryName?: string
  sourceType?: string
  sourceLabel?: string
  isMix?: boolean
  correctCount?: number
  totalCount?: number
  /** True when a completed activity also has a resumable in-progress session */
  hasActiveSession?: boolean
  activeAnsweredCount?: number
  activeTotalCount?: number
  activeStartedAt?: string
}

export interface PinnedCategoryItem {
  id: string
  name: string
  quizCount: number
}

export function useStudentDashboard() {
  const { data: authData } = useAuth()
  const user = authData?.user ?? null
  const isDevOrAdmin = useMemo(
    () => user?.role === 'admin' || user?.role === 'dev',
    [user?.role]
  )

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.STUDENT.DASHBOARD}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const recentActivities: ActivityItem[] = useMemo(
    () => data?.recentActivities || [],
    [data?.recentActivities]
  )

  const pinnedCategories: PinnedCategoryItem[] = useMemo(
    () => data?.pinnedCategories || [],
    [data?.pinnedCategories]
  )

  const primaryIncomplete = useMemo(
    () => recentActivities.find((a: ActivityItem) =>
      (a.status === 'active' || a.hasActiveSession) && !a.quizDeleted
    ),
    [recentActivities]
  )

  const userInitial = useMemo(
    () => (user?.name?.[0] || 'U').toUpperCase(),
    [user?.name]
  )

  return {
    user,
    isDevOrAdmin,
    isLoading,
    isRefetching,
    refetch,
    recentActivities,
    pinnedCategories,
    primaryIncomplete,
    userInitial,
  }
}
