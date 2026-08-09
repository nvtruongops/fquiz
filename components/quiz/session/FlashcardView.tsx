'use client'

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
  taggedStatus?: 'known' | 'unknown' | null
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

function getCorrectAnswers(question: FlashcardViewProps['question']) {
  if (!question?.options?.length) return []
  const raw = question.correct_answer
  const answerIndices = Array.isArray(raw) ? raw : raw != null ? [raw] : []
  return answerIndices
    .map((idx: number) => ({
      idx,
      letter: String.fromCodePoint(65 + idx),
      text: question.options[idx]
    }))
    .filter((item): item is { idx: number; letter: string; text: string } => Boolean(item.text))
}

export const FlashcardView = forwardRef<FlashcardViewRef, FlashcardViewProps>(({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading = false,
  enableAnimation = true,
  enableExplanation = false,
  taggedStatus,
}, ref) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])
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

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    setTimeout(() => {
      isDraggingRef.current = false
    }, 150)

    const isLeft = info.offset.x < -90 || info.velocity.x < -400
    const isRight = info.offset.x > 90 || info.velocity.x > 400
    if (isLeft) handleAnswer(false)
    else if (isRight) handleAnswer(true)
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

  const correctAnswers = getCorrectAnswers(question)
  const questionLength = question.text.length
  const optionsLength = (question.options || []).reduce((sum, opt) => sum + opt.length, 0)
  const totalContentLength = questionLength + optionsLength

  return (
    <div className="w-full max-w-3xl mx-auto px-4 space-y-4">
      {/* Perspective Container */}
      <div className={cn("relative flex-1 min-h-0 w-full", enableAnimation && "[perspective:1000px]")}>
        {/* Drag Feedback Badges (Only shown when animation is enabled) */}
        {enableAnimation && (
          <>
            <motion.div
              style={{ opacity: unknownBadgeOpacity }}
              className="absolute top-4 left-6 z-50 pointer-events-none bg-destructive text-destructive-foreground px-4 py-2 rounded-2xl border-2 border-background shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider"
            >
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive-foreground" />
              <span>Chưa biết</span>
            </motion.div>

            <motion.div
              style={{ opacity: knownBadgeOpacity }}
              className="absolute top-4 right-6 z-50 pointer-events-none bg-primary text-primary-foreground px-4 py-2 rounded-2xl border-2 border-primary-foreground/20 shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              <span>Đã biết</span>
            </motion.div>
          </>
        )}

        <motion.div
          drag={enableAnimation ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragStart={enableAnimation ? handleDragStart : undefined}
          onDragEnd={enableAnimation ? handleDragEnd : undefined}
          onClick={handleCardClick}
          style={enableAnimation ? { x, rotate } : undefined}
          className={cn(
            "w-full min-h-[420px] bg-card text-card-foreground rounded-3xl border-2 border-border p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden select-none touch-none",
            enableAnimation 
              ? "cursor-grab active:cursor-grabbing shadow-md hover:shadow-xl hover:border-ring will-change-transform transform-gpu transition-colors duration-150" 
              : "cursor-pointer shadow-sm transition-none"
          )}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border pb-3">
            <span className="flex items-center gap-1.5 text-primary font-extrabold">
              <RotateCw className={cn("w-3.5 h-3.5", enableAnimation && "transition-transform duration-500", enableAnimation && isFlipped && "rotate-180")} /> Thẻ {questionNumber} / {totalQuestions}
            </span>
            <div className="flex items-center gap-2">
              {taggedStatus === 'known' && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shadow-2xs animate-in fade-in">
                  <CheckCircle className="w-3 h-3 text-primary" /> Đã thuộc
                </span>
              )}
              {taggedStatus === 'unknown' && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-black text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20 shadow-2xs animate-in fade-in">
                  <XCircle className="w-3 h-3 text-destructive" /> Chưa thuộc
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider bg-muted px-2.5 py-0.5 rounded-full font-black text-muted-foreground">
                {isFlipped ? 'Mặt Sau (Đáp án)' : 'Mặt Trước (Câu hỏi)'}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className={cn(
            "my-auto py-4 space-y-4",
            enableAnimation ? "transition-all duration-300 animate-in fade-in zoom-in-95" : "transition-none"
          )}>
            {!isFlipped ? (
              <div className="space-y-4">
                <h2 className={cn('font-normal text-card-foreground leading-relaxed text-left', getQuestionFontSize(totalContentLength))}>
                  {question.text}
                </h2>

                {/* Choices A, B, C, D */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-left">
                  {question.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/60 hover:bg-muted",
                        enableAnimation ? "transition-all hover:-translate-y-0.5" : "transition-none"
                      )}
                    >
                      <span className="flex-none flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs border border-primary/20">
                        {String.fromCodePoint(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-card-foreground leading-relaxed min-w-0 break-words">
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-success-fg bg-success-bg px-3 py-1 rounded-full border border-success-border inline-block shadow-2xs">
                  Đáp án chính xác
                </span>
                <div className="space-y-2">
                  {correctAnswers.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-success-bg/40 border-2 border-success-border text-foreground flex items-center justify-center gap-3 shadow-xs"
                    >
                      <span className="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {item.letter}
                      </span>
                      <span className="text-base sm:text-lg font-semibold text-foreground text-left leading-snug">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
                {question.explanation && enableExplanation && (
                  <div className="p-3.5 bg-muted/50 rounded-2xl border border-border text-left space-y-1 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Giải thích:</span>
                    <p className="text-xs text-foreground leading-relaxed">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="text-center pt-2 border-t border-border">
            <span className="text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
              <MousePointerClick className="w-3 h-3" /> {enableAnimation ? 'Kéo sang trái/phải hoặc nhấn vào thẻ để lật' : 'Nhấn vào thẻ để lật mặt'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <FlashcardActionButtons onAnswer={handleAnswer} isLoading={isLoading} enableAnimation={enableAnimation} taggedStatus={taggedStatus} />
    </div>
  )
})

FlashcardView.displayName = 'FlashcardView'
