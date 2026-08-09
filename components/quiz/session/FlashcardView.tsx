import { useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/core/utils/cn'
import { RotateCw, CheckCircle, XCircle, MousePointerClick } from 'lucide-react'
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
  if (totalContentLength > 2000) return 'text-xs md:text-sm'
  if (totalContentLength > 1000) return 'text-sm md:text-base'
  if (totalContentLength > 600) return 'text-base md:text-lg'
  return 'text-lg md:text-xl'
}

export const FlashcardView = forwardRef<FlashcardViewRef, FlashcardViewProps>(({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading = false,
  enableExplanation = false,
}, ref) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const x = useMotionValue(0)
  const unknownBadgeOpacity = useTransform(x, [-140, -40], [1, 0])
  const knownBadgeOpacity = useTransform(x, [40, 140], [0, 1])

  const isDraggingRef = useRef(false)

  useEffect(() => {
    setIsFlipped(false)
    setShowExplanation(false)
    x.set(0)
  }, [question._id, questionNumber, x])

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
      x.set(0)
      onAnswer(knows)
    }
  }

  const handleDragStart = () => {
    isDraggingRef.current = true
  }

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number } }) => {
    setTimeout(() => {
      isDraggingRef.current = false
    }, 150)

    if (info.offset.x < -90 || info.velocity.x < -400) {
      handleAnswer(false) // Drag Left = Chưa biết
    } else if (info.offset.x > 90 || info.velocity.x > 400) {
      handleAnswer(true) // Drag Right = Đã biết
    }
  }

  const handleCardClick = () => {
    if (isDraggingRef.current) return
    handleFlip()
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

  const answerIndices = Array.isArray(question.correct_answer)
    ? question.correct_answer
    : question.correct_answer != null
    ? [question.correct_answer]
    : []
  const correctAnswers = answerIndices.map((idx: number) => question.options[idx]).filter(Boolean) as string[]

  const questionLength = question.text.length
  const optionsLength = (question.options || []).reduce((sum, opt) => sum + opt.length, 0)
  const totalContentLength = questionLength + optionsLength

  return (
    <div className="w-full max-w-3xl mx-auto px-4 space-y-4">
      {/* 3D Perspective Card Container with Drag Gestures */}
      <div className="relative flex-1 min-h-0 w-full">
        {/* Drag Feedback Badges */}
        <motion.div
          style={{ opacity: unknownBadgeOpacity }}
          className="absolute top-4 left-6 z-50 pointer-events-none bg-red-500 text-white px-4 py-2 rounded-2xl border-2 border-white shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
        >
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <span>Chưa biết</span>
        </motion.div>

        <motion.div
          style={{ opacity: knownBadgeOpacity }}
          className="absolute top-4 right-6 z-50 pointer-events-none bg-success text-success-foreground px-4 py-2 rounded-2xl border-2 border-background shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
        >
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Đã biết</span>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleCardClick}
          style={{ x }}
          className="w-full min-h-[420px] bg-card text-card-foreground rounded-3xl border-2 border-border shadow-md p-6 sm:p-8 flex flex-col justify-between cursor-grab active:cursor-grabbing relative overflow-hidden transition-colors hover:border-ring touch-none select-none"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border pb-3">
            <span className="flex items-center gap-1.5 text-primary">
              <RotateCw className="w-3.5 h-3.5" /> Thẻ {questionNumber} / {totalQuestions}
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-muted px-2.5 py-0.5 rounded-full font-black text-muted-foreground">
              {isFlipped ? 'Mặt Sau (Đáp án)' : 'Mặt Trước (Câu hỏi)'}
            </span>
          </div>

          {/* Card Body */}
          <div className="my-auto py-4 space-y-4">
            {!isFlipped ? (
              <div className="space-y-4">
                <h2 className={cn('font-black text-card-foreground leading-snug text-left', getQuestionFontSize(totalContentLength))}>
                  {question.text}
                </h2>

                {/* Choices A, B, C, D */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-left">
                  {question.options.map((option, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/60 hover:bg-muted transition-colors"
                    >
                      <span className="flex-none flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs border border-primary/20">
                        {String.fromCodePoint(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-card-foreground leading-relaxed min-w-0 break-words">
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-success-foreground bg-success/20 px-3 py-1 rounded-full border border-success/30 inline-block">
                  Đáp án chính xác
                </span>
                <div className="space-y-2">
                  {correctAnswers.map((ans, idx) => {
                    const originalIdx = question.options.findIndex((opt) => opt === ans)
                    const letter = originalIdx >= 0 ? String.fromCodePoint(65 + originalIdx) : ''
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success-foreground flex items-center justify-center gap-2"
                      >
                        {letter && (
                          <span className="w-7 h-7 rounded-xl bg-success text-success-foreground border border-success font-black text-sm flex items-center justify-center shrink-0">
                            {letter}
                          </span>
                        )}
                        <span className="text-base sm:text-lg font-black text-left">
                          {ans}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {question.explanation && enableExplanation && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-1 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Giải thích:</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="text-center pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
              <MousePointerClick className="w-3 h-3" /> Kéo sang trái/phải hoặc nhấn vào thẻ để lật
            </span>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <FlashcardActionButtons onAnswer={handleAnswer} isLoading={isLoading} />
    </div>
  )
})

FlashcardView.displayName = 'FlashcardView'
