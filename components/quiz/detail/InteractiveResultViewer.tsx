'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight, BookOpen, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
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
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 text-gray-500">
        Không có thông tin chi tiết câu hỏi.
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
      <div className="md:col-span-3 lg:col-span-3 xl:col-span-3 bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xs border border-gray-100 flex flex-col h-auto md:h-full min-h-0 overflow-hidden shrink-0">
        {/* Header (Clickable toggle on mobile) */}
        <div 
          onClick={() => setIsMobileMatrixOpen(!isMobileMatrixOpen)}
          className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100 shrink-0 cursor-pointer md:cursor-default select-none"
        >
          <span className="text-[11px] sm:text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#5D7B6F]" />
            Danh sách câu ({totalQuestions})
            <span className="md:hidden inline-flex items-center text-[10px] font-bold text-[#5D7B6F] ml-1 bg-[#5D7B6F]/10 px-1.5 py-0.5 rounded">
              {isMobileMatrixOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#5D7B6F] bg-[#5D7B6F]/10 px-2 py-0.5 rounded-full">
            Đúng {correctCount}/{totalQuestions}
          </span>
        </div>

        {/* Matrix content container: Hidden on mobile unless toggled open */}
        <div className={cn("flex flex-col flex-1 min-h-0 transition-all", !isMobileMatrixOpen && "hidden md:flex")}>
          {/* Filter Pills */}
          <div className="grid grid-cols-4 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-100 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold select-none my-2 sm:my-3 shrink-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'py-1 rounded-md sm:rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'all'
                  ? 'bg-white text-slate-800 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              Tất cả ({totalQuestions})
            </button>
            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={cn(
                'py-1 rounded-md sm:rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'correct'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-emerald-700 hover:bg-emerald-50'
              )}
            >
              Đúng ({correctCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('incorrect')}
              className={cn(
                'py-1 rounded-md sm:rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'incorrect'
                  ? 'bg-incorrect-border text-white shadow-xs font-black'
                  : 'text-incorrect-fg hover:bg-incorrect-bg'
              )}
            >
              Sai ({incorrectCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unanswered')}
              className={cn(
                'py-1 rounded-md sm:rounded-lg transition-all text-center px-0.5 cursor-pointer',
                filter === 'unanswered'
                  ? 'bg-slate-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:bg-slate-200'
              )}
            >
              Bỏ ({unansweredCount})
            </button>
          </div>

          {/* Matrix Grid (Compact Buttons w-6 h-6 on mobile, 8-10 cols) */}
          <div className="max-h-[160px] md:max-h-none flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
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

                let btnBg = 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                if (notAnswered) {
                  btnBg = 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                } else if (isCorrect) {
                  btnBg = 'bg-emerald-500 text-white hover:bg-emerald-600'
                } else if (isIncorrect) {
                  btnBg = 'bg-red-500 text-white hover:bg-red-600'
                }

                return (
                  <button
                    key={q._id}
                    type="button"
                    onClick={() => handleSelectQuestion(idx)}
                    className={cn(
                      'w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center relative select-none mx-auto border border-transparent cursor-pointer',
                      btnBg,
                      isSelected && 'border-2 border-slate-900 ring-2 ring-white/90 font-black z-10 shadow-xs'
                    )}
                    title={`Câu ${idx + 1}: ${notAnswered ? 'Chưa làm' : isCorrect ? 'Đúng' : 'Sai'}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend Footer */}
          <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-around text-[9px] sm:text-[10px] font-bold text-gray-500 select-none shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Đúng
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sai
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Bỏ trống
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
    <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Question Header & Status */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[#5D7B6F]/10 text-[#5D7B6F] font-black text-xs uppercase tracking-wider">
            Câu {idx + 1} / {totalQuestions}
          </span>
        </div>

        <div>
          {notAnswered ? (
            <Badge className="bg-slate-100 text-slate-600 border-none text-xs font-bold px-2.5 py-0.5 rounded-full">
              <MinusCircle className="h-3.5 w-3.5 mr-1 inline text-slate-400" /> Chưa trả lời
            </Badge>
          ) : q.is_correct ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline text-emerald-500" /> Trả lời đúng
            </Badge>
          ) : (
            <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <XCircle className="h-3.5 w-3.5 mr-1 inline text-red-500" /> Trả lời sai
            </Badge>
          )}
        </div>
      </div>

      {/* Main Scrollable Content Box (Question text + Image + Options + Explanation) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 my-3 scrollbar-thin">
        {/* Question Text - Anti-copy select-none */}
        <p className="text-gray-900 font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap select-none pt-1">
          {q.text}
        </p>

        {/* Question Image */}
        {q.image_url && (
          <div className="flex justify-center rounded-xl bg-slate-50 p-2 border border-slate-100 select-none">
            <img
              src={
                /^(https?:\/\/|\/|data:image\/)/i.test(q.image_url) && !/javascript:/i.test(q.image_url)
                  ? q.image_url
                  : ''
              }
              alt={`Câu hỏi ${idx + 1}`}
              className="max-h-56 object-contain rounded-lg select-none"
            />
          </div>
        )}

        {/* Options List - Anti-copy select-none */}
        <div className="space-y-2 select-none">
          {q.options.map((option: string, optIdx: number) => {
            const isCorrectAnswer = correctAnswers.includes(optIdx)
            const isSubmittedAnswer = submittedAnswers.includes(optIdx)

            let borderColor = 'border-gray-100'
            let bgColor = 'bg-slate-50/60'
            let textColor = 'text-gray-700'
            let indicator = null

            if (isCorrectAnswer && isSubmittedAnswer) {
              borderColor = 'border-emerald-400'
              bgColor = 'bg-emerald-50'
              textColor = 'text-emerald-900 font-semibold'
              indicator = <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            } else if (isCorrectAnswer) {
              borderColor = 'border-emerald-300'
              bgColor = 'bg-emerald-50/60'
              textColor = 'text-emerald-800 font-medium'
              indicator = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            } else if (isSubmittedAnswer && !isCorrectAnswer) {
              borderColor = 'border-red-300'
              bgColor = 'bg-red-50'
              textColor = 'text-red-800 font-medium'
              indicator = <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            }

            return (
              <div
                key={optIdx}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all select-none',
                  borderColor,
                  bgColor
                )}
              >
                <span
                  className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black select-none',
                    isCorrectAnswer
                      ? 'border-emerald-300 bg-emerald-500 text-white'
                      : isSubmittedAnswer
                        ? 'border-red-300 bg-red-500 text-white'
                        : 'border-gray-200 bg-white text-gray-400'
                  )}
                >
                  {String.fromCodePoint(65 + optIdx)}
                </span>
                <span className={cn('text-xs md:text-sm flex-1 leading-relaxed select-none', textColor)}>{option}</span>
                {indicator}
              </div>
            )
          })}
        </div>

        {/* Explanation Section with Toggle Button */}
        {hasExplanation && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExplanation(!showExplanation)}
              className="h-8 px-3 rounded-xl border-sky-200 bg-sky-50/60 hover:bg-sky-100/80 text-sky-700 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {showExplanation ? 'Ẩn giải thích' : 'Xem giải thích đáp án'}
              {showExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>

            {showExplanation && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-sky-50/70 border border-sky-100 space-y-1.5 select-none animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[11px] font-black text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-sky-600" /> Giải thích chi tiết
                </p>
                <p className="text-xs sm:text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap pl-4 select-none">
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Question Navigation Bar */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={idx === 0}
          className="h-9 px-4 rounded-xl font-bold text-xs uppercase tracking-wider border-slate-200 disabled:opacity-40"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Câu trước
        </Button>

        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
          {idx + 1} / {totalQuestions}
        </span>

        <Button
          onClick={onNext}
          disabled={idx === totalQuestions - 1}
          className="h-9 px-4 rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40"
        >
          Câu tiếp <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
