'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  BookOpen,
  CheckCircle2,
  Zap,
  RotateCcw,
  GraduationCap,
  Shuffle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Card, CardContent } from '@/components/shared/ui/card'
import { cn } from '@/lib/core/utils/cn'
import { format } from 'date-fns'
import type { GroupedQuiz } from '@/hooks/useStudentHistory'

export function ModeBadge({ mode }: { mode: 'immediate' | 'review' | 'flashcard' }) {
  const config = {
    immediate: { label: 'Practice', icon: Zap, bg: 'bg-primary/10 text-primary border-primary/20' },
    review: { label: 'Exam', icon: BookOpen, bg: 'bg-info-bg text-info-fg border-info-border' },
    flashcard: { label: 'Flashcard', icon: GraduationCap, bg: 'bg-accent/15 text-accent-foreground border-border' },
  }
  const { label, icon: Icon, bg } =
    config[mode] || { label: mode, icon: BookOpen, bg: 'bg-muted text-muted-foreground border-border' }

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border shrink-0 flex items-center gap-1',
        bg
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  )
}

export function GroupedQuizTimelineCard({ quizGroup }: { quizGroup: GroupedQuiz }) {
  const [expanded, setExpanded] = useState(false)
  const latestAttempt = quizGroup.attempts[0]
  const attemptCount = quizGroup.attempts.length
  const hasCompletedAttempt = quizGroup.attempts.some((a) => a.status === 'completed')
  const maxScore = (quizGroup.bestScorePercentage / 10).toFixed(1)
  const isPerfect = hasCompletedAttempt && quizGroup.bestScorePercentage >= 100

  // Deduplicate display title
  const displayTitle =
    quizGroup.quiz_title && quizGroup.quiz_title !== quizGroup.quiz_code
      ? `${quizGroup.quiz_code} — ${quizGroup.quiz_title}`
      : quizGroup.quiz_title || quizGroup.quiz_code

  const latestSessionUrl =
    latestAttempt.status === 'active'
      ? latestAttempt.mode === 'flashcard'
        ? `/quiz/${latestAttempt.quiz_id}/session/${latestAttempt._id}/flashcard`
        : `/quiz/${latestAttempt.quiz_id}/session/${latestAttempt._id}`
      : `/quiz/${latestAttempt.quiz_id}/result/${latestAttempt._id}`

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Main Sleek Single Header Row */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Left Column: Icon & Quiz Details */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            {/* Status / Type Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs mt-0.5 sm:mt-0',
                isPerfect
                  ? 'bg-success/15 text-success border-success/30'
                  : quizGroup.is_mix
                  ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              )}
            >
              {isPerfect ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : quizGroup.is_mix ? (
                <Shuffle className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {quizGroup.category_name && (
                  <Badge
                    variant="secondary"
                    className="bg-muted text-muted-foreground font-black text-[9px] uppercase rounded-md px-2 py-0.5 border border-border shrink-0"
                  >
                    {quizGroup.category_name}
                  </Badge>
                )}
                <h3 className="text-sm font-black text-foreground truncate tracking-tight">{displayTitle}</h3>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1 font-bold text-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  Latest: {format(new Date(latestAttempt.started_at), 'HH:mm')}
                </span>
                <span>•</span>
                <span className="font-semibold text-muted-foreground">{attemptCount} attempts</span>
                <span>•</span>
                <ModeBadge mode={latestAttempt.mode} />
              </div>
            </div>
          </div>

          {/* Right Column: Score & Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            {/* Score Display */}
            <div className="text-left sm:text-right">
              {hasCompletedAttempt ? (
                <div className="flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-0">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-base sm:text-lg font-black text-primary leading-none">{maxScore}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">/10</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Best Score</p>
                </div>
              ) : (
                <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full">
                  Incomplete
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {attemptCount > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className={cn(
                    'h-8 px-3 rounded-xl border-border text-foreground font-bold text-xs hover:bg-muted transition-all cursor-pointer',
                    expanded && 'bg-muted border-primary/40 text-primary'
                  )}
                >
                  <span>Details ({attemptCount})</span>
                  <ChevronDown
                    className={cn('w-3.5 h-3.5 ml-1 transition-transform duration-200', expanded && 'rotate-180')}
                  />
                </Button>
              )}

              <Button
                size="sm"
                className="h-8 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-xs shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
                asChild
              >
                <Link href={latestSessionUrl} prefetch={false}>
                  <span>{latestAttempt.status === 'active' ? 'Continue' : 'View Results'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Attempts Section Container */}
        {expanded && (
          <div className="border-t border-border/70 bg-muted/20 p-3 sm:p-4 space-y-2 rounded-b-2xl animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Attempt Progress ({attemptCount})
              </p>
              <span className="text-[10px] font-bold text-muted-foreground">Click an attempt to view review details</span>
            </div>

            <div className="space-y-1.5">
              {quizGroup.attempts.map((attempt, idx) => {
                const maxQuizQuestions = Math.max(...quizGroup.attempts.map((a) => a.total_questions || 0))
                const isRetryWrong = attempt.total_questions < maxQuizQuestions
                const scoreOnTen = (attempt.score / Math.max(attempt.total_questions, 1)) * 10
                const formattedScore = Math.min(10, Math.max(0, scoreOnTen)).toFixed(1)
                const isLatest = idx === 0

                const attemptUrl =
                  attempt.status === 'active'
                    ? attempt.mode === 'flashcard'
                      ? `/quiz/${attempt.quiz_id}/session/${attempt._id}/flashcard`
                      : `/quiz/${attempt.quiz_id}/session/${attempt._id}`
                    : `/quiz/${attempt.quiz_id}/result/${attempt._id}`

                return (
                  <Link
                    key={attempt._id}
                    href={attemptUrl}
                    prefetch={false}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/40 transition-all shadow-2xs cursor-pointer group"
                  >
                    {/* Left: Clean Single Attempt Tag & Details */}
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-black shrink-0 tracking-tight',
                          isLatest
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-muted text-muted-foreground font-bold border border-border/60'
                        )}
                      >
                        Attempt {attemptCount - idx}
                      </span>

                      <ModeBadge mode={attempt.mode} />

                      {isRetryWrong && (
                        <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <RotateCcw className="w-2.5 h-2.5" /> Retry Wrong
                        </Badge>
                      )}

                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(attempt.started_at), 'HH:mm')} • {attempt.duration_minutes || 0} min
                      </span>
                    </div>

                    {/* Right: Score & Arrow */}
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {attempt.status === 'completed' ? (
                        <div className="text-right">
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-black',
                              scoreOnTen >= 8 ? 'text-success' : scoreOnTen >= 5 ? 'text-primary' : 'text-foreground'
                            )}
                          >
                            {formattedScore}/10
                          </span>
                          <p className="text-[9px] font-bold text-muted-foreground">
                            {attempt.correct_count}/{attempt.total_questions} correct
                          </p>
                        </div>
                      ) : (
                        <div className="text-right flex flex-col items-end">
                          <Badge className="bg-warning-bg/20 text-warning-fg border border-warning-border font-black text-[9px] uppercase px-2 py-0.5 rounded-full">
                            In Progress
                          </Badge>
                          <span className="text-[9px] font-bold text-warning-fg mt-0.5">
                            {attempt.answered_count ?? 0}/{attempt.total_questions} answered
                          </span>
                        </div>
                      )}

                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
