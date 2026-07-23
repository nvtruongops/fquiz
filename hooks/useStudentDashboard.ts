'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/auth/useAuth'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

export interface DashboardStats {
  totalQuizzes: number
  averageScore: string
  totalCorrectAnswers: number
}

export interface ActivityItem {
  id: string
  quizId: string
  activeSessionId?: string
  quizTitle: string
  quizCode: string
  status: string
  mode: string
  quizDeleted?: boolean
  completedAt?: string
}

export function useStudentDashboard() {
  const { data: authData } = useAuth()
  const user = authData?.user ?? null
  const isDevOrAdmin = user?.role === 'admin' || user?.role === 'dev'

  const { data, isLoading } = useQuery({
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

  const recentActivities: ActivityItem[] = data?.recentActivities || []
  const incompleteSessions = recentActivities.filter((a: ActivityItem) =>
    a.status === 'active' && !a.quizDeleted
  ) || []

  const primaryIncomplete = incompleteSessions[0]
  const stats: DashboardStats = data?.stats || { totalQuizzes: 0, averageScore: '0.0', totalCorrectAnswers: 0 }
  const avgScoreNum = Number(stats.averageScore || 0)
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'

  return {
    user,
    isDevOrAdmin,
    isLoading,
    recentActivities,
    primaryIncomplete,
    stats,
    avgScoreNum,
    userInitial,
  }
}
