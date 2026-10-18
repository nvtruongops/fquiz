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
    <section aria-labelledby="pinned-subjects-title" className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h2 id="pinned-subjects-title" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <Pin aria-hidden="true" className="h-4 w-4 text-primary" />
          Pinned subjects
        </h2>
        <Link
          href="/explore"
          className="flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Manage
        </Link>
      </header>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/courses/${encodeURIComponent(category.name.toLowerCase())}`}
              title={category.name}
              className="group flex min-h-16 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{category.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {category.quizCount} {category.quizCount === 1 ? 'quiz' : 'quizzes'}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
})
