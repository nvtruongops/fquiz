'use client'

import React from 'react'
import { cn } from '@/lib/core/utils/cn'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { IncompleteSessionBanner } from '@/components/dashboard/IncompleteSessionBanner'
import { PinnedCategoriesSection } from '@/components/dashboard/PinnedCategoriesSection'
import { LearningStudioGrid } from '@/components/dashboard/LearningStudioGrid'
import { RecentActivitiesFeed } from '@/components/dashboard/RecentActivitiesFeed'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

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
    <div className="w-full max-w-7xl mx-auto space-y-7 sm:space-y-8 font-sans text-foreground pb-10 p-4 sm:p-6 md:p-8">
      <GsapStaggerContainer selector=".dash-section" stagger={0.08} y={16}>
        {/* 1. Header Greeting Hero */}
        <div className="dash-section">
          <DashboardHeader
            user={user}
            userInitial={userInitial}
            isDevOrAdmin={isDevOrAdmin}
            isRefetching={isRefetching}
            onRefetch={refetch}
          />
        </div>

        {/* 2. Pinned Categories — Quick Access */}
        <div className="dash-section py-2 sm:py-3">
          <PinnedCategoriesSection categories={pinnedCategories} />
        </div>

        {/* 3. Quick Action Learning Hub & Recent Activities Grid */}
        <div className="dash-section grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          <LearningStudioGrid isDevOrAdmin={isDevOrAdmin} />
          <RecentActivitiesFeed recentActivities={recentActivities} />
        </div>
      </GsapStaggerContainer>
    </div>
  )
}
