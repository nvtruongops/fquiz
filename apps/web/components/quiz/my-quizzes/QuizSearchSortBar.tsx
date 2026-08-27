'use client'

import React from 'react'
import { Input } from '@/components/shared/ui/input'
import { Search, BookmarkCheck } from 'lucide-react'

interface QuizSearchSortBarProps {
  search: string
  setSearch: (val: string) => void
  savedQuizTotal: number
}

export const QuizSearchSortBar = React.memo(function QuizSearchSortBar({
  search,
  setSearch,
  savedQuizTotal,
}: QuizSearchSortBarProps) {
  return (
    <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
      {/* Title / Badge info */}
      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <BookmarkCheck className="w-4 h-4" />
        </div>
        <span>Danh sách bộ đề đã lưu ({savedQuizTotal})</span>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã môn, tên bài..."
          className="pl-10 h-10 rounded-2xl border-2 border-input text-xs font-semibold focus:border-primary bg-card text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>
    </div>
  )
})
