'use client'

import React from 'react'
import { HelpCircle, Users } from 'lucide-react'

interface QuizStatsProps {
  numQuestions: number
  numAttempts: number
}

export function QuizStats({ numQuestions, numAttempts }: QuizStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-6">
      <div className="group flex items-center gap-2.5 sm:gap-5 rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-6 shadow-xs transition-all hover:shadow-md">
        <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-all shrink-0">
          <HelpCircle className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 sm:mb-1.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground truncate">Quy mô</p>
          <p className="text-xs sm:text-xl font-extrabold text-foreground tracking-tight truncate">{numQuestions} <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">CÂU</span></p>
        </div>
      </div>

      <div className="group flex items-center gap-2.5 sm:gap-5 rounded-xl sm:rounded-2xl border border-border bg-card p-3 sm:p-5 shadow-xs transition-all hover:shadow-md">
        <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-all shrink-0">
          <Users className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 sm:mb-1.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground truncate">Lượt thi</p>
          <p className="text-xs sm:text-xl font-extrabold text-foreground tracking-tight truncate">{numAttempts ?? 0} <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground">LƯỢT</span></p>
        </div>
      </div>
    </div>
  )
}
