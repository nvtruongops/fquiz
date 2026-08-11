'use client'

import React from 'react'
import { CheckCircle2, XCircle, Bookmark, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { SessionQuestion, QuestionFeedback } from '@/lib/modules/quiz/types/session'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'

interface QuestionDisplayProps {
  question: SessionQuestion
  currentIndex: number
  totalQuestions: number
  selectedOptions: number[]
  submitted: boolean
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  onSelectOption: (idx: number) => void
  onNavigate?: (idx: number) => void
  onSubmit?: () => void
  onExit?: () => void
  isPending: boolean
  sessionMode: 'immediate' | 'review' | 'flashcard'
  enableAnimation?: boolean
  isExplanationOpen?: boolean
  onToggleExplanation?: () => void
  courseCode?: string
  quizTitle?: string
  quizId?: string
  focusedOption?: number | null
}

function useQuestionPin({
  question,
  showImmediateFeedback,
  lastAnswerResult,
  courseCode,
  quizTitle,
  quizId,
}: Pick<QuestionDisplayProps, 'question' | 'showImmediateFeedback' | 'lastAnswerResult' | 'courseCode' | 'quizTitle' | 'quizId'>) {
  const { pinnedQuestions, togglePinMutation } = usePinnedQuestions(courseCode)
  const isPinned = pinnedQuestions.some(
    (p) => (p.question_id && p.question_id === question._id) || p.text === question.text
  )

  const handleTogglePin = () => {
    const pinCorrectAnswer = showImmediateFeedback && lastAnswerResult?.correctAnswers
      ? lastAnswerResult.correctAnswers
      : (Array.isArray((question as any).correct_answer)
          ? (question as any).correct_answer
          : typeof (question as any).correct_answer === 'number'
            ? [(question as any).correct_answer]
            : [])

    togglePinMutation.mutate({
      question_id: question._id,
      quiz_id: quizId,
      quiz_title: quizTitle || courseCode,
      course_code: courseCode || 'GENERAL',
      text: question.text,
      options: question.options,
      correct_answer: pinCorrectAnswer,
      explanation: lastAnswerResult?.explanation || (question as any).explanation || '',
      image_url: question.image_url || '',
    })
  }

  return { isPinned, togglePinMutation, handleTogglePin }
}

/**
 * Standard / EOS Exam Minimal View (enableAnimation = false)
 * - Ultra-minimal flat exam UI (Image 1 style)
 * - Left column: Answer checkboxes (A, B, C, D) + Back/Next buttons
 * - Red vertical divider line: Click & Drag left/right to resize columns
 * - Right panel: Flat question text & options A., B., C., D. near top margin
 * - Zero CSS transition animations
 */
function StandardQuestionView({
  question,
  currentIndex,
  totalQuestions,
  selectedOptions,
  submitted,
  showImmediateFeedback,
  lastAnswerResult,
  onSelectOption,
  onNavigate,
  onSubmit,
  onExit,
  isPending,
  sessionMode,
  courseCode,
  quizTitle,
  quizId,
  focusedOption,
}: QuestionDisplayProps) {
  const [leftWidth, setLeftWidth] = React.useState<number>(220)
  const [wantFinish, setWantFinish] = React.useState<boolean>(false)
  const isDraggingRef = React.useRef(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = moveEvent.clientX - rect.left
      const clampedWidth = Math.max(140, Math.min(newWidth, 420))
      setLeftWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  const requiredSelectionCount = Math.max(question.answer_selection_count ?? 1, 1)
  const rawCorrect = lastAnswerResult?.correctAnswers ??
    (lastAnswerResult?.correctAnswer !== undefined ? [lastAnswerResult.correctAnswer] : undefined) ??
    (Array.isArray(question.correct_answer) ? question.correct_answer : typeof question.correct_answer === 'number' ? [question.correct_answer] : [])
  const correctAnswerSet = showImmediateFeedback ? (Array.isArray(rawCorrect) ? rawCorrect : []) : []

  const safeDisplayIndex = Math.min(Math.max(currentIndex, 0), Math.max(totalQuestions - 1, 0)) + 1

  const { isPinned, togglePinMutation, handleTogglePin } = useQuestionPin({
    question,
    showImmediateFeedback,
    lastAnswerResult,
    courseCode,
    quizTitle,
    quizId,
  })

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden select-none bg-background text-foreground font-sans">
      {/* Upper Split View: Answer Panel | Red Line | Question Content */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Column: Quick Answer Selector Panel (EOS Exam style) */}
        <div 
          style={{ width: `${leftWidth}px` }} 
          className="shrink-0 h-full flex flex-col p-3 border-r border-border bg-muted/20 overflow-y-auto"
        >
          <h3 className="text-sm font-bold text-center text-blue-800 dark:text-blue-400 mb-3">Answer</h3>

          {/* Checkbox / Radio list for A, B, C, D */}
          <div className="space-y-3 flex flex-col items-center justify-start pt-2">
            {question.options.map((_, idx) => {
              const isSelected = selectedOptions.includes(idx)
              const isFocused = focusedOption === idx
              const letter = String.fromCodePoint(65 + idx)
              const isDisabled = submitted || isPending

              return (
                <label
                  key={idx}
                  className={cn(
                    "flex items-center gap-1.5 py-0.5 px-2 text-xs font-semibold cursor-pointer transition-none select-none rounded w-24 justify-start",
                    isFocused && "bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/40",
                    isSelected && !isFocused && "text-blue-600 dark:text-blue-400 font-bold",
                    !isSelected && !isFocused && "text-foreground hover:text-blue-500",
                    isDisabled && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isFocused ? (
                    <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => !isDisabled && onSelectOption(idx)}
                    className="w-4 h-4 rounded-xs text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <span>{letter}</span>
                </label>
              )
            })}
          </div>

          {/* Navigation Buttons (Back & Next) placed directly below options */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate?.(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-2.5 py-1 rounded border border-border bg-card text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-none shadow-2xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.(currentIndex + 1)}
              disabled={currentIndex === totalQuestions - 1}
              className="px-2.5 py-1 rounded border border-border bg-card text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-none shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>

        {/* Red Resizable Splitter Line (Can be dragged left/right) */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1.5 shrink-0 h-full bg-red-600 hover:bg-red-500 cursor-col-resize select-none transition-colors"
          title="Kéo để điều chỉnh độ rộng 2 cột"
        />

        {/* Right Column: Flat Question Content (Attached near top margin) */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Top Header Bar inside question area - Full Width (Không resize) */}
          <div className="flex items-center justify-start gap-3 flex-wrap pb-2 border-b border-border w-full">
            <span className="text-xs font-bold text-foreground">
              Câu hỏi {safeDisplayIndex}/{totalQuestions}
            </span>
            <span className="text-[11px] text-muted-foreground italic">
              {requiredSelectionCount === 1 ? '(Choose 1 answer)' : `(Choose ${requiredSelectionCount} answers)`}
            </span>
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={togglePinMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
            >
              {isPinned ? 'Bỏ ghim' : 'Ghim câu'}
            </button>
            {(sessionMode === 'immediate' || (sessionMode === 'review' && submitted)) && (
              <UsageBadge
                count={question.usage_count}
                used_in_quizzes={question.used_in_quizzes?.length ? question.used_in_quizzes : (courseCode ? [courseCode] : [])}
              />
            )}
          </div>

          {/* Question Body & Options - Constrained max-w-3xl to avoid eye fatigue */}
          <div className="max-w-3xl w-full space-y-4">
            {/* Flat Question Text */}
            <p className="whitespace-pre-wrap text-sm sm:text-base font-normal leading-relaxed text-foreground font-sans">
              {question.text}
            </p>

            {/* Image if present */}
            {question.image_url && (
              <div className="my-3 border border-border bg-muted/20 p-2 rounded">
                <img
                  src={question.image_url}
                  alt="Minh họa câu hỏi"
                  className="max-h-[360px] w-auto object-contain"
                />
              </div>
            )}

            {/* Flat Option List A., B., C., D. */}
            <div className="space-y-2.5 pt-2">
              {question.options.map((option, idx) => {
                const isSelected = selectedOptions.includes(idx)
                const isCorrect = showImmediateFeedback && correctAnswerSet.includes(idx)
                const isWrongSelected = showImmediateFeedback && isSelected && !correctAnswerSet.includes(idx)
                const letter = String.fromCodePoint(65 + idx)
                const isDisabled = submitted || isPending

                return (
                  <div
                    key={idx}
                    onClick={() => !isDisabled && onSelectOption(idx)}
                    className={cn(
                      "p-2.5 rounded text-sm leading-relaxed cursor-pointer font-sans transition-none border",
                      isCorrect && "border-success-fg bg-success-bg/20 text-success-fg font-semibold",
                      isWrongSelected && "border-incorrect-border bg-incorrect-bg text-incorrect-fg font-semibold",
                      !isCorrect && !isWrongSelected && isSelected && "border-primary bg-primary/10 font-semibold text-primary",
                      !isCorrect && !isWrongSelected && !isSelected && "border-transparent text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="font-bold mr-2">{letter}.</span>
                    <span>{option}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom EOS Exam Footer Bar (Image 1, 2, 3 style) */}
      <div className="shrink-0 border-t border-border px-4 py-2 bg-card text-foreground font-sans text-xs flex items-center justify-between gap-4">
        {/* Bottom Left: Finish exam checkbox & Finish button */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={wantFinish}
              onChange={(e) => setWantFinish(e.target.checked)}
              className="w-3.5 h-3.5 rounded-xs accent-blue-600 cursor-pointer"
            />
            <span>I want to finish the exam.</span>
          </label>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!wantFinish}
            className="px-3 py-1 rounded border border-border bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-none"
          >
            Finish
          </button>
        </div>

        {/* Bottom Right: Exit button */}
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1 rounded border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-none"
            >
              Exit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Animated / Modern View (enableAnimation = true)
 * - Question Card & Options centered vertically and horizontally in workspace (Image 2 style)
 * - GSAP staggered entrance animations upon question change
 * - Rich option cards, hover micro-interactions, feedback badges
 */
function AnimatedQuestionView({
  question,
  currentIndex,
  totalQuestions,
  selectedOptions,
  submitted,
  showImmediateFeedback,
  lastAnswerResult,
  onSelectOption,
  isPending,
  sessionMode,
  courseCode,
  quizTitle,
  quizId,
  focusedOption,
}: QuestionDisplayProps) {
  const requiredSelectionCount = Math.max(question.answer_selection_count ?? 1, 1)
  const rawCorrect = lastAnswerResult?.correctAnswers ??
    (lastAnswerResult?.correctAnswer !== undefined ? [lastAnswerResult.correctAnswer] : undefined) ??
    (Array.isArray(question.correct_answer) ? question.correct_answer : typeof question.correct_answer === 'number' ? [question.correct_answer] : [])
  const correctAnswerSet = showImmediateFeedback ? (Array.isArray(rawCorrect) ? rawCorrect : []) : []

  const safeDisplayIndex = Math.min(Math.max(currentIndex, 0), Math.max(totalQuestions - 1, 0)) + 1

  const { isPinned, togglePinMutation, handleTogglePin } = useQuestionPin({
    question,
    showImmediateFeedback,
    lastAnswerResult,
    courseCode,
    quizTitle,
    quizId,
  })

  return (
    <div className="question-view-animated flex h-full w-full flex-col items-start justify-start quiz-scroll overflow-y-auto p-4 sm:p-6 sm:pt-8 md:pt-10 pb-12">
      <div className="question-card-inner shrink-0 max-w-3xl w-full border border-border bg-card/95 backdrop-blur-md p-5 sm:p-7 rounded-2xl shadow-lg transition-all duration-300 mb-10">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 shadow-2xs">
              Câu {safeDisplayIndex}/{totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground italic font-medium">
              {requiredSelectionCount === 1 ? '(Chọn 1 đáp án)' : `(Chọn ${requiredSelectionCount} đáp án)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(sessionMode === 'immediate' || (sessionMode === 'review' && submitted)) && (
              <UsageBadge
                count={question.usage_count}
                used_in_quizzes={question.used_in_quizzes?.length ? question.used_in_quizzes : (courseCode ? [courseCode] : [])}
              />
            )}
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={togglePinMutation.isPending}
              className={cn(
                "flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold cursor-pointer rounded-lg transition-all active:scale-95",
                isPinned
                  ? "border-amber-400/50 bg-amber-500/10 text-amber-500 shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Bookmark className={cn("w-3.5 h-3.5 transition-transform", isPinned && "fill-current scale-110")} />
              <span>{isPinned ? 'Đã ghim' : 'Ghim câu'}</span>
            </button>
          </div>
        </div>

        <p className="question-text-animated whitespace-pre-wrap text-base sm:text-lg font-normal leading-relaxed text-foreground tracking-tight">
          {question.text}
        </p>

        {question.image_url && (
          <div className="mt-4 border border-border bg-muted/30 p-2 rounded-xl">
            <div className="flex min-h-[220px] max-h-[420px] w-full items-center justify-center overflow-hidden rounded-lg bg-background">
              <img
                src={question.image_url}
                alt="Minh họa câu hỏi"
                className="h-full max-h-[420px] w-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedOptions.includes(idx)
            const isCorrect = showImmediateFeedback && correctAnswerSet.includes(idx)
            const isWrongSelected = showImmediateFeedback && isSelected && !correctAnswerSet.includes(idx)
            const isFocused = focusedOption === idx
            const optionKey = `${idx}-${option}`
            const isDisabled = submitted || isPending

            return (
              <button
                key={optionKey}
                onClick={() => !isDisabled && onSelectOption(idx)}
                disabled={isDisabled}
                className={cn(
                  'option-card w-full select-none min-h-[50px] py-2.5 px-4 text-left text-sm sm:text-base leading-relaxed transition-all duration-200 rounded-xl border-2 flex items-center gap-3.5 relative overflow-hidden group shadow-2xs',
                  isDisabled && 'cursor-not-allowed opacity-75',
                  !isDisabled && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                  isFocused && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-md',
                  isCorrect && 'border-success-fg/60 bg-success-bg/25 text-success-fg font-medium shadow-sm animate-in zoom-in-95 duration-200',
                  isWrongSelected && 'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-medium animate-in shake duration-200',
                  !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-primary bg-primary/10 font-semibold text-primary shadow-sm ring-2 ring-primary/20',
                  !isCorrect && !isWrongSelected && !isSelected && 'border-border bg-card/80 text-foreground hover:border-primary/50 hover:bg-muted/60'
                )}
              >
                <span className={cn(
                  'flex-none flex items-center justify-center w-7 h-7 rounded-lg font-extrabold text-xs transition-colors duration-200 shrink-0',
                  isCorrect && 'bg-success-fg text-white shadow-sm',
                  isWrongSelected && 'bg-incorrect-border text-white shadow-sm',
                  !isCorrect && !isWrongSelected && isSelected && 'bg-primary text-primary-foreground shadow-sm',
                  !isCorrect && !isWrongSelected && !isSelected && 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                )}>
                  {String.fromCodePoint(65 + idx)}
                </span>
                <span className="flex-1 whitespace-pre-wrap">{option}</span>
                {isCorrect && <CheckCircle2 className="w-5 h-5 text-success-fg flex-none self-center animate-in zoom-in duration-300" />}
                {isWrongSelected && <XCircle className="w-5 h-5 text-incorrect-fg flex-none self-center animate-in zoom-in duration-300" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const QuestionDisplay = React.memo(function QuestionDisplay(props: QuestionDisplayProps) {
  if (!props.question || !Array.isArray(props.question.options)) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-muted-foreground font-medium">
        Đang chuẩn bị câu hỏi...
      </div>
    )
  }
  if (!props.enableAnimation) {
    return <StandardQuestionView {...props} />
  }
  return <AnimatedQuestionView {...props} />
})

