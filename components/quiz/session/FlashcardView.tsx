import { useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'
import { RotateCw, CheckCircle, XCircle, ChevronDown, ChevronUp, MousePointerClick } from 'lucide-react'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { FlashcardActionButtons } from './FlashcardActionButtons'

interface FlashcardViewProps {
  question: {
    _id: string
    text: string
    options: string[]
    correct_answer: number | number[]
    explanation?: string
    image_url?: string
    usage_count?: number
  }
  questionNumber: number
  totalQuestions: number
  onAnswer: (knows: boolean) => void
  isLoading?: boolean
  enableAnimation?: boolean
  enableExplanation?: boolean
}

export interface FlashcardViewRef {
  flip: () => void
}

function getQuestionFontSize(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'text-[11px] md:text-xs'
  if (totalContentLength > 1500) return 'text-xs md:text-sm'
  if (totalContentLength > 1000) return 'text-sm md:text-base'
  if (totalContentLength > 600) return 'text-base md:text-lg'
  return 'text-lg md:text-2xl'
}

export const FlashcardView = forwardRef<FlashcardViewRef, FlashcardViewProps>(({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading = false,
  enableAnimation = true,
  enableExplanation = false,
}, ref) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  useEffect(() => {
    setIsFlipped(false)
    setShowExplanation(false)
  }, [question._id, questionNumber])

  const handleFlip = useCallback(() => {
    if (!isLoading) {
      setIsFlipped(prev => {
        if (prev) setShowExplanation(false)
        return !prev
      })
    }
  }, [isLoading])

  useImperativeHandle(ref, () => ({
    flip: handleFlip
  }), [handleFlip])

  const handleAnswer = (knows: boolean) => {
    if (!isLoading) {
      setIsFlipped(false)
      setShowExplanation(false)
      onAnswer(knows)
    }
  }

  if (!question || !question.text || !question.options || question.options.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="p-8 text-center border border-gray-200 rounded-lg">
          <p className="text-muted-foreground">Dữ liệu câu hỏi không hợp lệ</p>
        </div>
      </div>
    )
  }

  const answerIndices = Array.isArray(question.correct_answer) ? question.correct_answer : question.correct_answer != null ? [question.correct_answer] : []
  const correctAnswers = answerIndices.map((idx: number) => question.options[idx]).filter(Boolean) as string[]

  const questionLength = question.text.length
  const optionsLength = (question.options || []).reduce((sum, opt) => sum + opt.length, 0)
  const totalContentLength = questionLength + optionsLength

  return (
    <div className="w-full max-w-3xl mx-auto px-4 space-y-4">
      {/* 3D Perspective Card Container */}
      <div
        onClick={handleFlip}
        className="w-full min-h-[380px] bg-white rounded-3xl border-2 border-slate-200 shadow-md p-6 sm:p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-all hover:border-[#5D7B6F]/40"
      >
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-3">
          <span className="flex items-center gap-1.5 text-[#5D7B6F]">
            <RotateCw className="w-3.5 h-3.5" /> Thẻ {questionNumber} / {totalQuestions}
          </span>
          <span className="text-[10px] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
            {isFlipped ? 'Mặt Sau (Đáp án)' : 'Mặt Trước (Câu hỏi)'}
          </span>
        </div>

        <div className="my-auto py-6 text-center space-y-4">
          {!isFlipped ? (
            <h2 className={cn('font-black text-slate-900 leading-snug', getQuestionFontSize(totalContentLength))}>
              {question.text}
            </h2>
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Đáp án chính xác
              </span>
              <div className="space-y-1">
                {correctAnswers.map((ans, idx) => (
                  <p key={idx} className="text-lg sm:text-xl font-black text-slate-900">
                    {ans}
                  </p>
                ))}
              </div>
              {question.explanation && enableExplanation && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed text-left">
                  {question.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="text-center pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Nhấn vào thẻ để xoay mặt
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <FlashcardActionButtons onAnswer={handleAnswer} isLoading={isLoading} />
    </div>
  )
})

FlashcardView.displayName = 'FlashcardView'
