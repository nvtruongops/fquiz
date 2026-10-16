'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shuffle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  Trophy,
  ArrowRight,
  BookOpen,
  Zap,
  CheckCircle2,
  PlayCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import { cn } from '@/lib/core/utils/cn'
import { MIX_QUIZ_MAX_SELECT, MIX_QUIZ_QUESTION_OPTIONS } from '@/lib/modules/quiz/constants/mix-quiz'
import { useMixQuizGenerator, ActiveMixSession } from '@/hooks/useMixQuizGenerator'

interface MixQuizTabProps {
  onSessionCreated?: (quizId: string, sessionId: string) => void
  embedded?: boolean
  categoryId?: string
}

function QuotaExceededDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[32px] border border-border bg-card/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-0 overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-warning-bg flex items-center justify-center mb-6 shadow-inner text-warning-fg">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <DialogTitle className="text-xl font-black text-card-foreground mb-2">
            Quota Limit Reached
          </DialogTitle>

          <DialogDescription className="text-xs font-bold text-muted-foreground leading-relaxed mb-8 px-2">
            {message || 'You have reached the maximum limit of 10 custom and mixed quizzes. Please delete an older quiz to continue.'}
          </DialogDescription>

          <div className="flex flex-col gap-3 w-full">
            <Button
              asChild
              className="h-13 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs uppercase tracking-wider justify-center"
            >
              <Link href="/explore">
                Explore Quizzes
              </Link>
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="h-11 rounded-2xl border-border font-bold text-muted-foreground hover:bg-muted text-xs cursor-pointer"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ActiveSessionBanner({
  session,
  onContinue,
  onCreateNew,
  isDeleting,
}: {
  session: ActiveMixSession
  onContinue: () => void
  onCreateNew: () => void
  isDeleting: boolean
}) {
  const modeLabel = session.mode === 'immediate' ? 'Practice' : 'Exam'
  const modeColor = session.mode === 'immediate' ? 'text-success-fg' : 'text-info-fg'
  const modeBg = session.mode === 'immediate' ? 'bg-success-bg border-success-border' : 'bg-info-bg border-info-border'

  return (
    <div className="bg-card rounded-[24px] border-2 border-primary/20 p-6 space-y-5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-black text-card-foreground">You have an incomplete Mixed Quiz</h3>
          <p className="text-sm text-muted-foreground">Continue where you left off or create a new quiz?</p>
        </div>
      </div>

      <div className={cn('rounded-2xl p-4 border space-y-2', modeBg)}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider shadow-xs">
            Mixed Quiz
          </span>
          <span className="px-2 py-0.5 rounded-full bg-card/80 text-card-foreground text-[10px] font-bold">
            {session.question_count} questions
          </span>
          <span className={cn('px-2 py-0.5 rounded-full bg-card/80 text-[10px] font-bold', modeColor)}>
            {modeLabel}
          </span>
        </div>
        <p className="font-black text-card-foreground text-sm leading-snug line-clamp-2 break-words">
          {session.title.replace(/^(Quiz Tr\u1ED9n|Mixed Quiz) · /, '')}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onContinue}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl h-12 gap-2 cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          Resume
        </Button>
        <Button
          onClick={onCreateNew}
          disabled={isDeleting}
          variant="outline"
          className="flex-1 border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive font-black rounded-2xl h-12 gap-2 cursor-pointer"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Start Fresh
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function MixQuizTab({ onSessionCreated, embedded, categoryId }: MixQuizTabProps) {
  const router = useRouter()
  const stepOffset = embedded ? 0 : 1
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    selectedCategoryId, setSelectedCategoryId,
    selectedQuizIds, setSelectedQuizIds,
    toggleQuiz,
    questionCount, setQuestionCount,
    mode, setMode,
    rateLimitMsg,
    poolWarning,
    quotaErrorMsg, setQuotaErrorMsg,
    activeSessionData,
    categories, catsLoading,
    quizzes, quizzesLoading,
    hasNextPage, isFetchingNextPage, fetchNextPage,
    totalPool,
    canStart,
    isPreloading,
    createMutation,
    deleteActiveSessionMutation,
  } = useMixQuizGenerator(embedded, onSessionCreated, categoryId)

  // IntersectionObserver for infinite scroll in quizzes list
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage() },
      { threshold: 0, rootMargin: '80px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, quizzes.length])

  const activeSession = activeSessionData?.session

  if (activeSession) {
    return (
      <div className="max-w-xl mx-auto py-6">
        <ActiveSessionBanner
          session={activeSession}
          onContinue={() => router.push(`/quiz/${activeSession.quizId || 'mix'}/session/${activeSession.sessionId}`)}
          onCreateNew={() => deleteActiveSessionMutation.mutate(activeSession.sessionId)}
          isDeleting={deleteActiveSessionMutation.isPending}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header — only shown when not embedded */}
      {!embedded && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shuffle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-black text-card-foreground">Mix Quiz</h2>
          </div>
          <p className="text-muted-foreground font-medium text-sm">
            Select up to {MIX_QUIZ_MAX_SELECT} public quizzes, combine questions, and start practicing immediately.
          </p>
        </div>
      )}

      {rateLimitMsg && (
        <div className="flex items-start gap-3 bg-warning-bg border border-warning-border rounded-2xl p-4 animate-in zoom-in-95 duration-300">
          <AlertTriangle className="w-4 h-4 text-warning-fg mt-0.5 shrink-0" />
          <p className="text-sm text-warning-fg font-bold">{rateLimitMsg}</p>
        </div>
      )}

      {poolWarning && (
        <div className="flex items-start gap-3 bg-warning-bg border border-warning-border rounded-2xl p-4 animate-in zoom-in-95 duration-300">
          <AlertTriangle className="w-4 h-4 text-warning-fg mt-0.5 shrink-0" />
          <p className="text-sm text-warning-fg font-bold">{poolWarning}</p>
        </div>
      )}

      {/* Step 1 — Category selection (hidden when embedded in course page) */}
      {!embedded && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-black">1</div>
            <h2 className="text-sm font-black text-card-foreground uppercase tracking-widest">Select Course Category</h2>
          </div>
          {catsLoading || isPreloading ? (
            <div className="h-14 rounded-2xl bg-muted animate-pulse flex items-center px-4 text-xs font-bold text-muted-foreground">
              {isPreloading ? 'Restoring configuration...' : 'Loading categories...'}
            </div>
          ) : (
            <Select
              value={selectedCategoryId}
              onValueChange={(val) => { setSelectedCategoryId(val); setSelectedQuizIds(new Set()) }}
            >
              <SelectTrigger className="w-full h-12 px-4 rounded-xl border-2 border-border bg-card text-card-foreground font-bold shadow-xs transition-all hover:border-primary/50 focus:ring-0">
                <SelectValue placeholder="Browse question categories..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2 border-border shadow-2xl bg-popover text-popover-foreground">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="py-3 font-bold text-muted-foreground hover:text-primary cursor-pointer">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </section>
      )}

      {/* Steps: Quiz Selection & Configuration */}
      {selectedCategoryId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Left Column — Quiz Selection Grid (col-span-6 on desktop) */}
          <div className="lg:col-span-6 space-y-4 bg-card/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-border/80 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-2xs">
                  {stepOffset + 1}
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">
                    Select Quizzes to Mix
                  </h2>
                  <p className="text-[11px] font-medium text-muted-foreground">Choose from 2 to {MIX_QUIZ_MAX_SELECT} quizzes to combine questions</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {totalPool > 0 && (
                  <Badge variant="outline" className="rounded-full px-3 py-1 font-extrabold text-[10px] bg-success-bg text-success-fg border-success-border shadow-2xs">
                    Pool: {totalPool} questions
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  'rounded-full px-3 py-1 font-extrabold text-[10px] transition-colors shadow-2xs',
                  selectedQuizIds.size >= 2
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border'
                )}>
                  {selectedQuizIds.size}/{MIX_QUIZ_MAX_SELECT} SELECTED
                </Badge>
              </div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-2 sm:p-3 border border-border/60">
              {quizzesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : quizzes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground font-bold bg-card/60 rounded-xl border border-dashed border-border text-xs">
                  No quizzes found in this category
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto overscroll-contain p-1.5 pr-2.5">
                  {quizzes.map((quiz, idx) => {
                    const isSelected = selectedQuizIds.has(quiz.id)
                    const isDisabled = !isSelected && selectedQuizIds.size >= MIX_QUIZ_MAX_SELECT
                    const hasScore = quiz.latestScoreOnTen !== null
                    const isPassed = (quiz.latestScoreOnTen ?? 0) >= 5
                    const isSentinel = idx === Math.min(6, quizzes.length - 1)

                    return (
                      <div
                        key={quiz.id}
                        ref={isSentinel ? sentinelRef : undefined}
                        onClick={() => !isDisabled && toggleQuiz(quiz.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (!isDisabled) toggleQuiz(quiz.id)
                          }
                        }}
                        className={cn(
                          'relative group w-full flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none',
                          isSelected
                            ? 'border-primary bg-card shadow-md shadow-primary/5 ring-1 ring-primary/40 text-foreground'
                            : isDisabled
                              ? 'border-border/60 bg-muted/40 opacity-40 cursor-not-allowed text-muted-foreground'
                              : 'border-border/80 bg-card hover:border-primary/40 hover:shadow-xs text-foreground'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-lg transition-colors shrink-0',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                        )}>
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-foreground text-xs truncate uppercase tracking-tight">{quiz.course_code}</p>
                          <p className="text-[10px] font-bold text-muted-foreground truncate">{quiz.title}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-0.5">
                          {hasScore && (
                            <div className={cn('flex items-center gap-0.5 justify-end text-[10px] font-black', isPassed ? 'text-success-fg' : 'text-destructive')}>
                              <Trophy className="w-3 h-3" />
                              <span>{quiz.latestScoreOnTen!.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 justify-end text-[9.5px] font-bold text-muted-foreground">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-extrabold border border-border/60">{quiz.questionCount} questions</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {isFetchingNextPage && (
                    <div className="col-span-full h-12 rounded-xl bg-card border border-border animate-pulse flex items-center justify-center text-xs font-bold text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" /> Loading more quizzes...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column — Step 2 & 3: Configuration & Launch (col-span-6 on desktop) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Step 2: Question count selection */}
            <section className="space-y-3 bg-card/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-border/80 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary text-primary-foreground text-xs font-black shrink-0 shadow-2xs">
                  {stepOffset + 2}
                </div>
                <div>
                  <h2 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Number of Questions
                  </h2>
                  <p className="text-[11px] font-medium text-muted-foreground">Select how many random questions to draw from the selected pool</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                {(totalPool > 0 ? MIX_QUIZ_QUESTION_OPTIONS.filter((count) => count <= totalPool) : MIX_QUIZ_QUESTION_OPTIONS).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={cn(
                      'flex-1 min-w-[70px] py-2.5 px-3 rounded-xl border-2 font-black text-xs transition-all cursor-pointer select-none text-center shadow-2xs active:scale-95',
                      questionCount === count
                        ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                        : 'border-border bg-muted/60 text-muted-foreground hover:border-primary/40 hover:bg-card'
                    )}
                  >
                    {count} QUESTIONS
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Mode Selection */}
            <section className="space-y-3 bg-card/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-border/80 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary text-primary-foreground text-xs font-black shrink-0 shadow-2xs">
                  {stepOffset + 3}
                </div>
                <div>
                  <h2 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Study / Exam Mode
                  </h2>
                  <p className="text-[11px] font-medium text-muted-foreground">Choose your preferred quiz experience</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Practice */}
                <button
                  type="button"
                  onClick={() => setMode('immediate')}
                  className={cn(
                    'relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer select-none',
                    mode === 'immediate'
                      ? 'border-success-border bg-success-bg/30 shadow-md ring-2 ring-success-border/40'
                      : 'border-border/80 bg-muted/50 hover:border-success-border/50 hover:bg-card'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs shadow-2xs',
                    mode === 'immediate' ? 'bg-success-fg text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <Zap className="h-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-black text-xs uppercase tracking-tight', mode === 'immediate' ? 'text-success-fg' : 'text-card-foreground')}>
                      Practice
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-snug mt-0.5 truncate">
                      Instant answers & explanations
                    </p>
                  </div>
                  {mode === 'immediate' && (
                    <CheckCircle2 className="w-4 h-4 text-success-fg shrink-0" />
                  )}
                </button>

                {/* Exam */}
                <button
                  type="button"
                  onClick={() => setMode('review')}
                  className={cn(
                    'relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer select-none',
                    mode === 'review'
                      ? 'border-info-border bg-info-bg/30 shadow-md ring-2 ring-info-border/40'
                      : 'border-border/80 bg-muted/50 hover:border-info-border/50 hover:bg-card'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs shadow-2xs',
                    mode === 'review' ? 'bg-info-fg text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <BookOpen className="h-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-black text-xs uppercase tracking-tight', mode === 'review' ? 'text-info-fg' : 'text-card-foreground')}>
                      Exam
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-snug mt-0.5 truncate">
                      Graded upon completion
                    </p>
                  </div>
                  {mode === 'review' && (
                    <CheckCircle2 className="w-4 h-4 text-info-fg shrink-0" />
                  )}
                </button>
              </div>
            </section>

            {/* Hint Badge */}
            {selectedQuizIds.size < 2 && (
              <div className="p-3 bg-warning-bg/90 border border-warning-border/80 rounded-2xl flex items-center gap-2.5 shadow-2xs animate-in fade-in duration-300">
                <AlertCircle className="w-4 h-4 text-warning-fg shrink-0" />
                <p className="text-xs font-bold text-warning-fg leading-snug">
                  Please select 2 or more quizzes on the left to activate mixing.
                </p>
              </div>
            )}

            {/* Start Button */}
            <div className="pt-1">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canStart || createMutation.isPending}
                className={cn(
                  "group relative w-full h-14 sm:h-16 rounded-2xl text-primary-foreground shadow-lg transition-all duration-300 active:scale-[0.98] overflow-hidden cursor-pointer",
                  canStart
                    ? "bg-primary hover:bg-primary-hover shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                    : "bg-muted opacity-80 cursor-not-allowed shadow-none text-muted-foreground"
                )}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    INITIALIZING MIXED SESSION...
                  </span>
                ) : (
                  <div className="flex items-center justify-between w-full px-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 transition-transform duration-500 shrink-0 shadow-2xs',
                        canStart && 'group-hover:rotate-45 group-hover:scale-110'
                      )}>
                        <Shuffle className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70 leading-none mb-1">
                          {canStart ? 'Confirm configuration & start' : 'Select at least 2 quizzes'}
                        </p>
                        <p className="text-base sm:text-lg font-black tracking-tight leading-none uppercase">
                          {canStart ? 'LAUNCH MIX QUIZ' : 'SELECT QUIZZES TO START'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className={cn("w-5 h-5 transition-transform duration-500 shrink-0", canStart ? "opacity-90 group-hover:translate-x-2" : "opacity-30")} />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Exceeded Modal */}
      <QuotaExceededDialog
        open={!!quotaErrorMsg}
        onOpenChange={(open) => !open && setQuotaErrorMsg(null)}
        message={quotaErrorMsg || ''}
      />
    </div>
  )
}

export default MixQuizTab
