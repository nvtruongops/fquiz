'use client'

import React from 'react'
import { Sparkles, BookOpen, Hash, Layers, Lightbulb, PenTool } from 'lucide-react'
import { Switch } from '@/components/shared/ui/switch'
import { cn } from '@/lib/core/utils/cn'

interface QuizHeaderProps {
  categoryName: string
  courseCode: string
  totalQuestions: number
  currentIndex: number
  answeredCount: number
  enableAnimation?: boolean
  onToggleAnimation?: (enabled: boolean) => void
  isExplanationOpen?: boolean
  onToggleExplanation?: () => void
  isNoteMode?: boolean
  onToggleNoteMode?: () => void
  children?: React.ReactNode
}

const QuizHeader = React.memo(function QuizHeader({
  categoryName,
  courseCode,
  totalQuestions,
  currentIndex,
  answeredCount,
  enableAnimation = true,
  onToggleAnimation,
  isExplanationOpen = false,
  onToggleExplanation,
  isNoteMode = false,
  onToggleNoteMode,
  children
}: Readonly<QuizHeaderProps>) {
  const safeTotal = totalQuestions > 0 ? totalQuestions : 1
  const progressPercent = Math.min(100, Math.max(0, Math.round((answeredCount / safeTotal) * 100)))

  if (!enableAnimation) {
    return (
      <header className="shrink-0 border-b border-border bg-card text-card-foreground px-4 py-2 text-xs font-sans">
        <div className="flex items-center justify-between gap-4">
          {/* Center: EOS Progress Bar & Status Text */}
          <div className="flex-1 max-w-xl flex items-center justify-center gap-2 mx-auto">
            <span className="text-xs font-medium text-foreground shrink-0">
              There are <strong className="font-bold">{totalQuestions}</strong> questions, and your progress of answering is
            </span>
            <div
              className="flex-1 h-3.5 bg-muted border border-border rounded-xs overflow-hidden"
              role="progressbar"
              aria-valuenow={answeredCount}
              aria-valuemin={0}
              aria-valuemax={totalQuestions}
              aria-label="Quiz progress"
            >
              <div
                className="h-full w-full bg-success-fg origin-left transition-none will-change-transform"
                style={{ transform: `scaleX(${progressPercent / 100})` }}
              />
            </div>
          </div>

          {/* Right: Controls & Timer */}
          <div className="flex items-center gap-2 shrink-0">
            {onToggleNoteMode && (
              <button
                type="button"
                onClick={onToggleNoteMode}
                aria-label="Vocabulary lookup pen"
                aria-pressed={isNoteMode}
                className={cn(
                  "flex h-7 w-7 items-center justify-center border rounded transition-all cursor-pointer",
                  isNoteMode
                    ? "border-warning-border bg-warning-bg text-warning-fg font-bold animate-pulse ring-2 ring-warning-border"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={isNoteMode ? "Vocabulary Lookup active: Select text to lookup words (Click to return to quiz)" : "Vocabulary Lookup Pen (Select text to lookup words without triggering answer selection)"}
              >
                <PenTool aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleExplanation && (
              <button
                type="button"
                onClick={onToggleExplanation}
                className="flex items-center gap-1 border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted rounded"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {isExplanationOpen ? 'Hide Explanation' : 'Explanation'}
              </button>
            )}
            {onToggleAnimation && (
              <div className="flex items-center gap-1.5 border border-border bg-card px-2 py-1 rounded" title="Toggle animations">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Effects</span>
                <Switch 
                  checked={enableAnimation} 
                  onCheckedChange={onToggleAnimation} 
                  className="scale-75 data-[state=checked]:bg-primary"
                />
              </div>
            )}
            {children}
          </div>
        </div>
      </header>
    )
  }

  // Modern Animated Header Mode
  return (
    <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3 shadow-xs z-20 text-card-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted text-foreground text-xs font-semibold border border-border shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>{categoryName || 'Uncategorized'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Hash className="w-3.5 h-3.5 text-primary" />
            <span className="uppercase">{courseCode || 'N/A'}</span>
          </div>
        </div>

        {/* Center: Progress Bar */}
        <div className="min-w-0 flex-1 max-w-2xl mx-auto w-full px-2">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Quiz Progress: <strong className="text-primary font-black">{answeredCount}</strong>/{totalQuestions} questions</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black text-[11px]">
              {progressPercent}%
            </span>
          </div>
          <div
            className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border"
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
            aria-label="Quiz progress"
          >
            <div
              className="h-full w-full bg-primary rounded-full origin-left transition-transform duration-500 ease-out will-change-transform shadow-2xs"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>
        </div>

        {/* Right: Controls & Timer */}
        <div className="flex items-center gap-3 shrink-0 justify-end">
          {onToggleNoteMode && (
            <button
              type="button"
              onClick={onToggleNoteMode}
              aria-label="Vocabulary lookup pen"
              aria-pressed={isNoteMode}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95",
                isNoteMode
                  ? "bg-warning-bg text-warning-fg border border-warning-border shadow-xs animate-pulse ring-2 ring-warning-border"
                  : "bg-warning-bg/50 text-warning-fg hover:bg-warning-bg border border-warning-border/40"
              )}
              title={isNoteMode ? "Vocabulary Lookup active: Select text to lookup words (Click to return to quiz)" : "Vocabulary Lookup Pen (Select text to lookup words without triggering answer selection)"}
            >
              <PenTool aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
          {onToggleExplanation && (
            <button
              type="button"
              onClick={onToggleExplanation}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95",
                isExplanationOpen
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              )}
              title={isExplanationOpen ? "Collapse explanation" : "View hints & explanation"}
            >
              <Lightbulb className={cn("w-3.5 h-3.5", isExplanationOpen && "fill-current")} />
              <span className="hidden sm:inline">{isExplanationOpen ? "Collapse Explanation" : "Hints & Explanation"}</span>
            </button>
          )}
          {onToggleAnimation && (
            <div className="flex items-center gap-1.5 bg-muted border border-border px-2.5 py-1 rounded-full shadow-2xs" title="Toggle animations">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Effects</span>
              <Switch 
                checked={enableAnimation} 
                onCheckedChange={onToggleAnimation} 
                className="scale-75 data-[state=checked]:bg-primary"
              />
            </div>
          )}
          {children}
        </div>
      </div>
    </header>
  )
})

export default QuizHeader
