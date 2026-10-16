'use client'

import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  History as HistoryIcon,
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { HistorySkeleton } from '@/components/history/HistorySkeleton'
import { HistoryFilterBar } from '@/components/history/HistoryFilterBar'
import { HistoryGroupList } from '@/components/history/HistoryGroupList'
import { useStudentHistory } from '@/hooks/useStudentHistory'

function HistoryContent() {
  const {
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    modeFilter,
    setModeFilter,
    data,
    isLoading,
    isError,
    stats,
    dateGroups,
  } = useStudentHistory()

  const hasActiveFilters = Boolean(search || statusFilter !== 'all' || modeFilter !== 'all')

  return (
    <main className="min-h-screen pb-20 px-3 sm:px-6 max-w-6xl mx-auto space-y-6">
      {/* ── Page Header & Stats Strip ────────────────────────────────────────────────────────── */}
      <div className="pt-4 sm:pt-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-wider">
              <HistoryIcon className="w-3 h-3" />
              <span>Learning Journey</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Quiz History
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Track your study progress, scores achieved, and review details for every quiz attempt.
            </p>
          </div>

          {/* Quick Stats Pill Strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                {stats.totalQuizzes}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Quizzes Taken</p>
                <p className="text-xs font-black text-foreground">{stats.totalAttempts} attempts</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-success/15 text-success flex items-center justify-center font-black text-xs">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Perfect Scores</p>
                <p className="text-xs font-black text-foreground">{stats.perfectScores} scored 10/10</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <HistoryFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          modeFilter={modeFilter}
          onModeFilterChange={setModeFilter}
        />
      </div>

      {/* Main Activity Feed */}
      <div className="w-full">
        <HistoryGroupList
          isLoading={isLoading}
          isError={isError}
          dateGroups={dateGroups}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border-border hover:bg-muted shadow-2xs h-9 px-4 text-xs font-bold cursor-pointer"
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-primary px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
                {page}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                / {data.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-xl border-border hover:bg-muted shadow-2xs h-9 px-4 text-xs font-bold cursor-pointer"
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function HistoryPage() {
  return (
    <React.Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </React.Suspense>
  )
}
