'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
import { useFlashcardSession } from '@/hooks/useFlashcardSession'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SwipeState {
  startX: number
  currentX: number
  isDragging: boolean
}

function MobileFlashcardView({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading = false,
}: {
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
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    currentX: 0,
    isDragging: false,
  })

  // Reset flip state when question changes
  useEffect(() => {
    setIsFlipped(false)
    setSwipeState({
      startX: 0,
      currentX: 0,
      isDragging: false,
    })
  }, [question._id, questionNumber])

  const correctAnswers = (question.correct_answer || [])
    .map((idx) => question.options?.[idx])
    .filter(Boolean)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLoading) return
    setSwipeState({
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      isDragging: true,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.isDragging || isLoading) return
    setSwipeState((prev) => ({
      ...prev,
      currentX: e.touches[0].clientX,
    }))
  }

  const handleTouchEnd = () => {
    if (!swipeState.isDragging || isLoading) return

    const diff = swipeState.currentX - swipeState.startX
    const threshold = 100 // Minimum swipe distance

    // Only process swipe if card is flipped (showing answer)
    if (isFlipped && Math.abs(diff) > threshold) {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50) // Short vibration
      }

      // Reset states before calling onAnswer
      setIsFlipped(false)
      setSwipeState({
        startX: 0,
        currentX: 0,
        isDragging: false,
      })

      if (diff > 0) {
        // Swipe right = Doesn't know
        onAnswer(false)
      } else {
        // Swipe left = Knows
        onAnswer(true)
      }
    }

    setSwipeState({
      startX: 0,
      currentX: 0,
      isDragging: false,
    })
  }

  const handleTap = () => {
    if (!isLoading && !swipeState.isDragging) {
      // Light haptic feedback on tap
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      setIsFlipped(!isFlipped)
    }
  }

  const swipeOffset = swipeState.isDragging ? swipeState.currentX - swipeState.startX : 0
  const swipeOpacity = 1 - Math.abs(swipeOffset) / 300

  // Calculate content-based sizing - more aggressive for mobile
  const questionLength = question.text.length
  const optionsLength = question.options.reduce((sum, opt) => sum + opt.length, 0)
  const totalContentLength = questionLength + optionsLength

  const getQuestionFontSize = () => {
    if (totalContentLength > 800) return 'text-[10px]'
    if (totalContentLength > 500) return 'text-xs'
    if (totalContentLength > 300) return 'text-xs'
    return 'text-sm'
  }

  const getOptionFontSize = () => {
    if (totalContentLength > 800) return 'text-[9px]'
    if (totalContentLength > 500) return 'text-[10px]'
    return 'text-xs'
  }

  const getCardPadding = () => {
    if (totalContentLength > 800) return 'p-1.5'
    if (totalContentLength > 500) return 'p-2'
    return 'p-2.5'
  }

  const getSpacing = () => {
    if (totalContentLength > 800) return 'space-y-0.5'
    if (totalContentLength > 500) return 'space-y-1'
    return 'space-y-1.5'
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Compact Progress Bar */}
      <div className="px-3 py-2 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">
            {questionNumber}/{totalQuestions}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round((questionNumber / totalQuestions) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard Container */}
      <div className="flex-1 p-1 overflow-hidden">
        <div
          className="relative w-full h-full max-h-[calc(100vh-50px)]"
          style={{
            transform: `translateX(${swipeOffset}px)`,
            opacity: swipeOpacity,
            transition: swipeState.isDragging ? 'none' : 'transform 0.3s, opacity 0.3s',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTap}
        >
          <div
            className={cn(
              'relative w-full h-full transition-transform duration-500',
              'preserve-3d'
            )}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
            }}
          >
            {/* Front - Question Side */}
            <div
              className={cn(
                'absolute inset-0 backface-hidden',
                'bg-white rounded-lg shadow-md border border-gray-200',
                'flex flex-col',
                getCardPadding()
              )}
            >
              <div className="flex-1 flex flex-col justify-center min-h-0">
                {/* Question Image */}
                {question.image_url && (
                  <div className="mb-1 flex justify-center">
                    <img
                      src={question.image_url}
                      alt="Question"
                      className="max-h-12 w-auto object-contain rounded"
                    />
                  </div>
                )}
                
                {/* Question Text */}
                <div className="mb-1.5">
                  <h2 className={cn(
                    "font-semibold text-gray-800 leading-tight",
                    getQuestionFontSize()
                  )}>
                    {question.text}
                  </h2>
                </div>

                {/* Options */}
                <div className={cn("flex-1", getSpacing())}>
                  {(question.options || []).map((option, idx) => (
                    <div
                      key={idx}
                      className="p-1 bg-gray-50 rounded border border-gray-100"
                    >
                      <span className="font-semibold text-blue-600 mr-1 text-[10px]">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span className={cn("text-gray-700 leading-tight", getOptionFontSize())}>
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Tap instruction */}
              <div className="mt-1 text-center">
                <div className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 rounded-full">
                  <span className="text-[9px] text-blue-600 font-medium">👆 Chạm xem đáp án</span>
                </div>
              </div>
            </div>

            {/* Back - Answer Side */}
            <div
              className={cn(
                'absolute inset-0 backface-hidden',
                'bg-white rounded-lg shadow-md border border-gray-200',
                'flex flex-col',
                getCardPadding()
              )}
              style={{ transform: 'rotateX(180deg)' }}
            >
              <div className="flex-1 space-y-1.5 min-h-0">
                {/* Correct Answer */}
                <div className="p-1.5 bg-green-50 rounded border border-green-200">
                  <h3 className="text-[10px] font-semibold text-green-700 mb-0.5 flex items-center">
                    <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                    Đáp án đúng
                  </h3>
                  <div className="space-y-0.5">
                    {correctAnswers.length > 0 ? (
                      correctAnswers.map((answer, idx) => (
                        <p key={idx} className="text-[9px] font-medium text-green-800 leading-tight">
                          {String.fromCharCode(65 + (question.correct_answer?.[idx] ?? idx))}. {answer}
                        </p>
                      ))
                    ) : (
                      <p className="text-[9px] text-gray-500">Không có đáp án</p>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="p-1.5 bg-blue-50 rounded border border-blue-200 flex-1 min-h-0">
                    <h3 className="text-[10px] font-semibold text-blue-700 mb-0.5 flex items-center">
                      <Lightbulb className="mr-0.5 h-2.5 w-2.5" />
                      Giải thích
                    </h3>
                    <div className="overflow-y-auto max-h-24">
                      <p className={cn(
                        "text-blue-800 leading-tight whitespace-pre-wrap",
                        question.explanation.length > 400 ? "text-[8px]" : 
                        question.explanation.length > 200 ? "text-[9px]" : "text-[10px]"
                      )}>
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-1.5 space-y-1">
                {/* Swipe instruction */}
                <div className="text-center">
                  <div className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded-full">
                    <span className="text-[8px] text-gray-600">👈 Vuốt: Biết | Chưa biết 👉</span>
                  </div>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-1">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Reset states before calling onAnswer
                      setIsFlipped(false)
                      setSwipeState({
                        startX: 0,
                        currentX: 0,
                        isDragging: false,
                      })
                      onAnswer(false)
                    }}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-7 text-[10px]"
                  >
                    <XCircle className="mr-0.5 h-2.5 w-2.5" />
                    Chưa biết
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Reset states before calling onAnswer
                      setIsFlipped(false)
                      setSwipeState({
                        startX: 0,
                        currentX: 0,
                        isDragging: false,
                      })
                      onAnswer(true)
                    }}
                    disabled={isLoading}
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 h-7 text-[10px]"
                  >
                    <CheckCircle className="mr-0.5 h-2.5 w-2.5" />
                    Đã biết
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swipe indicators */}
        {swipeState.isDragging && isFlipped && (
          <>
            {swipeOffset > 50 && (
              <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-red-500 text-2xl animate-pulse z-10">
                ❌
              </div>
            )}
            {swipeOffset < -50 && (
              <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-green-500 text-2xl animate-pulse z-10">
                ✅
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function MobileFlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const router = useRouter()

  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId

  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''

  const { session, question, isLoading, error, submitAnswer, isSubmitting } =
    useFlashcardSession(resolvedSessionId)

  const [stats, setStats] = useState({ known: 0, unknown: 0, total: 0 })

  useEffect(() => {
    if (session?.flashcard_stats) {
      setStats({
        known: session.flashcard_stats.cards_known,
        unknown: session.flashcard_stats.cards_unknown,
        total: session.flashcard_stats.total_cards,
      })
    }
  }, [session])

  useEffect(() => {
    if (session?.status === 'completed') {
      router.push(`/quiz/${resolvedQuizId}/result/${resolvedSessionId}`)
    }
  }, [session?.status, resolvedQuizId, resolvedSessionId, router])

  const handleAnswer = (knows: boolean) => {
    if (!session || !question) return

    submitAnswer(
      { knows, questionIndex: session.current_question_index },
      {
        onSuccess: (data) => {
          setStats(data.stats)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (error || !session || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Có lỗi xảy ra</h2>
          <Button onClick={() => router.push('/dashboard')}>
            Quay về Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Ultra Compact Header - Single Line */}
      <div className="bg-white border-b px-2 py-1 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-medium text-gray-800 truncate">{session.title}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 truncate">{session.categoryName}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{session.current_question_index + 1}/{session.totalQuestions}</span>
          </div>
          <div className="flex items-center gap-3 ml-2">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-semibold">{stats.known}</span>
              <span className="text-red-600 font-semibold">{stats.unknown}</span>
              <span className="text-gray-600 font-semibold">{stats.total}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="h-6 px-2 text-xs"
            >
              Thoát
            </Button>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1">
        <MobileFlashcardView
          question={question}
          questionNumber={session.current_question_index + 1}
          totalQuestions={session.totalQuestions}
          onAnswer={handleAnswer}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  )
}
