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
      <header className="shrink-0 border-b border-[#d4d4d4] bg-white px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Left: Quiz info */}
          <div className="min-w-0 shrink-0">
            <p className="truncate text-sm font-bold text-[#171717]">{categoryName || 'Chưa phân loại'}</p>
            <p className="text-xs font-semibold uppercase text-[#737373]">{courseCode || 'N/A'}</p>
          </div>

          {/* Center: Progress */}
          <div className="min-w-[180px] flex-1">
            <div className="flex items-center justify-between gap-3 text-xs text-[#525252]">
              <span>Đã trả lời {answeredCount}/{totalQuestions || 0} câu ({progressPercent}%)</span>
              <span>Câu hiện tại: {Math.min(currentIndex + 1, Math.max(totalQuestions, 1))}</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-[#e5e5e5]">
              <div className="h-full bg-[#5D7B6F]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Right: Controls & Timer */}
          <div className="flex items-center gap-2 shrink-0">
            {onToggleExplanation && (
              <button
                type="button"
                onClick={onToggleExplanation}
                className="flex items-center gap-1 border border-[#d4d4d4] bg-white px-2 py-1 text-xs font-semibold text-[#404040] hover:bg-[#f5f5f5]"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {isExplanationOpen ? 'Đóng giải thích' : 'Giải thích'}
              </button>
            )}
            {onToggleAnimation && (
              <div className="flex items-center gap-1.5 border border-[#d4d4d4] bg-white px-2 py-1" title="Bật/Tắt hiệu ứng giao diện">
                <Sparkles className="w-3.5 h-3.5 text-[#a3a3a3]" />
                <span className="text-xs font-semibold text-[#525252] hidden sm:inline">Hiệu ứng</span>
                <Switch 
                  checked={enableAnimation} 
                  onCheckedChange={onToggleAnimation} 
                  className="scale-75 data-[state=checked]:bg-amber-500"
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
    <header className="shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-sm z-20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>{categoryName || 'Chưa phân loại'}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/50">
            <Hash className="w-3.5 h-3.5 text-emerald-500" />
            <span className="uppercase">{courseCode || 'N/A'}</span>
          </div>
        </div>

        {/* Center: Progress Bar */}
        <div className="min-w-0 flex-1 max-w-2xl mx-auto w-full px-2">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Tiến độ bài làm: <strong className="text-primary">{answeredCount}</strong>/{totalQuestions} câu</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px]">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm"
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
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95",
                isExplanationOpen
                  ? "bg-amber-500 text-white shadow-amber-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
              )}
              title={isExplanationOpen ? "Thu gọn giải thích" : "Xem gợi ý & giải thích"}
            >
              <Lightbulb className={cn("w-3.5 h-3.5", isExplanationOpen && "fill-current")} />
              <span className="hidden sm:inline">{isExplanationOpen ? "Thu gọn giải thích" : "Gợi ý & Giải thích"}</span>
            </button>
          )}
          {onToggleAnimation && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full shadow-xs" title="Bật/Tắt hiệu ứng giao diện">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">Hiệu ứng</span>
              <Switch 
                checked={enableAnimation} 
                onCheckedChange={onToggleAnimation} 
                className="scale-75 data-[state=checked]:bg-amber-500"
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
