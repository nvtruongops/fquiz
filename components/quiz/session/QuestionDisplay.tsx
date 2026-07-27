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
      <p className="mb-2 text-xs text-[#737373]">
        {requiredSelectionCount === 1
          ? '(Chọn 1 đáp án)'
          : `(Chọn ${requiredSelectionCount} đáp án)`}
      </p>
      <div className="max-w-3xl border border-[#d4d4d4] bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
          <p className="text-sm font-bold text-[#171717]">
            Câu {safeDisplayIndex}/{totalQuestions}
          </p>
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={togglePinMutation.isPending}
            className={cn(
              "flex items-center gap-1 border px-2 py-1 text-xs font-semibold cursor-pointer",
              isPinned
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-[#d4d4d4] bg-white text-[#525252] hover:bg-[#f5f5f5]"
            )}
          >
            <Bookmark className={cn("w-3.5 h-3.5", isPinned && "fill-current")} />
            <span>{isPinned ? 'Đã ghim' : 'Ghim câu'}</span>
          </button>
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#171717]">
          {question.text}
        </p>

        {question.image_url && (
          <div className="mt-4 border border-[#d4d4d4] bg-white p-2">
            <div className="flex min-h-[220px] max-h-[420px] w-full items-center justify-center overflow-hidden bg-[#fafafa]">
              <img
                src={question.image_url}
                alt="Minh họa câu hỏi"
                className="h-full max-h-[420px] w-full object-contain"
              />
            </div>
          </div>
        )}

        {(sessionMode === 'immediate' || (sessionMode === 'review' && submitted)) && (
          <div className="mt-3">
            <UsageBadge count={question.usage_count ?? 0} />
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
                className={cn(
                  'w-full select-none border px-3 py-2 text-left text-sm leading-relaxed',
                  isDisabled && 'cursor-not-allowed opacity-60',
                  !isDisabled && 'cursor-pointer',
                  isCorrect && 'border-green-600 bg-green-50 font-semibold text-green-800',
                  isWrongSelected && 'border-red-500 bg-red-50 font-semibold text-red-700',
                  !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-[#5D7B6F] bg-[#5D7B6F]/5 font-semibold text-[#3d5c50]',
                  !isCorrect && !isWrongSelected && !isSelected && 'border-[#d4d4d4] bg-white text-[#262626] hover:border-[#a3a3a3]'
                )}
              >
                <span className="font-semibold">{String.fromCodePoint(65 + idx)}.</span> {option}
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
    <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900/50 quiz-scroll overflow-y-auto px-4 py-6 sm:px-8">
      <div 
        key={question._id || currentIndex}
        className="max-w-4xl mx-auto w-full border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary tracking-wide">
              Câu {safeDisplayIndex} / {totalQuestions}
            </span>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">
              {requiredSelectionCount === 1
                ? '• Chọn 1 đáp án đúng'
                : `• Chọn ${requiredSelectionCount} đáp án đúng`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleTogglePin}
            disabled={togglePinMutation.isPending}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border",
              isPinned
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <Bookmark className={cn("w-3.5 h-3.5", isPinned && "fill-current text-amber-500")} />
            <span>{isPinned ? 'Đã ghim' : 'Ghim câu'}</span>
          </button>
        </div>

        <h2 className="text-lg sm:text-xl font-bold leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
          {question.text}
        </h2>

        {question.image_url && (
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-3 overflow-hidden shadow-inner group">
            <div className="flex min-h-[220px] max-h-[420px] w-full items-center justify-center overflow-hidden rounded-lg bg-white dark:bg-slate-900">
              <img
                src={question.image_url}
                alt="Minh họa câu hỏi"
                className="h-full max-h-[420px] w-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        )}

        {(sessionMode === 'immediate' || (sessionMode === 'review' && submitted)) && (
          <div className="mt-4">
            <UsageBadge count={question.usage_count ?? 0} size="md" />
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
                  'w-full select-none p-4 text-left text-sm sm:text-base leading-relaxed transition-all duration-300 rounded-xl border-2 flex items-start gap-3 relative overflow-hidden group',
                  isDisabled && 'cursor-not-allowed opacity-75',
                  !isDisabled && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                  isCorrect && 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium shadow-emerald-100 dark:shadow-none animate-in zoom-in-95 duration-200',
                  isWrongSelected && 'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-medium animate-in shake duration-200',
                  !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-primary bg-primary/5 dark:bg-primary/10 font-semibold text-primary shadow-sm ring-2 ring-primary/20',
                  !isCorrect && !isWrongSelected && !isSelected && 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                )}
              >
                <span className={cn(
                  'flex-none flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs transition-colors duration-200 mt-0.5',
                  isCorrect && 'bg-emerald-500 text-white shadow-sm',
                  isWrongSelected && 'bg-incorrect-border text-white shadow-sm',
                  !isCorrect && !isWrongSelected && isSelected && 'bg-primary text-white shadow-sm',
                  !isCorrect && !isWrongSelected && !isSelected && 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                )}>
                  {String.fromCodePoint(65 + idx)}
                </span>
                <span className="flex-1 whitespace-pre-wrap">{option}</span>
                {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-none self-center animate-in zoom-in duration-300" />}
                {isWrongSelected && <XCircle className="w-5 h-5 text-rose-500 flex-none self-center animate-in zoom-in duration-300" />}
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
      <div className="flex h-full items-center justify-center p-6 text-slate-500 font-medium">
        Đang chuẩn bị câu hỏi...
      </div>
    )
  }
  if (!props.enableAnimation) {
    return <StandardQuestionView {...props} />
  }
  return <AnimatedQuestionView {...props} />
})
