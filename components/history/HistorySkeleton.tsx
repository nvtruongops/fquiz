'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function HistorySkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Date Group 1: Hôm nay */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <Skeleton className="h-3.5 w-24 rounded-full" />
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="space-y-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-md shrink-0" />
                    <Skeleton className="h-5 w-44 sm:w-60 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-24 rounded-md" />
                    <Skeleton className="h-3.5 w-20 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="space-y-1 text-right">
                  <Skeleton className="h-5 w-16 rounded-md ml-auto" />
                  <Skeleton className="h-3 w-20 rounded-md ml-auto" />
                </div>
                <Skeleton className="h-8 w-24 rounded-xl" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date Group 2: Hôm qua */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3 px-1">
          <Skeleton className="h-3.5 w-28 rounded-full" />
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="space-y-3.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-md shrink-0" />
                    <Skeleton className="h-5 w-48 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-24 rounded-md" />
                    <Skeleton className="h-3.5 w-20 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="space-y-1 text-right">
                  <Skeleton className="h-5 w-16 rounded-md ml-auto" />
                  <Skeleton className="h-3 w-20 rounded-md ml-auto" />
                </div>
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
