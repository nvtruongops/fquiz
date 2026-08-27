import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Conflict } from '@/hooks/question-bank/useQuestionBankConflicts'

interface ConflictCardProps {
  conflict: Conflict
  selected: boolean
  onClick: () => void
}

export function ConflictCard({ conflict, selected, onClick }: ConflictCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
        selected
          ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
          : 'bg-card border-border hover:bg-muted'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-medium text-card-foreground text-sm line-clamp-2">
          {conflict.text}
        </p>
        <Badge variant="destructive" className="shrink-0">
          {conflict.answer_groups.length} đáp án
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{conflict.total_variants} quiz</span>
        <span>•</span>
        <span>
          {conflict.answer_groups.reduce((sum, g) => sum + g.count, 0)} variants
        </span>
      </div>
    </div>
  )
}
