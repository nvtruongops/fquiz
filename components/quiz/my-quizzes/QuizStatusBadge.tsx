'use client'

import React from 'react'
import { Badge } from '@/components/shared/ui/badge'
import { Shuffle, Clock3, History } from 'lucide-react'
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
  if (quiz.is_temp) {
    return (
      <Badge variant="outline" className="font-black text-[9px] px-2 py-0.5 rounded-md border-[#5D7B6F] bg-[#5D7B6F]/10 text-[#5D7B6F]">
        <Shuffle className="w-2.5 h-2.5 mr-1" /> QUIZ TRỘN
      </Badge>
    )
  }

  if (hasAttempt) {
    return (
      <div className={isPassed ? 'text-[#166534]' : 'text-[#B91C1C]'}>
        <p className="text-[10px] font-black uppercase tracking-wider">Đã làm</p>
        <p className="text-base sm:text-lg font-black leading-tight">
          {scoreOnTen.toFixed(2)}/10{' '}
          <span className="text-xs font-bold">
            ({quiz.latestCorrectCount}/{quiz.latestTotalCount ?? quiz.questionCount})
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-gray-500">
          <Clock3 className="h-3 w-3 text-[#5D7B6F]" />
          Đã học: {totalStudyMinutes} phút
        </p>
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
            ? 'border-red-100 bg-red-50/60 text-red-600'
            : 'border-green-100 bg-green-50/50 text-green-600'
        )}
      >
        <History className="w-2.5 h-2.5 mr-1" /> {isSourceLocked ? 'NGUỒN ĐÃ BỊ ĐÓNG' : 'AUTO-SYNC'}
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Bản nháp</span>
    </div>
  )
}
