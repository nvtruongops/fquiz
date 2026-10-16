import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function QuizDetailSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-emerald-500/5 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-3 sm:px-6 py-4 sm:py-8 pb-40 md:pb-32 max-w-7xl mx-auto w-full">
        {/* Back Navigation Bar & Quick Stats Skeleton */}
        <div className="w-full mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Skeleton className="h-8 sm:h-9 w-24 sm:w-28 rounded-xl sm:rounded-2xl" />
            <Skeleton className="h-8 sm:h-9 w-28 sm:w-32 rounded-xl sm:rounded-2xl" />
            <Skeleton className="h-8 sm:h-9 w-28 sm:w-32 rounded-xl sm:rounded-2xl" />
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
          {/* Left Column (8 cols): Header & History */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-8 order-1 lg:order-1">
            {/* Header Card Skeleton */}
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-28 rounded-full bg-primary/10" />
                <div className="h-3 w-px bg-border" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <Skeleton className="h-8 sm:h-10 w-3/4 rounded-xl" />
              <div className="border-l-2 border-primary/20 py-0.5 pl-4 sm:pl-8 space-y-1.5">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            </div>

            {/* History Table Skeleton (Desktop) */}
            <div className="hidden lg:flex flex-col gap-5 sm:gap-6 bg-card backdrop-blur-md border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-36 rounded-md" />
                    <Skeleton className="h-3 w-56 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>

              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-card p-3 sm:p-3.5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-2.5 h-2.5 rounded-full" />
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-32 rounded-md ml-4" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-16 rounded-md" />
                      <Skeleton className="h-8 w-24 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Action Card only (no dangling stats card) */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-8 lg:sticky lg:top-24 h-fit order-2 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
              {/* Header */}
              <div className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 rounded-md mt-1.5" />
              </div>

              {/* Feature Badges (2 small cards) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 sm:p-2.5">
                  <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <Skeleton className="h-2.5 w-16 rounded" />
                    <Skeleton className="h-2 w-12 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 sm:p-2.5">
                  <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <Skeleton className="h-2.5 w-16 rounded" />
                    <Skeleton className="h-2 w-12 rounded" />
                  </div>
                </div>
              </div>

              {/* Mode Selection (3 cards) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              </div>

              {/* Order Selection (2 cards) */}
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-11 rounded-xl" />
                  <Skeleton className="h-11 rounded-xl" />
                </div>
              </div>

              {/* Start Button */}
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl bg-primary/80" />
            </div>
          </div>

          {/* Mobile History Skeleton */}
          <div className="lg:hidden order-3 w-full">
            <div className="flex flex-col gap-4 bg-card backdrop-blur-md border border-border rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Skeleton className="w-8 h-8 rounded-xl" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
