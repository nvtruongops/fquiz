'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 font-sans text-foreground pb-24 sm:pb-10 p-4 sm:p-6 md:p-8 animate-pulse overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Main Column: Header, Pinned Categories, Learning Studio Grid */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* 1. Header Greeting Hero Skeleton */}
          <div className="glass-card-elevated p-4 sm:p-6 rounded-[28px] border border-strong shadow-lg shadow-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full w-full overflow-hidden">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shrink-0 ring-4 ring-primary/20" />
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-36 sm:w-52 rounded-xl" />
                  <Skeleton className="h-5 w-20 sm:w-24 rounded-full shrink-0" />
                </div>
                <Skeleton className="h-3.5 sm:h-4 w-full max-w-[280px] rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl shrink-0 hidden sm:block" />
          </div>

          {/* 2. Pinned Categories Section Skeleton */}
          <div className="space-y-3 w-full overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                <Skeleton className="h-4 w-32 sm:w-36 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-16 sm:w-20 rounded-md shrink-0" />
            </div>
            <div className="flex gap-3 overflow-x-hidden pt-1.5 pb-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl glass-card border border-subtle shrink-0 w-[150px] sm:w-[180px]"
                >
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-3.5 w-full max-w-[70px] rounded-md" />
                    <Skeleton className="h-2.5 w-10 rounded-md" />
                  </div>
                  <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Learning Studio Grid Skeleton */}
          <div className="space-y-4 w-full overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                <Skeleton className="h-4 w-48 sm:w-60 rounded-md" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Bento 1: Khám Phá Đề Thi */}
              <div className="sm:col-span-7 glass-card rounded-[28px] p-5 sm:p-6 border border-subtle min-h-[200px] flex flex-col justify-between space-y-4 overflow-hidden">
                <div className="space-y-3.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
                    <Skeleton className="h-5 w-28 sm:w-32 rounded-full shrink-0" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Skeleton className="h-5 w-44 sm:w-52 rounded-lg max-w-full" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                    <Skeleton className="h-3.5 w-3/4 rounded-md" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Skeleton className="h-5 w-20 sm:w-24 rounded-md" />
                    <Skeleton className="h-5 w-24 sm:w-28 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-10 w-32 sm:w-36 rounded-xl mt-4 shrink-0" />
              </div>

              {/* Bento 2: AI Studio / Community */}
              <div className="sm:col-span-5 glass-card rounded-[28px] p-5 sm:p-6 border border-subtle min-h-[200px] flex flex-col justify-between space-y-4 overflow-hidden">
                <div className="space-y-3.5 min-w-0">
                  <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
                  <div className="space-y-2 min-w-0">
                    <Skeleton className="h-5 w-36 sm:w-40 rounded-lg max-w-full" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                    <Skeleton className="h-3.5 w-4/5 rounded-md" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-4 w-12 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-10 w-32 sm:w-36 rounded-xl mt-4 shrink-0" />
              </div>

              {/* Bento 3: Community Forum */}
              <div className="sm:col-span-6 glass-card rounded-[28px] p-5 sm:p-6 border border-subtle min-h-[180px] flex flex-col justify-between space-y-4 overflow-hidden">
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
                    <Skeleton className="h-5 w-24 sm:w-28 rounded-full shrink-0" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Skeleton className="h-5 w-40 sm:w-44 rounded-lg max-w-full" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-10 w-32 rounded-xl mt-4 shrink-0" />
              </div>

              {/* Bento 4: CEFR Language Pathway */}
              <div className="sm:col-span-6 glass-card rounded-[28px] p-5 sm:p-6 border border-subtle min-h-[180px] flex flex-col justify-between space-y-4 overflow-hidden">
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-4 w-4 sm:w-5 rounded" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Skeleton className="h-5 w-44 sm:w-48 rounded-lg max-w-full" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-10 w-32 sm:w-36 rounded-xl mt-4 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column: Recent Activities Feed Skeleton */}
        <div className="lg:col-span-4 h-full sticky top-6 min-w-0 w-full">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-subtle flex flex-col h-full space-y-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-subtle pb-2.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
                <Skeleton className="h-4 w-32 sm:w-36 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-16 rounded-md shrink-0" />
            </div>

            {/* List */}
            <div className="space-y-2.5 flex-1 pt-0.5 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 min-w-0">
                  <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-subtle bg-surface-card overflow-hidden">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Skeleton className="h-3.5 w-full max-w-[140px] sm:max-w-[180px] rounded" />
                      <Skeleton className="h-2.5 w-20 sm:w-24 rounded" />
                    </div>
                    <Skeleton className="h-5 w-10 sm:w-12 rounded-full shrink-0 ml-2" />
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


