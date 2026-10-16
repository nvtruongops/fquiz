'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight, BookOpen, AlertCircle, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'

export interface ResultQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
  submitted_answer: number | number[] | null
  is_correct: boolean
}

interface InteractiveResultViewerProps {
  questions: ResultQuestion[]
}

type FilterType = 'all' | 'correct' | 'incorrect' | 'unanswered'

export function InteractiveResultViewer({ questions }: Readonly<InteractiveResultViewerProps>) {
  // Find first wrong or unanswered question as default selected index, or 0
  const initialIndex = questions.findIndex(q => !q.is_correct) >= 0 
    ? questions.findIndex(q => !q.is_correct) 
    : 0

  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex)
  const [filter, setFilter] = useState<FilterType>('all')
  const [isMobileMatrixOpen, setIsMobileMatrixOpen] = useState<boolean>(false)

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground font-bold text-xs">
        No question detail information available.
      </div>
    )
  }

  const currentQuestion = questions[selectedIndex] || questions[0]
  const totalQuestions = questions.length

  // Stats calculation
  const correctCount = questions.filter(q => q.is_correct).length
  const unansweredCount = questions.filter(
    q => q.submitted_answer === null || q.submitted_answer === undefined || (Array.isArray(q.submitted_answer) && q.submitted_answer.length === 0)
  ).length
  const incorrectCount = totalQuestions - correctCount - unansweredCount

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex < totalQuestions - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const handleSelectQuestion = (idx: number) => {
    setSelectedIndex(idx)
    setIsMobileMatrixOpen(false)
  }

  return (
    <div className="w-full max-w-full h-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch overflow-hidden">
      {/* Left Panel: Compact Question Matrix & Filters */}
      <div className="md:col-span-3 lg:col-span-3 xl:col-span-3 bg-card rounded-2xl p-3 sm:p-3.5 shadow-2xs border border-border flex flex-col h-auto md:h-full min-h-0 overflow-hidden shrink-0">
        {/* Header (Clickable toggle on mobile only) */}
        <button 
          type="button"
          onClick={() => setIsMobileMatrixOpen(!isMobileMatrixOpen)}
          aria-expanded={isMobileMatrixOpen}
          aria-label="Expand or collapse question list"
          className="w-full flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border shrink-0 cursor-pointer md:cursor-default select-none text-left"
        >
          <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen aria-hidden="true" className="h-4 w-4 text-primary shrink-0" />
            Questions ({totalQuestions})
            <span className="inline-flex md:hidden items-center text-[10px] font-black text-muted-foreground ml-1 bg-muted px-2 py-0.5 rounded-full border border-border">
              {isMobileMatrixOpen ? <ChevronUp aria-hidden="true" className="h-3 w-3" /> : <ChevronDown aria-hidden="true" className="h-3 w-3" />}
            </span>
          </span>
          <span className="text-[11px] font-black text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
            Correct {correctCount}/{totalQuestions}
          </span>
        </button>

        {/* Matrix content container: Hidden on mobile unless toggled open */}
        <div className={cn("flex flex-col flex-1 min-h-0 transition-all", !isMobileMatrixOpen && "hidden md:flex")}>
          {/* Filter Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-xl text-[9px] sm:text-[10px] font-black select-none my-2 sm:my-3 shrink-0 border border-border">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'py-1 rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'all'
                  ? 'bg-card text-foreground border border-border shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All ({totalQuestions})
            </button>
            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={cn(
                'py-1 rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'correct'
                  ? 'bg-success-bg text-success-fg border border-success-border shadow-2xs font-black'
                  : 'text-success-fg hover:bg-success-bg/40'
              )}
            >
              Correct ({correctCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('incorrect')}
              className={cn(
                'py-1 rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'incorrect'
                  ? 'bg-incorrect-bg text-incorrect-fg border border-incorrect-border shadow-2xs font-black'
                  : 'text-incorrect-fg hover:bg-incorrect-bg/50'
              )}
            >
              Wrong ({incorrectCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unanswered')}
              className={cn(
                'py-1 rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'unanswered'
                  ? 'bg-primary text-primary-foreground shadow-2xs font-black'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Skipped ({unansweredCount})
            </button>
          </div>

          {/* Matrix Grid (Compact Buttons w-6 h-6 on mobile, 8-10 cols) */}
          <div className="max-h-[160px] md:max-h-none flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar">
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1 sm:gap-1.5 p-0.5">
              {questions.map((q, idx) => {
                const notAnswered =
                  q.submitted_answer === null ||
                  q.submitted_answer === undefined ||
                  (Array.isArray(q.submitted_answer) && q.submitted_answer.length === 0)

                const isCorrect = q.is_correct
                const isIncorrect = !notAnswered && !isCorrect

                // Apply Filter logic
                if (filter === 'correct' && !isCorrect) return null
                if (filter === 'incorrect' && !isIncorrect) return null
                if (filter === 'unanswered' && !notAnswered) return null

                const isSelected = selectedIndex === idx

                let btnBg = 'bg-muted text-card-foreground hover:bg-muted/80'
                if (notAnswered) {
                  btnBg = 'bg-muted/60 text-muted-foreground hover:bg-muted'
                } else if (isCorrect) {
                  btnBg = 'bg-success-bg text-success-fg border border-success-border hover:opacity-90'
                } else if (isIncorrect) {
                  btnBg = 'bg-incorrect-bg text-incorrect-fg border border-incorrect-border hover:opacity-90'
                }

                return (
                  <button
                    key={q._id || idx}
                    type="button"
                    onClick={() => handleSelectQuestion(idx)}
                    aria-label={`Question ${idx + 1}: ${notAnswered ? 'Unanswered' : isCorrect ? 'Correct' : 'Incorrect'}`}
                    aria-current={isSelected ? 'step' : undefined}
                    className={cn(
                      'w-6 h-6 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-[11px] font-black transition-all flex items-center justify-center relative select-none mx-auto border border-transparent cursor-pointer',
                      btnBg,
                      isSelected && 'border-2 border-primary ring-2 ring-primary/20 font-black z-10 shadow-2xs'
                    )}
                    title={`Question ${idx + 1}: ${notAnswered ? 'Unanswered' : isCorrect ? 'Correct' : 'Incorrect'}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend Footer */}
          <div className="pt-2 mt-1.5 border-t border-border flex items-center justify-around text-[9px] sm:text-[10px] font-black text-muted-foreground select-none shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success-fg inline-block" /> Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-incorrect-fg inline-block" /> Incorrect
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> Skipped
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel: Detailed View of Active Selected Question */}
      <div className="md:col-span-9 lg:col-span-9 xl:col-span-9 h-full min-h-0 flex flex-col overflow-hidden">
        <QuestionDetailCard
          key={currentQuestion._id || selectedIndex}
          question={currentQuestion}
          index={selectedIndex}
          totalQuestions={totalQuestions}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>
    </div>
  )
}

function QuestionDetailCard({
  question: q,
  index: idx,
  totalQuestions,
  onPrev,
  onNext,
}: Readonly<{
  question: ResultQuestion
  index: number
  totalQuestions: number
  onPrev: () => void
  onNext: () => void
}>) {
  const [showExplanation, setShowExplanation] = useState<boolean>(false)
  const correctAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]
  const submittedAnswers =
    q.submitted_answer === null || q.submitted_answer === undefined
      ? []
      : Array.isArray(q.submitted_answer)
        ? q.submitted_answer
        : [q.submitted_answer]

  const notAnswered = submittedAnswers.length === 0
  const hasExplanation = Boolean(q.explanation && q.explanation.trim().length > 0)

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-2xs border border-border flex flex-col h-full min-h-0 overflow-hidden">
      {/* Question Header & Status */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-black text-xs uppercase tracking-wider border border-border">
            QUESTION {idx + 1} / {totalQuestions}
          </span>
        </div>

        <div>
          {notAnswered ? (
            <Badge className="bg-muted text-muted-foreground border border-border text-xs font-black px-3 py-1.5 rounded-full">
              <MinusCircle aria-hidden="true" className="h-3.5 w-3.5 mr-1 inline text-muted-foreground" /> Unanswered
            </Badge>
          ) : q.is_correct ? (
            <Badge className="bg-success-bg text-success-fg border border-success-border text-xs font-black px-3 py-1.5 rounded-full">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 inline text-success-fg" /> Correct
            </Badge>
          ) : (
            <Badge className="bg-incorrect-bg text-incorrect-fg border border-incorrect-border text-xs font-black px-3 py-1.5 rounded-full">
              <XCircle aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 inline text-incorrect-fg" /> Incorrect
            </Badge>
          )}
        </div>
      </div>

      {/* Main Scrollable Content Box (Question text + Image + Options + Explanation) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-8 space-y-4 my-2 custom-scrollbar">
        {/* Question Text - Anti-copy select-none */}
        <p className="text-foreground font-extrabold text-sm md:text-base leading-relaxed whitespace-pre-wrap select-none pt-1">
          {q.text}
        </p>

        {/* Question Image */}
        {q.image_url && (
          <div className="flex justify-center rounded-2xl bg-muted p-2 border border-border select-none">
            <img
              src={
                /^(https?:\/\/|\/|data:image\/)/i.test(q.image_url) && !/javascript:/i.test(q.image_url)
                  ? q.image_url
                  : ''
              }
              alt={`Question ${idx + 1}`}
              className="max-h-56 object-contain rounded-xl select-none"
            />
          </div>
        )}

        {/* Options List - Anti-copy select-none */}
        <div className="space-y-2.5 select-none">
          {(q?.options || []).map((option: string, optIdx: number) => {
            const isCorrectAnswer = correctAnswers.includes(optIdx)
            const isSubmittedAnswer = submittedAnswers.includes(optIdx)

            let borderColor = 'border-border'
            let bgColor = 'bg-muted/30'
            let textColor = 'text-foreground'
            let circleBg = 'bg-card border-border text-muted-foreground'
            let indicator = null

            if (isCorrectAnswer && isSubmittedAnswer) {
              borderColor = 'border-success-border'
              bgColor = 'bg-success-bg/90'
              textColor = 'text-success-fg font-black'
              circleBg = 'bg-primary text-primary-foreground border-primary'
              indicator = (
                <div className="w-6 h-6 rounded-full border border-success-border bg-card text-success-fg flex items-center justify-center shrink-0">
                  <Check aria-hidden="true" className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )
            } else if (isCorrectAnswer) {
              borderColor = 'border-success-border'
              bgColor = 'bg-success-bg/40'
              textColor = 'text-success-fg font-black'
              circleBg = 'bg-primary text-primary-foreground border-primary'
              indicator = (
                <div className="w-6 h-6 rounded-full border border-success-border bg-card text-success-fg flex items-center justify-center shrink-0">
                  <Check aria-hidden="true" className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )
            } else if (isSubmittedAnswer && !isCorrectAnswer) {
              borderColor = 'border-incorrect-border'
              bgColor = 'bg-incorrect-bg'
              textColor = 'text-incorrect-fg font-black'
              circleBg = 'bg-destructive text-destructive-foreground border-destructive'
              indicator = (
                <div className="w-6 h-6 rounded-full border border-incorrect-border bg-card text-incorrect-fg flex items-center justify-center shrink-0">
                  <X aria-hidden="true" className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )
            }

            return (
              <div
                key={optIdx}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border transition-all select-none',
                  borderColor,
                  bgColor
                )}
              >
                <span
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black select-none',
                    circleBg
                  )}
                >
                  {String.fromCodePoint(65 + optIdx)}
                </span>
                <span className={cn('text-xs md:text-sm flex-1 leading-relaxed select-none font-extrabold', textColor)}>{option}</span>
                {indicator}
              </div>
            )
          })}
        </div>

        {/* Explanation Section with Toggle Button */}
        {hasExplanation && (
          <div className="pt-2 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExplanation(!showExplanation)}
              className="h-9 px-4 rounded-full border-info-border bg-info-bg text-info-fg hover:bg-info-bg/80 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              VIEW EXPLANATION
              {showExplanation ? <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />}
            </Button>

            {showExplanation && (
              <div className="mt-2.5 p-4 rounded-2xl bg-info-bg border border-info-border space-y-1.5 select-none animate-in fade-in slide-in-from-top-1 duration-200 text-card-foreground">
                <p className="text-xs font-black text-info-fg uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 text-info-fg" /> Detailed Explanation
                </p>
                <p className="text-xs sm:text-[13px] text-info-fg leading-relaxed whitespace-pre-wrap select-none font-bold">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Question Navigation Bar */}
      <div className="pt-3 border-t border-border flex items-center justify-between shrink-0 gap-2">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={idx === 0}
          className="h-10 sm:h-9 px-4 rounded-2xl font-black text-xs uppercase tracking-wider border-border disabled:opacity-40 text-muted-foreground bg-muted/80 hover:bg-muted cursor-pointer"
        >
          <ChevronLeft aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> PREV QUESTION
        </Button>

        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
          {idx + 1} / {totalQuestions}
        </span>

        <Button
          onClick={onNext}
          disabled={idx === totalQuestions - 1}
          className="h-10 sm:h-9 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-xs uppercase tracking-wider disabled:opacity-40 cursor-pointer"
        >
          NEXT QUESTION <ChevronRight aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
