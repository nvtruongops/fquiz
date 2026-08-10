'use client'

import React from 'react'
import { Skeleton } from '@/components/shared/ui/skeleton'

export function CommunitySkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] relative animate-pulse font-sans text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-1 sm:pt-2 md:pt-3 pb-6 md:pb-10 space-y-6 sm:space-y-8 overflow-x-hidden">
        {/* 1. Header Hero Card Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 sm:p-7 rounded-3xl border border-border shadow-xs">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-8 w-56 sm:w-72 rounded-xl" />
            <Skeleton className="h-4 w-full max-w-lg rounded-md" />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <Skeleton className="h-10 w-full sm:w-36 rounded-2xl" />
            <Skeleton className="h-10 w-full sm:w-44 rounded-2xl" />
          </div>
        </div>

        {/* 2. Search & Filter Bar Skeleton */}
        <div className="bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
          <div className="flex items-center gap-2 overflow-x-hidden pt-1 sm:pt-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full shrink-0" />
            ))}
          </div>
        </div>

        {/* 3. 2-Column Grid Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Feed Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <Skeleton className="h-5 w-48 rounded-lg" />
            </div>

            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3.5 w-2/3 rounded-md" />
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                  <Skeleton className="h-4 w-12 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Top Contributors Card Skeleton */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                      <Skeleton className="h-2.5 w-16 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Tags Card Skeleton */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-xs">
              <Skeleton className="h-5 w-36 rounded-lg" />
              <div className="flex flex-wrap gap-2 pt-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
