import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 pb-24 font-sans sm:p-6 md:p-8 lg:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
        <div className="flex items-center gap-2 self-start">
          <Skeleton className="h-11 w-36 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-xl" />
        </div>
      </div>

      <div className="space-y-7" aria-hidden="true">
        <div className="flex min-h-[144px] items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3 w-36 rounded" />
            <Skeleton className="h-6 w-56 max-w-full rounded" />
            <Skeleton className="h-2 w-full max-w-xl rounded" />
          </div>
          <Skeleton className="hidden h-11 w-32 rounded-xl sm:block" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-11 w-24 rounded-lg" />
          </div>
          <div className="flex gap-3 overflow-hidden px-0.5 pb-3.5 pt-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex min-h-[68px] w-[168px] shrink-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-2.5 w-10 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-3 w-64 max-w-full rounded" />
              </div>
            </div>
            <Skeleton className="h-11 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex min-h-[156px] items-start gap-3 rounded-xl border border-border bg-card p-4">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-4 w-4/5 rounded" />
                  <Skeleton className="h-3 w-2/5 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
