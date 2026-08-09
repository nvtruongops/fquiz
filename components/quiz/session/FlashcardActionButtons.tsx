'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'

interface FlashcardActionButtonsProps {
  onAnswer: (knows: boolean) => void
  isLoading?: boolean
  enableAnimation?: boolean
  taggedStatus?: 'known' | 'unknown' | null
}

export const FlashcardActionButtons = React.memo(function FlashcardActionButtons({
  onAnswer,
  isLoading,
  enableAnimation = true,
  taggedStatus,
}: FlashcardActionButtonsProps) {
  return (
    <div className="flex gap-4 sm:gap-6 mt-6">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onAnswer(false)}
        disabled={isLoading}
        className={cn(
          "flex-1 py-6 text-sm sm:text-base font-black border-2 border-destructive/30 text-destructive bg-destructive/10 hover:bg-destructive/20 hover:border-destructive/40 rounded-2xl gap-2 shadow-xs cursor-pointer relative",
          enableAnimation ? "transition-all active:scale-95 duration-200" : "transition-none active:scale-100 duration-0",
          taggedStatus === 'unknown' && "ring-2 ring-destructive ring-offset-2 ring-offset-background border-destructive font-black bg-destructive/20"
        )}
      >
        <XCircle className="w-5 h-5 text-destructive shrink-0" />
        <span>Chưa thuộc</span>
        {taggedStatus === 'unknown' ? (
          <span className="text-[10px] font-black uppercase text-destructive-foreground bg-destructive px-2 py-0.5 rounded-md ml-auto shadow-xs animate-in fade-in">Đã chọn</span>
        ) : (
          <span className="hidden sm:inline-block text-[10px] font-bold text-destructive bg-destructive/15 px-1.5 py-0.5 rounded-md ml-auto">← vuốt trái</span>
        )}
      </Button>

      <Button
        type="button"
        size="lg"
        onClick={() => onAnswer(true)}
        disabled={isLoading}
        className={cn(
          "flex-1 py-6 text-sm sm:text-base font-black bg-primary hover:bg-primary-hover text-primary-foreground rounded-2xl gap-2 shadow-md cursor-pointer relative",
          enableAnimation ? "transition-all active:scale-95 duration-200" : "transition-none active:scale-100 duration-0",
          taggedStatus === 'known' && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary font-black shadow-lg"
        )}
      >
        <CheckCircle className="w-5 h-5 shrink-0 text-primary-foreground" />
        <span>Đã thuộc</span>
        {taggedStatus === 'known' ? (
          <span className="text-[10px] font-black uppercase text-primary bg-primary-foreground px-2 py-0.5 rounded-md ml-auto shadow-xs animate-in fade-in">Đã chọn</span>
        ) : (
          <span className="hidden sm:inline-block text-[10px] font-bold text-primary-foreground/90 bg-primary-foreground/15 px-1.5 py-0.5 rounded-md ml-auto">vuốt phải →</span>
        )}
      </Button>
    </div>
  )
})
