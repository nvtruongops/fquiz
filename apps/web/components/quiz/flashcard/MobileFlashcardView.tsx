'use client'

import * as React from 'react'
import { useState, useMemo, useRef, useEffect } from 'react'
import { CheckCircle2, XCircle, Lightbulb, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { cn } from '@/lib/core/utils/cn'

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
      <div
        className="h-16 w-16 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20"
        style={{ opacity: swipeOffset < -40 ? 1 : 0 }}
      >
        <XCircle className="h-8 w-8 text-red-500" strokeWidth={2.5} />
      </div>
      <div
        className="h-16 w-16 flex items-center justify-center rounded-full bg-green-500/10 border border-green-500/20"
        style={{ opacity: swipeOffset > 40 ? 1 : 0 }}
      >
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
      text: question.options?.[idx],
    }))
    .filter((item): item is { index: number; letter: string; text: string } => Boolean(item.text))
}

export interface FlashcardQuestionItem {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
  usage_count?: number
  used_in_quizzes?: string[]
}

interface MobileFlashcardViewProps {
  question: FlashcardQuestionItem
  questionNumber: number
  totalQuestions: number
  onAnswer: (knows: boolean) => void
  onBack: () => void
  onForward?: () => void
  isLoading?: boolean
  enableAnimation?: boolean
  taggedStatus?: 'known' | 'unknown' | null
}

export function MobileFlashcardView({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onBack,
  onForward,
  isLoading = false,
  enableAnimation = true,
  taggedStatus,
}: Readonly<MobileFlashcardViewProps>) {
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
                  <div className="flex items-center justify-between border-b border-border pb-2 mb-2 gap-2">
                    <UsageBadge
                      count={question.usage_count}
                      used_in_quizzes={question.used_in_quizzes}
                      size="sm"
                      align="left"
                    />

                    {taggedStatus && (
                      <div className="flex items-center justify-end">
                        {taggedStatus === 'known' && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                            <CheckCircle2 className="w-3 h-3 text-primary" /> Mastered
                          </span>
                        )}
                        {taggedStatus === 'unknown' && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-black text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                            <XCircle className="w-3 h-3 text-destructive" /> Still Learning
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
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tap to flip</span>
                  <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
            </div>

            {/* Back Side */}
            <div
              className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] bg-card text-card-foreground rounded-[2rem] p-5 sm:p-7 flex flex-col shadow-xl border-2 border-border overflow-hidden"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <div className="flex-1 flex flex-col min-h-0 relative">
                <ScrollArea className="flex-1 w-full pr-1">
                  <div className="flex flex-col min-h-full justify-center items-center py-4 space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-success-bg border border-success-border rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success-fg" strokeWidth={2.5} />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-success-fg">Correct Answer</span>
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
                        View explanation
                      </Button>
                    )}
                  </div>
                </ScrollArea>

                {showExplanation && (
                  <div className="absolute inset-0 bg-card text-card-foreground z-30 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 p-1">
                    <div className="flex items-center justify-between mb-4 pt-4 px-4">
                      <div className="flex items-center gap-2 text-foreground">
                        <Lightbulb className="h-4 w-4 text-primary" strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Detailed Explanation</span>
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
                        Close explanation
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
                  <XCircle className="mr-2 h-4 w-4" strokeWidth={2.5} /> Still Learning
                </Button>
                <Button
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(true); }}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px] shadow-lg",
                    taggedStatus === 'known' && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={2.5} /> Mastered
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
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2 gap-2">
                <UsageBadge
                  count={question.usage_count}
                  used_in_quizzes={question.used_in_quizzes}
                  size="sm"
                  align="left"
                />
                {taggedStatus && (
                  <div className="flex items-center justify-end">
                    {taggedStatus === 'known' && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                        <CheckCircle2 className="w-3 h-3 text-primary" /> Mastered
                      </span>
                    )}
                    {taggedStatus === 'unknown' && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-black text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                        <XCircle className="w-3 h-3 text-destructive" /> Still Learning
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
                      Detailed Explanation
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
                <XCircle className="mr-1.5 h-4 w-4" strokeWidth={2.5} /> Still Learning
              </Button>
              <Button
                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); onAnswer(true); }}
                disabled={isLoading}
                className={cn(
                  "flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-[10px] shadow-md",
                  taggedStatus === 'known' && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" strokeWidth={2.5} /> Mastered
              </Button>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-border flex justify-center z-20">
              <Button onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }} variant="outline" className="w-full max-w-xs h-12 rounded-xl border-border text-foreground font-black uppercase tracking-wider text-[10px] bg-muted/60">
                Show Answer
              </Button>
            </div>
          )}
        </div>

        <SwipeIndicator isDragging={swipeState.isDragging} isHorizontalSwipe={isHorizontalSwipe} swipeOffset={swipeOffset} />
      </div>
    </div>
  )
}
