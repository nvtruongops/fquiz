'use client'

import React from 'react'
import { Input } from '@/components/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { Search } from 'lucide-react'

interface AIHistoryFilterBarProps {
  search: string
  setSearch: (val: string) => void
  typeFilter: string
  setTypeFilter: (val: string) => void
  setPage: (page: number) => void
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả thể loại' },
  { value: 'writing_eval', label: 'Đánh giá Luyện Viết' },
  { value: 'writing', label: 'Đề Luyện Viết' },
  { value: 'vocabulary', label: 'Từ vựng' },
  { value: 'grammar', label: 'Ngữ pháp' },
  { value: 'paragraph', label: 'Bài đọc theo chủ đề' },
  { value: 'dialogue', label: 'Kịch bản Hội thoại' },
  { value: 'story', label: 'Truyện ngắn' },
  { value: 'quiz', label: 'Trắc nghiệm AI' },
  { value: 'translation', label: 'Dịch thuật' },
  { value: 'flashcard', label: 'Bộ thẻ Flashcards' },
]

export const AIHistoryFilterBar = React.memo(function AIHistoryFilterBar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  setPage,
}: AIHistoryFilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Tìm theo chủ đề, tiêu đề..."
          className="pl-10 h-10 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-[#5D7B6F] bg-slate-50/50"
        />
      </div>

      <div className="w-full sm:w-56">
        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-10 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700">
            <SelectValue placeholder="Chọn loại bài" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold py-2 rounded-xl cursor-pointer">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})
