'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  History,
  Layers,
  Trophy,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface RecentActivitiesFeedProps {
  recentActivities: ActivityItem[]
  featuredActivityId?: string
}

const MAX_FEED_ITEMS = 5

export const RecentActivitiesFeed = React.memo(function RecentActivitiesFeed({
  recentActivities,
  featuredActivityId,
}: RecentActivitiesFeedProps) {
  const activities = (recentActivities || [])
    .filter((activity) => activity.id !== featuredActivityId)
    .slice(0, MAX_FEED_ITEMS)

  return (
    <section aria-labelledby="recent-activity-title" className="min-w-0 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <History aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 id="recent-activity-title" className="text-base font-semibold tracking-tight text-foreground">
            Recent activity
          </h2>
        </div>
        <Link
          href="/history"
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View history <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>

      {activities.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <History aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No recent activity</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Your completed quizzes will appear here.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </ul>
      )}
    </section>
  )
})

function getActivityStatusStyles(
  isResumable: boolean,
  isFlashcard: boolean,
  scoreNum: number | null,
  isDeleted: boolean
) {
  if (isDeleted) {
    return {
      container: 'bg-muted text-muted-foreground border-border',
      icon: <FileText aria-hidden="true" className="h-4 w-4" />,
    }
  }
  if (isResumable) {
    return {
      container: 'bg-warning-bg text-warning-fg border-warning-border',
      icon: <Clock aria-hidden="true" className="h-4 w-4" />,
    }
  }
  if (isFlashcard) {
    return {
      container: 'bg-primary/10 text-primary border-primary/20',
      icon: <Layers aria-hidden="true" className="h-4 w-4" />,
    }
  }
  if (scoreNum !== null) {
    if (scoreNum >= 8) {
      return {
        container: 'bg-success-bg text-success-fg border-success-border',
        icon: <Trophy aria-hidden="true" className="h-4 w-4" />,
      }
    }
    if (scoreNum >= 5) {
      return {
        container: 'bg-primary/10 text-primary border-primary/20',
        icon: <CheckCircle2 aria-hidden="true" className="h-4 w-4" />,
      }
    }
    return {
      container: 'bg-incorrect-bg text-incorrect-fg border-incorrect-border',
      icon: <AlertCircle aria-hidden="true" className="h-4 w-4" />,
    }
  }
  return {
    container: 'bg-muted text-muted-foreground border-border',
    icon: <FileText aria-hidden="true" className="h-4 w-4" />,
  }
}

function getScoreBadgeClasses(score: number) {
  if (score >= 8) return 'bg-success-bg text-success-fg border-success-border'
  if (score >= 6.5) return 'bg-primary/10 text-primary border-primary/20'
  if (score >= 5) return 'bg-warning-bg text-warning-fg border-warning-border'
  return 'bg-incorrect-bg text-incorrect-fg border-incorrect-border'
}

const ActivityStatusBadge = React.memo(function ActivityStatusBadge({
  isDeleted,
  isResumable,
  formattedScore,
  scoreNum,
}: {
  isDeleted: boolean
  isResumable: boolean
  formattedScore: string | null
  scoreNum: number | null
}) {
  const base = 'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium'

  if (isDeleted) {
    return <Badge className={cn(base, 'border-border bg-muted text-muted-foreground')}>Deleted</Badge>
  }
  if (isResumable) {
    return <Badge className={cn(base, 'border-warning-border bg-warning-bg text-warning-fg')}>In progress</Badge>
  }
  if (formattedScore !== null && scoreNum !== null) {
    return <Badge className={cn(base, getScoreBadgeClasses(scoreNum))}>{formattedScore}/10</Badge>
  }
  return <Badge className={cn(base, 'border-success-border bg-success-bg text-success-fg')}>Completed</Badge>
})

function getActivityHref(activity: ActivityItem, isResumable: boolean): string {
  if (!isResumable) return `/quiz/${activity.quizId}/result/${activity.id}`
  const resumeSessionId = activity.activeSessionId || activity.id
  return activity.mode === 'flashcard'
    ? `/quiz/${activity.quizId}/session/${resumeSessionId}/flashcard`
    : `/quiz/${activity.quizId}/session/${resumeSessionId}`
}

function resolveActivityTitle(quizTitle: string, quizCode?: string) {
  if (!quizCode || quizCode === 'N/A' || quizCode === 'QUIZ') {
    return { showCode: false, code: '', title: quizTitle }
  }
  const cleanCode = quizCode.trim()
  const cleanTitle = quizTitle.trim()
  if (cleanCode.toLowerCase() === cleanTitle.toLowerCase()) {
    return { showCode: false, code: '', title: cleanTitle }
  }
  if (cleanCode.includes('+') || cleanCode.length > 14) {
    return { showCode: false, code: '', title: cleanTitle }
  }
  return { showCode: true, code: cleanCode, title: cleanTitle }
}

const ActivityRow = React.memo(function ActivityRow({ activity }: { activity: ActivityItem }) {
  const isResumable = activity.status === 'active' || activity.hasActiveSession === true
  const isDeleted = activity.quizDeleted === true
  const content = <ActivityDetails activity={activity} />

  return (
    <li>
      {isDeleted ? (
        <div className="flex min-h-16 items-center gap-3 px-3 py-3 opacity-70 sm:px-4">{content}</div>
      ) : (
        <Link
          href={getActivityHref(activity, isResumable)}
          aria-label={`${isResumable ? 'Continue' : 'Review'} ${activity.quizTitle}`}
          className="group flex min-h-16 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
        >
          {content}
        </Link>
      )}
    </li>
  )
})

const ActivityDetails = React.memo(function ActivityDetails({ activity }: { activity: ActivityItem }) {
  const view = getActivityView(activity)

  return (
    <>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', view.statusStyles.container)}>
        {view.statusStyles.icon}
      </span>
      <ActivityInfo view={view} />
      <ActivityStatusBadge
        isDeleted={view.isDeleted}
        isResumable={view.isResumable}
        formattedScore={view.formattedScore}
        scoreNum={view.scoreNum}
      />
      {!view.isDeleted && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </>
  )
})

interface ActivityView {
  isDeleted: boolean
  isResumable: boolean
  isFlashcard: boolean
  scoreNum: number | null
  formattedScore: string | null
  progressText: string
  timeAgo: string
  showCode: boolean
  code: string
  title: string
  modeLabel: string
  statusStyles: ReturnType<typeof getActivityStatusStyles>
}

function getActivityView(activity: ActivityItem): ActivityView {
  const status = getActivityStatus(activity)
  const displayTime = activity.activityAt || activity.completedAt
  const title = resolveActivityTitle(activity.quizTitle, activity.quizCode)

  return {
    ...status,
    ...title,
    timeAgo: displayTime ? formatDistanceToNow(new Date(displayTime), { addSuffix: true }) : 'Recently',
    progressText: getProgressText(activity),
    modeLabel: status.isDeleted ? 'Quiz deleted' : status.isFlashcard ? 'Flashcards' : 'Quiz',
    statusStyles: getActivityStatusStyles(status.isResumable, status.isFlashcard, status.scoreNum, status.isDeleted),
  }
}

function getActivityStatus(activity: ActivityItem) {
  const isDeleted = activity.quizDeleted === true
  const isResumable = activity.status === 'active' || activity.hasActiveSession === true
  const isFlashcard = activity.mode === 'flashcard'
  const scoreNum = activity.score != null ? Number(activity.score) : null
  const formattedScore = scoreNum !== null ? scoreNum.toFixed(1).replace(/\.0$/, '') : null
  return { isDeleted, isResumable, isFlashcard, scoreNum, formattedScore }
}

function getProgressText(activity: ActivityItem) {
  const active = activity.hasActiveSession || activity.status === 'active'
  const answered = active ? (activity.activeAnsweredCount ?? 0) : (activity.correctCount ?? 0)
  const total = active ? (activity.activeTotalCount ?? 0) : (activity.totalCount ?? 0)
  return total ? `${answered}/${total} questions` : ''
}

const ActivityInfo = React.memo(function ActivityInfo({ view }: { view: ActivityView }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-foreground">{view.title}</span>
        {view.showCode && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{view.code}</span>}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span>{view.timeAgo}</span>
        <span aria-hidden="true">·</span>
        <span>{view.modeLabel}</span>
        {view.progressText && (
          <>
            <span aria-hidden="true">·</span>
            <span>{view.progressText}</span>
          </>
        )}
      </span>
    </span>
  )
})
