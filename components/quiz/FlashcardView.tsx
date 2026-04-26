'use client'

import { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RotateCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface FlashcardViewProps {
  question: {
    _id: string
    text: string
    options: string[]
    correct_answer: number[]
    explanation?: string
    image_url?: string
  }
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
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col" key={question._id}>
      <div 
        className="perspective-1000 flex-1 min-h-0 animate-in fade-in duration-300"
        onClick={handleFlip}
      >
        <div
          className={cn(
            'flashcard-inner relative w-full h-full min-h-0 transition-transform duration-700',
            isFlipped && 'rotate-y-180'
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front side */}
          <div
            className={cn(
              'flashcard-face flashcard-face-front h-full flex flex-col transition-all duration-300',
              'bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 shadow-xl flashcard-shadow',
              getCardPadding()
            )}
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 -mx-2 flex flex-col pt-1 pb-4">
              <div className="flex-1 flex flex-col justify-center">
                {/* Question image - Improved Scaling */}
                {question.image_url && (
                  <div className="mb-6 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary-bg/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                      <img
                        src={question.image_url}
                        alt="Question"
                        className="max-w-full h-auto mx-auto max-h-[35vh] md:max-h-[400px] object-contain transition-transform duration-500 hover:scale-[1.02]"
                      />
                    </div>
                  </div>
                )}

                {/* Question text */}
                <h2 className={cn(
                  "font-bold text-center whitespace-pre-wrap tracking-tight",
                  getQuestionFontSize(),
                  getQuestionMargin(),
                  getQuestionLineHeight(),
                  "text-slate-800 dark:text-slate-100"
                )}>
                  {question.text}
                </h2>

                {/* Options */}
                <div className={cn("max-w-2xl mx-auto w-full", getOptionSpacing())}>
                  {(question.options || []).map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "bg-slate-50 dark:bg-slate-800/50 rounded-xl text-left border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm",
                        getOptionPadding()
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={cn("whitespace-pre-wrap flex-1 text-slate-700 dark:text-slate-300", getOptionFontSize())}>
                          {option}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Flip hint at bottom */}
            <div className="text-center pt-2 opacity-40 group">
              <p className="text-[10px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                <RotateCw className="w-3 h-3 animate-spin-slow" />
                Nhấn để xem đáp án
              </p>
            </div>
          </div>

          {/* Back side */}
          <div
            className={cn(
              'flashcard-face flashcard-face-back h-full flex flex-col',
              'bg-white dark:bg-gray-950 border-2 border-primary/20 dark:border-primary/40 shadow-2xl',
              getCardPadding()
            )}
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 -mx-2 pt-1 pb-4 flex flex-col">
              <div className="flex-1 flex flex-col justify-center space-y-6">
                {/* Correct answer - Modernized */}
                <div 
                  className="p-6 bg-green-50/50 dark:bg-green-900/20 rounded-2xl border-2 border-green-500/30 relative overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                  
                  <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <div className="p-1 bg-green-100 dark:bg-green-800 rounded">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    Đáp án chính xác
                  </h3>
                  
                  <div className="space-y-3 relative z-10">
                    {correctAnswers.length > 0 ? (
                      correctAnswers.map((answer, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg shadow-sm border border-green-100 dark:border-green-900/30">
                          <span className="font-bold text-green-600">
                            {String.fromCharCode(65 + (question.correct_answer?.[idx] ?? idx))}.
                          </span>
                          <p className="text-base font-medium whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed">
                            {answer}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-base font-medium text-muted-foreground italic text-center py-4">
                        Không có đáp án được chỉ định
                      </p>
                    )}
                  </div>
                </div>

                {/* Explanation Dropdown - Modernized */}
                {question.explanation && (
                  <div onClick={(e) => e.stopPropagation()} className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowExplanation(!showExplanation)
                      }}
                      className={cn(
                        "w-full p-4 rounded-xl border transition-all flex items-center justify-between group",
                        showExplanation 
                          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-inner" 
                          : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-300"
                      )}
                    >
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                        <div className={cn(
                          "p-1 rounded transition-colors",
                          showExplanation ? "bg-blue-200 dark:bg-blue-800" : "bg-slate-200 dark:bg-slate-700"
                        )}>
                          <span className="text-xs">💡</span>
                        </div>
                        Giải thích chi tiết
                      </span>
                      {showExplanation ? (
                        <ChevronUp className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
                      )}
                    </button>
                    
                    {showExplanation && (
                      <div className="mt-3 p-5 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30"></div>
                        <div className="pr-4">
                          <p 
                            className={cn(
                              "leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300",
                              question.explanation.length > 1000 ? "text-xs" :
                              question.explanation.length > 600 ? "text-sm" : "text-base"
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

              {/* Self-assessment buttons - Premium look */}
              <div className="pt-6 mt-auto border-t border-slate-100 dark:border-slate-800 flex gap-4 justify-center" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="lg"
                  variant="outline"
                  className="group relative flex-1 h-14 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-95 overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAnswer(false)
                  }}
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-red-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <XCircle className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  <span className="font-bold">Chưa biết</span>
                </Button>
                <Button
                  size="lg"
                  className="group relative flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAnswer(true)
                  }}
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <CheckCircle className="mr-2 h-5 w-5 group-hover:-rotate-12 transition-transform" />
                  <span className="font-bold text-white">Đã biết</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint - More elegant */}
      <div className="mt-6 px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full mx-auto text-center text-[10px] md:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 border border-slate-200/50 dark:border-slate-700/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 shadow-sm font-mono uppercase">Space</kbd>
          <span>Lật thẻ</span>
        </div>
        <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 shadow-sm font-mono">1</kbd>
          <span>Chưa biết</span>
        </div>
        <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100 shadow-sm font-mono">2</kbd>
          <span>Đã biết</span>
        </div>
      </div>
    </div>
  )

})

FlashcardView.displayName = 'FlashcardView'
