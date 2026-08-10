'use client'

import React from 'react'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function MyQuizzesSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 sm:p-6 sm:pb-10 space-y-6 animate-pulse overflow-x-hidden">
      {/* 1. Header Hero Card Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-xs overflow-hidden">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
          <Skeleton className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-6 w-36 sm:w-44 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              <Skeleton className="h-5 w-32 rounded-full shrink-0" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-sm rounded-md" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <Skeleton className="h-10 w-full sm:w-36 rounded-2xl" />
          <Skeleton className="h-10 w-full sm:w-32 rounded-2xl" />
        </div>
      </div>

      {/* 2. Category Filter Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-hidden pt-1 pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 sm:w-32 rounded-full shrink-0" />
        ))}
      </div>

      {/* 3. Search & Tab Switcher Bar Skeleton */}
      <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <Skeleton className="h-10 w-full sm:max-w-md rounded-2xl" />
        <Skeleton className="h-10 w-full sm:w-64 rounded-2xl" />
      </div>

      {/* 4. Quiz Cards List Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="w-full border border-border rounded-xl sm:rounded-2xl overflow-hidden bg-card shadow-xs">
            <CardContent className="p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-48 sm:w-64 rounded-lg" />
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                </div>
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border justify-between sm:justify-end">
                  <Skeleton className="w-24 h-9 rounded-xl" />
                  <Skeleton className="w-24 h-9 rounded-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
