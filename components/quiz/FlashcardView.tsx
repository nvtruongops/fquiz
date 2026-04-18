'use client'

import { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RotateCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { IQuestion } from '@/types/quiz'

interface FlashcardViewProps {
  question: IQuestion
  questionNumber: number
  totalQuestions: number
  onAnswer: (knows: boolean) => void
  isLoading?: boolean
}

export interface FlashcardViewRef {
  flip: () => void
}

export const FlashcardView = forwardRef<FlashcardViewRef, FlashcardViewProps>(({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading = false,
}, ref) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  // Reset flip state when question changes
  useEffect(() => {
    setIsFlipped(false)
    setShowExplanation(false)
  }, [question._id, questionNumber])

  const handleFlip = useCallback(() => {
    if (!isLoading) {
      setIsFlipped(prev => {
        // Reset explanation when flipping to front
        if (prev) {
          setShowExplanation(false)
        }
        return !prev
      })
    }
  }, [isLoading])

  // Expose flip function to parent via ref
  useImperativeHandle(ref, () => ({
    flip: handleFlip
  }), [handleFlip])

  const handleAnswer = (knows: boolean) => {
    if (!isLoading) {
      // Reset states BEFORE calling onAnswer to ensure next card shows front
      setIsFlipped(false)
      setShowExplanation(false)
      
      // Call onAnswer which will load next question
      onAnswer(knows)
    }
  }

  // Safety check: ensure question has required data
  if (!question || !question.text || !question.options || question.options.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="p-8 text-center border border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-muted-foreground">Dữ liệu câu hỏi không hợp lệ</p>
        </div>
      </div>
    )
  }

  // Get correct answer text - with safety checks
  const correctAnswers = (question.correct_answer || [])
    .map((idx) => question.options?.[idx])
    .filter(Boolean)

  // Calculate total content length for auto-scaling
  const questionLength = question.text.length
  const optionsLength = question.options.reduce((sum, opt) => sum + opt.length, 0)
  const totalContentLength = questionLength + optionsLength

  // Determine font sizes based on content length
  const getQuestionFontSize = () => {
    if (totalContentLength > 2000) return 'text-[11px] md:text-xs'
    if (totalContentLength > 1500) return 'text-xs md:text-sm'
    if (totalContentLength > 1000) return 'text-sm md:text-base'
    if (totalContentLength > 600) return 'text-base md:text-lg'
    return 'text-lg md:text-2xl'
  }

  const getOptionFontSize = () => {
    if (totalContentLength > 2000) return 'text-[10px] md:text-[11px]'
    if (totalContentLength > 1500) return 'text-[11px] md:text-xs'
    if (totalContentLength > 1000) return 'text-xs md:text-sm'
    if (totalContentLength > 600) return 'text-sm md:text-base'
    return 'text-base'
  }

  const getOptionPadding = () => {
    if (totalContentLength > 2000) return 'p-1.5'
    if (totalContentLength > 1500) return 'p-2'
    if (totalContentLength > 1000) return 'p-3'
    return 'p-4'
  }

  const getQuestionMargin = () => {
    if (totalContentLength > 2000) return 'mb-2'
    if (totalContentLength > 1500) return 'mb-3'
    if (totalContentLength > 1000) return 'mb-4'
    return 'mb-6'
  }

  const getOptionSpacing = () => {
    if (totalContentLength > 2000) return 'space-y-1'
    if (totalContentLength > 1500) return 'space-y-1.5'
    if (totalContentLength > 1000) return 'space-y-2'
    return 'space-y-3'
  }

  const getCardPadding = () => {
    if (totalContentLength > 2000) return 'p-3'
    if (totalContentLength > 1500) return 'p-4'
    if (totalContentLength > 1000) return 'p-6'
    return 'p-8'
  }

  const getMinHeight = () => {
    if (totalContentLength > 2500) return 'min-h-[800px]'
    if (totalContentLength > 2000) return 'min-h-[700px]'
    if (totalContentLength > 1500) return 'min-h-[600px]'
    if (totalContentLength > 1000) return 'min-h-[500px]'
    return 'min-h-[400px]'
  }

  const getQuestionLineHeight = () => {
    if (totalContentLength > 2000) return 'leading-tight'
    if (totalContentLength > 1500) return 'leading-snug'
    return 'leading-normal'
  }

  return (
    <div className="w-full h-full max-w-3xl mx-auto flex flex-col">
      {/* Flashcard container */}
      <div 
        className="perspective-1000 transition-all duration-300 flex-1 min-h-0"
        onClick={handleFlip}
      >
        <div
          className={cn(
            'flashcard-inner relative w-full h-full min-h-0 transition-transform duration-600',
            isFlipped && 'rotate-y-180'
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front side */}
          <div
            className={cn(
              'flashcard-face h-full flex flex-col hover:shadow-lg transition-shadow',
              'backface-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
              getCardPadding()
            )}
          >
            <div className="flex-1 overflow-y-auto px-1 -mx-1 flex flex-col pt-1 pb-4">
              <div className="flex-1 flex flex-col justify-start">
                {/* Question image */}
                {question.image_url && (
                  <div className="mb-6">
                    <img
                      src={question.image_url}
                      alt="Question"
                      className="max-w-full h-auto rounded-lg mx-auto max-h-64 object-contain"
                    />
                  </div>
                )}

                {/* Question text */}
                <h2 className={cn(
                  "font-semibold text-left whitespace-pre-wrap",
                  getQuestionFontSize(),
                  getQuestionMargin(),
                  getQuestionLineHeight()
                )}>
                  {question.text}
                </h2>

                {/* Options */}
                <div className={getOptionSpacing()}>
                  {(question.options || []).map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "bg-secondary rounded-lg text-left",
                        getOptionPadding()
                      )}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span className={cn("whitespace-pre-wrap", getOptionFontSize())}>{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Back side */}
          <div
            className={cn(
              'flashcard-face h-full flex flex-col',
              'backface-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
              getCardPadding()
            )}
            style={{ transform: 'rotateX(180deg)' }}
          >
            <div className="flex-1 overflow-y-auto px-1 -mx-1 pt-1 pb-4 flex flex-col justify-start">
              <div className="space-y-4">
                {/* Correct answer */}
                <div 
                  className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Đáp án đúng:
                  </h3>
                  <div className="space-y-1">
                    {correctAnswers.length > 0 ? (
                      correctAnswers.map((answer, idx) => (
                        <p key={idx} className="text-base font-medium whitespace-pre-wrap">
                          {String.fromCharCode(65 + (question.correct_answer?.[idx] ?? idx))}. {answer}
                        </p>
                      ))
                    ) : (
                      <p className="text-base font-medium text-muted-foreground">
                        Không có đáp án
                      </p>
                    )}
                  </div>
                </div>

                {/* Explanation Dropdown */}
                {question.explanation && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowExplanation(!showExplanation)
                      }}
                      className="w-full p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center">
                        <span className="mr-2">💡</span>
                        Giải thích
                      </span>
                      {showExplanation ? (
                        <ChevronUp className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      )}
                    </button>
                    
                    {showExplanation && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 relative">
                        {/* Close button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowExplanation(false)
                          }}
                          className="absolute top-2 right-2 p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors z-10"
                          aria-label="Đóng giải thích"
                        >
                          <span className="text-lg text-blue-700 dark:text-blue-300">×</span>
                        </button>
                        
                        {/* Full explanation content - no scroll */}
                        <div className="pr-6">
                          <p 
                            className={cn(
                              "leading-snug whitespace-pre-wrap text-gray-700 dark:text-gray-300",
                              question.explanation.length > 1000 ? "text-[11px]" :
                              question.explanation.length > 600 ? "text-xs" : 
                              question.explanation.length > 300 ? "text-sm" : "text-base"
                            )}
                          >
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Self-assessment buttons */}
              <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 flex gap-4 justify-center flex-none" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 max-w-xs border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAnswer(false)
                  }}
                  disabled={isLoading}
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  Chưa biết
                </Button>
                <Button
                  size="lg"
                  className="flex-1 max-w-xs bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAnswer(true)
                  }}
                  disabled={isLoading}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Đã biết
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 text-center text-xs md:text-sm text-muted-foreground flex-none pb-2" onClick={(e) => e.stopPropagation()}>
        <p>Phím tắt: Space = Lật thẻ | 1 = Chưa biết | 2 = Đã biết | Click anywhere = Lật thẻ</p>
      </div>
    </div>
  )
})

FlashcardView.displayName = 'FlashcardView'
