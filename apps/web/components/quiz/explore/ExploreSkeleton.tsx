'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function ExploreSkeleton() {
  return (
    <div className="w-full space-y-4 sm:space-y-8 font-sans text-foreground">
      {/* 1. Search Bar Skeleton */}
      <div className="max-w-xl mx-auto w-full px-2 sm:px-0">
        <div className="h-10 sm:h-12 w-full rounded-full bg-card border border-border px-4 flex items-center gap-3 shadow-xs">
          <Skeleton className="w-4 h-4 rounded-full shrink-0" />
          <Skeleton className="h-3.5 flex-1 rounded-md" />
        </div>
      </div>

      {/* 2. Category Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-border bg-card flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
              <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <Skeleton className="w-8 h-8 rounded-xl shrink-0 ml-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
