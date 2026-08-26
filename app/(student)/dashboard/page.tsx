'use client'

import React from 'react'
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
    <div className="w-full max-w-[1400px] mx-auto space-y-6 font-sans text-foreground pb-12 p-4 sm:p-6 md:p-8">
      <GsapStaggerContainer selector=".dash-section" stagger={0.06} y={12}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7/12): Header, Incomplete Banner, Pinned Categories (Top for quick access), Bento Studio */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Header Greeting */}
            <div className="dash-section">
              <DashboardHeader
                user={user}
                userInitial={userInitial}
                isDevOrAdmin={isDevOrAdmin}
                isRefetching={isRefetching}
                onRefetch={refetch}
              />
            </div>

            {/* 2. Incomplete Session Quick Resume (if exists) */}
            {primaryIncomplete && (
              <div className="dash-section">
                <IncompleteSessionBanner item={primaryIncomplete} />
              </div>
            )}

            {/* 3. Pinned Categories / Quick Course Access (Moved to top for rapid access) */}
            {pinnedCategories && pinnedCategories.length > 0 && (
              <div className="dash-section">
                <PinnedCategoriesSection categories={pinnedCategories} />
              </div>
            )}

            {/* 4. Learning Studio Bento Hub Grid */}
            <div className="dash-section">
              <LearningStudioGrid isDevOrAdmin={isDevOrAdmin} />
            </div>
          </div>

          {/* Right Column (5/12): Learning Activity Timeline Hub */}
          <div className="lg:col-span-5 dash-section h-full lg:sticky lg:top-6">
            <RecentActivitiesFeed recentActivities={recentActivities} />
          </div>
        </div>
      </GsapStaggerContainer>
    </div>
  )
}
