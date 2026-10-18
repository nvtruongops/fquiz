'use client'

import React, { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
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
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface RecentActivitiesFeedProps {
  recentActivities: ActivityItem[]
}

const MAX_FEED_ITEMS = 6

type FilterType = 'all' | 'active' | 'completed'

export const RecentActivitiesFeed = React.memo(function RecentActivitiesFeed({
  recentActivities,
}: RecentActivitiesFeedProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const rawActivities = useMemo(
    () => (recentActivities || []).slice(0, MAX_FEED_ITEMS),
    [recentActivities]
  )

  const activeCount = useMemo(
    () => rawActivities.filter((a) => (a.status === 'active' || a.hasActiveSession) && !a.quizDeleted).length,
    [rawActivities]
  )

  const completedCount = useMemo(
    () => rawActivities.filter((a) => a.status === 'completed' && !a.quizDeleted).length,
    [rawActivities]
  )

  const filteredActivities = useMemo(() => {
    if (filter === 'active') {
      return rawActivities.filter((a) => (a.status === 'active' || a.hasActiveSession) && !a.quizDeleted)
    }
    if (filter === 'completed') {
      return rawActivities.filter((a) => a.status === 'completed' && !a.quizDeleted)
    }
    return rawActivities
  }, [rawActivities, filter])

  return (
    <div className="w-full">
      <div className="glass-card p-5 sm:p-6 rounded-[28px] border border-border shadow-xs flex flex-col space-y-4">
        {/* Header with Title and Link */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <History aria-hidden="true" className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground whitespace-nowrap">
              Study Timeline
            </h3>
          </div>
          <Link
            href="/history"
            className="text-xs font-bold text-primary hover:underline transition-colors flex items-center gap-0.5 shrink-0"
          >
            View all <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Segmented Controls */}
        {rawActivities.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter recent study activities"
            className="flex items-center gap-1 p-1 bg-surface-inset rounded-xl border border-border/50 text-[10px] sm:text-[11px] font-bold"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={cn(
                'flex-1 py-1 px-1.5 sm:px-2.5 rounded-lg transition-all text-center cursor-pointer whitespace-nowrap min-h-[36px] flex items-center justify-center active:scale-[0.98]',
                filter === 'all'
                  ? 'bg-card text-foreground font-black shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All ({rawActivities.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'active'}
              onClick={() => setFilter('active')}
              className={cn(
                'flex-1 py-1 px-1.5 sm:px-2.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap min-h-[36px] active:scale-[0.98]',
                filter === 'active'
                  ? 'bg-card text-warning-fg font-black shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              In Progress {activeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-warning-fg animate-pulse" aria-hidden="true" />} ({activeCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'completed'}
              onClick={() => setFilter('completed')}
              className={cn(
                'flex-1 py-1 px-1.5 sm:px-2.5 rounded-lg transition-all text-center cursor-pointer whitespace-nowrap min-h-[36px] flex items-center justify-center active:scale-[0.98]',
                filter === 'completed'
                  ? 'bg-card text-foreground font-black shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Completed ({completedCount})
            </button>
          </div>
        )}

        {/* Timeline Stream List */}
        <div className="min-h-[260px] flex flex-col justify-center">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground border border-border shadow-2xs">
                <HelpCircle aria-hidden="true" className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-[260px]">
                <p className="text-xs text-foreground font-black">
                  {filter === 'all'
                    ? 'No study history yet'
                    : filter === 'active'
                    ? 'No quizzes in progress'
                    : 'No quizzes completed yet'}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {filter === 'all'
                    ? 'Start practicing quizzes to record your results and build your study timeline.'
                    : 'Select any quiz to start practicing now.'}
                </p>
              </div>
              {filter === 'all' && (
                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-9 sm:h-10 px-4 rounded-xl shadow-xs transition-all mt-1 cursor-pointer active:scale-[0.98]"
                >
                  <Link href="/explore">
                    Practice Now <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-0.5">
              {filteredActivities.map((act, index) => (
                <TimelineRowItem
                  key={act.id}
                  activity={act}
                  isLast={index === filteredActivities.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {rawActivities.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl h-10 min-h-[40px] cursor-pointer active:scale-[0.98] transition-transform"
            >
              <Link href="/history" className="flex items-center justify-center gap-1.5">
                View Full Quiz History <ArrowRight aria-hidden="true" className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})

function getTimelineNodeStyles(
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
        <span className="w-1.5 h-1.5 rounded-full bg-warning-fg animate-pulse" aria-hidden="true" />
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

interface TimelineRowItemProps {
  activity: ActivityItem
  isLast: boolean
}

const TimelineRowItem = React.memo(function TimelineRowItem({
  activity,
  isLast,
}: TimelineRowItemProps) {
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
  const nodeStyles = getTimelineNodeStyles(isResumable, isFlashcard, scoreNum)

  if (activity.quizDeleted) {
    return (
      <div className="timeline-item relative group/item">
        {!isLast && (
          <div
            className="absolute left-[19px] top-[40px] -bottom-3 w-[2px] bg-border/60 rounded-full pointer-events-none z-0"
            aria-hidden="true"
          />
        )}
        <div className="flex items-start gap-3 relative z-10 opacity-50 cursor-not-allowed">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border shadow-2xs">
            <FileText aria-hidden="true" className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 p-3 rounded-2xl border border-border bg-muted/40 space-y-1">
            <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
            <span className="text-[10px] text-muted-foreground font-semibold block">{timeAgo} • Deleted</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="timeline-item relative group/item">
      {/* Sleek Segment Connector Track between this node and the next node */}
      {!isLast && (
        <div
          className="absolute left-[19px] top-[42px] -bottom-3.5 w-[2px] bg-gradient-to-b from-border via-border/70 to-border/40 rounded-full pointer-events-none z-0"
          aria-hidden="true"
        />
      )}

      <Link
        href={getActivityHref(activity, isResumable)}
        className="flex items-start gap-3 relative z-10 group/link cursor-pointer focus:outline-none"
      >
        {/* Timeline Status Node Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform duration-200 group-hover/link:scale-105 group-hover/link:shadow-xs relative z-10',
            nodeStyles.container
          )}
        >
          {nodeStyles.icon}
        </div>

        {/* Content Card */}
        <div className="flex-1 min-w-0 p-3 sm:p-3.5 rounded-2xl border border-subtle bg-surface-card/80 group-hover/link:bg-muted/50 group-hover/link:border-primary/40 group-hover/link:shadow-xs transition-all duration-200 space-y-1.5">
          {/* Top Row: Title + Code + Score */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {showBadge && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border shrink-0 max-w-[90px] truncate">
                    {code}
                  </span>
                )}
                <h4
                  className="text-xs sm:text-sm font-bold text-foreground truncate group-hover/link:text-primary transition-colors leading-tight"
                  title={title}
                >
                  {title}
                </h4>
              </div>
            </div>

            <ActivityStatusBadge
              isResumable={isResumable}
              formattedScore={formattedScore}
              scoreNum={scoreNum}
            />
          </div>

          {/* Progress Bar for Active / Resumable sessions */}
          {isResumable && progressTotal > 0 && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                <span>Completion Progress</span>
                <span className="text-warning-fg font-black">{progressText} ({progressPercent}%)</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning-fg rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Meta Info Row */}
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground font-medium pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span>{timeAgo}</span>
              <span>•</span>
              <span>{isFlashcard ? 'Flashcards' : 'Quiz'}</span>
              {!isResumable && progressText && (
                <>
                  <span>•</span>
                  <span className="text-foreground font-bold">{progressText}</span>
                </>
              )}
            </div>

            <span className="text-primary font-bold text-[10px] flex items-center gap-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0">
              {isResumable ? 'Continue' : 'Review'} <ChevronRight aria-hidden="true" className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
})
