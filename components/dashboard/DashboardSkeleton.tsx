'use client'

import React from 'react'

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans text-slate-800 pb-10 p-4 sm:p-6 md:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white/90 p-5 sm:p-7 rounded-[28px] border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-64 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-2xl shrink-0" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-[24px] bg-slate-200/70 p-5 flex flex-col justify-between" />
          ))}
        </div>
        <div className="lg:col-span-4 h-96 rounded-[24px] bg-white p-5 border border-slate-200/80 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
