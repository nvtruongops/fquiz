'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, MessageCircle, UsersRound } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { IncompleteSessionBanner } from '@/components/dashboard/IncompleteSessionBanner'
import { PinnedCategoriesSection } from '@/components/dashboard/PinnedCategoriesSection'
import { RecentActivitiesFeed } from '@/components/dashboard/RecentActivitiesFeed'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'

export default function DashboardPage() {
  const {
    user,
    isLoading,
    isError,
    hasData,
    isRefetching,
    refetch,
    recentActivities,
    pinnedCategories,
    primaryIncomplete,
  } = useStudentDashboard()

  if (isLoading) return <DashboardSkeleton />

  if (isError && !hasData) {
    return (
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 md:p-8">
        <section role="alert" className="space-y-3 rounded-2xl border border-border bg-card p-5 text-card-foreground">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">We couldn&apos;t load your dashboard. Please try again.</p>
          <Button type="button" className="min-h-[44px]" onClick={() => void refetch()}>
            Try again
          </Button>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 pb-24 font-sans text-foreground sm:p-6 md:p-8 lg:pb-8">
      <DashboardHeader
        user={user}
        isRefetching={isRefetching}
        showExploreAction={!primaryIncomplete}
        onRefetch={refetch}
      />

      <div className="space-y-7">
        {primaryIncomplete && <IncompleteSessionBanner item={primaryIncomplete} />}
        {pinnedCategories.length > 0 && <PinnedCategoriesSection categories={pinnedCategories} />}
        <RecentActivitiesFeed recentActivities={recentActivities} />

        <nav aria-label="More learning destinations" className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <Link
            href="/student/classrooms"
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <UsersRound aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">My classrooms</span>
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/community"
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">Community</span>
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </nav>
      </div>
    </div>
  )
}
