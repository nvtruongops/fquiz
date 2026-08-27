'use client'

import React from 'react'
import { Badge } from '@/components/shared/ui/badge'
import { Clock3, History } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { Quiz } from '@/hooks/useMyQuizzes'

interface QuizStatusBadgeProps {
  quiz: Quiz
  hasAttempt: boolean
  isPassed: boolean
  scoreOnTen: number
  totalStudyMinutes: number
  isSourceLocked: boolean
}

export function QuizStatusBadge({
  quiz,
  hasAttempt,
  isPassed,
  scoreOnTen,
  totalStudyMinutes,
  isSourceLocked,
}: QuizStatusBadgeProps) {
  if (hasAttempt) {
    return (
      <div className={isPassed ? 'text-success' : 'text-destructive'}>
        <p className="text-[10px] font-black uppercase tracking-wider">Đã làm</p>
        <p className="text-base sm:text-lg font-black leading-tight">
          {scoreOnTen.toFixed(2)}/10{' '}
          <span className="text-xs font-bold">
            ({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
          <Clock3 className="h-3 w-3 text-primary" />
          Đã học: {totalStudyMinutes} phút
        </p>
      </div>
    )
  }

  if (quiz.is_temp) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Chưa làm</span>
      </div>
    )
  }

  if (quiz.is_saved_from_explore) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'font-black text-[9px] px-2 py-0.5 rounded-md',
          isSourceLocked
            ? 'border-destructive/20 bg-destructive/10 text-destructive'
            : 'border-success/20 bg-success/10 text-success'
        )}
      >
        <History className="w-2.5 h-2.5 mr-1" /> {isSourceLocked ? 'NGUỒN ĐÃ BỊ ĐÓNG' : 'AUTO-SYNC'}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-draft-dot rounded-full animate-pulse" />
      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Bản nháp</span>
    </div>
  )
}
