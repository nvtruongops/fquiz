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
  score?: number | null
  maxScore?: number
  quizDeleted?: boolean
  completedAt?: string
  activityAt?: string
  categoryName?: string
  sourceType?: string
  sourceLabel?: string
  isMix?: boolean
}

export function useStudentDashboard() {
  const { data: authData } = useAuth()
  const user = authData?.user ?? null
  const isDevOrAdmin = user?.role === 'admin' || user?.role === 'dev'

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

  const recentActivities: ActivityItem[] = data?.recentActivities || []
  const incompleteSessions = recentActivities.filter((a: ActivityItem) =>
    a.status === 'active' && !a.quizDeleted
  ) || []

  const primaryIncomplete = incompleteSessions[0]
  const incompleteCount = incompleteSessions.length
  const stats: DashboardStats = data?.stats || { totalQuizzes: 0, averageScore: '0.0', totalCorrectAnswers: 0 }
  const avgScoreNum = Number(stats.averageScore || 0)
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'

  const getPerformanceGrade = (score: number) => {
    if (score >= 9) return { label: 'Xuất sắc', color: 'text-[#5D7B6F] bg-emerald-50 border-emerald-200' }
    if (score >= 8) return { label: 'Giỏi', color: 'text-blue-700 bg-blue-50 border-blue-200' }
    if (score >= 6.5) return { label: 'Khá', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    if (score >= 5) return { label: 'Trung bình', color: 'text-slate-700 bg-slate-100 border-slate-200' }
    return { label: 'Cần cố gắng', color: 'text-rose-700 bg-rose-50 border-rose-200' }
  }

  const performanceGrade = getPerformanceGrade(avgScoreNum)
  const completionRate = Math.min(Math.round((avgScoreNum / 10) * 100), 100)

  return {
    user,
    isDevOrAdmin,
    isLoading,
    isRefetching,
    refetch,
    recentActivities,
    incompleteSessions,
    incompleteCount,
    primaryIncomplete,
    stats,
    avgScoreNum,
    userInitial,
    performanceGrade,
    completionRate,
  }
}
