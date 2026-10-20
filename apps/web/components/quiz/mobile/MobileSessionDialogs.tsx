'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import { cn } from '@/lib/core/utils/cn'
import { AnswerSaveBlockedNotice } from '@/components/quiz/session/SessionSaveStatus'

interface MobileSessionDialogsProps {
  confirmOpen: boolean
  setConfirmOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  questionMapOpen: boolean
  setQuestionMapOpen: (open: boolean) => void
  answeredCount: number
  effectiveTotal: number
  effectiveIndex: number
  answeredFromSession: Set<number>
  onConfirmSubmit: () => void
  onConfirmExitQuiz: () => void
  onNavigate: (index: number) => void
  navigationDisabled?: boolean
  isFinalizePending: boolean
  submitDisabled?: boolean
}

export function MobileSessionDialogs({
  confirmOpen,
  setConfirmOpen,
  exitConfirmOpen,
  setExitConfirmOpen,
  questionMapOpen,
  setQuestionMapOpen,
  answeredCount,
  effectiveTotal,
  effectiveIndex,
  answeredFromSession,
  onConfirmSubmit,
  onConfirmExitQuiz,
  onNavigate,
  navigationDisabled = false,
  isFinalizePending,
  submitDisabled,
}: MobileSessionDialogsProps) {
  return (
    <>
      {/* Submit Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6 bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-card-foreground">Confirm Submission</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              You have answered {answeredCount}/{effectiveTotal} questions. Are you sure you want to submit?
            </DialogDescription>
          </DialogHeader>
          <AnswerSaveBlockedNotice blocked={Boolean(submitDisabled)} />
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              onClick={onConfirmSubmit}
              disabled={isFinalizePending || submitDisabled}
              className="w-full bg-primary py-5 font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Submit Quiz
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="w-full py-5 font-bold text-muted-foreground"
            >
              Keep Going
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-foreground">Exit Exam Room?</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Your progress will be saved automatically. You can continue later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button type="button" variant="destructive" onClick={onConfirmExitQuiz} className="w-full py-5 font-bold">
              Exit Exam
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setExitConfirmOpen(false)}
              className="w-full py-5 font-bold text-muted-foreground"
            >
              Stay & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Map Dialog */}
      <Dialog open={questionMapOpen} onOpenChange={setQuestionMapOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-5 bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black text-card-foreground">
              Question List
            </DialogTitle>
          </DialogHeader>
          <div className="my-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: effectiveTotal }, (_, i) => {
                const isCurrent = i === effectiveIndex
                const isAnswered = answeredFromSession.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={navigationDisabled}
                    onClick={() => {
                      onNavigate(i)
                      setQuestionMapOpen(false)
                    }}
                    className={cn(
                      'h-10 rounded-xl font-black text-xs border transition-all active:scale-95 cursor-pointer flex items-center justify-center relative',
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30'
                        : isAnswered
                        ? 'bg-primary/10 text-primary border-primary/30 font-bold'
                        : 'bg-muted text-card-foreground border-border hover:bg-muted/80'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuestionMapOpen(false)}
              className="w-full h-10 rounded-xl font-bold border-border text-card-foreground"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
