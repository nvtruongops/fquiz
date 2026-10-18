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
    <section aria-labelledby="resume-quiz-title" className="rounded-2xl border border-warning-border bg-card p-5 text-foreground sm:p-6">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-warning-bg">
            <Flame aria-hidden="true" className="h-5 w-5 text-warning-fg" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-warning-border bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning-fg">
                  In progress
                </span>
                <span className="truncate text-xs font-medium text-muted-foreground">{item.quizCode}</span>
              </div>
              <h2 id="resume-quiz-title" className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {item.quizTitle}
              </h2>
            </div>
            {totalCount > 0 && (
              <div className="max-w-xl space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="shrink-0 font-medium tabular-nums">{answeredCount} of {totalCount} answered</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Quiz progress"
                  aria-valuemin={0}
                  aria-valuemax={totalCount}
                  aria-valuenow={Math.min(answeredCount, totalCount)}
                >
                  <div
                    className="h-full rounded-full bg-warning-fg"
                    style={{ width: `${Math.min(100, Math.round((answeredCount / totalCount) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Button asChild size="sm" className="h-11 min-h-[44px] w-full shrink-0 rounded-xl px-5 font-semibold shadow-sm shadow-primary/25 sm:w-fit">
          <Link href={resumeHref}>
            Resume quiz <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
})
