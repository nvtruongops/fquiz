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
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-500 fill-amber-500" /> Môn Học Đã Ghim
        </h2>
        <Link href="/explore" className="text-[11px] font-bold text-slate-400 hover:text-[#5D7B6F] transition-colors">
          Quản lý ghim
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pt-1.5 -mt-1.5 pb-2 scrollbar-thin">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/courses/${encodeURIComponent(cat.name.toLowerCase())}`}
            className="group relative flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-amber-200/70 shadow-2xs hover:border-[#5D7B6F]/60 hover:shadow-md hover:-translate-y-0.5 hover:z-10 active:scale-[0.98] transition-all duration-200 shrink-0"
          >
            <span className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 group-hover:bg-[#5D7B6F]/10 group-hover:border-[#5D7B6F]/30 transition-colors">
              <BookOpen className="w-3.5 h-3.5 text-amber-600 group-hover:text-[#5D7B6F] transition-colors" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-[#5D7B6F] transition-colors">
                {cat.name}
              </span>
              <span className="block text-[10px] font-bold text-slate-400">
                {cat.quizCount} đề thi
              </span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5D7B6F] group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  )
})
