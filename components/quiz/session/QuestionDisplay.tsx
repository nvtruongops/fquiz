'use client'

import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SessionQuestion, QuestionFeedback } from '@/types/session'

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
}

export function QuestionDisplay({
  question,
  currentIndex,
  totalQuestions,
  selectedOptions,
  submitted,
  showImmediateFeedback,
  lastAnswerResult,
  onSelectOption,
  isPending,
  sessionMode
}: QuestionDisplayProps) {
  const requiredSelectionCount = Math.max(question.answer_selection_count ?? 1, 1)
  const correctAnswerSet = showImmediateFeedback
    ? lastAnswerResult?.correctAnswers ?? [lastAnswerResult?.correctAnswer ?? -1]
    : []

  return (
    <div className="flex h-full flex-col">
      <section className="quiz-main-scale quiz-scroll border-b-2 border-[#101010] overflow-y-auto px-4 py-4 sm:px-6 sm:py-4">
        <p className="mb-2 text-[clamp(11px,0.2vw+10px,13px)] text-[#4f4f4f]">
          {requiredSelectionCount === 1
            ? '(Choose 1 answer)'
            : `(Choose ${requiredSelectionCount} answers)`}
        </p>
        <div className="max-w-4xl border border-[#c7c7c7] bg-[#f5f5f5] px-[clamp(12px,1vw,20px)] py-[clamp(12px,1vw,20px)]">
          <p className="text-[clamp(14px,0.4vw+12px,17px)] font-semibold leading-snug text-[#101010]">
            Câu {currentIndex + 1}/{totalQuestions}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[clamp(13px,0.45vw+11px,16px)] leading-relaxed text-[#101010]">
            {question.text}
          </p>

          {question.image_url && (
            <div className="mt-4 border border-[#d0d0d0] bg-white p-2">
              <div className="flex min-h-[220px] max-h-[420px] w-full items-center justify-center overflow-hidden rounded-sm bg-[#fafafa]">
                <img
                  src={question.image_url}
                  alt="Minh họa câu hỏi"
                  className="h-full max-h-[420px] w-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
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
                    'w-full select-none px-3 py-2.5 text-left text-[clamp(13px,0.45vw+11px,16px)] leading-relaxed transition-all duration-200 rounded-md border-2',
                    isDisabled && 'cursor-not-allowed opacity-60',
                    !isDisabled && 'cursor-pointer hover:bg-gray-50',
                    isCorrect && 'border-green-500 bg-green-50 text-green-700 font-semibold',
                    isWrongSelected && 'border-red-500 bg-red-50 text-red-700 font-semibold',
                    !isCorrect && !isWrongSelected && isSelected && !submitted && 'border-blue-400 bg-blue-50 font-semibold text-blue-700',
                    !isCorrect && !isWrongSelected && !isSelected && 'border-gray-300 bg-white text-[#202020]'
                  )}
                >
                  <span className="font-semibold">{String.fromCodePoint(65 + idx)}.</span> {option}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {sessionMode === 'immediate' && (
        <section className="quiz-main-scale quiz-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <h3 className="text-[clamp(18px,0.7vw+14px,24px)] font-bold leading-none text-[#101010]">Giải thích nếu có</h3>
          <div className="mt-4 min-h-[140px] max-w-4xl border border-[#c7c7c7] bg-[#f5f5f5] p-[clamp(12px,1vw,20px)]">
            {showImmediateFeedback ? (
              <div className="flex items-start gap-3 text-[clamp(12px,0.35vw+11px,15px)] text-[#111111]">
                {lastAnswerResult?.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                )}
                <div>
                  <p className="font-semibold">
                    {lastAnswerResult?.isCorrect ? 'Bạn đã trả lời đúng.' : 'Bạn trả lời chưa đúng.'}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                    {lastAnswerResult?.explanation || 'Hệ thống chưa có phần giải thích cho câu này.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[clamp(12px,0.35vw+11px,15px)] leading-relaxed text-[#4f4f4f]">
                Chưa có giải thích. Sau khi nộp đáp án ở chế độ luyện tập, nội dung giải thích sẽ hiển thị tại đây.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
