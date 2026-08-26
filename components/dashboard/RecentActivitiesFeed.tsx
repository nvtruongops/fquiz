'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, HelpCircle, Layers, TrendingUp, FileText, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { cn } from '@/lib/core/utils/cn'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

interface RecentActivitiesFeedProps {
  recentActivities: ActivityItem[]
}

const MAX_FEED_ITEMS = 6

export const RecentActivitiesFeed = React.memo(function RecentActivitiesFeed({ recentActivities }: RecentActivitiesFeedProps) {
  const activities = (recentActivities || []).slice(0, MAX_FEED_ITEMS)

  return (
    <div className="w-full">
      <div className="glass-card p-5 rounded-[24px] border border-border shadow-xs flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Dòng Thời Gian Học Tập
            </h3>
          </div>
          <Link
            href="/history"
            className="text-xs font-bold text-primary hover:underline transition-colors flex items-center gap-0.5"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Feed List */}
        <div className="space-y-1.5">
          {!activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground border border-border shadow-2xs">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-[240px]">
                <p className="text-xs text-foreground font-black">Chưa có lịch sử làm bài</p>
                <p className="text-[11px] text-muted-foreground font-medium">Bắt đầu làm bài thi để ghi nhận kết quả và dòng thời gian học tập.</p>
              </div>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs h-8 px-4 rounded-xl shadow-xs transition-all mt-1 cursor-pointer">
                <Link href="/explore">
                  Làm bài ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {activities.map((act) => (
                <ActivityRowItem key={act.id} activity={act} />
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA when list has items */}
        {activities && activities.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-xl h-9 cursor-pointer"
            >
              <Link href="/history" className="flex items-center justify-center gap-1.5">
                Xem toàn bộ lịch sử làm bài <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})

function getScoreBadgeClass(score: number) {
  if (score >= 8) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (score >= 6.5) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (score >= 5) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
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
      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wide shadow-2xs">
        Đang dở
      </Badge>
    )
  }
  if (formattedScore !== null && scoreNum !== null) {
    return (
      <Badge className={cn('text-[11px] font-black border px-2.5 py-0.5 rounded-full shadow-2xs', getScoreBadgeClass(scoreNum))}>
        {formattedScore}/10
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wide shadow-2xs">
      Hoàn thành
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
  // If code is equal to title, don't show duplicate
  if (quizCode.trim().toLowerCase() === quizTitle.trim().toLowerCase()) {
    return { showBadge: false, code: '', title: quizTitle }
  }
  return { showBadge: true, code: quizCode, title: quizTitle }
}

const ActivityRowItem = React.memo(function ActivityRowItem({ activity }: { activity: ActivityItem }) {
  const isResumable = activity.status === 'active' || activity.hasActiveSession === true
  const isFlashcard = activity.mode === 'flashcard'
  const scoreNum = activity.score != null ? Number(activity.score) : null
  const formattedScore = scoreNum !== null ? scoreNum.toFixed(1).replace(/\.0$/, '') : null

  const progressAnswered = activity.hasActiveSession ? (activity.activeAnsweredCount ?? 0) : (activity.correctCount ?? 0)
  const progressTotal = activity.hasActiveSession ? (activity.activeTotalCount ?? 0) : (activity.totalCount ?? 0)
  const progressText = progressTotal > 0 ? `${progressAnswered}/${progressTotal} câu` : ''

  const displayTime = activity.activityAt || activity.completedAt
  const timeAgo = displayTime ? formatDistanceToNow(new Date(displayTime), { addSuffix: true, locale: vi }) : 'Gần đây'

  const { showBadge, code, title } = resolveActivityTitle(activity.quizTitle, activity.quizCode)

  if (activity.quizDeleted) {
    return (
      <div className="flex items-center gap-3 py-3 px-2 opacity-50 cursor-not-allowed">
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
          <span className="text-[10px] text-muted-foreground font-semibold block">{timeAgo} • Đã xóa</span>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={getActivityHref(activity, isResumable)}
      className="flex items-center justify-between gap-3 py-3 px-2 rounded-xl transition-all duration-150 hover:bg-muted/60 group cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Icon */}
        <div
          className={cn(
            'w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
            isFlashcard
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
              : 'bg-primary/10 text-primary border-primary/20'
          )}
        >
          {isFlashcard ? <Layers className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {showBadge && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border shrink-0">
                {code}
              </span>
            )}
            <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors leading-snug">
              {title}
            </h4>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium flex-wrap">
            <span>{timeAgo}</span>
            <span>•</span>
            <span>{isFlashcard ? 'Thẻ Flashcard' : 'Trắc nghiệm'}</span>
            {progressText && (
              <>
                <span>•</span>
                <span className="text-primary font-bold">{progressText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Score Badge */}
      <div className="shrink-0 pl-1">
        <ActivityStatusBadge isResumable={isResumable} formattedScore={formattedScore} scoreNum={scoreNum} />
      </div>
    </Link>
  )
})
