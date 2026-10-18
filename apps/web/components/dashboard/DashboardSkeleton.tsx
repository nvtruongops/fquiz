import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 pb-20 font-sans sm:p-6 md:p-8 lg:pb-8">
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

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section className="order-1 min-w-0 space-y-5 lg:col-span-8" aria-hidden="true">
          <div className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-4 w-48 max-w-full rounded" />
            </div>
            <Skeleton className="hidden h-11 w-32 rounded-xl sm:block" />
          </div>

          <div className="space-y-3 overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="flex gap-3 overflow-hidden px-0.5 pb-3.5 pt-1.5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex min-h-[60px] w-[160px] shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-2.5 w-10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        <aside className="order-2 min-w-0 lg:col-span-4" aria-hidden="true">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-14 rounded-md" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-border/60 p-3">
                    <Skeleton className="h-4 w-4/5 rounded" />
                    <Skeleton className="h-3 w-2/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="order-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8" aria-hidden="true">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
