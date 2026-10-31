'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface QuizSidebarProps {
  onNavigate: (index: number) => void
  onSubmit: () => void
  currentIndex: number
  totalQuestions: number
  isPending: boolean
  submitDisabled?: boolean
  answeredCount: number
  navigationDisabled?: boolean
  enableAnimation?: boolean
  answeredSet?: Set<number>
  onExit?: () => void
}

const QuizSidebar = React.memo(function QuizSidebar({
  onNavigate,
  onSubmit,
  currentIndex,
  totalQuestions,
  isPending,
  submitDisabled,
  answeredCount,
  navigationDisabled = false,
  enableAnimation = true,
  answeredSet,
  onExit,
}: Readonly<QuizSidebarProps>) {
  // Modern Sidebar View (Supports both animated and static modes)
  return (
    <aside className={cn(
      "w-[240px] shrink-0 border-r border-border bg-card/95 backdrop-blur-md sm:w-[270px] flex flex-col z-10 text-card-foreground",
      !enableAnimation && "backdrop-blur-none bg-card"
    )}>
      <div className="quiz-scroll flex h-full flex-col overflow-y-auto p-4 space-y-5">
        
        {/* Question Grid Matrix (Interactive Navigator) */}
        <div className="flex-1 min-h-0 bg-muted/50 p-3 rounded-2xl border border-border flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Question Palette
            </h4>
            <span className="text-[11px] font-black text-primary">
              {answeredCount}/{totalQuestions} questions
            </span>
          </div>

          <div className="quiz-scroll flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-6 gap-1.5 p-1.5">
              {Array.from({ length: totalQuestions }, (_, i) => {
                const isCurrent = i === currentIndex
                const isAnswered = answeredSet ? answeredSet.has(i) : false

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate(i)}
                    disabled={navigationDisabled}
                    aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ', not answered'}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cn(
                      'h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all duration-200 relative cursor-pointer',
                      isAnswered
                        ? 'bg-primary text-primary-foreground font-black shadow-2xs'
                        : 'bg-card text-card-foreground border border-border hover:border-primary/50 hover:bg-muted',
                      isCurrent && 'ring-2 ring-primary ring-offset-1 ring-offset-card font-extrabold z-10 scale-105'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Keep sequential navigation beside the submit controls, after the question palette. */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={navigationDisabled || currentIndex === 0}
            className="h-10 rounded-xl border-border bg-card text-xs font-bold shadow-2xs hover:bg-muted transition-all text-foreground"
            title="Previous question (←)"
          >
            <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4 text-primary" /> Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={navigationDisabled || currentIndex === totalQuestions - 1}
            className="h-10 rounded-xl border-border bg-card text-xs font-bold shadow-2xs hover:bg-muted transition-all text-foreground"
            title="Next question (→)"
          >
            Next <ChevronRight aria-hidden="true" className="ml-1 h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Action Panel */}
        <div className="pt-2 space-y-2 mt-auto">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending || submitDisabled}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-sm shadow-md transition-all cursor-pointer active:scale-98"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> Submitting...
              </span>
            ) : (
              <span>Submit Quiz ({answeredCount}/{totalQuestions})</span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onExit}
            className="w-full h-10 rounded-xl border border-border bg-card text-destructive font-bold text-xs hover:bg-destructive/10 shadow-2xs transition-all cursor-pointer"
          >
            Pause & Exit
          </Button>
        </div>
      </div>
    </aside>
  )
})

export default QuizSidebar
