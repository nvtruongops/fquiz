import { useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/shared/ui/button'
import { cn } from '@/lib/core/utils/cn'
import { RotateCw, CheckCircle, XCircle, ChevronDown, ChevronUp, MousePointerClick } from 'lucide-react'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { motion, useMotionValue, useTransform } from 'framer-motion'

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

function getOptionFontSize(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'text-[10px] md:text-[11px]'
  if (totalContentLength > 1500) return 'text-[11px] md:text-xs'
  if (totalContentLength > 1000) return 'text-xs md:text-sm'
  if (totalContentLength > 600) return 'text-sm md:text-base'
  return 'text-base'
}

function getOptionPadding(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'p-1.5'
  if (totalContentLength > 1500) return 'p-2'
  if (totalContentLength > 1000) return 'p-3'
  return 'p-4'
}

function getQuestionMargin(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'mb-2'
  if (totalContentLength > 1500) return 'mb-3'
  if (totalContentLength > 1000) return 'mb-4'
  return 'mb-6'
}

function getOptionSpacing(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'space-y-1'
  if (totalContentLength > 1500) return 'space-y-1.5'
  if (totalContentLength > 1000) return 'space-y-2'
  return 'space-y-3'
}

function getCardPadding(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'p-3'
  if (totalContentLength > 1500) return 'p-4'
  if (totalContentLength > 1000) return 'p-6'
  return 'p-8'
}

function getMinHeight(totalContentLength: number): string {
  if (totalContentLength > 2500) return 'min-h-[800px]'
  if (totalContentLength > 2000) return 'min-h-[700px]'
  if (totalContentLength > 1500) return 'min-h-[600px]'
  if (totalContentLength > 1000) return 'min-h-[500px]'
  return 'min-h-[400px]'
}

function getQuestionLineHeight(totalContentLength: number): string {
  if (totalContentLength > 2000) return 'leading-tight'
  if (totalContentLength > 1500) return 'leading-snug'
  return 'leading-normal'
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
  const answerIndices = Array.isArray(question.correct_answer) ? question.correct_answer : question.correct_answer != null ? [question.correct_answer] : []
  const correctAnswers = answerIndices
    .map((idx: number) => question.options[idx])
    .filter(Boolean) as string[]

  // Calculate total content length for auto-scaling
  const questionLength = question.text.length
  const optionsLength = (question.options || []).reduce((sum, opt) => sum + opt.length, 0)
  const totalContentLength = questionLength + optionsLength

  if (!enableAnimation) {
    return (
      <NoAnimationView
        question={question}
        totalContentLength={totalContentLength}
        answerIndices={answerIndices}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        showExplanation={showExplanation}
        setShowExplanation={setShowExplanation}
        handleAnswer={handleAnswer}
        isLoading={isLoading}
        enableExplanation={enableExplanation}
      />
    )
  }

  return (
    <AnimatedView
      question={question}
      totalContentLength={totalContentLength}
      answerIndices={answerIndices}
      correctAnswers={correctAnswers}
      isFlipped={isFlipped}
      handleFlip={handleFlip}
      showExplanation={showExplanation}
      setShowExplanation={setShowExplanation}
      handleAnswer={handleAnswer}
      isLoading={isLoading}
      enableExplanation={enableExplanation}
    />
  )
})

FlashcardView.displayName = 'FlashcardView'

interface SubViewProps {
  question: FlashcardViewProps['question']
  totalContentLength: number
  answerIndices: number[]
  isFlipped: boolean
  showExplanation: boolean
  setShowExplanation: React.Dispatch<React.SetStateAction<boolean>>
  handleAnswer: (knows: boolean) => void
  isLoading: boolean
  enableExplanation: boolean
}

function NoAnimationView({
  question,
  totalContentLength,
  answerIndices,
  isFlipped,
  setIsFlipped,
  showExplanation,
  setShowExplanation,
  handleAnswer,
  isLoading,
  enableExplanation,
}: SubViewProps & { setIsFlipped: React.Dispatch<React.SetStateAction<boolean>> }) {
  const x = useMotionValue(0)
  const unknownBadgeOpacity = useTransform(x, [-140, -40], [1, 0])
  const knownBadgeOpacity = useTransform(x, [40, 140], [0, 1])

  const isDraggingRef = useRef(false)

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

  const handleTap = () => {
    if (isDraggingRef.current) return
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setIsFlipped(prev => !prev)
  }

  // Answer indices
  const correctAnswers = answerIndices
    .map((idx: number) => question.options[idx])
    .filter(Boolean) as string[]

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col justify-between" key={question._id}>
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
        {/* Swipe Feedback Badges */}
        <motion.div
          style={{ opacity: unknownBadgeOpacity }}
          className="absolute top-4 left-6 z-50 pointer-events-none bg-red-500 text-white px-4 py-2 rounded-2xl border-2 border-white shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
        >
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <span>Chưa biết</span>
        </motion.div>

        <motion.div
          style={{ opacity: knownBadgeOpacity }}
          className="absolute top-4 right-6 z-50 pointer-events-none bg-emerald-500 text-white px-4 py-2 rounded-2xl border-2 border-white shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
        >
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <span>Đã biết</span>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onTap={handleTap}
          style={{ x }}
          className={cn(
            "w-full h-full touch-none relative select-none flex flex-col justify-between bg-white dark:bg-gray-950 border-2 shadow-xl rounded-2xl p-4 md:p-6 transition-colors cursor-grab active:cursor-grabbing outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
            isFlipped ? "border-primary/40" : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col space-y-4">
            {/* Front vs Back View */}
            {!isFlipped ? (
              /* Front Side (Question) */
              <div className="space-y-4 my-auto">
                {question.image_url && (
                  <div className="mb-2 relative group flex-none">
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                      <img
                        src={question.image_url}
                        alt="Question"
                        className="max-w-full h-auto mx-auto max-h-[160px] md:max-h-[220px] object-contain"
                      />
                    </div>
                  </div>
                )}
                <h2 className={cn(
                  "font-bold text-center whitespace-pre-wrap tracking-tight text-slate-800 dark:text-slate-100",
                  getQuestionFontSize(totalContentLength),
                  getQuestionLineHeight(totalContentLength)
                )}>
                  {question.text}
                </h2>
                <div className={cn("max-w-2xl mx-auto w-full", getOptionSpacing(totalContentLength))}>
                  {(question.options || []).map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "bg-slate-50 dark:bg-slate-800/50 rounded-xl text-left border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm",
                        getOptionPadding(totalContentLength)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {String.fromCodePoint(65 + idx)}
                        </span>
                        <span className={cn("whitespace-pre-wrap flex-1 text-slate-700 dark:text-slate-300", getOptionFontSize(totalContentLength))}>
                          {option}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center pt-2 opacity-40">
                  <p className="text-[10px] uppercase tracking-widest font-semibold">
                    Nhấn hoặc kéo chuột để lật / chọn đáp án
                  </p>
                </div>
              </div>
            ) : (
              /* Back Side (Answer + Explanation) */
              <div className="space-y-6 my-auto">
                <div className="p-6 bg-green-50/50 dark:bg-green-900/20 rounded-2xl border-2 border-green-500/30 relative overflow-hidden">
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
                            {String.fromCodePoint(65 + (answerIndices[idx] ?? idx))}.
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

                {/* Usage Badge */}
                <div className="flex justify-center">
                  <UsageBadge count={question.usage_count ?? 0} size="md" />
                </div>

                {/* Direct Explanation */}
                {enableExplanation && question.explanation && (
                  <div className="p-4 bg-blue-50/40 dark:bg-blue-900/15 rounded-2xl border border-blue-100 dark:border-blue-900/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                    <div className="pl-2 pr-2">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1.5 tracking-wider uppercase">
                        Giải thích:
                      </p>
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

          {/* Self-assessment buttons */}
          <div role="none" className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex gap-4 justify-center flex-none" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Button
              size="lg"
              variant="outline"
              tabIndex={-1}
              className="group relative flex-1 h-12 rounded-xl border-2 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-95 overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur()
                }
                handleAnswer(false)
              }}
              disabled={isLoading}
            >
              <XCircle className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-xs md:text-sm">Chưa biết</span>
            </Button>
            <Button
              size="lg"
              tabIndex={-1}
              className="group relative flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 dark:shadow-none transition-all active:scale-95 overflow-hidden cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur()
                }
                handleAnswer(true)
              }}
              disabled={isLoading}
            >
              <CheckCircle className="mr-2 h-5 w-5 group-hover:-rotate-12 transition-transform" />
              <span className="font-bold text-white text-xs md:text-sm">Đã biết</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function AnimatedView({
  question,
  totalContentLength,
  answerIndices,
  correctAnswers,
  isFlipped,
  handleFlip,
  showExplanation,
  setShowExplanation,
  handleAnswer,
  isLoading,
  enableExplanation,
}: SubViewProps & { correctAnswers: string[]; handleFlip: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-10, 10])
  const unknownBadgeOpacity = useTransform(x, [-140, -40], [1, 0])
  const knownBadgeOpacity = useTransform(x, [40, 140], [0, 1])

  const isDraggingRef = useRef(false)

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

  const handleTap = () => {
    if (isDraggingRef.current) return
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    handleFlip()
  }

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col justify-between" key={question._id}>
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
        {/* Swipe Feedback Badges */}
        <motion.div
          style={{ opacity: unknownBadgeOpacity }}
          className="absolute top-4 left-6 z-50 pointer-events-none bg-red-500 text-white px-4 py-2 rounded-2xl border-2 border-white shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
        >
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <span>Chưa biết</span>
        </motion.div>

        <motion.div
          style={{ opacity: knownBadgeOpacity }}
          className="absolute top-4 right-6 z-50 pointer-events-none bg-emerald-500 text-white px-4 py-2 rounded-2xl border-2 border-white shadow-xl flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
        >
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <span>Đã biết</span>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onTap={handleTap}
          style={{ x, rotate }}
          transition={{ duration: 0.2 }}
          className="w-full h-full touch-none relative select-none cursor-grab active:cursor-grabbing outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        >
          <div
            className="perspective-1000 flex-1 min-h-0 h-full w-full"
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
                  getCardPadding(totalContentLength)
                )}
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 -mx-2 flex flex-col pt-1 pb-4">
                  <div className="flex-1 flex flex-col justify-center">
                    {/* Question image */}
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
                      getQuestionFontSize(totalContentLength),
                      getQuestionMargin(totalContentLength),
                      getQuestionLineHeight(totalContentLength),
                      "text-slate-800 dark:text-slate-100"
                    )}>
                      {question.text}
                    </h2>

                    {/* Options */}
                    <div className={cn("max-w-2xl mx-auto w-full", getOptionSpacing(totalContentLength))}>
                      {(question.options || []).map((option, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "bg-slate-50 dark:bg-slate-800/50 rounded-xl text-left border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm",
                            getOptionPadding(totalContentLength)
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {String.fromCodePoint(65 + idx)}
                            </span>
                            <span className={cn("whitespace-pre-wrap flex-1 text-slate-700 dark:text-slate-300", getOptionFontSize(totalContentLength))}>
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
                    Nhấn hoặc kéo chuột để lật / chọn đáp án
                  </p>
                </div>
              </div>

              {/* Back side */}
              <div
                className={cn(
                  'flashcard-face flashcard-face-back h-full flex flex-col',
                  'bg-white dark:bg-gray-950 border-2 border-primary/20 dark:border-primary/40 shadow-2xl',
                  getCardPadding(totalContentLength)
                )}
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 -mx-2 pt-1 pb-4 flex flex-col">
                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    {/* Correct answer */}
                    <div
                      role="none"
                      className="p-6 bg-green-50/50 dark:bg-green-900/20 rounded-2xl border-2 border-green-500/30 relative overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
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
                                {String.fromCodePoint(65 + (answerIndices[idx] ?? idx))}.
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

                    {/* Usage frequency badge */}
                    <div className="flex justify-center">
                      <UsageBadge count={question.usage_count ?? 0} size="md" />
                    </div>

                    {/* Explanation Section - Directly shown when enabled */}
                    {enableExplanation && question.explanation && (
                      <div role="none" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="p-4 bg-blue-50/40 dark:bg-blue-900/15 rounded-2xl border border-blue-100 dark:border-blue-900/50 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                        <div className="pl-2 pr-2">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1.5 tracking-wider uppercase">
                            Giải thích:
                          </p>
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

                  {/* Self-assessment buttons */}
                  <div role="none" className="pt-6 mt-auto border-t border-slate-100 dark:border-slate-800 flex gap-4 justify-center" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Button
                      size="lg"
                      variant="outline"
                      tabIndex={-1}
                      className="group relative flex-1 h-14 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-95 overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur()
                        }
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
                      tabIndex={-1}
                      className="group relative flex-1 h-14 rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur()
                        }
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
        </motion.div>
      </div>

    </div>
  )
}
