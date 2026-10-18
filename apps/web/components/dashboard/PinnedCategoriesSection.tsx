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
    <section className="space-y-3 w-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-tertiary flex items-center gap-2">
          <Pin aria-hidden="true" className="w-4 h-4 text-accentRole-learning fill-accentRole-learning" /> Pinned Subjects
        </h2>
        <Link href="/explore" className="text-[11px] font-bold text-text-tertiary hover:text-foreground transition-colors">
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
            className="group flex min-h-[60px] min-w-[150px] max-w-[200px] shrink-0 snap-start items-center gap-2.5 rounded-xl border border-subtle bg-card px-3.5 py-3 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={cat.name}
          >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <BookOpen aria-hidden="true" className="w-4 h-4 text-primary transition-colors" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold uppercase tracking-tight text-foreground group-hover:text-primary">
                {cat.name}
              </span>
              <span className="block text-[10px] font-bold text-text-tertiary mt-0.5">
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
