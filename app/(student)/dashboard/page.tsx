'use client'

import React from 'react'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { IncompleteSessionBanner } from '@/components/dashboard/IncompleteSessionBanner'
import { PinnedCategoriesSection } from '@/components/dashboard/PinnedCategoriesSection'
import { LearningStudioGrid } from '@/components/dashboard/LearningStudioGrid'
import { RecentActivitiesFeed } from '@/components/dashboard/RecentActivitiesFeed'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export default function DashboardPage() {
  const {
    user,
    isDevOrAdmin,
    isLoading,
    isRefetching,
    refetch,
    recentActivities,
    pinnedCategories,
    primaryIncomplete,
    userInitial,
  } = useStudentDashboard()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans text-slate-800 pb-10 p-4 sm:p-6 md:p-8">
      {/* 1. Header Greeting & Hero Card */}
      <DashboardHeader
        user={user}
        userInitial={userInitial}
        isDevOrAdmin={isDevOrAdmin}
        isRefetching={isRefetching}
        onRefetch={refetch}
      />

      {/* 2. Incomplete Session Banner (High-Priority Alert) */}
      {primaryIncomplete ? <IncompleteSessionBanner item={primaryIncomplete} /> : null}

      {/* 2.5. Pinned Categories — Quick Access */}
      <PinnedCategoriesSection categories={pinnedCategories} />

      {/* 3. Quick Action Learning Hub & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <LearningStudioGrid isDevOrAdmin={isDevOrAdmin} />
        <RecentActivitiesFeed recentActivities={recentActivities} />
      </div>
    </div>
  )
}
