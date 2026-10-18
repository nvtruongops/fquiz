'use client'

import React from 'react'
import { BookOpen, RotateCcw, Play, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'

interface QuizResumeSessionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeSessionInfo: any
  onContinue: () => void
  onRestart: () => void
  onCloseResumeDialog: () => void
}

export function QuizResumeSessionModal({
  open,
  onOpenChange,
  activeSessionInfo,
  onContinue,
  onRestart,
  onCloseResumeDialog,
}: QuizResumeSessionModalProps) {
  const isFlashcardMode =
    activeSessionInfo?.mode === 'flashcard' || activeSessionInfo?.cardsUnknown > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButtonAriaLabel="Close previous session dialog"
        className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full sm:fixed sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md rounded-t-[24px] rounded-b-none sm:rounded-[24px] border-t sm:border border-border p-0 shadow-2xl overflow-hidden bg-card text-card-foreground flex flex-col h-auto max-h-[88dvh] sm:max-h-[90vh] max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-1/2 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-1/2 sm:data-[state=closed]:zoom-out-95 [&>button]:z-20 [&>button]:top-3.5 sm:[&>button]:top-4.5 [&>button]:right-3.5 sm:[&>button]:right-4.5 [&>button]:w-9 [&>button]:h-9 [&>button]:rounded-full [&>button]:bg-muted/60 [&>button:hover]:bg-muted [&>button]:text-muted-foreground [&>button:hover]:text-foreground [&>button]:border [&>button]:border-border/60 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:transition-all z-50"
      >
        <div className="flex flex-col h-full w-full">
          {isFlashcardMode ? (
            <>
              {/* Header */}
              <div className="bg-card border-b border-border/80 px-5 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-4 relative shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mb-2.5 sm:hidden" />
                <div className="flex items-center gap-2 mb-1.5 gsap-resume-item relative z-10">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full"
                  >
                    Flashcard Mode
                  </Badge>
                </div>
                <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground mb-1 gsap-resume-item relative z-10">
                  Resume Flashcards
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-[11px] sm:text-xs font-medium leading-relaxed gsap-resume-item relative z-10">
                  For this quiz in <strong className="text-foreground font-bold">Flashcard Mode</strong>, you still have{' '}
                  <strong className="text-primary font-bold">
                    {activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0}/
                    {activeSessionInfo?.totalCards ?? activeSessionInfo?.totalQuestions ?? 0} unlearned cards
                  </strong>
                  . Would you like to resume or start fresh?
                </DialogDescription>
              </div>

              {/* Body */}
              <div className="p-3.5 sm:p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="rounded-xl sm:rounded-2xl bg-primary/10 p-3 sm:p-3.5 border border-primary/20 gsap-resume-item">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      Unlearned cards progress
                    </span>
                    <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {activeSessionInfo?.cardsUnknown ?? 0}/{activeSessionInfo?.totalCards ?? 0} unlearned cards
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-0.5 gsap-resume-item">
                  <Button
                    onClick={onContinue}
                    className="h-11 min-h-[44px] w-full rounded-xl bg-primary hover:bg-primary/90 font-bold text-xs uppercase tracking-wider text-primary-foreground shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    <span>
                      Resume (Review{' '}
                      {activeSessionInfo?.cardsUnknown ?? activeSessionInfo?.answeredCount ?? 0} unlearned cards)
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRestart}
                    className="h-11 min-h-[44px] w-full rounded-xl border-border bg-card font-bold text-xs uppercase tracking-wider text-foreground hover:bg-muted transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Restart (Start from beginning)</span>
                  </Button>
                  <button
                    type="button"
                    onClick={onCloseResumeDialog}
                    className="min-h-[44px] py-2 text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer text-center flex items-center justify-center"
                  >
                    Change study mode
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="bg-card border-b border-border/80 px-5 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-4 relative shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20 mx-auto mb-2.5 sm:hidden" />
                <div className="flex items-center gap-2 mb-1.5 gsap-resume-item relative z-10">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full"
                  >
                    Incomplete Progress
                  </Badge>
                </div>
                <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground mb-1 gsap-resume-item relative z-10">
                  Previous Session Detected
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-[11px] sm:text-xs font-medium leading-relaxed gsap-resume-item relative z-10">
                  You have an unfinished quiz session. Would you like to resume where you left off?
                </DialogDescription>
              </div>

              {/* Body */}
              <div className="p-3.5 sm:p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="rounded-xl sm:rounded-2xl bg-primary/10 p-3 sm:p-3.5 border border-primary/20 gsap-resume-item">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      Current Progress
                    </span>
                    <span className="bg-primary/20 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-black">
                      {activeSessionInfo?.answeredCount ?? 0}/{activeSessionInfo?.totalQuestions ?? 0} QUESTIONS
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{
                        width: `${
                          ((activeSessionInfo?.answeredCount ?? 0) /
                            (activeSessionInfo?.totalQuestions ?? 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[10.5px] font-bold text-foreground uppercase tracking-tight">
                    Mode:{' '}
                    {activeSessionInfo?.mode === 'immediate'
                      ? 'Practice'
                      : activeSessionInfo?.mode === 'flashcard'
                      ? 'Flashcard'
                      : 'Exam'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-0.5 gsap-resume-item">
                  <Button
                    onClick={onContinue}
                    className="h-11 min-h-[44px] w-full rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-primary-foreground shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" aria-hidden="true" />
                    <span>Resume Quiz</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRestart}
                    className="h-11 min-h-[44px] w-full rounded-xl border-border bg-card font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    <span>Restart from Beginning</span>
                  </Button>
                  <button
                    type="button"
                    onClick={onCloseResumeDialog}
                    className="min-h-[44px] py-2 text-[10.5px] font-black text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors cursor-pointer text-center flex items-center justify-center"
                  >
                    Change study mode
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
