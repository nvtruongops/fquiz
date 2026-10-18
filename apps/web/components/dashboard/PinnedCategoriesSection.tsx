'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Pin } from 'lucide-react'
import type { PinnedCategoryItem } from '@/hooks/useStudentDashboard'

interface PinnedCategoriesSectionProps {
  categories: PinnedCategoryItem[]
}

export const PinnedCategoriesSection = React.memo(function PinnedCategoriesSection({ categories }: PinnedCategoriesSectionProps) {
  if (!categories || categories.length === 0) return null

  return (
    <section aria-labelledby="pinned-subjects-title" className="w-full space-y-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pinned-subjects-title" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
          <Pin aria-hidden="true" className="h-4 w-4 fill-accentRole-learning text-accentRole-learning" /> Pinned subjects
        </h2>
        <Link href="/explore" className="flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Manage pins
        </Link>
      </div>
      <div
        className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-0.5 pb-3.5 pt-1.5 touch-pan-x scrollbar-thin custom-scrollbar sm:gap-3.5"
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`}
            className="group flex min-h-[68px] min-w-[168px] max-w-[220px] shrink-0 snap-start items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={cat.name}
          >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <BookOpen aria-hidden="true" className="w-4 h-4 text-primary transition-colors" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold tracking-tight text-foreground group-hover:text-primary">
                {cat.name}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {cat.quizCount} quizzes
              </span>
            </span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          </Link>
        ))}
        {/* Trailing spacer to prevent last card from clipping on right edge when scrolling */}
        <div className="w-3 shrink-0 pointer-events-none" aria-hidden="true" />
      </div>
    </section>
  )
})
