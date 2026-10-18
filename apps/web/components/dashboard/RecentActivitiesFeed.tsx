'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  HelpCircle,
  Layers,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trophy,
  History,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface RecentActivitiesFeedProps {
  recentActivities: ActivityItem[]
}

const MAX_FEED_ITEMS = 5

export const RecentActivitiesFeed = React.memo(function RecentActivitiesFeed({
  recentActivities,
}: RecentActivitiesFeedProps) {
  const rawActivities = useMemo(
    () => (recentActivities || []).slice(0, MAX_FEED_ITEMS),
    [recentActivities]
  )

  return (
    <section aria-labelledby="recent-activity-title" className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <History aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h2 id="recent-activity-title" className="text-lg font-semibold tracking-tight text-foreground">
              Recent activity
            </h2>
            <p className="text-sm text-muted-foreground">Pick up where you left off or review a completed quiz.</p>
          </div>
        </div>
        <Link
          href="/history"
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View history <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

      {rawActivities.length === 0 ? (
        <div className="flex min-h-36 items-center gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HelpCircle aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No study history yet</p>
            <p className="text-sm text-muted-foreground">Start a quiz to see your recent activity here.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rawActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </section>
  )
})

function getActivityStatusStyles(
  isResumable: boolean,
  isFlashcard: boolean,
  scoreNum: number | null
) {
  if (isResumable) {
    return {
      container: 'bg-warning-bg text-warning-fg border-warning-border',
      icon: <Clock aria-hidden="true" className="w-4 h-4" />,
    }
  }
  if (isFlashcard) {
    return {
      container: 'bg-primary/10 text-primary border-primary/20',
      icon: <Layers aria-hidden="true" className="w-4 h-4" />,
    }
  }
  if (scoreNum !== null) {
    if (scoreNum >= 8) {
      return {
        container: 'bg-success-bg text-success-fg border-success-border',
        icon: <Trophy aria-hidden="true" className="w-4 h-4" />,
      }
    }
    if (scoreNum >= 5) {
      return {
        container: 'bg-primary/10 text-primary border-primary/20',
        icon: <CheckCircle2 aria-hidden="true" className="w-4 h-4" />,
      }
    }
    return {
      container: 'bg-incorrect-bg text-incorrect-fg border-incorrect-border',
      icon: <AlertCircle aria-hidden="true" className="w-4 h-4" />,
    }
  }
  return {
    container: 'bg-primary/10 text-primary border-primary/20',
    icon: <FileText aria-hidden="true" className="w-4 h-4" />,
  }
}

function getScoreBadgeClasses(score: number) {
  if (score >= 8) return 'bg-success-bg text-success-fg border-success-border'
  if (score >= 6.5) return 'bg-primary/10 text-primary border-primary/20'
  if (score >= 5) return 'bg-warning-bg text-warning-fg border-warning-border'
  return 'bg-incorrect-bg text-incorrect-fg border-incorrect-border'
}

const ActivityStatusBadge = React.memo(function ActivityStatusBadge({
  isResumable,
  formattedScore,
  scoreNum,
}: {
  isResumable: boolean
  formattedScore: string | null
  scoreNum: number | null
}) {
  if (isResumable) {
    return (
      <Badge className="bg-warning-bg text-warning-fg border border-warning-border text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide shadow-2xs flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-warning-fg motion-safe:animate-pulse" aria-hidden="true" />
        In Progress
      </Badge>
    )
  }
  if (formattedScore !== null && scoreNum !== null) {
    return (
      <Badge
        className={cn(
          'text-[11px] font-black border px-2.5 py-0.5 rounded-full shadow-2xs shrink-0',
          getScoreBadgeClasses(scoreNum)
        )}
      >
        {formattedScore}/10
      </Badge>
    )
  }
  return (
    <Badge className="bg-success-bg text-success-fg border border-success-border text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide shadow-2xs shrink-0">
      Completed
    </Badge>
  )
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
    return { showBadge: false, code: '', title: quizTitle }
  }
  const cleanCode = quizCode.trim()
  const cleanTitle = quizTitle.trim()
  if (cleanCode.toLowerCase() === cleanTitle.toLowerCase()) {
    return { showBadge: false, code: '', title: cleanTitle }
  }
  // If code is composite / very long (e.g. "HCM202_SU26_RE + HCM202_SU26_C1FE"), don't render a cramped badge
  if (cleanCode.includes('+') || cleanCode.length > 14) {
    return { showBadge: false, code: '', title: cleanTitle }
  }
  return { showBadge: true, code: cleanCode, title: cleanTitle }
}

const ActivityCard = React.memo(function ActivityCard({ activity }: { activity: ActivityItem }) {
  const isResumable = activity.status === 'active' || activity.hasActiveSession === true
  const isFlashcard = activity.mode === 'flashcard'
  const scoreNum = activity.score != null ? Number(activity.score) : null
  const formattedScore = scoreNum !== null ? scoreNum.toFixed(1).replace(/\.0$/, '') : null

  const progressAnswered = activity.hasActiveSession
    ? (activity.activeAnsweredCount ?? 0)
    : (activity.correctCount ?? 0)
  const progressTotal = activity.hasActiveSession
    ? (activity.activeTotalCount ?? 0)
    : (activity.totalCount ?? 0)
  const progressPercent = progressTotal > 0 ? Math.min(100, Math.round((progressAnswered / progressTotal) * 100)) : 0
  const progressText = progressTotal > 0 ? `${progressAnswered}/${progressTotal} questions` : ''

  const displayTime = activity.activityAt || activity.completedAt
  const timeAgo = displayTime
    ? formatDistanceToNow(new Date(displayTime), { addSuffix: true })
    : 'Recently'

  const { showBadge, code, title } = resolveActivityTitle(activity.quizTitle, activity.quizCode)
  const nodeStyles = getActivityStatusStyles(isResumable, isFlashcard, scoreNum)
  const cardContent = (
    <div className={cn(
      'flex h-full min-h-[156px] items-start gap-3 rounded-xl border p-4',
      activity.quizDeleted
        ? 'border-border bg-muted/40 opacity-70'
        : 'border-border bg-card transition-colors group-hover/link:border-ring group-hover/link:bg-muted/30'
    )}>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
          activity.quizDeleted ? 'border-border bg-muted text-muted-foreground' : nodeStyles.container
        )}
      >
        {activity.quizDeleted ? <FileText aria-hidden="true" className="h-4 w-4" /> : nodeStyles.icon}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            {showBadge && (
              <span className="block max-w-28 truncate text-[10px] font-medium text-muted-foreground">
                {code}
              </span>
            )}
            <h3 className="truncate text-sm font-semibold leading-snug text-foreground" title={title}>
              {title}
            </h3>
          </div>
          {!activity.quizDeleted && (
            <ActivityStatusBadge
              isResumable={isResumable}
              formattedScore={formattedScore}
              scoreNum={scoreNum}
            />
          )}
        </div>

        {isResumable && progressTotal > 0 && !activity.quizDeleted && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">{progressText} ({progressPercent}%)</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-warning-fg" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span>{timeAgo}</span>
            <span aria-hidden="true">·</span>
            <span>{activity.quizDeleted ? 'Deleted' : isFlashcard ? 'Flashcards' : 'Quiz'}</span>
            {!activity.quizDeleted && !isResumable && progressText && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-foreground">{progressText}</span>
              </>
            )}
          </div>
          {!activity.quizDeleted && (
            <span className="flex shrink-0 items-center gap-0.5 font-medium text-primary">
              {isResumable ? 'Continue' : 'Review'} <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (activity.quizDeleted) return <div className="h-full">{cardContent}</div>

  return (
    <Link
      href={getActivityHref(activity, isResumable)}
      className="group/link block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {cardContent}
    </Link>
  )
})
