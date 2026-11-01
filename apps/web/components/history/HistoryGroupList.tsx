'use client'

import React from 'react'
import Link from 'next/link'
import { Calendar, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { HistorySkeleton } from '@/components/history/HistorySkeleton'
import { GroupedQuizTimelineCard } from '@/components/history/HistoryItemCard'
import type { DateGroup } from '@/hooks/useStudentHistory'
import { useTranslations } from '@fquiz/ui/i18n'

interface HistoryGroupListProps {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  dateGroups: DateGroup[]
  hasActiveFilters: boolean
}

export function HistoryGroupList({
  isLoading,
  isError,
  onRetry,
  dateGroups,
  hasActiveFilters,
}: HistoryGroupListProps) {
  const t = useTranslations()
  if (isLoading) {
    return <HistorySkeleton />
  }

  if (isError) {
    return (
      <div role="alert" className="p-8 text-center bg-destructive/10 rounded-2xl border border-destructive/20 space-y-2">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-sm font-bold text-destructive">{t('history.loadError')}</p>
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-black"
        >
          {t('common.tryAgain')}
        </Button>
      </div>
    )
  }

  if (dateGroups.length === 0) {
    return (
      <div className="p-10 sm:p-16 text-center bg-card rounded-2xl sm:rounded-3xl border border-border shadow-2xs space-y-4">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground">
          <Calendar className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-foreground">{t('history.noMatchingHistory')}</h3>
          <p className="text-xs font-medium text-muted-foreground max-w-sm mx-auto">
            {hasActiveFilters
              ? t('history.noFilterResults')
              : t('history.noHistoryDescription')}
          </p>
        </div>
        <Button
          asChild
          className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl px-6 h-10 text-xs font-black cursor-pointer shadow-md shadow-primary/20"
        >
          <Link href="/explore" prefetch={false}>
            <Sparkles className="w-4 h-4 mr-1.5" />
            {t('history.exploreNow')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dateGroups.map((dateGroup) => (
        <section key={dateGroup.title} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              {dateGroup.title}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {dateGroup.quizzes.map((groupedQuiz) => (
              <GroupedQuizTimelineCard key={groupedQuiz.key} quizGroup={groupedQuiz} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
