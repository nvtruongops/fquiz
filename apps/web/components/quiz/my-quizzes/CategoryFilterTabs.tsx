'use client'

import React from 'react'
import { Badge } from '@/components/shared/ui/badge'
import { Category } from '@/hooks/useMyQuizzes'

interface CategoryFilterTabsProps {
  categories: Category[]
  selectedCategoryId: string | null
  setSelectedCategoryId: (id: string | null) => void
}

export const CategoryFilterTabs = React.memo(function CategoryFilterTabs({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
}: CategoryFilterTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
      <button
        onClick={() => setSelectedCategoryId(null)}
        className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 border ${
          selectedCategoryId === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-foreground border-border hover:bg-muted'
        }`}
      >
        Tất cả danh mục
      </button>

      {categories.map((cat) => (
        <button
          key={cat._id}
          onClick={() => setSelectedCategoryId(selectedCategoryId === cat._id ? null : cat._id)}
          className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 border flex items-center gap-1.5 ${
            selectedCategoryId === cat._id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:bg-muted'
          }`}
        >
          <span>{cat.name}</span>
          {cat.totalQuizCount !== undefined && (
            <Badge variant="secondary" className="px-1.5 py-0 rounded-full text-[9px] font-extrabold bg-muted text-muted-foreground">
              {cat.totalQuizCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  )
})
