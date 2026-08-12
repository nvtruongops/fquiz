'use client'

import React, { useEffect, useRef } from 'react'
import type { UserMatcherItem } from '@/app/api/v1/learning/vocabulary/user-matcher-list/route'
import { Sparkles, Calendar, BookOpen, X } from 'lucide-react'

interface VocabPopoverProps {
  item: UserMatcherItem
  position: { top: number; left: number }
  onClose: () => void
}

export function VocabPopover({ item, position, onClose }: VocabPopoverProps) {
  const popoverRef = useRef<HTMLSpanElement>(null)
  const isNeedsReview = item.reviewStatus === 'needs_review'
  const isTempLookup = item.reviewStatus === 'temp'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <span
      ref={popoverRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="vocab-popover-container fixed z-50 -translate-x-1/2 translate-y-2 w-80 rounded-xl border border-border bg-popover/95 p-4 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 inline-block text-left select-none"
    >
      {/* Nút đóng X ở góc trên bên phải */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer z-10"
        title="Đóng bảng giải thích"
      >
        <X className="h-4 w-4" />
      </button>

      <span className="flex items-start justify-between gap-2 border-b border-border pb-2.5 mb-2.5 pr-6">
        <span className="block pr-1">
          <span className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
            <span>{item.display || item.expression}</span>
            {item.partOfSpeech && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                {item.partOfSpeech}
              </span>
            )}
          </span>
          {item.ipa && (
            <span className="text-xs text-muted-foreground font-mono mt-0.5 block">{item.ipa}</span>
          )}
        </span>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
            isTempLookup
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
              : isNeedsReview
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isTempLookup ? (
            <>
              <BookOpen className="h-3 w-3" />
              <span>Tra từ nhanh</span>
            </>
          ) : isNeedsReview ? (
            <>
              <Calendar className="h-3 w-3" />
              <span>Cần ôn tập</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              <span>Đã lưu FSRS</span>
            </>
          )}
        </span>
      </span>

      <span className="block space-y-2 text-xs">
        <span className="block">
          <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
            Bản dịch / Nghĩa
          </span>
          <span className="font-medium text-foreground bg-muted/40 p-2 rounded border border-border/40 block">
            {item.translation || 'Chưa có bản dịch'}
          </span>
        </span>

        {item.contextSentence && (
          <span className="block">
            <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
              Ngữ cảnh đã lưu
            </span>
            <span className="italic text-muted-foreground line-clamp-2 text-[11px] block">
              &quot;{item.contextSentence}&quot;
            </span>
          </span>
        )}

        {item.personalNote && (
          <span className="block">
            <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
              Ghi chú
            </span>
            <span className="text-foreground/90 block">{item.personalNote}</span>
          </span>
        )}
      </span>
    </span>
  )
}
