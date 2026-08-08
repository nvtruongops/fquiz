'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Flame } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface IncompleteSessionBannerProps {
  item: ActivityItem
}

export const IncompleteSessionBanner = React.memo(function IncompleteSessionBanner({ item }: IncompleteSessionBannerProps) {
  const resumeSessionId = item.activeSessionId || item.id
  const isFlashcardMode = item.mode === 'flashcard'
  const resumeHref = `/quiz/${item.quizId}/session/${resumeSessionId}${isFlashcardMode ? '/flashcard' : ''}`
  const answeredCount = item.hasActiveSession ? (item.activeAnsweredCount ?? 0) : (item.correctCount ?? 0)
  const totalCount = item.hasActiveSession ? (item.activeTotalCount ?? 0) : (item.totalCount ?? 0)

  return (
    <div className="overflow-hidden rounded-[24px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-md transform-gpu hover:scale-[1.005] transition-all">
      <div className="bg-slate-900/95 backdrop-blur-xl px-5 py-4 rounded-[22px] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-400 animate-bounce" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                Bài thi chưa hoàn thành • {item.quizCode}
              </span>
              {totalCount > 0 ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-white/70 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                  Đã làm {answeredCount}/{totalCount} câu
                </span>
              ) : null}
            </div>
            <h3 className="text-sm sm:text-base font-black truncate text-white">{item.quizTitle}</h3>
          </div>
        </div>

        <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs h-9 px-5 shrink-0 shadow-sm">
          <Link href={resumeHref}>
            Tiếp tục ngay <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
})
