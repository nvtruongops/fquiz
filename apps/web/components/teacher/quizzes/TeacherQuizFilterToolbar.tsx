'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'

interface TeacherQuizFilterToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function TeacherQuizFilterToolbar({
  searchQuery,
  onSearchChange,
}: TeacherQuizFilterToolbarProps) {
  return (
    <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-xs">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search by quiz title or course code..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-0 bg-transparent focus-visible:ring-0 text-sm text-card-foreground"
        />
      </div>
    </div>
  )
}
