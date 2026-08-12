'use client'

import React from 'react'
import type { UserMatcherItem } from '@/app/api/v1/learning/vocabulary/user-matcher-list/route'
import { Sparkles, Calendar, BookOpen } from 'lucide-react'

interface VocabPopoverProps {
  item: UserMatcherItem
  position: { top: number; left: number }
  onClose: () => void
}

export function VocabPopover({ item, position, onClose }: VocabPopoverProps) {
  const isNeedsReview = item.reviewStatus === 'needs_review'

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-50 -translate-x-1/2 translate-y-2 w-72 rounded-xl border border-border bg-popover/95 p-3.5 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border pb-2 mb-2">
        <div>
          <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <span>{item.display || item.expression}</span>
            {item.partOfSpeech && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                {item.partOfSpeech}
              </span>
            )}
          </h4>
          {item.ipa && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.ipa}</p>
          )}
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isNeedsReview
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isNeedsReview ? (
            <>
              <Calendar className="h-3 w-3" />
              <span>Cần ôn tập</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              <span>Đã lưu</span>
            </>
          )}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
            Bản dịch / Nghĩa
          </span>
          <p className="font-medium text-foreground bg-muted/40 p-2 rounded border border-border/40">
            {item.translation || 'Chưa có bản dịch'}
          </p>
        </div>

        {item.contextSentence && (
          <div>
            <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
              Ngữ cảnh đã lưu
            </span>
            <p className="italic text-muted-foreground line-clamp-2 text-[11px]">
              "{item.contextSentence}"
            </p>
          </div>
        )}

        {item.personalNote && (
          <div>
            <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider mb-0.5">
              Ghi chú
            </span>
            <p className="text-foreground/90">{item.personalNote}</p>
          </div>
        )}
      </div>
    </div>
  )
}
