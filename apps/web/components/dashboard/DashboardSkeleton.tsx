import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24 font-sans sm:p-6 md:p-8 lg:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
        <div className="flex items-center gap-2 self-start">
          <Skeleton className="h-11 w-11 rounded-lg" />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12" aria-hidden="true">
        <main className="min-w-0 space-y-5 lg:col-span-8">
          <div className="flex min-h-24 items-center gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-5 w-56 max-w-full rounded" />
              <Skeleton className="h-2 w-40 rounded" />
            </div>
            <Skeleton className="hidden h-11 w-32 rounded-lg sm:block" />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-11 w-28 rounded-lg" />
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex min-h-16 items-center gap-3 px-3 py-3 sm:px-4">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                  <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-5 lg:col-span-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-11 w-20 rounded-lg" />
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex min-h-16 items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card px-3 py-4">
            <Skeleton className="mb-2 ml-1 h-3 w-28 rounded" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="mt-1 h-11 w-full rounded-lg" />
          </section>
        </aside>
      </div>
    </div>
  )
}
