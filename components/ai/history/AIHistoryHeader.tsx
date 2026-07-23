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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          asChild
          className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
        >
          <Link href="/ai">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Lịch Sử Học Tập AI</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" /> History
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Xem lại các tài nguyên đã tạo, đề bài luyện viết và kết quả chấm điểm AI.
          </p>
        </div>
      </div>

      {typeof totalCount === 'number' && (
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500">Tổng cộng:</span>
          <span className="text-sm font-black text-[#5D7B6F]">{totalCount} bản ghi</span>
        </div>
      )}
    </div>
  )
})
