'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Lightbulb, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useFlashcardSessionState } from '@/hooks/quiz/useFlashcardSession'

import { Button } from '@/components/shared/ui/button'
import { Switch } from '@/components/shared/ui/switch'
import { cn } from '@/lib/core/utils/cn'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'

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
      <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20" style={{ opacity: swipeOffset < -40 ? 1 : 0 }}>
        <XCircle className="h-8 w-8 text-red-500" strokeWidth={2.5} />
      </div>
      <div className="h-16 w-16 flex items-center justify-center rounded-full bg-green-500/10 border border-green-500/20" style={{ opacity: swipeOffset > 40 ? 1 : 0 }}>
        <CheckCircle2 className="h-8 w-8 text-green-500" strokeWidth={2.5} />
      </div>
    </div>
  )
}

function getQuestionFontSize(text = '') {
  if (text.length > 500) return 'text-[12px] sm:text-[13px]'
  if (text.length > 300) return 'text-[14px] sm:text-[15px]'
  if (text.length > 150) return 'text-[16px] sm:text-[17px]'
  return 'text-[19px] sm:text-[21px]'
}

function getOptionFontSize(options: string[] = []) {
  const text = options.join('')
  if (text.length > 600) return 'text-[11px]'
  if (text.length > 400) return 'text-[12px]'
  if (text.length > 200) return 'text-[13px]'
  return 'text-[14px]'
}

function getMobileCorrectAnswers(question: { options?: string[]; correct_answer?: number | number[] }) {
  const raw = question.correct_answer
  const answerIndices = Array.isArray(raw) ? raw : raw != null ? [raw] : []
  return answerIndices
    .map((idx: number) => ({
      index: idx,
      letter: String.fromCodePoint(65 + idx),
      text: question.options?.[idx]
    }))
    .filter((item): item is { index: number; letter: string; text: string } => Boolean(item.text))
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
  taggedStatus,
}: {
  question: {
    _id: string
    text: string
    options: string[]
    correct_answer: number | number[]
    explanation?: string
    image_url?: string
    usage_count?: number
    used_in_quizzes?: string[]
  }
  questionNumber: number
  totalQuestions: number
  onAnswer: (knows: boolean) => void
  onBack: () => void
  onForward?: () => void
  isLoading?: boolean
  enableAnimation?: boolean
  taggedStatus?: 'known' | 'unknown' | null
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const touchCoordsRef = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false })
  const cardTransformRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setIsFlipped(false)
    setShowExplanation(false)
    touchCoordsRef.current = { startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false }
    if (cardTransformRef.current) {
      cardTransformRef.current.style.transform = ''
      cardTransformRef.current.style.opacity = '1'
      cardTransformRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s'
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [question._id, questionNumber])

  const correctAnswers = useMemo(() => getMobileCorrectAnswers(question), [question])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLoading) return
    touchCoordsRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      currentX: e.touches[0].clientX,
      currentY: e.touches[0].clientY,
      isDragging: true,
    }
    if (cardTransformRef.current) {
      cardTransformRef.current.style.transition = 'none'
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchCoordsRef.current.isDragging || isLoading) return
    touchCoordsRef.current.currentX = e.touches[0].clientX
    touchCoordsRef.current.currentY = e.touches[0].clientY

    if (rafRef.current !== null) return

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (!cardTransformRef.current || !touchCoordsRef.current.isDragging) return
      const diffX = touchCoordsRef.current.currentX - touchCoordsRef.current.startX
      const diffY = touchCoordsRef.current.currentY - touchCoordsRef.current.startY
      const isHorizontal = Math.abs(diffX) > Math.abs(diffY)
      const swipeOpacity = 1 - (isHorizontal ? Math.abs(diffX) : Math.abs(diffY)) / 500
      const rotZ = isHorizontal ? diffX / 30 : 0
      const scale = !isHorizontal ? 1 - Math.abs(diffY) / 2000 : 1

      cardTransformRef.current.style.transform = `translate3d(${diffX}px, ${diffY}px, 0) rotateZ(${rotZ}deg) scale(${scale})`
      cardTransformRef.current.style.opacity = `${swipeOpacity}`
    })
  }

  const handleTouchEnd = () => {
    if (!touchCoordsRef.current.isDragging || isLoading) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const diffX = touchCoordsRef.current.currentX - touchCoordsRef.current.startX
    const diffY = touchCoordsRef.current.currentY - touchCoordsRef.current.startY
    const absX = Math.abs(diffX)
    const absY = Math.abs(diffY)
    const threshold = 60
    touchCoordsRef.current.isDragging = false

    if (cardTransformRef.current) {
      cardTransformRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s'
      cardTransformRef.current.style.transform = ''
      cardTransformRef.current.style.opacity = '1'
    }

    if ('vibrate' in navigator && (absX > threshold || absY > threshold)) {
      navigator.vibrate(40)
    }

    if (absY > absX && absY > threshold) {
      if (diffY > 0) onBack()
      else onForward?.()
    } else if (absX > absY && absX > threshold) {
      setIsFlipped(false)
      setShowExplanation(false)
      onAnswer(diffX > 0)
    }
  }

  const handleTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="dialog"]') || target.closest('.usage-badge-dropdown')) return
    if (!isLoading && !touchCoordsRef.current.isDragging) {
      if ('vibrate' in navigator) navigator.vibrate(10)
      setIsFlipped(!isFlipped)
    }
  }

  const questionFontSize = getQuestionFontSize(question.text)
  const optionFontSize = getOptionFontSize(question.options)

  if (!enableAnimation) {
    return (
      <StaticMobileFlashcardCard
        question={question}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        onAnswer={onAnswer}
        onBack={onBack}
        onForward={onForward}
        isLoading={isLoading}
        taggedStatus={taggedStatus}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        showExplanation={showExplanation}
        setShowExplanation={setShowExplanation}
        swipeState={{ startX: 0, startY: 0, currentX: 0, currentY: 0, isDragging: false }}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
        swipeOffset={0}
        swipeOffsetY={0}
        isHorizontalSwipe={true}
        swipeOpacity={1}
        transformOrigin="center center"
        questionFontSize={questionFontSize}
        optionFontSize={optionFontSize}
      />
    )
  }

  return (
    <div className="w-full h-full flex flex-col bg-background select-none touch-pan-y overflow-hidden overscroll-none">
      {/* Card Area - Full Height */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 perspective-2000 overflow-hidden relative">
        <div
          key={question._id || questionNumber}
          ref={cardTransformRef}
          className="relative w-full h-full max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 duration-300 transform-gpu"
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
            className="relative w-full h-full transition-transform duration-500 ease-in-out"
            style={{ transformStyle: 'preserve-3d', transform: `rotateY(${isFlipped ? 180 : 0}deg)` }}
          >
            {/* Front Side */}
            <div className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] bg-card text-card-foreground rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-md border-2 border-border overflow-hidden">
              <ScrollArea className="flex-1 w-full h-full pr-1">
                <div className="flex flex-col min-h-full justify-center space-y-4 pb-8">
                  {/* Status & Usage Header Bar */}
                  <div className="flex items-center justify-between border-b border-border pb-2 mb-2 gap-2">
                    <UsageBadge
                      count={question.usage_count}
                      used_in_quizzes={question.used_in_quizzes?.length ? question.used_in_quizzes : (question.used_in_quizzes || [])}
                      size="sm"
                      align="left"
                    />

                    {taggedStatus && (
                      <div className="flex items-center justify-end">
                        {taggedStatus === 'known' && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                            <CheckCircle2 className="w-3 h-3 text-primary" /> Đã thuộc
                          </span>
                        )}
                        {taggedStatus === 'unknown' && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-black text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                            <XCircle className="w-3 h-3 text-destructive" /> Chưa thuộc
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {question.image_url && (
                    <img src={question.image_url} alt="Q" className="max-h-[100px] w-auto object-contain rounded-xl mx-auto mb-2" />
                  )}

                  <h2 className={cn("font-normal text-card-foreground text-center leading-relaxed px-1", questionFontSize)}>
                    {question.text}
                  </h2>

                  <div className="space-y-1.5 pt-2">
                    {question.options.map((option, idx) => (
                      <div key={idx} className="p-2.5 bg-muted/60 rounded-xl border border-border flex items-center gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[9px] font-black text-primary border border-primary/20">
                          {String.fromCodePoint(65 + idx)}
                        </span>
                        <span className={cn("text-card-foreground font-medium leading-tight", optionFontSize)}>{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <div className="px-4 py-1.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Chạm để lật</span>
                  <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] bg-card text-card-foreground rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-xl border-2 border-border overflow-hidden" style={{ transform: 'rotateY(180deg)' }}>
              <div className="flex-1 flex flex-col min-h-0 relative">
                <ScrollArea className="flex-1 w-full pr-1">
                  <div className="flex flex-col min-h-full justify-center items-center py-4 space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-success-bg border border-success-border rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success-fg" strokeWidth={2.5} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-success-fg">Đáp án chính xác</span>
                    </div>
                    
                    <div className="w-full space-y-2">
                      {correctAnswers.map((item, idx) => (
                        <div key={idx} className="bg-success-bg/40 p-4 rounded-[1.5rem] border border-success-border flex items-center justify-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {item.letter}
                          </span>
                          <p className={cn("font-semibold text-foreground text-left leading-tight", item.text.length > 100 ? "text-[15px]" : "text-[18px]")}>{item.text}</p>
                        </div>
                      ))}
                    </div>

                    {question.explanation && !showExplanation && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); setShowExplanation(true); }}
                        variant="ghost" 
                        className="h-10 px-4 rounded-xl bg-muted border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted/80"
                      >
                        <Lightbulb className="mr-2 h-3.5 w-3.5 text-primary" />
                        Xem giải thích
                      </Button>
                    )}
                  </div>
                </ScrollArea>

                {showExplanation && (
                  <div className="absolute inset-0 bg-card text-card-foreground z-30 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 p-1">
                    <div className="flex items-center justify-between mb-4 pt-4 px-4">
                      <div className="flex items-center gap-2 text-foreground">
                        <Lightbulb className="h-4 w-4 text-primary" strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Giải thích chi tiết</span>
                      </div>
                      <Button onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }} variant="ghost" className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:bg-muted">
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 px-4">
                      <p className={cn("text-foreground leading-relaxed pb-8", question.explanation!.length > 300 ? "text-[13px]" : "text-[15px]")}>
                        {question.explanation}
                      </p>
                    </ScrollArea>
                    <div className="p-4 pt-2">
                      <Button onClick={(e) => { e.stopPropagation(); setShowExplanation(false); }} className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg">
                        Đóng giải thích
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex gap-3 z-20">
                <Button 
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(false); }} 
                  disabled={isLoading} 
                  variant="outline" 
                  className={cn(
                    "flex-1 h-14 rounded-2xl bg-destructive/10 border-destructive/30 text-destructive font-black uppercase tracking-wider text-[10px]",
                    taggedStatus === 'unknown' && "ring-2 ring-destructive ring-offset-2 bg-destructive/20"
                  )}
                >
                  <XCircle className="mr-2 h-4 w-4" strokeWidth={2.5} /> Chưa biết
                </Button>
                <Button 
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(true); }} 
                  disabled={isLoading} 
                  className={cn(
                    "flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px] shadow-lg",
                    taggedStatus === 'known' && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={2.5} /> Đã biết
                </Button>
              </div>
            </div>
          </div>
        </div>

        <SwipeIndicator isDragging={false} isHorizontalSwipe={false} swipeOffset={0} />
      </div>
    </div>
  )
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { Menu } from 'lucide-react'

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
    actualIndex,
    taggedStatus,
    handleBack,
    handleForward,
  } = useFlashcardSessionState(resolvedSessionId, resolvedQuizId)

  // Modal states
  const [questionMapOpen, setQuestionMapOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

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
    <div className="h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )

  if (error || !session || !question) return (
    <div className="h-[100dvh] flex items-center justify-center bg-background p-8">
      <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs">Về trang chủ</Button>
    </div>
  )

  const effectiveTotal = session.totalQuestions || 0

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden fixed inset-0 overscroll-none select-none">
      {/* Top Header matching Image */}
      <header className="sticky top-0 z-20 border-b border-border bg-card text-card-foreground shadow-xs flex-none">
        <div className="flex items-center justify-between px-3 py-3">
          {/* Left: Menu & Quiz Code */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setQuestionMapOpen(true)}
              className="h-11 w-11 rounded-2xl bg-muted text-primary hover:bg-muted/80 flex items-center justify-center shrink-0 border border-border cursor-pointer transition-colors"
              title="Danh sách câu"
            >
              <Menu className="h-5 w-5 text-primary" strokeWidth={2.2} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground truncate leading-none mb-0.5">{session.categoryName}</p>
              <p className="text-sm font-black text-primary truncate max-w-[150px] leading-tight">{session.courseCode || session.title}</p>
            </div>
          </div>
          
          {/* Right: Progress Stats, Counter & Exit Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center text-xs font-black tracking-tight">
                <span className="text-success-fg font-black">{stats.known} Biết</span>
                <span className="text-muted-foreground font-normal mx-1">|</span>
                <span className="text-destructive font-black">{stats.unknown} Chưa</span>
              </div>
              <p className="text-[11px] font-bold text-primary mt-0.5">
                {actualIndex + 1}/{effectiveTotal} câu
              </p>
            </div>

            <button
              onClick={() => setExitConfirmOpen(true)}
              className="h-11 w-11 rounded-full bg-incorrect-bg hover:bg-incorrect-bg/80 text-destructive flex items-center justify-center shrink-0 cursor-pointer transition-colors border border-incorrect-border ml-1"
              title="Thoát"
            >
              <XCircle className="h-6 w-6 text-destructive" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Top Progress Line */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((actualIndex + 1) / effectiveTotal) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Flashcard Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <MobileFlashcardView 
          question={question} 
          questionNumber={actualIndex + 1} 
          totalQuestions={effectiveTotal} 
          onAnswer={handleAnswer} 
          onBack={handleBack} 
          onForward={handleForward}
          isLoading={isSubmitting} 
          enableAnimation={enableAnimation}
          taggedStatus={taggedStatus}
        />
      </div>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 z-20 border-t-2 border-border bg-card p-3 shadow-lg flex-none">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={actualIndex <= 0}
            onClick={handleBack}
            className="h-12 flex-1 rounded-xl font-bold border-border text-foreground cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-5 w-5 text-primary" />
            <span>Câu trước</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={actualIndex >= effectiveTotal - 1}
            onClick={handleForward}
            className="h-12 flex-1 rounded-xl font-bold border-border text-foreground cursor-pointer disabled:opacity-40"
          >
            <span>Câu sau</span>
            <ChevronRight className="ml-1 h-5 w-5 text-primary" />
          </Button>
        </div>
      </footer>

      {/* Question Map Modal (Danh sách thẻ) */}
      <Dialog open={questionMapOpen} onOpenChange={setQuestionMapOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black text-foreground">Danh sách câu hỏi Flashcard</DialogTitle>
          </DialogHeader>
          <div className="my-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: effectiveTotal }, (_, i) => {
                const isCurrent = i === actualIndex
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setDisplayIndex(i)
                      setQuestionMapOpen(false)
                    }}
                    className={cn(
                      "h-10 rounded-xl font-black text-xs border transition-all active:scale-95 cursor-pointer",
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted text-foreground border-border hover:bg-muted/80"
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionMapOpen(false)} className="w-full h-10 rounded-xl font-bold">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-foreground">Thoát Flashcard?</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Tiến trình ôn tập của bạn sẽ được lưu tự động. Bạn có thể tiếp tục học lại sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full bg-rose-600 py-5 font-bold text-white hover:bg-rose-700 rounded-xl"
            >
              Thoát phòng học
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setExitConfirmOpen(false)}
              className="w-full py-5 font-bold text-muted-foreground"
            >
              Ở lại học tiếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StaticMobileFlashcardCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onBack,
  onForward,
  isLoading,
  taggedStatus,
  isFlipped,
  setIsFlipped,
  showExplanation,
  setShowExplanation,
  swipeState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  swipeOffset,
  swipeOffsetY,
  isHorizontalSwipe,
  swipeOpacity,
  transformOrigin,
  questionFontSize,
  optionFontSize,
}: any) {
  return (
    <div className="w-full h-full flex flex-col bg-background select-none touch-none overflow-hidden overscroll-none">
      <div 
        className="flex-1 flex flex-col p-3 sm:p-5 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          key={question._id || questionNumber}
          className="flex-1 bg-card text-card-foreground rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-md border-2 border-border overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300"
          style={{
            transform: `translate(${swipeOffset}px, ${swipeOffsetY}px) rotateZ(${isHorizontalSwipe ? swipeOffset / 30 : 0}deg) scale(${!isHorizontalSwipe ? 1 - Math.abs(swipeOffsetY) / 2000 : 1})`,
            transformOrigin,
            opacity: swipeOpacity,
            transition: swipeState.isDragging ? 'none' : 'transform 0.25s ease-out, opacity 0.2s',
          }}
        >
          <ScrollArea className="flex-1 w-full h-full pr-1">
            <div className="flex flex-col min-h-full space-y-4 pb-8">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2 gap-2">
                <UsageBadge
                  count={question.usage_count}
                  used_in_quizzes={question.used_in_quizzes?.length ? question.used_in_quizzes : (question.used_in_quizzes || [])}
                  size="sm"
                  align="left"
                />
                {taggedStatus && (
                  <div className="flex items-center justify-end">
                    {taggedStatus === 'known' && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                        <CheckCircle2 className="w-3 h-3 text-primary" /> Đã thuộc
                      </span>
                    )}
                    {taggedStatus === 'unknown' && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-black text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                        <XCircle className="w-3 h-3 text-destructive" /> Chưa thuộc
                      </span>
                    )}
                  </div>
                )}
              </div>

              {question.image_url && (
                <img src={question.image_url} alt="Q" className="max-h-[100px] w-auto object-contain rounded-xl mx-auto mb-2" />
              )}
              
              <h2 className={cn("font-normal text-card-foreground text-center leading-relaxed px-1", questionFontSize)}>
                {question.text}
              </h2>

              <div className="space-y-2 pt-2">
                {question.options.map((option: string, idx: number) => {
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
                          ? "bg-success-bg/40 border-success-border text-foreground font-semibold" 
                          : "bg-muted/60 border-border text-card-foreground"
                      )}
                    >
                      <span className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black shadow-xs border",
                        isFlipped && isCorrect ? "bg-primary text-primary-foreground border-primary" : "bg-primary/10 text-primary border-primary/20"
                      )}>
                        {String.fromCodePoint(65 + idx)}
                      </span>
                      <span className={cn(
                        "font-medium leading-tight flex-1", 
                        optionFontSize,
                        isFlipped && isCorrect ? "text-foreground font-semibold" : "text-card-foreground"
                      )}>
                        {option}
                      </span>
                      {isFlipped && isCorrect && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </div>
                  )
                })}
              </div>

              {isFlipped && question.explanation && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Button 
                    onClick={(e) => { e.stopPropagation(); setShowExplanation(!showExplanation); }}
                    variant="ghost" 
                    className="w-full h-10 px-4 rounded-xl bg-muted border border-border text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 flex justify-between items-center"
                  >
                    <div className="flex items-center">
                      <Lightbulb className="mr-2 h-3.5 w-3.5 text-primary" />
                      Giải thích chi tiết
                    </div>
                    {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  {showExplanation && (
                    <div className="mt-2 p-4 bg-muted/50 rounded-xl border border-border animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className={cn("text-foreground leading-relaxed", question.explanation.length > 300 ? "text-[12px]" : "text-[14px]")}>
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {isFlipped ? (
            <div className="mt-3 pt-3 border-t border-border flex gap-2 z-20 animate-in fade-in duration-200">
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(false); }} 
                disabled={isLoading} 
                variant="outline" 
                className={cn(
                  "flex-1 h-12 rounded-xl border-destructive/30 text-destructive bg-destructive/10 font-black uppercase tracking-wider text-[10px]",
                  taggedStatus === 'unknown' && "ring-2 ring-destructive ring-offset-2 bg-destructive/20"
                )}
              >
                <XCircle className="mr-1.5 h-4 w-4" strokeWidth={2.5} /> Chưa biết
              </Button>
              <Button 
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(true); }} 
                disabled={isLoading} 
                className={cn(
                  "flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px] shadow-md",
                  taggedStatus === 'known' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" strokeWidth={2.5} /> Đã biết
              </Button>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-border flex justify-center z-20">
              <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} variant="outline" className="w-full max-w-xs h-12 rounded-xl border-border text-foreground font-black uppercase tracking-wider text-[10px] bg-muted/60">
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
