'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'

interface DashboardHeaderProps {
  user: { name?: string } | null
  isRefetching: boolean
  showExploreAction: boolean
  onRefetch: () => void
}

export const DashboardHeader = React.memo(function DashboardHeader({
  user,
  isRefetching,
  showExploreAction,
  onRefetch,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {user?.name || 'Student'}</p>
      </div>

      <div className="flex items-center gap-2 self-start shrink-0">
        {showExploreAction && (
          <Button asChild className="h-11 min-h-[44px] rounded-xl px-4 font-semibold">
            <Link href="/explore">
              Explore quizzes <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        )}
        <Button
          type="button"
          onClick={onRefetch}
          variant="outline"
          size="sm"
          disabled={isRefetching}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl p-0"
          title="Refresh dashboard data"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw aria-hidden="true" className={cn('h-4 w-4', isRefetching && 'motion-safe:animate-spin')} />
        </Button>
      </div>
    </header>
  )
})
