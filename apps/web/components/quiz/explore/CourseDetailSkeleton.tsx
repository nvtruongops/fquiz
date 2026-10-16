'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function CourseDetailSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-x-clip px-3 sm:px-6 md:px-8 pt-3 pb-12 font-sans text-foreground">
      {/* Background Mesh Ambient */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden -z-10 transform-gpu">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-indigo-500/5 to-transparent blur-3xl opacity-50 transform-gpu" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30 transform-gpu" />
      </div>

      <div className="max-w-7xl mx-auto space-y-5 relative z-10">
        {/* Cockpit Header Card Skeleton */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xs relative overflow-hidden space-y-2.5 sm:space-y-3.5">
          {/* Row 1: Header Identity */}
          <div className="relative z-10 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Skeleton className="min-w-[44px] min-h-[44px] rounded-xl shrink-0" />
              <Skeleton className="h-7 sm:h-9 w-40 sm:w-64 rounded-xl" />
              <Skeleton className="min-h-[44px] w-24 rounded-xl shrink-0 hidden sm:block" />
            </div>
            <Skeleton className="h-8 sm:h-9 w-28 sm:w-36 rounded-xl shrink-0" />
          </div>

          {/* Row 2: Tabs + Toolbar */}
          <div className="relative z-10 pt-2.5 sm:pt-3 border-t border-border/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
            <div className="grid grid-cols-3 sm:inline-flex p-1 rounded-xl bg-muted/60 border border-border/60 gap-1 shrink-0">
              <Skeleton className="min-h-[44px] sm:w-28 rounded-lg" />
              <Skeleton className="min-h-[44px] sm:w-24 rounded-lg" />
              <Skeleton className="min-h-[44px] sm:w-24 rounded-lg" />
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <Skeleton className="h-9 flex-1 max-w-full lg:max-w-xs rounded-xl" />
              <Skeleton className="h-8.5 sm:h-9 w-24 rounded-xl shrink-0" />
            </div>
          </div>
        </div>

        {/* Quiz Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-border bg-card shadow-xs min-h-[160px] space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <div className="flex gap-1">
                    <Skeleton className="w-7 h-7 rounded-lg" />
                    <Skeleton className="w-7 h-7 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="h-5 w-4/5 rounded-md" />
                <Skeleton className="h-3.5 w-1/2 rounded-md" />
              </div>
              <Skeleton className="h-9 w-full rounded-xl bg-primary/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default CourseDetailSkeleton
