'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function HistorySkeleton() {
  return (
    <main className="min-h-screen pb-20 px-3 sm:px-6 animate-pulse overflow-x-hidden">
      {/* 1. Header Banner Skeleton */}
      <div className="bg-card/80 border-b border-border -mx-3 sm:-mx-6 px-3 sm:px-6">
        <div className="w-full py-4 sm:py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-7 sm:h-9 w-48 sm:w-64 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-full md:w-80 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 2. Timeline Date Groups Skeleton */}
      <div className="w-full mt-4 sm:mt-8 space-y-6">
        {/* Date Group 1: Hôm nay */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-24 rounded-full" />
            <div className="h-px w-full bg-border/60" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl sm:rounded-3xl border border-border bg-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 flex-wrap">
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                  <Skeleton className="h-5 w-20 rounded-md shrink-0" />
                  <Skeleton className="h-4 w-32 sm:w-44 rounded-md shrink-0" />
                  <Skeleton className="h-5 w-24 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 w-36 rounded-md ml-auto hidden sm:block shrink-0" />
                </div>
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Group 2: Hôm qua */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-28 rounded-full" />
            <div className="h-px w-full bg-border/60" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl sm:rounded-3xl border border-border bg-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 flex-wrap">
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                  <Skeleton className="h-5 w-20 rounded-md shrink-0" />
                  <Skeleton className="h-4 w-36 sm:w-48 rounded-md shrink-0" />
                  <Skeleton className="h-3.5 w-36 rounded-md ml-auto hidden sm:block shrink-0" />
                </div>
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
