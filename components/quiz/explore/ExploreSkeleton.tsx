'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function ExploreSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans text-foreground pb-20 p-4 sm:p-6 animate-pulse overflow-x-hidden">
      {/* 1. Search Bar & Title Skeleton */}
      <div className="space-y-4 max-w-2xl mx-auto text-center">
        <div className="flex justify-center">
          <Skeleton className="h-9 w-64 sm:w-80 rounded-2xl" />
        </div>
        <div className="h-12 w-full rounded-2xl bg-card border border-border p-2 flex items-center gap-3 shadow-xs">
          <Skeleton className="w-5 h-5 rounded-full ml-2 shrink-0" />
          <Skeleton className="h-4 flex-1 rounded-lg" />
        </div>
      </div>

      {/* 2. Pinned Categories Section Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-full shrink-0" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <Skeleton className="h-3.5 w-16 rounded-md shrink-0" />
        </div>
        <div className="flex gap-3 overflow-x-hidden pt-1 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-card border border-border shrink-0 w-[160px] sm:w-[190px] shadow-xs"
            >
              <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-full rounded-md" />
                <Skeleton className="h-2.5 w-10 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Category Grid Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-20 rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl sm:rounded-3xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
