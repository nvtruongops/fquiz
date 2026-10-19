'use client'

import React from 'react'
import { Search, CheckCircle2, AlertCircle, GraduationCap } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { cn } from '@/lib/core/utils/cn'
import type { FilterStatus, FilterMode } from '@/hooks/useStudentHistory'

interface HistoryFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: FilterStatus
  onStatusFilterChange: (status: FilterStatus) => void
  modeFilter: FilterMode
  onModeFilterChange: (mode: FilterMode) => void
}

export function HistoryFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  modeFilter,
  onModeFilterChange,
}: HistoryFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-2xs">
      {/* Search Box */}
      <div className="relative flex-1 group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search quiz code, title, or subject..."
          className="pl-10 h-10 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary text-xs transition-all shadow-none"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Flat Segmented Filter Buttons */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 shrink-0 overflow-x-auto scrollbar-none">
        <button
          type="button"
          aria-pressed={statusFilter === 'all' && modeFilter === 'all'}
          onClick={() => {
            onStatusFilterChange('all')
            onModeFilterChange('all')
          }}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0',
            statusFilter === 'all' && modeFilter === 'all'
              ? 'bg-card text-foreground shadow-2xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'completed'}
          onClick={() => onStatusFilterChange(statusFilter === 'completed' ? 'all' : 'completed')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
            statusFilter === 'completed'
              ? 'bg-card text-foreground shadow-2xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Completed</span>
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'active'}
          onClick={() => onStatusFilterChange(statusFilter === 'active' ? 'all' : 'active')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
            statusFilter === 'active'
              ? 'bg-card text-foreground shadow-2xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <AlertCircle className="w-3.5 h-3.5 text-warning-fg" />
          <span>In Progress</span>
        </button>
        <button
          type="button"
          aria-pressed={modeFilter === 'flashcard'}
          onClick={() => onModeFilterChange(modeFilter === 'flashcard' ? 'all' : 'flashcard')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
            modeFilter === 'flashcard'
              ? 'bg-card text-foreground shadow-2xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Flashcard</span>
        </button>
      </div>
    </div>
  )
}
