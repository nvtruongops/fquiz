'use client'

import React from 'react'

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans text-foreground pb-10 p-4 sm:p-6 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-card p-5 sm:p-7 rounded-[28px] border border-border flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-64 bg-muted/60 rounded-lg" />
          </div>
        </div>
        <div className="h-10 w-36 bg-muted rounded-2xl shrink-0" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-[24px] bg-card p-5 border border-border flex flex-col justify-between" />
          ))}
        </div>
        <div className="lg:col-span-4 h-96 rounded-[24px] bg-card p-5 border border-border space-y-4">
          <div className="h-5 w-32 bg-muted rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
