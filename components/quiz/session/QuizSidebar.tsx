'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/shared/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface QuizSidebarProps {
  onSelectOption: (idx: number) => void
  onNavigate: (index: number) => void
  onSubmit: () => void
  currentIndex: number
  totalQuestions: number
  selectedOptions: number[]
  optionCount: number
  isSubmitted: boolean
  isPending: boolean
  answeredCount: number
  enableAnimation?: boolean
  answeredSet?: Set<number>
  onExit?: () => void
}

const QuizSidebar = React.memo(function QuizSidebar({
  onSelectOption,
  onNavigate,
  onSubmit,
  currentIndex,
  totalQuestions,
  selectedOptions,
  optionCount,
  isSubmitted,
  isPending,
  answeredCount,
  enableAnimation = true,
  answeredSet,
  onExit,
}: Readonly<QuizSidebarProps>) {
  const options = Array.from({ length: Math.max(optionCount, 1) }, (_, i) => String.fromCodePoint(65 + i))
  const [focusedOption, setFocusedOption] = useState<number | null>(null)

  // Ref to stabilize the callback — avoids re-attaching the keyboard listener
  const onSelectOptionRef = useRef(onSelectOption)
  onSelectOptionRef.current = onSelectOption

  // Keyboard navigation: ← → for Back/Next, ↑↓ for options, Enter to select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) onNavigate(currentIndex - 1)
          break
        case 'ArrowRight':
          if (currentIndex < totalQuestions - 1) onNavigate(currentIndex + 1)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedOption(prev => prev === null ? options.length - 1 : Math.max(0, prev - 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedOption(prev => prev === null ? 0 : Math.min(options.length - 1, prev + 1))
          break
        case 'Enter':
          if (focusedOption !== null && !isSubmitted) {
            onSelectOptionRef.current(focusedOption)
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, totalQuestions, onNavigate, options.length, focusedOption, isSubmitted])

  // Reset focused option when question changes
  useEffect(() => {
    setFocusedOption(null)
  }, [currentIndex])

  if (!enableAnimation) {
    return (
      <aside className="w-[210px] shrink-0 bg-[#e9e9e9] sm:w-[250px]">
        <div className="quiz-scroll flex h-full flex-col overflow-y-auto">
          <div className="px-4 py-4 sm:px-5">
            <h3 className="mb-2 whitespace-nowrap text-[24px] font-bold leading-none text-[#111111]">Chọn đáp án</h3>
            <div className="space-y-1.5">
              {options.map((option, idx) => (
                <button
                  key={option}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => onSelectOption(idx)}
                  className={cn(
                    'flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-80 rounded px-1 transition-colors',
                    focusedOption === idx && !isSubmitted && 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center border-2 border-[#111111] bg-white text-[10px] font-bold',
                      selectedOptions.includes(idx) && 'bg-[#d8ebd8]',
                      focusedOption === idx && !isSubmitted && 'border-gray-600 bg-gray-200'
                    )}
                  >
                    {selectedOptions.includes(idx) ? 'X' : ''}
                  </span>
                  <span className="text-[24px] font-bold leading-none text-[#111111]">{option}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="h-10 rounded-none border-[#111111] bg-[#f4f4f4] text-[16px] font-semibold text-[#111111] hover:bg-white"
                title="Câu trước (←)"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onNavigate(currentIndex + 1)}
                disabled={currentIndex === totalQuestions - 1}
                className="h-10 rounded-none border-[#111111] bg-[#f4f4f4] text-[16px] font-semibold text-[#111111] hover:bg-white"
                title="Câu sau (→)"
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-auto border-t-2 border-[#101010] p-3 sm:p-4 space-y-2">
            <Button
              type="button"
              onClick={onExit}
              className="h-auto w-full rounded-none border-2 border-[#111111] bg-white px-3 py-2 text-left text-[18px] font-bold text-red-600 hover:bg-red-50"
            >
              Thoát bài thi
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isPending}
              className="h-auto w-full rounded-none border-2 border-[#111111] bg-[#efefef] px-3 py-3 text-left text-[22px] font-bold leading-tight text-[#111111] hover:bg-white"
            >
              <span className="block">Nộp bài <span className="inline-block h-5 w-5 border-2 border-[#111111] align-middle" /></span>
              {isPending ? <Loader2 className="ml-2 inline h-4 w-4 animate-spin align-middle" /> : null}
            </Button>
            <p className="mt-2 text-[17px] font-semibold text-[#333333]">
              {answeredCount}/{totalQuestions} câu đã trả lời
            </p>
          </div>
        </div>
      </aside>
    )
  }

  // Modern Animated Sidebar Mode
  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sm:w-[270px] flex flex-col z-10">
      <div className="quiz-scroll flex h-full flex-col overflow-y-auto p-4 space-y-5">
        
        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            title="Câu trước (←)"
          >
            <ChevronLeft className="mr-1 h-4 w-4 text-primary" /> Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex === totalQuestions - 1}
            className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            title="Câu sau (→)"
          >
            Sau <ChevronRight className="ml-1 h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Question Grid Matrix (Interactive Navigator) */}
        <div className="flex-1 min-h-0 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ma trận câu hỏi
            </h4>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {answeredCount}/{totalQuestions} câu
            </span>
          </div>

          <div className="quiz-scroll flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-6 gap-1.5 p-1.5">
              {Array.from({ length: totalQuestions }, (_, i) => {
                const isCurrent = i === currentIndex
                const isAnswered = answeredSet ? answeredSet.has(i) : false

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate(i)}
                    className={cn(
                      'h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all duration-200 relative',
                      isAnswered
                        ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400',
                      isCurrent && 'ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900 font-extrabold z-10 scale-105'
                    )}

                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="pt-2 space-y-2 mt-auto">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang nộp bài...
              </span>
            ) : (
              <span>Nộp bài thi ({answeredCount}/{totalQuestions})</span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onExit}
            className="w-full h-10 rounded-xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-xs transition-all"
          >
            Tạm dừng & Thoát
          </Button>
        </div>

      </div>
    </aside>
  )
})

export default QuizSidebar
