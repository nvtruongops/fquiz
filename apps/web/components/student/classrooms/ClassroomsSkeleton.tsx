'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function ClassroomsSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background relative overflow-hidden px-4 sm:px-6 md:px-10 pt-4 pb-12 animate-pulse font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Header Banner Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 sm:p-7 rounded-3xl border border-border shadow-xs">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-8 w-64 sm:w-80 rounded-xl" />
            <Skeleton className="h-4 w-full max-w-xl rounded-md" />
          </div>
          <Skeleton className="h-12 w-full sm:w-56 rounded-2xl shrink-0" />
        </div>

        {/* 2. Main 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Classrooms List */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>

            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-border rounded-2xl bg-card p-4 flex items-start justify-between gap-2 shadow-xs">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="w-6 h-6 rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Assignments List */}
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border border-border p-5 rounded-2xl bg-card shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-56 sm:w-72 rounded-lg" />
                      <Skeleton className="h-3.5 w-full max-w-md rounded-md" />
                      <Skeleton className="h-3.5 w-40 rounded-md" />
                    </div>
                    <Skeleton className="h-7 w-28 rounded-full shrink-0" />
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-9 w-32 rounded-xl shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
