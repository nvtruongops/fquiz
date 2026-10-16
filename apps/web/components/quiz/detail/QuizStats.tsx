'use client'

import React from 'react'
import { HelpCircle, Users } from 'lucide-react'

interface QuizStatsProps {
  numQuestions: number
  numAttempts: number
}

export function QuizStats({ numQuestions, numAttempts }: QuizStatsProps) {
  return (
    <div className="inline-flex items-center gap-1.5 sm:gap-2 flex-wrap">
      {/* Total Questions */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border border-border bg-card shadow-xs text-xs font-bold transition-colors">
        <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <HelpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Questions:</span>
          <span className="font-black text-foreground text-xs sm:text-sm">{numQuestions}</span>
          <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase">items</span>
        </div>
      </div>

      {/* Total Attempts */}
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border border-border bg-card shadow-xs text-xs font-bold transition-colors">
        <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Attempts:</span>
          <span className="font-black text-foreground text-xs sm:text-sm">{numAttempts ?? 0}</span>
          <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase">plays</span>
        </div>
      </div>
    </div>
  )
}
