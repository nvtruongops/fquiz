'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'

interface FlashcardActionButtonsProps {
  onAnswer: (knows: boolean) => void
  isLoading?: boolean
}

export const FlashcardActionButtons = React.memo(function FlashcardActionButtons({
  onAnswer,
  isLoading,
}: FlashcardActionButtonsProps) {
  return (
    <div className="flex gap-4 sm:gap-6 mt-6">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onAnswer(false)}
        disabled={isLoading}
        className="flex-1 py-6 text-sm sm:text-base font-black border-2 border-red-200 text-red-700 bg-red-50/50 hover:bg-red-100 hover:border-red-300 rounded-2xl gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
      >
        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
        <span>Chưa thuộc</span>
        <span className="hidden sm:inline-block text-[10px] font-bold text-red-400 bg-red-100 px-1.5 py-0.5 rounded-md ml-auto">← vuốt trái</span>
      </Button>

      <Button
        type="button"
        size="lg"
        onClick={() => onAnswer(true)}
        disabled={isLoading}
        className="flex-1 py-6 text-sm sm:text-base font-black bg-[#5D7B6F] hover:bg-[#4a6358] text-white rounded-2xl gap-2 shadow-md shadow-[#5D7B6F]/20 active:scale-95 transition-all cursor-pointer"
      >
        <CheckCircle className="w-5 h-5 shrink-0 text-emerald-300" />
        <span>Đã thuộc</span>
        <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-200 bg-white/10 px-1.5 py-0.5 rounded-md ml-auto">vuốt phải →</span>
      </Button>
    </div>
  )
})
