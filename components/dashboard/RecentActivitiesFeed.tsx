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
  return (
    <div className="flex flex-col h-full">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-xs flex flex-col h-full space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Hoạt Động Gần Đây
          </h3>
          <Link href="/history" className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors">
            Xem tất cả
          </Link>
        </div>

        <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
          {!recentActivities || recentActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 gap-2.5 h-full my-auto">
              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground border border-border shadow-2xs">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground font-bold italic">Chưa có lịch sử làm bài gần đây.</p>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-8 px-4 rounded-xl shadow-xs transition-all mt-1">
                <Link href="/explore">
                  Làm bài ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            recentActivities.slice(0, 6).map((act) => (
              <CompactActivityItem key={act.id} activity={act} />
            ))
          )}
        </div>
      </div>
    </div>
  )
})

function getScoreStyle(score: number) {
  if (score >= 8) return 'bg-success-bg/20 text-success-fg border-success-fg/30'
  if (score >= 6.5) return 'bg-primary/10 text-primary border-primary/20'
  if (score >= 5) return 'bg-warning-bg text-warning-fg border-warning-border'
  return 'bg-destructive/10 text-destructive border-destructive/30'
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
      <Badge className="bg-warning-bg text-warning-fg border border-warning-border text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
        Đang dở
      </Badge>
    )
  }
  if (formattedScore !== null && scoreNum !== null) {
    return (
      <Badge className={cn('text-[10px] font-black border px-2 py-0.5 rounded-full', getScoreStyle(scoreNum))}>
        {formattedScore}/10
      </Badge>
    )
  }
  return (
    <Badge className="bg-success-bg/20 text-success-fg border border-success-fg/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
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
  const progressText = progressTotal > 0 ? ` • ${progressAnswered}/${progressTotal} câu` : ''

  const displayTime = activity.activityAt || activity.completedAt
  const timeAgo = displayTime ? formatDistanceToNow(new Date(displayTime), { addSuffix: true, locale: vi }) : 'Gần đây'

  return { isResumable, isFlashcard, scoreNum, formattedScore, progressText, timeAgo }
}

const DeletedActivityItem = React.memo(function DeletedActivityItem({ title, timeAgo }: { title: string; timeAgo: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 opacity-50 cursor-not-allowed bg-muted border-border">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs bg-primary/10 text-primary border-primary/20">
          <Zap className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-black text-card-foreground truncate leading-snug">{title}</h4>
          <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">{timeAgo} • Đã xóa</span>
        </div>
      </div>
    </div>
  )
})

const CompactActivityItem = React.memo(function CompactActivityItem({ activity }: { activity: ActivityItem }) {
  const { isResumable, isFlashcard, scoreNum, formattedScore, progressText, timeAgo } = formatActivityDetails(activity)

  if (activity.quizDeleted) {
    return <DeletedActivityItem title={activity.quizTitle} timeAgo={timeAgo} />
  }

  return (
    <Link
      href={getActivityHref(activity, isResumable)}
      className="group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover:border-primary/50 hover:bg-muted/60 bg-card border-border shadow-2xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
            isFlashcard ? 'bg-warning-bg text-warning-fg border-warning-border' : 'bg-primary/10 text-primary border-primary/20'
          )}
        >
          {isFlashcard ? <Layers className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <h4 className="text-xs font-black text-card-foreground truncate group-hover:text-primary transition-colors leading-snug">
            {activity.quizCode || 'QUIZ'} — {activity.quizTitle}
          </h4>
          <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
            {timeAgo} • {isFlashcard ? 'Flashcard' : 'Trắc nghiệm'}
            {isResumable && <span className="text-warning-fg font-extrabold">{progressText}</span>}
          </span>
        </div>
      </div>

      <div className="shrink-0 ml-2">
        <ActivityStatusBadge isResumable={isResumable} formattedScore={formattedScore} scoreNum={scoreNum} />
      </div>
    </Link>
  )
})
