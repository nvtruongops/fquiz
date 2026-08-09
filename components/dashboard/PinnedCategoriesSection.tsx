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
    <section className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Pin className="w-4 h-4 text-primary fill-primary" /> Môn Học Đã Ghim
        </h2>
        <Link href="/explore" className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors">
          Quản lý ghim
        </Link>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-2 pb-3 scrollbar-thin">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`}
            className="group relative flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl bg-card border border-border shadow-2xs hover:border-ring hover:shadow-md hover:-translate-y-0.5 hover:z-10 active:scale-[0.98] transition-all duration-200 shrink-0"
          >
            <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <BookOpen className="w-4 h-4 text-primary transition-colors" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black text-card-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                {cat.name}
              </span>
              <span className="block text-[10px] font-bold text-muted-foreground">
                {cat.quizCount} đề thi
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </Link>
        ))}
      </div>
    </section>
  )
})
