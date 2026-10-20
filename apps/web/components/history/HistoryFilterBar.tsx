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

function HistoryFilterButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5',
        selected ? 'bg-card text-foreground shadow-2xs font-black' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function toggleFilter<T extends string>(current: T, value: T, all: T, onChange: (next: T) => void) {
  onChange(current === value ? all : value)
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
          aria-label="Search quiz history"
          placeholder="Search quiz code, title, or subject..."
          className="pl-10 h-10 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary text-xs transition-all shadow-none"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Flat Segmented Filter Buttons */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 shrink-0 overflow-x-auto scrollbar-none">
        <HistoryFilterButton
          selected={statusFilter === 'all' && modeFilter === 'all'}
          onClick={() => {
            onStatusFilterChange('all')
            onModeFilterChange('all')
          }}
        >
          All
        </HistoryFilterButton>
        <HistoryFilterButton
          selected={statusFilter === 'completed'}
          onClick={() => toggleFilter(statusFilter, 'completed', 'all', onStatusFilterChange)}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Completed</span>
        </HistoryFilterButton>
        <HistoryFilterButton
          selected={statusFilter === 'active'}
          onClick={() => toggleFilter(statusFilter, 'active', 'all', onStatusFilterChange)}
        >
          <AlertCircle className="w-3.5 h-3.5 text-warning-fg" />
          <span>In Progress</span>
        </HistoryFilterButton>
        <HistoryFilterButton
          selected={modeFilter === 'flashcard'}
          onClick={() => toggleFilter(modeFilter, 'flashcard', 'all', onModeFilterChange)}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Flashcard</span>
        </HistoryFilterButton>
      </div>
    </div>
  )
}
