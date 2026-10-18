'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Flame } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface DashboardPrimaryActionProps {
  item: ActivityItem | null
}

export const DashboardPrimaryAction = React.memo(function DashboardPrimaryAction({ item }: DashboardPrimaryActionProps) {
  return item ? <ResumeQuizAction item={item} /> : <StartPracticeAction />
})

function StartPracticeAction() {
  return (
    <section aria-labelledby="start-practice-title" className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Your next step</p>
            <h2 id="start-practice-title" className="mt-1 text-base font-semibold tracking-tight text-foreground">
              Start practicing
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Choose a subject and find a quiz that fits.</p>
          </div>
        </div>
        <Button asChild size="sm" className="h-11 min-h-[44px] w-full shrink-0 rounded-lg px-4 font-semibold shadow-sm shadow-primary/25 sm:w-auto">
          <Link href="/explore">
            Find a quiz <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

function ResumeQuizAction({ item }: { item: ActivityItem }) {
  const { answeredCount, totalCount, progressPercent } = getResumeProgress(item)

  return (
    <section aria-labelledby="resume-quiz-title" className="rounded-xl border border-warning-border bg-card p-4 text-foreground sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-warning-border bg-warning-bg text-warning-fg">
            <Flame aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-semibold text-warning-fg">In progress</span>
              <QuizCode item={item} />
            </div>
            <h2 id="resume-quiz-title" className="mt-1 truncate text-base font-semibold tracking-tight text-foreground">
              {item.quizTitle}
            </h2>
            <ResumeQuizProgress answeredCount={answeredCount} totalCount={totalCount} progressPercent={progressPercent} />
          </div>
        </div>

        <Button asChild size="sm" className="h-11 min-h-[44px] w-full shrink-0 rounded-lg px-4 font-semibold shadow-sm shadow-primary/25 sm:w-auto">
          <Link href={getResumeHref(item)}>
            Resume quiz <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

function QuizCode({ item }: { item: ActivityItem }) {
  if (!item.quizCode || item.quizCode === item.quizTitle) return null
  return <span className="truncate text-xs text-muted-foreground">{item.quizCode}</span>
}

function ResumeQuizProgress({
  answeredCount,
  totalCount,
  progressPercent,
}: {
  answeredCount: number
  totalCount: number
  progressPercent: number
}) {
  if (totalCount === 0) return null

  return (
    <div className="mt-2 flex items-center gap-2.5">
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {answeredCount} of {totalCount} answered
      </span>
      <div
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-valuenow={Math.min(answeredCount, totalCount)}
      >
        <div className="h-full rounded-full bg-warning-fg" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  )
}

function getResumeProgress(item: ActivityItem) {
  const active = item.hasActiveSession || item.status === 'active'
  const answeredCount = active ? (item.activeAnsweredCount ?? 0) : (item.correctCount ?? 0)
  const totalCount = active ? (item.activeTotalCount ?? 0) : (item.totalCount ?? 0)
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((answeredCount / totalCount) * 100)) : 0
  return { answeredCount, totalCount, progressPercent }
}

function getResumeHref(item: ActivityItem) {
  const sessionId = item.activeSessionId || item.id
  return `/quiz/${item.quizId}/session/${sessionId}${item.mode === 'flashcard' ? '/flashcard' : ''}`
}
