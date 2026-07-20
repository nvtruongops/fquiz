'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Lightbulb, ChevronUp, ChevronDown, Sparkles } from 'lucide-react'
import { useFlashcardSessionState } from '@/hooks/quiz/useFlashcardSession'

import { Button } from '@/components/shared/ui/button'
import { Switch } from '@/components/shared/ui/switch'
import { cn } from '@/lib/core/utils/cn'
import { ScrollArea } from '@/components/shared/ui/scroll-area'

interface SwipeState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
}

function SwipeIndicator({
  isDragging,
  isHorizontalSwipe,
  swipeOffset,
}: {
  isDragging: boolean
  isHorizontalSwipe: boolean
  swipeOffset: number
}) {
  if (!isDragging || !isHorizontalSwipe) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-between px-10">
      <div className="h-16 w-16 flex items-center justify-center rounded-full bg-green-500/10 border border-green-500/20" style={{ opacity: swipeOffset < -40 ? 1 : 0 }}>
        <CheckCircle2 className="h-8 w-8 text-green-500" strokeWidth={2.5} />
      </div>
      <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20" style={{ opacity: swipeOffset > 40 ? 1 : 0 }}>
        <XCircle className="h-8 w-8 text-red-500" strokeWidth={2.5} />
      </div>
    </div>
  )
}

function MobileFlashcardView({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onBack,
  onForward,
  isLoading = false,
  enableAnimation = true,
}: {
  question: {
    _id: string
    text: string
    options: string[]
    correct_answer: number | number[]
    explanation?: string
    image_url?: string
  }
  questionNumber: number
  totalQuestions: number
  onAnswer: (knows: boolean) => void
  onBack: () => void
  onForward?: () => void
  isLoading?: boolean
  enableAnimation?: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
  })

  useEffect(() => {
    setIsFlipped(false)
    setShowExplanation(false)
    setSwipeState({ startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false })
  }, [question._id, questionNumber])

  const correctAnswers = useMemo(() => {
    const answerIndices = Array.isArray(question.correct_answer) ? question.correct_answer : question.correct_answer != null ? [question.correct_answer] : []
    return answerIndices
      .map((idx: number) => question.options?.[idx])
      .filter(Boolean) as string[]
  }, [question])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLoading) return
    setSwipeState({ 
      startX: e.touches[0].clientX, 
      startY: e.touches[0].clientY,
      currentX: e.touches[0].clientX, 
      currentY: e.touches[0].clientY,
      isDragging: true 
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.isDragging || isLoading) return
    setSwipeState((prev) => ({ 
      ...prev, 
      currentX: e.touches[0].clientX,
      currentY: e.touches[0].clientY
    }))
  }

  const handleTouchEnd = () => {
    if (!swipeState.isDragging || isLoading) return
    const diffX = swipeState.currentX - swipeState.startX
    const diffY = swipeState.currentY - swipeState.startY
    const threshold = 60

    // Check for vertical swipe down to go back
    if (diffY > threshold && Math.abs(diffY) > Math.abs(diffX)) {
      if ('vibrate' in navigator) navigator.vibrate(40)
      onBack()
    } 
    // Check for vertical swipe up to go forward
    else if (diffY < -threshold && Math.abs(diffY) > Math.abs(diffX)) {
      if ('vibrate' in navigator) navigator.vibrate(40)
      if (onForward) onForward()
    }
    // Check for horizontal swipe to answer - works on both question and answer sides
    else if (Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) {
      if ('vibrate' in navigator) navigator.vibrate(40)
      setIsFlipped(false)
      setShowExplanation(false)
      setSwipeState({ startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false })
      if (diffX > 0) onAnswer(false)
      else onAnswer(true)
      return
    }
    setSwipeState({ startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false })
  }

  const handleTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if (!isLoading && !swipeState.isDragging) {
      if ('vibrate' in navigator) navigator.vibrate(10)
      setIsFlipped(!isFlipped)
    }
  }

  const swipeOffset = swipeState.isDragging ? swipeState.currentX - swipeState.startX : 0
  const swipeOffsetY = swipeState.isDragging ? swipeState.currentY - swipeState.startY : 0
  const isHorizontalSwipe = Math.abs(swipeOffset) > Math.abs(swipeOffsetY)
  const swipeOpacity = 1 - (isHorizontalSwipe ? Math.abs(swipeOffset) : Math.abs(swipeOffsetY)) / 500
  const transformOrigin = isHorizontalSwipe ? 'center center' : (swipeOffsetY > 0 ? 'top center' : 'bottom center')
  
  const totalChars = question.text.length + question.options.reduce((a, b) => a + b.length, 0)
  
  const getQuestionFontSize = () => {
    const text = question.text || ''
    if (text.length > 500) return 'text-[12px] sm:text-[13px]'
    if (text.length > 300) return 'text-[14px] sm:text-[15px]'
    if (text.length > 150) return 'text-[16px] sm:text-[17px]'
    return 'text-[19px] sm:text-[21px]'
  }

  const getOptionFontSize = () => {
    const text = question.options.join('')
    if (text.length > 600) return 'text-[11px]'
    if (text.length > 400) return 'text-[12px]'
    if (text.length > 200) return 'text-[13px]'
    return 'text-[14px]'
  }

  if (!enableAnimation) {
    return (
      <div className="w-full h-full flex flex-col bg-[#F9F9F7] select-none touch-none overflow-hidden overscroll-none">
        <div 
          className="flex-1 flex flex-col p-3 sm:p-5 overflow-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex-1 bg-white rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden"
            style={{
              transform: `translate(${swipeOffset}px, ${swipeOffsetY}px) rotateZ(${isHorizontalSwipe ? swipeOffset / 30 : 0}deg) rotateX(${!isHorizontalSwipe ? swipeOffsetY / 10 : 0}deg) scale(${!isHorizontalSwipe ? 1 - Math.abs(swipeOffsetY) / 2000 : 1})`,
              transformOrigin,
              opacity: swipeOpacity,
              transition: swipeState.isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s',
            }}
          >
            <ScrollArea className="flex-1 w-full h-full pr-1">
              <div className="flex flex-col min-h-full space-y-4 pb-8">
                {question.image_url && (
                  <img src={question.image_url} alt="Q" className="max-h-[100px] w-auto object-contain rounded-xl mx-auto mb-2" />
                )}
                
                <h2 className={cn("font-bold text-gray-900 text-center leading-snug tracking-tight px-1", getQuestionFontSize())}>
                  {question.text}
                </h2>

                <div className="space-y-2 pt-2">
                  {question.options.map((option, idx) => {
                    const answers = Array.isArray(question.correct_answer) ? question.correct_answer : question.correct_answer != null ? [question.correct_answer] : []
                    const isCorrect = answers.includes(idx)
                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (!isFlipped) setIsFlipped(true)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (!isFlipped) setIsFlipped(true)
                          }
                        }}
                        className={cn(
                          "p-3 rounded-xl border flex items-center gap-3 transition-colors",
                          isFlipped && isCorrect 
                            ? "bg-green-50 border-green-500/50" 
                            : "bg-gray-50/50 border-gray-100"
                        )}
                      >
                        <span className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black shadow-sm border",
                          isFlipped && isCorrect ? "bg-green-500 text-white border-green-600" : "bg-white text-[#5D7B6F] border-gray-100"
                        )}>
                          {String.fromCodePoint(65 + idx)}
                        </span>
                        <span className={cn(
                          "font-medium leading-tight flex-1", 
                          getOptionFontSize(),
                          isFlipped && isCorrect ? "text-green-800" : "text-gray-700"
                        )}>
                          {option}
                        </span>
                        {isFlipped && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                      </div>
                    )
                  })}
                </div>

                {isFlipped && question.explanation && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Button 
                      onClick={(e) => { e.stopPropagation(); setShowExplanation(!showExplanation); }}
                      variant="ghost" 
                      className="w-full h-10 px-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 flex justify-between items-center"
                    >
                      <div className="flex items-center">
                        <Lightbulb className="mr-2 h-3.5 w-3.5" />
                        Giải thích chi tiết
                      </div>
                      {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    
                    {showExplanation && (
                      <div className="mt-2 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className={cn("text-slate-700 leading-relaxed", question.explanation.length > 300 ? "text-[12px]" : "text-[14px]")}>
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {isFlipped ? (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(false); }} disabled={isLoading} variant="outline" className="flex-1 h-12 rounded-xl bg-red-50 border-red-100 text-red-600 font-bold uppercase tracking-wider text-[10px]">
                  <XCircle className="mr-1.5 h-4 w-4" strokeWidth={2.5} /> Chưa biết
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(true); }} disabled={isLoading} className="flex-1 h-12 rounded-xl bg-green-600 text-white font-bold uppercase tracking-wider text-[10px] shadow-md shadow-green-200">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" strokeWidth={2.5} /> Đã biết
                </Button>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center z-20">
                <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} variant="outline" className="w-full max-w-xs h-12 rounded-xl border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
                  Xem đáp án
                </Button>
              </div>
            )}
          </div>

          <SwipeIndicator isDragging={swipeState.isDragging} isHorizontalSwipe={isHorizontalSwipe} swipeOffset={swipeOffset} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#F9F9F7] select-none touch-none overflow-hidden overscroll-none">
      {/* Card Area - Full Height minus merged header */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 perspective-2000 overflow-hidden relative">
        <div
          className="relative w-full h-full max-h-[85vh]"
          style={{
            transform: `translate(${swipeOffset}px, ${swipeOffsetY}px) rotateZ(${isHorizontalSwipe ? swipeOffset / 30 : 0}deg) rotateX(${!isHorizontalSwipe ? swipeOffsetY / 10 : 0}deg) scale(${!isHorizontalSwipe ? 1 - Math.abs(swipeOffsetY) / 2000 : 1})`,
            transformOrigin,
            opacity: swipeOpacity,
            transition: swipeState.isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTap}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleTap(e as any)
            }
          }}
        >
          <div
            className="relative w-full h-full transition-transform duration-700 ease-in-out"
            style={{ transformStyle: 'preserve-3d', transform: `rotateY(${isFlipped ? 180 : 0}deg)` }}
          >
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
              <ScrollArea className="flex-1 w-full h-full pr-1">
                <div className="flex flex-col min-h-full justify-center space-y-4 pb-8">
                  {question.image_url && (
                    <img src={question.image_url} alt="Q" className="max-h-[100px] w-auto object-contain rounded-xl mx-auto mb-2" />
                  )}
                  
                  <h2 className={cn("font-bold text-gray-900 text-center leading-snug tracking-tight px-1", getQuestionFontSize())}>
                    {question.text}
                  </h2>

                  <div className="space-y-1.5 pt-2">
                    {question.options.map((option, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-white text-[9px] font-black text-[#5D7B6F] shadow-sm border border-gray-100">
                          {String.fromCodePoint(65 + idx)}
                        </span>
                        <span className={cn("text-gray-700 font-medium leading-tight", getOptionFontSize())}>{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-1.5 bg-gray-50/40 backdrop-blur-sm rounded-full border border-gray-100 flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Chạm để lật</span>
                  <div className="h-1 w-1 rounded-full bg-[#5D7B6F] animate-pulse" />
                </div>
              </div>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden bg-[#5D7B6F] rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-2xl border border-[#4a6358] overflow-hidden" style={{ transform: 'rotateY(180deg)' }}>
              <div className="flex-1 flex flex-col min-h-0 relative">
                <ScrollArea className="flex-1 w-full pr-1">
                  <div className="flex flex-col min-h-full justify-center items-center py-4 space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Đáp án đúng</span>
                    </div>
                    
                    <div className="w-full space-y-2">
                      {correctAnswers.map((answer, idx) => (
                        <div key={idx} className="bg-white/10 p-4 rounded-[1.5rem] border border-white/10">
                          <p className={cn("font-bold text-white text-center leading-tight", answer.length > 100 ? "text-[15px]" : "text-[18px]")}>{answer}</p>
                        </div>
                      ))}
                    </div>

                    {question.explanation && !showExplanation && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setShowExplanation(true); }}
                        variant="ghost" 
                        className="h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20"
                      >
                        <Lightbulb className="mr-2 h-3.5 w-3.5" />
                        Xem giải thích
                      </Button>
                    )}
                  </div>
                </ScrollArea>

                {showExplanation && (
                  <div className="absolute inset-0 bg-[#5D7B6F] z-30 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 p-1">
                    <div className="flex items-center justify-between mb-4 pt-4 px-4">
                      <div className="flex items-center gap-2 text-white/80">
                        <Lightbulb className="h-4 w-4" strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Giải thích chi tiết</span>
                      </div>
                      <Button onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }} variant="ghost" className="h-8 w-8 p-0 rounded-full text-white/60 hover:bg-white/10">
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 px-4">
                      <p className={cn("text-white leading-relaxed pb-8", question.explanation!.length > 300 ? "text-[13px]" : "text-[15px]")}>
                        {question.explanation}
                      </p>
                    </ScrollArea>
                    <div className="p-4 pt-2">
                      <Button onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }} className="w-full h-12 bg-white text-[#5D7B6F] font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg">
                        Đóng giải thích
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex gap-3 z-20">
                <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(false); }} disabled={isLoading} variant="outline" className="flex-1 h-14 rounded-2xl bg-white/5 border-white/10 text-white font-black uppercase tracking-wider text-[10px]">
                  <XCircle className="mr-2 h-4 w-4" strokeWidth={2.5} /> Chưa biết
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(true); }} disabled={isLoading} className="flex-1 h-14 rounded-2xl bg-white text-[#5D7B6F] font-black uppercase tracking-wider text-[10px] shadow-lg">
                  <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={2.5} /> Đã biết
                </Button>
              </div>
            </div>
          </div>
        </div>

        <SwipeIndicator isDragging={swipeState.isDragging} isHorizontalSwipe={isHorizontalSwipe} swipeOffset={swipeOffset} />
      </div>
    </div>
  )
}

export default function MobileFlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const router = useRouter()
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const resolvedQuizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId ?? ''
  const resolvedSessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId ?? ''

  const {
    session,
    question,
    isLoading,
    error,
    submitAnswer,
    isSubmitting,
    stats,
    setStats,
    displayIndex,
    setDisplayIndex,
    enableAnimation,
    setEnableAnimation,
    actualIndex,
    handleBack,
    handleForward,
  } = useFlashcardSessionState(resolvedSessionId, resolvedQuizId)

  const handleAnswer = (knows: boolean) => {
    if (!session || !question) return
    submitAnswer({ knows, questionIndex: actualIndex }, { 
      onSuccess: (data) => {
        setStats(data.stats)
        if (displayIndex !== null) setDisplayIndex(null)
      } 
    })
  }


  if (isLoading) return (
    <div className="h-[100dvh] flex items-center justify-center bg-[#F9F9F7]">
      <Loader2 className="h-10 w-10 animate-spin text-[#5D7B6F]" />
    </div>
  )

  if (error || !session || !question) return (
    <div className="h-[100dvh] flex items-center justify-center bg-[#F9F9F7] p-8">
      <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl bg-[#5D7B6F] font-black uppercase tracking-widest text-xs">Về trang chủ</Button>
    </div>
  )

  return (
    <div className="h-[100dvh] bg-[#F9F9F7] flex flex-col overflow-hidden fixed inset-0 overscroll-none">
      {/* ULTRA COMPACT SINGLE HEADER */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 shadow-sm z-30">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-black text-[#5D7B6F] truncate leading-none">{session.title}</span>
              <span className="text-[8px] font-black uppercase tracking-wider text-gray-400 mt-1">{session.categoryName}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-3.5 h-3.5 ${enableAnimation ? 'text-amber-500' : 'text-gray-300'}`} />
              <Switch 
                checked={enableAnimation} 
                onCheckedChange={setEnableAnimation} 
                className="scale-[0.6] origin-right data-[state=checked]:bg-amber-500"
              />
            </div>
            <div className="flex items-center gap-3 px-3 py-1 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-black text-green-600">{stats.known}</span>
                <span className="text-[7px] font-black text-gray-300 uppercase">Biết</span>
              </div>
              <div className="w-[1px] h-3 bg-gray-200" />
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-black text-red-500">{stats.unknown}</span>
                <span className="text-[7px] font-black text-gray-300 uppercase">Chưa</span>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="p-1 text-gray-300 hover:text-gray-600 transition-colors">
              <XCircle className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar Integrated into Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#5D7B6F] transition-all duration-700" style={{ width: `${(actualIndex + 1) / session.totalQuestions * 100}%` }} />
          </div>
          <span className="text-[8px] font-black text-gray-400 whitespace-nowrap uppercase tracking-widest">
            {actualIndex + 1} / {session.totalQuestions}
          </span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <MobileFlashcardView 
          question={question} 
          questionNumber={actualIndex + 1} 
          totalQuestions={session.totalQuestions} 
          onAnswer={handleAnswer} 
          onBack={handleBack} 
          onForward={handleForward}
          isLoading={isSubmitting} 
          enableAnimation={enableAnimation}
        />
      </div>
    </div>
  )
}
