'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { AlertCircle, HelpCircle, Loader2, Pause, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { AnswerSaveBlockedNotice } from '@/components/quiz/session/SessionSaveStatus'

interface SessionModalsProps {
  confirmOpen: boolean
  setConfirmOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  inactivityPauseOpen?: boolean
  setInactivityPauseOpen?: (open: boolean) => void
  onResumeInactivity?: () => void
  answeredCount: number
  totalQuestions: number
  isPending: boolean
  submitDisabled?: boolean
  enableAnimation?: boolean
  onConfirmSubmit: () => void
  onConfirmExit: () => void
}

export const SessionModals = React.memo(function SessionModals({
  confirmOpen,
  setConfirmOpen,
  exitConfirmOpen,
  setExitConfirmOpen,
  inactivityPauseOpen = false,
  setInactivityPauseOpen,
  onResumeInactivity,
  answeredCount,
  totalQuestions,
  isPending,
  submitDisabled,
  enableAnimation = true,
  onConfirmSubmit,
  onConfirmExit
}: SessionModalsProps) {
  if (!enableAnimation) {
    return (
      <>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <DialogHeader className="text-center sm:text-center">
              <div
                className={cn(
                  'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs transition-colors',
                  answeredCount < totalQuestions
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                )}
              >
                {answeredCount < totalQuestions ? (
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <HelpCircle className="h-6 w-6" aria-hidden="true" />
                )}
              </div>
              <DialogTitle className="text-center text-base font-bold text-foreground">Confirm Submission</DialogTitle>
              <DialogDescription className="pt-1 text-center text-sm text-muted-foreground">
                You have answered <strong className="text-primary font-bold">{answeredCount}/{totalQuestions}</strong> questions. Are you sure you want to submit?
              </DialogDescription>
            </DialogHeader>
            <AnswerSaveBlockedNotice blocked={Boolean(submitDisabled)} />
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onConfirmSubmit}
                disabled={isPending || submitDisabled}
                className="rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
              >
                {isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
                <Pause className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle className="text-center text-base font-bold text-foreground">Pause Quiz?</DialogTitle>
              <DialogDescription className="pt-1 text-center text-sm text-muted-foreground">
                Your progress has been saved automatically. Do you want to pause and resume later?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExitConfirmOpen(false)}
                className="rounded-xl border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Resume Quiz
              </Button>
              <Button
                type="button"
                onClick={onConfirmExit}
                className="rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
              >
                Pause &amp; Exit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5-minute Inactivity Pause Modal */}
        <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
          <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
                <Pause className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle className="text-center text-base font-bold text-foreground">Auto-Paused</DialogTitle>
              <DialogDescription className="pt-1 text-center text-sm text-muted-foreground">
                You have been inactive for over 5 minutes. The timer has been paused to protect your exam progress.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                onClick={() => onResumeInactivity?.()}
                className="rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
              >
                Resume Quiz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Modern Animated Modals
  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-card-foreground">
          <DialogHeader className="text-center sm:text-center">
            <div
              className={cn(
                'mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xs transition-colors',
                answeredCount < totalQuestions
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              )}
            >
              {answeredCount < totalQuestions ? (
                <AlertCircle className="h-7 w-7" aria-hidden="true" />
              ) : (
                <HelpCircle className="h-7 w-7" aria-hidden="true" />
              )}
            </div>
            <DialogTitle className="text-center text-xl font-bold text-foreground">
              Confirm Exam Submission
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm leading-relaxed text-muted-foreground">
              You have completed <strong className="text-primary font-bold">{answeredCount}/{totalQuestions}</strong> questions. Do you want to submit your exam now?
            </DialogDescription>
          </DialogHeader>

          <AnswerSaveBlockedNotice blocked={Boolean(submitDisabled)} />

          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="h-11 flex-1 rounded-xl border-border bg-card font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirmSubmit}
              disabled={isPending || submitDisabled}
              className="h-11 flex-1 rounded-xl bg-primary hover:bg-primary-hover font-bold text-primary-foreground shadow-md transition-all cursor-pointer"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPending ? 'Submitting...' : 'Submit Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-card-foreground">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-primary" />

          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="text-center sm:text-center space-y-4">
              {/* Icon */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-xs text-primary">
                <Pause className="h-7 w-7" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <DialogTitle className="text-center text-lg font-black text-foreground tracking-tight">
                  Pause Exam?
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3">
                    {/* Progress indicator */}
                    <div className="mx-auto flex items-center justify-center gap-3 rounded-2xl bg-muted border border-border px-4 py-3">
                      <div className="text-center">
                        <div className="text-2xl font-black text-foreground tabular-nums">{answeredCount}<span className="text-muted-foreground text-lg font-bold">/{totalQuestions}</span></div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Answered</div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-2xl font-black text-primary tabular-nums">{Math.max(totalQuestions - answeredCount, 0)}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Remaining</div>
                      </div>
                    </div>

                    {/* Auto-save notice */}
                    <div className="flex items-center justify-center gap-1.5 text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">Progress saved automatically</span>
                    </div>
                  </div>
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 flex flex-col gap-2.5 sm:flex-col">
            <Button
              type="button"
              onClick={() => setExitConfirmOpen(false)}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Resume Quiz
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onConfirmExit}
              className="w-full h-11 rounded-2xl border-border bg-card text-muted-foreground font-semibold text-sm hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            >
              Pause & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modern 5-minute Inactivity Pause Modal */}
      <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
        <DialogContent className="max-w-sm rounded-3xl border border-border bg-card p-0 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-card-foreground">
          <div className="h-1.5 w-full bg-primary" />
          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="text-center sm:text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-xs text-primary">
                <Pause className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-center text-lg font-black text-foreground tracking-tight">
                  Auto-Paused
                </DialogTitle>
                <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
                  You have been inactive for over 5 minutes. The timer has been paused to protect your exam progress.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 flex flex-col">
            <Button
              type="button"
              onClick={() => onResumeInactivity?.()}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Resume Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})
