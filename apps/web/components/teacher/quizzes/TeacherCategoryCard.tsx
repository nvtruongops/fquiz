'use client'

import React from 'react'
import { Bookmark, Trash2, X } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { CategoryItem } from '@/hooks/useTeacherQuizzes'

interface TeacherCategoryCardProps {
  category: CategoryItem
  isConfirmingDelete: boolean
  onConfirmDelete: (id: string | null) => void
  onDelete: (id: string) => void
}

export function TeacherCategoryCard({
  category,
  isConfirmingDelete,
  onConfirmDelete,
  onDelete,
}: TeacherCategoryCardProps) {
  return (
    <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Bookmark className="w-5 h-5 text-primary" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black text-card-foreground truncate">{category.name}</span>
          <span className="text-[11px] font-semibold text-muted-foreground">{category.ownQuizCount ?? 0} quizzes</span>
        </div>
      </div>
      {isConfirmingDelete ? (
        <div className="flex items-center gap-1 bg-incorrect-bg p-1.5 rounded-xl border border-incorrect-border">
          <Button
            onClick={() => onDelete(category._id)}
            size="sm"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold rounded-lg cursor-pointer"
          >
            Delete
          </Button>
          <button
            onClick={() => onConfirmDelete(null)}
            className="p-1 text-muted-foreground hover:text-card-foreground cursor-pointer"
            aria-label="Cancel delete"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onConfirmDelete(category._id)}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          aria-label="Delete category"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
