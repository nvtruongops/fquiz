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
    <div
      className="relative overflow-hidden rounded-[28px] bg-card text-foreground p-5 sm:p-6 border border-border hover:border-ring shadow-sm flex flex-col justify-between gap-4 select-none h-full w-full group transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01]"
    >
      {/* Ambient Soft Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-xl pointer-events-none opacity-50" />

      <div className="flex items-start gap-3.5 min-w-0 relative z-10">
        <div className="w-11 h-11 rounded-2xl bg-warning-bg border border-warning-border flex items-center justify-center shrink-0 shadow-xs">
          <Flame aria-hidden="true" className="w-6 h-6 text-warning-fg group-hover:scale-110 transition-transform duration-200" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-warning-fg bg-warning-bg px-2.5 py-0.5 rounded-full border border-warning-border">
              In Progress • {item.quizCode}
            </span>
            {totalCount > 0 ? (
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border/40">
                {answeredCount}/{totalCount} answered
              </span>
            ) : null}
          </div>
          <h3 className="text-sm font-black truncate text-foreground leading-tight">{item.quizTitle}</h3>
        </div>
      </div>

      <Button asChild size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground font-black rounded-xl text-xs h-11 px-5 w-full sm:w-fit shrink-0 shadow-xs relative z-10 transition-colors mt-2 active:scale-[0.98]">
        <Link href={resumeHref}>
          Resume Quiz <ArrowRight aria-hidden="true" className="w-4 h-4 ml-1.5" />
        </Link>
      </Button>
    </div>
  )
})
