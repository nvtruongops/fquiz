'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

export default function QuizSidebar({
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
}: Readonly<QuizSidebarProps>) {
  const options = Array.from({ length: Math.max(optionCount, 1) }, (_, i) => String.fromCodePoint(65 + i))

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
                className="flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-80"
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center border-2 border-[#111111] bg-white text-[10px] font-bold',
                    selectedOptions.includes(idx) && 'bg-[#d8ebd8]'
                  )}
                >
                  {selectedOptions.includes(idx) ? 'X' : ''}
                </span>
                <span className="text-[24px] font-bold leading-none text-[#111111]">{option}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t-2 border-[#101010] p-3 sm:p-4">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="h-10 rounded-none border-[#111111] bg-[#f4f4f4] text-[16px] font-semibold text-[#111111] hover:bg-white"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === totalQuestions - 1}
              className="h-10 rounded-none border-[#111111] bg-[#f4f4f4] text-[16px] font-semibold text-[#111111] hover:bg-white"
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

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
