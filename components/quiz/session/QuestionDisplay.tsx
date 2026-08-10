'use client'

import React from 'react'
import { CheckCircle2, XCircle, Lightbulb, Bookmark } from 'lucide-react'
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
  isPending: boolean
  sessionMode: 'immediate' | 'review' | 'flashcard'
  enableAnimation?: boolean
  isExplanationOpen?: boolean
  onToggleExplanation?: () => void
  courseCode?: string
  quizTitle?: string
  quizId?: string
}

// Shared pin logic for both static & animated views
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

function StandardQuestionView({
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
    <div className="flex h-full flex-col quiz-scroll overflow-y-auto px-4 py-4 sm:px-6">
      <p className="mb-2 text-xs text-muted-foreground">
        {requiredSelectionCount === 1
          ? '(Chọn 1 đáp án)'
          : `(Chọn ${requiredSelectionCount} đáp án)`}
      </p>
      <div className="max-w-3xl border border-border bg-card p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
          <p className="text-sm font-bold text-foreground">
            Câu {safeDisplayIndex}/{totalQuestions}
          </p>
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
                "flex items-center gap-1 border px-2 py-1 text-xs font-semibold cursor-pointer rounded-lg transition-colors",
                isPinned
                  ? "border-amber-400/50 bg-amber-500/10 text-amber-500"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              <Bookmark className={cn("w-3.5 h-3.5", isPinned && "fill-current")} />
              <span>{isPinned ? 'Đã ghim' : 'Ghim câu'}</span>
            </button>
          </div>
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
          {question.text}
        </p>

        {question.image_url && (
          <div className="mt-4 border border-border bg-muted/30 p-2 rounded-xl">
            <div className="flex min-h-[220px] max-h-[420px] w-full items-center justify-center overflow-hidden bg-background rounded-lg">
              <img
                src={question.image_url}
                alt="Minh họa câu hỏi"
                className="h-full max-h-[420px] w-full object-contain"
              />
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {question.options.map((option, idx) => {
            const isSelected = selectedOptions.includes(idx)
            const isCorrect = showImmediateFeedback && correctAnswerSet.includes(idx)
            const isWrongSelected = showImmediateFeedback && isSelected && !correctAnswerSet.includes(idx)
            const optionKey = `${idx}-${option}`
            const isDisabled = submitted || isPending

            return (
              <button
                key={optionKey}
                onClick={() => !isDisabled && onSelectOption(idx)}
                disabled={isDisabled}
                aria-label={`Đáp án ${String.fromCodePoint(65 + idx)}: ${option}`}
                className={cn(
                  'w-full select-none border px-3.5 py-2.5 text-left text-sm leading-relaxed rounded-xl transition-all flex items-center justify-between gap-3',
                  isDisabled && 'cursor-not-allowed opacity-60',
                  !isDisabled && 'cursor-pointer',
                  isCorrect && 'border-success-fg/50 bg-success-bg/20 font-semibold text-success-fg',
                  isWrongSelected && 'border-incorrect-border bg-incorrect-bg font-semibold text-incorrect-fg',
                  !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-primary bg-primary/10 font-semibold text-primary',
                  !isCorrect && !isWrongSelected && !isSelected && 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="font-bold flex-none">{String.fromCodePoint(65 + idx)}.</span>
                  <span className="flex-1 whitespace-pre-wrap">{option}</span>
                </div>
                {isCorrect && <CheckCircle2 className="w-4 h-4 text-success-fg flex-none" />}
                {isWrongSelected && <XCircle className="w-4 h-4 text-incorrect-fg flex-none" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

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
    <div className="flex h-full flex-col bg-background quiz-scroll overflow-y-auto px-4 py-6 sm:px-8">
      <div 
        key={question._id || currentIndex}
        className="max-w-4xl mx-auto w-full border border-border bg-card backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl"
      >
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary tracking-wide">
              Câu {safeDisplayIndex} / {totalQuestions}
            </span>
            <p className="text-xs font-medium text-muted-foreground italic">
              {requiredSelectionCount === 1
                ? '• Chọn 1 đáp án đúng'
                : `• Chọn ${requiredSelectionCount} đáp án đúng`}
            </p>
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border",
                isPinned
                  ? "bg-question-flagged-bg text-question-flagged-fg border-question-flagged-border hover:bg-question-flagged-bg/80"
                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              )}
            >
              <Bookmark className={cn("w-3.5 h-3.5", isPinned && "fill-current text-question-flagged-fg")} />
              <span>{isPinned ? 'Đã ghim' : 'Ghim câu'}</span>
            </button>
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-bold leading-relaxed text-foreground whitespace-pre-wrap">
          {question.text}
        </h2>

        {question.image_url && (
          <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3 overflow-hidden shadow-inner group">
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
            const optionKey = `${idx}-${option}`
            const isDisabled = submitted || isPending

            return (
              <button
                key={optionKey}
                onClick={() => !isDisabled && onSelectOption(idx)}
                disabled={isDisabled}
                className={cn(
                  'option-card w-full select-none p-4 text-left text-sm sm:text-base leading-relaxed transition-all duration-300 rounded-xl border-2 flex items-start gap-3 relative overflow-hidden group',
                  isDisabled && 'cursor-not-allowed opacity-75',
                  !isDisabled && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                  isCorrect && 'border-success-fg/60 bg-success-bg/25 text-success-fg font-medium shadow-sm animate-in zoom-in-95 duration-200',
                  isWrongSelected && 'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-medium animate-in shake duration-200',
                  !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-primary bg-primary/10 font-semibold text-primary shadow-sm ring-2 ring-primary/20',
                  !isCorrect && !isWrongSelected && !isSelected && 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                )}
              >
                <span className={cn(
                  'flex-none flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs transition-colors duration-200 mt-0.5',
                  isCorrect && 'bg-success-fg text-white shadow-sm',
                  isWrongSelected && 'bg-incorrect-border text-white shadow-sm',
                  !isCorrect && !isWrongSelected && isSelected && 'bg-primary text-white shadow-sm',
                  !isCorrect && !isWrongSelected && !isSelected && 'bg-muted text-muted-foreground group-hover:bg-muted/80'
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
