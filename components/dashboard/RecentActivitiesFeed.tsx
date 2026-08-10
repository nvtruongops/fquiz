'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, HelpCircle, Layers, TrendingUp, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface RecentActivitiesFeedProps {
  recentActivities: ActivityItem[]
}

export const RecentActivitiesFeed = React.memo(function RecentActivitiesFeed({ recentActivities }: RecentActivitiesFeedProps) {
  const activities = (recentActivities || []).slice(0, 6)

  return (
    <div className="flex flex-col h-full">
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-subtle shadow-xs flex flex-col h-full space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle pb-2.5 shrink-0">
          <h3 className="text-xs font-black uppercase tracking-wider text-accentRole-learning flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-accentRole-learning" /> Dòng Thời Gian Học Tập
          </h3>
          <Link href="/history" className="text-[11px] font-bold text-accentRole-learning hover:underline transition-colors">
            Xem tất cả
          </Link>
        </div>

        {/* Timeline List Container */}
        <div className="relative space-y-2.5 flex-1 overflow-y-auto pr-1 scrollbar-thin pl-0.5 pt-0.5">
          {!activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-2 h-full my-auto">
              <div className="w-10 h-10 rounded-xl bg-surface-inset flex items-center justify-center text-text-tertiary border border-subtle shadow-2xs">
                <HelpCircle className="w-5 h-5 text-text-tertiary" />
              </div>
              <p className="text-[11px] text-text-tertiary font-bold italic">Chưa có lịch sử làm bài gần đây.</p>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-7 px-3 rounded-lg shadow-xs transition-all mt-1">
                <Link href="/explore">
                  Làm bài ngay <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            activities.map((act, idx) => (
              <CompactActivityItem key={act.id} activity={act} isLast={idx === activities.length - 1} />
            ))
          )}
        </div>
      </div>
    </div>
  )
})

function getScoreStyle(score: number) {
  if (score >= 8) return 'bg-learning-mastered-bg text-learning-mastered-fg border-learning-mastered-border'
  if (score >= 6.5) return 'bg-learning-progress-bg text-learning-progress-fg border-learning-progress-border'
  if (score >= 5) return 'bg-warning-bg text-warning-fg border-warning-border'
  return 'bg-learning-struggling-bg text-learning-struggling-fg border-learning-struggling-border'
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
      <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
        Đang dở
      </Badge>
    )
  }
  if (formattedScore !== null && scoreNum !== null) {
    return (
      <Badge className={cn('text-[9px] font-black border px-2 py-0.5 rounded-full shadow-2xs', getScoreStyle(scoreNum))}>
        {formattedScore}/10
      </Badge>
    )
  }
  return (
    <Badge className="bg-learning-mastered-bg text-learning-mastered-fg border border-learning-mastered-border text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
      Xong
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

function formatActivityDetails(activity: ActivityItem) {
  const isResumable = activity.status === 'active' || activity.hasActiveSession === true
  const isFlashcard = activity.mode === 'flashcard'
  const scoreNum = activity.score != null ? Number(activity.score) : null
  const formattedScore = scoreNum !== null ? scoreNum.toFixed(1).replace(/\.0$/, '') : null

  const progressAnswered = activity.hasActiveSession ? (activity.activeAnsweredCount ?? 0) : (activity.correctCount ?? 0)
  const progressTotal = activity.hasActiveSession ? (activity.activeTotalCount ?? 0) : (activity.totalCount ?? 0)
  const progressText = progressTotal > 0 ? `${progressAnswered}/${progressTotal} câu` : ''

  const displayTime = activity.activityAt || activity.completedAt
  const timeAgo = displayTime ? formatDistanceToNow(new Date(displayTime), { addSuffix: true, locale: vi }) : 'Gần đây'

  return { isResumable, isFlashcard, scoreNum, formattedScore, progressText, timeAgo }
}

const DeletedActivityItem = React.memo(function DeletedActivityItem({ title, timeAgo }: { title: string; timeAgo: string }) {
  return (
    <div className="relative flex items-center gap-2.5 opacity-50 cursor-not-allowed">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs bg-primary/10 text-primary border-primary/20 z-10">
        <Zap className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 p-2.5 rounded-xl border bg-surface-card-muted border-subtle">
        <h4 className="text-xs font-black text-foreground truncate leading-snug">{title}</h4>
        <span className="text-[10px] text-text-tertiary font-semibold block mt-0.5">{timeAgo} • Đã xóa</span>
      </div>
    </div>
  )
})

const CompactActivityItem = React.memo(function CompactActivityItem({
  activity,
  isLast = false,
}: {
  activity: ActivityItem
  isLast?: boolean
}) {
  const { isResumable, isFlashcard, scoreNum, formattedScore, progressText, timeAgo } = formatActivityDetails(activity)

  if (activity.quizDeleted) {
    return <DeletedActivityItem title={activity.quizTitle} timeAgo={timeAgo} />
  }

  return (
    <div className="relative flex items-center gap-2.5 group">
      {/* Precise Segment Connector Line (Stopped cleanly at last item) */}
      {!isLast && (
        <div className="absolute left-[15px] top-[16px] bottom-[-10px] w-[2px] bg-border/70 pointer-events-none z-0" />
      )}

      {/* Compact Timeline Node Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105 z-10 bg-card',
          isFlashcard
            ? 'bg-accentRole-memory-bg text-accentRole-memory-fg border-accentRole-memory-border'
            : 'bg-accentRole-learning-bg text-accentRole-learning-fg border-accentRole-learning-border'
        )}
      >
        {isFlashcard ? <Layers className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
      </div>

      {/* Sleek Compact Item Pill Card */}
      <Link
        href={getActivityHref(activity, isResumable)}
        className="flex-1 min-w-0 flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:border-strong hover:bg-surface-inset bg-surface-card border-subtle shadow-2xs relative z-10"
      >
        <div className="min-w-0 space-y-0.5">
          <h4 className="text-xs font-black text-foreground truncate group-hover:text-primary transition-colors leading-snug">
            {activity.quizCode || 'QUIZ'} — {activity.quizTitle}
          </h4>
          <div className="text-[10px] text-text-tertiary font-bold flex items-center gap-1 flex-wrap">
            <span>{timeAgo}</span>
            <span>•</span>
            <span>{isFlashcard ? 'Flashcard' : 'Trắc nghiệm'}</span>
            {progressText && (
              <>
                <span>•</span>
                <span className="text-warning-fg font-black">{progressText}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 ml-2.5">
          <ActivityStatusBadge isResumable={isResumable} formattedScore={formattedScore} scoreNum={scoreNum} />
        </div>
      </Link>
    </div>
  )
})
