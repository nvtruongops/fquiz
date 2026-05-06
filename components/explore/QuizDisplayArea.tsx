'use client'

import React from 'react'
import { BookOpen, Search, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuizDisplayAreaProps {
  isLoading: boolean
  isEmpty: boolean
  title: string
  subtitle?: string
  children: React.ReactNode
  searchMode: boolean
}

export function QuizDisplayArea({
  isLoading,
  isEmpty,
  title,
  subtitle,
  children,
  searchMode
}: QuizDisplayAreaProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {searchMode ? (
            <Search className="w-5 h-5 text-[#5D7B6F]" />
          ) : (
            <BookOpen className="w-5 h-5 text-[#5D7B6F]" />
          )}
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase break-words leading-tight">
            {title.replaceAll('_', '_\u200B')}
          </h2>
        </div>
        {subtitle && (
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-7 break-all">
            {subtitle}
          </p>
        )}
      </div>

      <div className="relative min-h-[400px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-sm rounded-3xl z-10">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-[#5D7B6F]/10 rounded-full" />
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-[#5D7B6F] rounded-full animate-spin" />
            </div>
            <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase">Không tìm thấy bộ đề nào</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vui lòng thử lại với từ khóa khác hoặc chọn môn học khác</p>
          </div>
        ) : (
          <div className="space-y-6">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
