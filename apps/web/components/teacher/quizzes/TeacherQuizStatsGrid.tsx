'use client'

import React from 'react'
import { FileText, HelpCircle, BookOpen } from 'lucide-react'

interface TeacherQuizStatsGridProps {
  quizCount: number
  totalQuestions: number
  categoryCount: number
}

export function TeacherQuizStatsGrid({
  quizCount,
  totalQuestions,
  categoryCount,
}: TeacherQuizStatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground block">Quizzes Created by Me</span>
          <span className="text-2xl font-black text-card-foreground">{quizCount}</span>
        </div>
      </div>
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
        <HelpCircle className="w-6 h-6 text-success-fg" />
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground block">Total Questions</span>
          <span className="text-2xl font-black text-card-foreground">{totalQuestions}</span>
        </div>
      </div>
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs flex items-center gap-4">
        <BookOpen className="w-6 h-6 text-warning-fg" />
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground block">Course Codes</span>
          <span className="text-2xl font-black text-card-foreground">{categoryCount}</span>
        </div>
      </div>
    </div>
  )
}
