'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import { Library, Compass } from 'lucide-react'

interface MyQuizzesHeaderProps {
  savedQuizTotal?: number
}

export const MyQuizzesHeader = React.memo(function MyQuizzesHeader({
  savedQuizTotal = 0,
}: MyQuizzesHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-3xl border border-border shadow-xs overflow-hidden">
      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
          <Library className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Kho Đề Của Tôi</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {savedQuizTotal} bộ đề đã lưu
            </span>
          </div>
          <p className="text-xs font-medium text-muted-foreground leading-relaxed">
            Quản lý và ôn tập các bộ đề thi trắc nghiệm bạn đã lưu từ Thư viện Khám phá.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto">
        <Link href="/explore" className="w-full sm:w-auto">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-2xl shadow-md px-5 justify-center h-10 cursor-pointer">
            <Compass className="w-4 h-4 mr-1.5" /> Khám phá thêm đề thi
          </Button>
        </Link>
      </div>
    </div>
  )
})
