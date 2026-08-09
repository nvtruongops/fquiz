'use client'

import React from 'react'
import { Sparkles, BookOpen, Hash, Layers, Lightbulb } from 'lucide-react'
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
  children
}: Readonly<QuizHeaderProps>) {
  const safeTotal = totalQuestions > 0 ? totalQuestions : 1
  const progressPercent = Math.min(100, Math.max(0, Math.round((answeredCount / safeTotal) * 100)))

  if (!enableAnimation) {
    return (
      <header className="shrink-0 border-b border-border bg-card text-card-foreground px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Left: Quiz info */}
          <div className="min-w-0 shrink-0">
            <p className="truncate text-sm font-bold text-foreground">{categoryName || 'Chưa phân loại'}</p>
            <p className="text-xs font-semibold uppercase text-muted-foreground">{courseCode || 'N/A'}</p>
          </div>

          {/* Center: Progress */}
          <div className="min-w-[180px] flex-1">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Đã trả lời {answeredCount}/{totalQuestions || 0} câu ({progressPercent}%)</span>
              <span>Câu hiện tại: {Math.min(currentIndex + 1, Math.max(totalQuestions, 1))}</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Right: Controls & Timer */}
          <div className="flex items-center gap-2 shrink-0">
            {onToggleExplanation && (
              <button
                type="button"
                onClick={onToggleExplanation}
                className="flex items-center gap-1 border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted rounded-lg"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {isExplanationOpen ? 'Đóng giải thích' : 'Giải thích'}
              </button>
            )}
            {onToggleAnimation && (
              <div className="flex items-center gap-1.5 border border-border bg-card px-2.5 py-1 rounded-lg" title="Bật/Tắt hiệu ứng giao diện">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Hiệu ứng</span>
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
            <span>{categoryName || 'Chưa phân loại'}</span>
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
              <span>Tiến độ bài làm: <strong className="text-primary font-black">{answeredCount}</strong>/{totalQuestions} câu</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black text-[11px]">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-2xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Controls & Timer */}
        <div className="flex items-center gap-3 shrink-0 justify-end">
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
              title={isExplanationOpen ? "Thu gọn giải thích" : "Xem gợi ý & giải thích"}
            >
              <Lightbulb className={cn("w-3.5 h-3.5", isExplanationOpen && "fill-current")} />
              <span className="hidden sm:inline">{isExplanationOpen ? "Thu gọn giải thích" : "Gợi ý & Giải thích"}</span>
            </button>
          )}
          {onToggleAnimation && (
            <div className="flex items-center gap-1.5 bg-muted border border-border px-2.5 py-1 rounded-full shadow-2xs" title="Bật/Tắt hiệu ứng giao diện">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Hiệu ứng</span>
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
