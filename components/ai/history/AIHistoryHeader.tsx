'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { ChevronLeft, Sparkles } from 'lucide-react'

interface AIHistoryHeaderProps {
  totalCount?: number
}

export const AIHistoryHeader = React.memo(function AIHistoryHeader({ totalCount }: AIHistoryHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          asChild
          className="rounded-2xl border-border text-card-foreground hover:bg-muted shrink-0 cursor-pointer"
        >
          <Link href="/ai">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight">Lịch Sử Học Tập AI</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> History
            </span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Xem lại các tài nguyên đã tạo, đề bài luyện viết và kết quả chấm điểm AI.
          </p>
        </div>
      </div>

      {typeof totalCount === 'number' && (
        <div className="bg-card px-4 py-2 rounded-2xl border border-border shadow-xs flex items-center gap-2 self-start sm:self-auto text-card-foreground">
          <span className="text-xs font-bold text-muted-foreground">Tổng cộng:</span>
          <span className="text-sm font-black text-primary">{totalCount} bản ghi</span>
        </div>
      )}
    </div>
  )
})
