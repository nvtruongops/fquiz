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
      <header className="shrink-0 border-b-2 border-[#101010] bg-[#e9e9e9] px-3 py-2 sm:px-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
          <div className="flex min-w-[210px] flex-col gap-1 text-[15px] font-semibold leading-tight text-[#111111]">
            <p>Danh mục: <span className="font-bold">{categoryName || 'Chưa phân loại'}</span></p>
            <p>Mã Quiz: <span className="font-bold uppercase">{courseCode || 'N/A'}</span></p>
          </div>
          <div className="min-w-0 flex-1 border border-[#c8c8c8] bg-[#efefef] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-[#2f6f31]">
                There are {totalQuestions || 0} questions, and your progress of answering is {progressPercent}% ({answeredCount}/{totalQuestions || 0}) - current question: {Math.min(currentIndex + 1, Math.max(totalQuestions, 1))}
              </p>
              <div className="flex items-center gap-3 shrink-0">
                {onToggleExplanation && (
                  <button
                    type="button"
                    onClick={onToggleExplanation}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-900 border border-amber-400 font-bold text-xs"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {isExplanationOpen ? 'Đóng giải thích' : 'Mở giải thích'}
                  </button>
                )}
                {onToggleAnimation && (
                  <div className="flex items-center gap-1.5 bg-white/70 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full shadow-sm" title="Bật/Tắt hiệu ứng giao diện">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">Hiệu ứng</span>
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
            <div className="mt-1 border border-[#c8c8c8] bg-white p-[2px]">
              <progress
                value={progressPercent}
                max={100}
                className="h-3 w-full overflow-hidden [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-[#22b14c] [&::-moz-progress-bar]:bg-[#22b14c]"
              />
            </div>
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
