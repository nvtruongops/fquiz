'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'

interface MobileFlashcardModalsProps {
  questionMapOpen: boolean
  setQuestionMapOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  effectiveTotal: number
  actualIndex: number
  onSelectIndex: (index: number) => void
  onConfirmExit: () => void
}

export function MobileFlashcardModals({
  questionMapOpen,
  setQuestionMapOpen,
  exitConfirmOpen,
  setExitConfirmOpen,
  effectiveTotal,
  actualIndex,
  onSelectIndex,
  onConfirmExit,
}: Readonly<MobileFlashcardModalsProps>) {
  return (
    <>
      {/* Question Map Modal (Card list) */}
      <Dialog open={questionMapOpen} onOpenChange={setQuestionMapOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black text-foreground">
              Flashcard Question List
            </DialogTitle>
          </DialogHeader>
          <div className="my-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: effectiveTotal }, (_, i) => {
                const isCurrent = i === actualIndex
                return (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectIndex(i)
                      setQuestionMapOpen(false)
                    }}
                    className={cn(
                      'h-10 rounded-xl font-black text-xs border transition-all active:scale-95 cursor-pointer',
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted text-foreground border-border hover:bg-muted/80'
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
              variant="outline"
              onClick={() => setQuestionMapOpen(false)}
              className="w-full h-10 rounded-xl font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              Exit Flashcard?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Your review progress will be saved automatically. You can continue anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              onClick={onConfirmExit}
              className="w-full bg-rose-600 py-5 font-bold text-white hover:bg-rose-700 rounded-xl"
            >
              Exit Session
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
    </>
  )
}
