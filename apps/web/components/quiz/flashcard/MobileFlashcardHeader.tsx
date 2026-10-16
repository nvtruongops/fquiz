'use client'

import * as React from 'react'
import { Menu, XCircle } from 'lucide-react'

interface MobileFlashcardHeaderProps {
  categoryName?: string
  courseCode?: string
  title?: string
  stats: { known: number; unknown: number }
  actualIndex: number
  effectiveTotal: number
  onOpenQuestionMap: () => void
  onOpenExitConfirm: () => void
}

export function MobileFlashcardHeader({
  categoryName,
  courseCode,
  title,
  stats,
  actualIndex,
  effectiveTotal,
  onOpenQuestionMap,
  onOpenExitConfirm,
}: Readonly<MobileFlashcardHeaderProps>) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card text-card-foreground shadow-xs flex-none">
      <div className="flex items-center justify-between px-3 py-3">
        {/* Left: Menu & Quiz Code */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenQuestionMap}
            className="h-11 w-11 rounded-2xl bg-muted text-primary hover:bg-muted/80 flex items-center justify-center shrink-0 border border-border cursor-pointer transition-colors"
            title="Question list"
          >
            <Menu className="h-5 w-5 text-primary" strokeWidth={2.2} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground truncate leading-none mb-0.5">
              {categoryName}
            </p>
            <p className="text-sm font-black text-primary truncate max-w-[150px] leading-tight">
              {courseCode || title}
            </p>
          </div>
        </div>

        {/* Right: Progress Stats, Counter & Exit Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center text-xs font-black tracking-tight">
              <span className="text-success-fg font-black">{stats.known} Known</span>
              <span className="text-muted-foreground font-normal mx-1">|</span>
              <span className="text-destructive font-black">{stats.unknown} Unknown</span>
            </div>
            <p className="text-[11px] font-bold text-primary mt-0.5">
              {actualIndex + 1}/{effectiveTotal} cards
            </p>
          </div>

          <button
            onClick={onOpenExitConfirm}
            className="h-11 w-11 rounded-full bg-incorrect-bg hover:bg-incorrect-bg/80 text-destructive flex items-center justify-center shrink-0 cursor-pointer transition-colors border border-incorrect-border ml-1"
            title="Exit"
          >
            <XCircle className="h-6 w-6 text-destructive" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Top Progress Line */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((actualIndex + 1) / (effectiveTotal || 1)) * 100}%` }}
        />
      </div>
    </header>
  )
}
