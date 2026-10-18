import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function QuizResultSkeleton() {
  return (
    <div className="w-full max-w-full min-h-[calc(100vh-4rem)] md:h-full flex flex-col gap-3 overflow-hidden px-1 sm:px-0">
      {/* Top Header Summary Card Skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-2xs border border-border p-3.5 sm:px-5 sm:py-3.5 shrink-0 space-y-3">
        {/* Top Summary Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <Skeleton className="h-8 w-14 rounded-lg bg-primary/10" />
              <span className="text-xs font-bold text-muted-foreground">/10</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-40 rounded-md" />
            </div>
          </div>

          <Skeleton className="h-6 w-20 rounded-full bg-primary/10" />
        </div>

        {/* Action Buttons Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border/70">
          <Skeleton className="h-9 sm:h-8 w-full sm:w-40 rounded-xl" />
          <Skeleton className="h-9 sm:h-8 w-full sm:w-44 rounded-xl bg-primary/20" />
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-9 sm:h-8 w-full sm:w-28 rounded-xl" />
            <Skeleton className="h-9 sm:h-8 w-full sm:w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Main Content Area: Interactive Question Matrix & Detail Viewer Skeleton */}
      <div className="w-full max-w-full h-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch overflow-hidden">
        {/* Left Panel: Compact Question Matrix & Filters (md:col-span-3) */}
        <div className="md:col-span-3 lg:col-span-3 xl:col-span-3 bg-card rounded-2xl p-3 sm:p-3.5 shadow-2xs border border-border flex flex-col h-auto md:h-full min-h-0 overflow-hidden shrink-0 space-y-3">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 rounded-xs" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <Skeleton className="h-4 w-8 rounded-md" />
          </div>

          {/* Filter Pills Skeleton */}
          <div className="grid grid-cols-2 gap-1.5">
            <Skeleton className="h-7 rounded-lg" />
            <Skeleton className="h-7 rounded-lg" />
            <Skeleton className="h-7 rounded-lg" />
            <Skeleton className="h-7 rounded-lg" />
          </div>

          {/* Question Grid Matrix Skeleton */}
          <div className="flex-1 min-h-[160px] overflow-hidden">
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {Array.from({ length: 25 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Question Detail Card Skeleton (md:col-span-9) */}
        <div className="md:col-span-9 lg:col-span-9 xl:col-span-9 bg-card rounded-2xl p-4 sm:p-6 shadow-2xs border border-border flex flex-col h-auto md:h-full min-h-0 overflow-hidden space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>

          {/* Question Text */}
          <div className="space-y-2 py-2">
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>

          {/* Options List */}
          <div className="space-y-2.5 flex-1">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          {/* Explanation Box Skeleton */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-4/5 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
