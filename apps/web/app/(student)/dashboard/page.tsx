'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, MessageCircle, UsersRound } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardPrimaryAction } from '@/components/dashboard/DashboardPrimaryAction'
import { PinnedCategoriesSection } from '@/components/dashboard/PinnedCategoriesSection'
import { RecentActivitiesFeed } from '@/components/dashboard/RecentActivitiesFeed'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { useStudentDashboard } from '@/hooks/useStudentDashboard'

export default function DashboardPage() {
  const dashboard = useStudentDashboard()

  if (dashboard.isLoading) return <DashboardSkeleton />

  if (dashboard.isError && !dashboard.hasData) return <DashboardLoadError onRetry={dashboard.refetch} />

  return <DashboardContent dashboard={dashboard} />
}

type DashboardData = ReturnType<typeof useStudentDashboard>

function DashboardLoadError({ onRetry }: { onRetry: DashboardData['refetch'] }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8">
      <section role="alert" className="space-y-3 rounded-2xl border border-border bg-card p-5 text-card-foreground">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">We couldn&apos;t load your dashboard. Please try again.</p>
        <Button type="button" className="min-h-11" onClick={() => void onRetry()}>
          Try again
        </Button>
      </section>
    </div>
  )
}

function DashboardContent({ dashboard }: { dashboard: DashboardData }) {
  const { user, isRefetching, refetch, recentActivities, pinnedCategories, primaryIncomplete } = dashboard

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24 font-sans text-foreground sm:p-6 md:p-8 lg:pb-8">
      <DashboardHeader
        user={user}
        isRefetching={isRefetching}
        showExploreAction={false}
        onRefetch={refetch}
      />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <main className="min-w-0 space-y-5 lg:col-span-8">
          <DashboardPrimaryAction item={primaryIncomplete ?? null} />
          <RecentActivitiesFeed
            recentActivities={recentActivities}
            featuredActivityId={primaryIncomplete?.id}
          />
        </main>

        <aside aria-label="Subjects and learning spaces" className="min-w-0 space-y-5 lg:col-span-4">
          {pinnedCategories.length > 0 && <PinnedCategoriesSection categories={pinnedCategories} />}

          <nav aria-label="More learning destinations" className="rounded-xl border border-border bg-card px-3">
            <h2 className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Learning spaces</h2>
            <Link
              href="/student/classrooms"
              className="flex min-h-11 items-center gap-2.5 border-b border-border px-1 text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <UsersRound aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              My classrooms
              <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/community"
              className="flex min-h-11 items-center gap-2.5 px-1 text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              Community
              <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 text-muted-foreground" />
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  )
}
