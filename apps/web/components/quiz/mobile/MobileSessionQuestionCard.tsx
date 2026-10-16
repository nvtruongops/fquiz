'use client'

import React from 'react'
import { Bookmark, CheckCircle2, PenTool, XCircle } from 'lucide-react'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { InteractiveText } from '@/components/shared/selection/InteractiveText'
import { cn } from '@/lib/core/utils/cn'
import type { SessionQuestion } from '@/lib/modules/quiz/types/session'

interface MobileSessionQuestionCardProps {
  question: SessionQuestion
  effectiveIndex: number
  effectiveTotal: number
  requiredSelectionCount: number
  isQuestionPinned: boolean
  isPinPending: boolean
  onTogglePin: () => void
  isNoteMode: boolean
  showImmediateFeedback: boolean
  correctAnswerSet: number[]
  selectedOptions: number[]
  submitted: boolean
  isSubmitting: boolean
  onSelectOption: (optIndex: number) => void
  mode: string
  currentCourseCode?: string
}

export function MobileSessionQuestionCard({
  question,
  effectiveIndex,
  effectiveTotal,
  requiredSelectionCount,
  isQuestionPinned,
  isPinPending,
  onTogglePin,
  isNoteMode,
  showImmediateFeedback,
  correctAnswerSet,
  selectedOptions,
  submitted,
  isSubmitting,
  onSelectOption,
  mode,
  currentCourseCode,
}: MobileSessionQuestionCardProps) {
  return (
    <div className="space-y-4">
      {/* Note Mode Alert Banner */}
      {isNoteMode && (
        <div className="flex items-center gap-2 rounded-xl bg-warning-bg border border-warning-border p-3 text-xs font-bold text-warning-fg">
          <PenTool aria-hidden="true" className="h-4 w-4 text-warning-fg shrink-0 animate-bounce" />
          <span>Lookup Pen is ON: You can freely highlight text to look up vocabulary (answer selection paused).</span>
        </div>
      )}

      {/* Question Meta Bar */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary border border-primary/20">
            Question {effectiveIndex + 1}/{effectiveTotal}
          </span>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            {requiredSelectionCount <= 1 ? '• Select 1 answer' : `• Select ${requiredSelectionCount} answers`}
            <span className="hidden sm:inline"> • Swipe 👈 👉 to change question</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onTogglePin}
            disabled={isPinPending}
            aria-label={isQuestionPinned ? 'Unpin question' : 'Pin question'}
            aria-pressed={isQuestionPinned}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm shrink-0',
              isQuestionPinned
                ? 'bg-warning-bg text-warning-fg border-warning-border'
                : 'bg-card text-card-foreground border-border hover:bg-muted'
            )}
          >
            <Bookmark aria-hidden="true" className={cn('w-3.5 h-3.5', isQuestionPinned && 'fill-current text-warning-fg')} />
            <span>{isQuestionPinned ? 'Pinned' : 'Pin'}</span>
          </button>

          <UsageBadge
            count={question.usage_count}
            used_in_quizzes={question.used_in_quizzes}
            currentCourseCode={currentCourseCode}
            size="sm"
            align="right"
          />
        </div>
      </div>

      {/* Question Text */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-card-foreground">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-card-foreground">
          <InteractiveText content={question.text} sourceType="quiz" sourceId={question._id} />
        </p>

        {question.image_url && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <img
              src={question.image_url}
              alt="Question Attachment"
              className="max-h-64 w-full object-contain bg-muted"
            />
          </div>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-3">
        {question.options.map((optText, optIndex) => {
          const isSelected = selectedOptions.includes(optIndex)
          let statusStyle = 'border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted'

          if (showImmediateFeedback) {
            const isCorrect = correctAnswerSet.includes(optIndex)
            if (isCorrect) {
              statusStyle =
                'border-success-border bg-success-bg text-success-fg font-bold ring-1 ring-success-border/30'
            } else if (isSelected) {
              statusStyle =
                'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-bold ring-1 ring-incorrect-border/30'
            }
          } else if (isSelected) {
            statusStyle = 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
          }

          return (
            <button
              key={optIndex}
              type="button"
              onClick={() => {
                if (isNoteMode) return
                onSelectOption(optIndex)
              }}
              disabled={submitted || isSubmitting || isNoteMode}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer',
                isNoteMode && 'cursor-text border-dashed border-warning-border bg-warning-bg/10',
                statusStyle
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border font-bold text-xs">
                {String.fromCharCode(65 + optIndex)}
              </div>
              <span className="flex-1 text-sm font-medium leading-normal">
                <InteractiveText content={optText} sourceType="quiz" sourceId={question._id} />
              </span>
              {showImmediateFeedback && correctAnswerSet.includes(optIndex) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-fg bg-background/90 px-2 py-0.5 rounded border border-success-border shrink-0">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success-fg" /> Correct
                </span>
              )}
              {showImmediateFeedback && !correctAnswerSet.includes(optIndex) && isSelected && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-incorrect-fg bg-background/90 px-2 py-0.5 rounded border border-incorrect-border shrink-0">
                  <XCircle aria-hidden="true" className="h-4 w-4 text-incorrect-fg" /> Incorrect
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
