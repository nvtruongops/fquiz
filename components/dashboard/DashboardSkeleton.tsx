'use client'

import React from 'react'

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 font-sans text-foreground pb-10 p-4 sm:p-6 md:p-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Main Column: Header, Pinned Categories, Learning Studio */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Skeleton */}
          <div className="bg-card p-5 sm:p-6 rounded-[28px] border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
              <div className="space-y-2">
                <div className="h-6 w-52 bg-muted rounded-lg" />
                <div className="h-4 w-72 bg-muted/60 rounded-lg" />
              </div>
            </div>
            <div className="h-10 w-10 bg-muted rounded-2xl shrink-0" />
          </div>

          {/* Pinned Categories Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="h-4 w-40 bg-muted rounded-md" />
              <div className="h-3 w-20 bg-muted/60 rounded-md" />
            </div>
            <div className="flex gap-3 overflow-hidden pt-1 pb-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 w-48 rounded-2xl bg-card border border-border shrink-0 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-2.5 w-14 bg-muted/60 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Studio Skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-52 bg-muted rounded-md px-1" />
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 h-56 rounded-[28px] bg-card border border-border p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-muted" />
                  <div className="h-5 w-44 bg-muted rounded-md" />
                  <div className="h-3.5 w-full bg-muted/60 rounded" />
                </div>
                <div className="h-10 w-32 bg-muted rounded-xl" />
              </div>
              <div className="sm:col-span-5 h-56 rounded-[28px] bg-card border border-border p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-muted" />
                  <div className="h-5 w-36 bg-muted rounded-md" />
                  <div className="h-3.5 w-full bg-muted/60 rounded" />
                </div>
                <div className="h-10 w-32 bg-muted rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column: Recent Activities Skeleton */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-card p-5 rounded-[24px] border border-border flex flex-col space-y-4 min-h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="h-4 w-36 bg-muted rounded-md" />
              <div className="h-3 w-16 bg-muted/60 rounded-md" />
            </div>
            <div className="space-y-3 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-card border border-border p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-muted shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-36 bg-muted rounded" />
                      <div className="h-2.5 w-24 bg-muted/60 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-14 bg-muted rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
