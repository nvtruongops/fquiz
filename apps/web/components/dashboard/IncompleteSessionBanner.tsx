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
    <section className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl border border-warning-border bg-card p-4 text-foreground sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-warning-bg">
          <Flame aria-hidden="true" className="h-5 w-5 text-warning-fg" />
        </div>
        <div className="min-w-0 space-y-1.5">
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
          <h2 className="truncate text-sm font-bold leading-tight text-foreground">{item.quizTitle}</h2>
        </div>
      </div>

      <Button asChild size="sm" className="h-11 min-h-[44px] w-full shrink-0 rounded-xl px-5 text-xs font-semibold sm:w-fit">
        <Link href={resumeHref}>
          Resume Quiz <ArrowRight aria-hidden="true" className="w-4 h-4 ml-1.5" />
        </Link>
      </Button>
    </section>
  )
})
