import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function QuizSessionSkeleton() {
  return (
    <div className="h-dvh max-h-dvh min-h-dvh overflow-hidden flex flex-col font-sans bg-background text-foreground select-none">
      {/* Top Header Skeleton */}
      <header className="h-14 shrink-0 border-b border-border bg-card px-3 sm:px-6 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-24 rounded-full bg-primary/10" />
          <div className="hidden sm:block h-3 w-px bg-border" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full bg-primary/10 border border-primary/20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        {/* Left Column: Navigator & Actions Sidebar (Desktop) */}
        <aside className="hidden md:flex w-64 xl:w-72 border-r border-border bg-card p-4 flex-col justify-between shrink-0 h-full space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {Array.from({ length: 25 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t border-border">
            <Skeleton className="h-10 w-full rounded-xl bg-primary/20" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </aside>

        {/* Center Column: Question & Options Display */}
        <main className="flex-1 min-w-0 h-full flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-5">
          {/* Question Metadata Header */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full bg-primary/10" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>

          {/* Question Text */}
          <div className="space-y-2.5 py-3">
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>

          {/* Option Cards */}
          <div className="space-y-3 pt-2 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-2xs"
              >
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>
            ))}
          </div>

          {/* Bottom Navigation Toolbar */}
          <div className="flex items-center justify-between pt-6 border-t border-border mt-auto">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl bg-primary/80" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
