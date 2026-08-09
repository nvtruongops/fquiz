import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function QuizDetailSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-emerald-500/5 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-7xl mx-auto w-full">
        {/* Back Navigation Bar Skeleton */}
        <div className="w-full mb-4 sm:mb-6 flex items-center justify-between">
          <Skeleton className="h-9 w-28 rounded-xl sm:rounded-2xl" />
          <Skeleton className="hidden sm:block h-8 w-36 rounded-full" />
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-8 order-1">
            {/* Header Card Skeleton */}
            <div className="bg-card backdrop-blur-md border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full bg-primary/15" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-8 sm:h-10 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            </div>

            {/* Comments Skeleton */}
            <div className="bg-card backdrop-blur-md border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-8 order-2">
            {/* Action Card Skeleton */}
            <div className="bg-card backdrop-blur-md border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-7 shadow-xs space-y-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-12 w-full rounded-2xl bg-primary/15" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
              <Skeleton className="h-12 w-full rounded-2xl bg-primary/80" />
            </div>

            {/* Stats Card Skeleton */}
            <div className="bg-card backdrop-blur-md border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-6 shadow-xs grid grid-cols-2 gap-4">
              <div className="space-y-2 text-center">
                <Skeleton className="h-8 w-12 mx-auto rounded-lg" />
                <Skeleton className="h-3 w-16 mx-auto rounded-md" />
              </div>
              <div className="space-y-2 text-center">
                <Skeleton className="h-8 w-12 mx-auto rounded-lg" />
                <Skeleton className="h-3 w-16 mx-auto rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
