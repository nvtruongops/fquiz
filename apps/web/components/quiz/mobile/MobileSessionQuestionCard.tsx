'use client'

import React from 'react'
import { Bookmark, CheckCircle2, PenTool, XCircle } from 'lucide-react'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { InteractiveText } from '@/components/shared/selection/InteractiveText'
import { cn } from '@/lib/core/utils/cn'
import type { SessionQuestion } from '@/lib/modules/quiz/types/session'
import { handleArrowOptionNavigation } from '@/components/quiz/option-keyboard-navigation'

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
  answerIsCorrect: boolean | null
  correctAnswerSet: number[]
  selectedOptions: number[]
  submitted: boolean
  isSubmitting: boolean
  onSelectOption: (optIndex: number) => void
  mode: string
  currentCourseCode?: string
}

function handleMobileOptionArrowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, optionIndex: number, optionCount: number, onSelectOption: (index: number) => void) {
  handleArrowOptionNavigation(event, optionIndex, optionCount, onSelectOption, (nextIndex) => {
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[data-answer-option]').item(nextIndex)?.focus()
  })
}

function getOptionTabIndex(isSingleChoice: boolean, isSelected: boolean, selectedCount: number, optionIndex: number) {
  if (!isSingleChoice) return undefined
  return isSelected || (!selectedCount && optionIndex === 0) ? 0 : -1
}

function getOptionStatusStyle(showImmediateFeedback: boolean, isCorrect: boolean, isSelected: boolean) {
  if (!showImmediateFeedback) {
    return isSelected ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm' : 'border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted'
  }
  if (isCorrect) return 'border-success-border bg-success-bg text-success-fg font-bold ring-1 ring-success-border/30'
  if (isSelected) return 'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-bold ring-1 ring-incorrect-border/30'
  return 'border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted'
}

function MobileOptionFeedback({ showImmediateFeedback, isCorrect, isSelected }: { showImmediateFeedback: boolean; isCorrect: boolean; isSelected: boolean }) {
  if (!showImmediateFeedback) return null
  if (isCorrect) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-fg bg-background/90 px-2 py-0.5 rounded border border-success-border shrink-0">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success-fg" /> Correct
      </span>
    )
  }
  if (isSelected) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-incorrect-fg bg-background/90 px-2 py-0.5 rounded border border-incorrect-border shrink-0">
        <XCircle aria-hidden="true" className="h-4 w-4 text-incorrect-fg" /> Incorrect
      </span>
    )
  }
  return null
}

function MobileQuestionAnnouncement({ effectiveIndex, showImmediateFeedback, answerIsCorrect }: Pick<MobileSessionQuestionCardProps, 'effectiveIndex' | 'showImmediateFeedback' | 'answerIsCorrect'>) {
  const announcement = showImmediateFeedback && answerIsCorrect !== null
    ? `Question ${effectiveIndex + 1}: ${answerIsCorrect ? 'Correct' : 'Incorrect'}.`
    : ''
  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
}

function MobileQuestionNoteBanner({ isNoteMode }: { isNoteMode: boolean }) {
  if (!isNoteMode) return null
  return (
    <div className="flex items-center gap-2 rounded-xl bg-warning-bg border border-warning-border p-3 text-xs font-bold text-warning-fg">
      <PenTool aria-hidden="true" className="h-4 w-4 text-warning-fg shrink-0 animate-bounce" />
      <span>Lookup Pen is ON: You can freely highlight text to look up vocabulary (answer selection paused).</span>
    </div>
  )
}

function MobileQuestionMeta({ question, effectiveIndex, effectiveTotal, requiredSelectionCount, isQuestionPinned, isPinPending, onTogglePin, currentCourseCode }: Pick<MobileSessionQuestionCardProps, 'question' | 'effectiveIndex' | 'effectiveTotal' | 'requiredSelectionCount' | 'isQuestionPinned' | 'isPinPending' | 'onTogglePin' | 'currentCourseCode'>) {
  return (
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
          type="button" onClick={onTogglePin} disabled={isPinPending}
          aria-label={isQuestionPinned ? 'Unpin question' : 'Pin question'} aria-pressed={isQuestionPinned}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm shrink-0',
            isQuestionPinned ? 'bg-warning-bg text-warning-fg border-warning-border' : 'bg-card text-card-foreground border-border hover:bg-muted'
          )}
        >
          <Bookmark aria-hidden="true" className={cn('w-3.5 h-3.5', isQuestionPinned && 'fill-current text-warning-fg')} />
          <span>{isQuestionPinned ? 'Pinned' : 'Pin'}</span>
        </button>
        <UsageBadge count={question.usage_count} used_in_quizzes={question.used_in_quizzes} currentCourseCode={currentCourseCode} size="sm" align="right" />
      </div>
    </div>
  )
}

function MobileQuestionBody({ question }: { question: SessionQuestion }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-card-foreground">
      <p className="whitespace-pre-wrap text-base leading-relaxed text-card-foreground">
        <InteractiveText content={question.text} sourceType="quiz" sourceId={question._id} />
      </p>
      {question.image_url && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <img src={question.image_url} alt="Question Attachment" className="max-h-64 w-full object-contain bg-muted" />
        </div>
      )}
    </div>
  )
}

function MobileSessionOption({
  option,
  optionIndex,
  question,
  isSingleChoice,
  isNoteMode,
  showImmediateFeedback,
  correctAnswerSet,
  selectedOptions,
  submitted,
  isSubmitting,
  onSelectOption,
}: Pick<MobileSessionQuestionCardProps, 'question' | 'isNoteMode' | 'showImmediateFeedback' | 'correctAnswerSet' | 'selectedOptions' | 'submitted' | 'isSubmitting' | 'onSelectOption'> & {
  option: string
  optionIndex: number
  isSingleChoice: boolean
}) {
  const isSelected = selectedOptions.includes(optionIndex)
  const isCorrect = correctAnswerSet.includes(optionIndex)
  const statusStyle = getOptionStatusStyle(showImmediateFeedback, isCorrect, isSelected)

  return (
    <button
      type="button"
      role={isSingleChoice ? 'radio' : 'checkbox'}
      aria-checked={isSelected}
      tabIndex={getOptionTabIndex(isSingleChoice, isSelected, selectedOptions.length, optionIndex)}
      data-answer-option
      onClick={() => onSelectOption(optionIndex)}
      onKeyDown={isSingleChoice ? (event) => handleMobileOptionArrowKeyDown(event, optionIndex, question.options.length, onSelectOption) : undefined}
      disabled={submitted || isSubmitting || isNoteMode}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-none cursor-pointer',
        isNoteMode && 'cursor-text border-dashed border-warning-border bg-warning-bg/10',
        statusStyle
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border font-bold text-xs">
        {String.fromCharCode(65 + optionIndex)}
      </div>
      <span className="flex-1 text-sm font-medium leading-normal">
        <InteractiveText content={option} sourceType="quiz" sourceId={question._id} />
      </span>
      <MobileOptionFeedback showImmediateFeedback={showImmediateFeedback} isCorrect={isCorrect} isSelected={isSelected} />
    </button>
  )
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
  answerIsCorrect,
  correctAnswerSet,
  selectedOptions,
  submitted,
  isSubmitting,
  onSelectOption,
  mode,
  currentCourseCode,
}: MobileSessionQuestionCardProps) {
  const isSingleChoice = requiredSelectionCount <= 1

  return (
    <div className="space-y-4">
      <MobileQuestionAnnouncement effectiveIndex={effectiveIndex} showImmediateFeedback={showImmediateFeedback} answerIsCorrect={answerIsCorrect} />
      <MobileQuestionNoteBanner isNoteMode={isNoteMode} />
      <MobileQuestionMeta question={question} effectiveIndex={effectiveIndex} effectiveTotal={effectiveTotal} requiredSelectionCount={requiredSelectionCount} isQuestionPinned={isQuestionPinned} isPinPending={isPinPending} onTogglePin={onTogglePin} currentCourseCode={currentCourseCode} />
      <MobileQuestionBody question={question} />

      {/* Options List */}
      <div
        role={isSingleChoice ? 'radiogroup' : 'group'}
        aria-label={`Question ${effectiveIndex + 1} answer options`}
        className="space-y-3"
      >
        {question.options.map((option, optionIndex) => (
          <MobileSessionOption
            key={optionIndex}
            option={option}
            optionIndex={optionIndex}
            question={question}
            isSingleChoice={isSingleChoice}
            isNoteMode={isNoteMode}
            showImmediateFeedback={showImmediateFeedback}
            correctAnswerSet={correctAnswerSet}
            selectedOptions={selectedOptions}
            submitted={submitted}
            isSubmitting={isSubmitting}
            onSelectOption={onSelectOption}
          />
        ))}
      </div>
    </div>
  )
}
