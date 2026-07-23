'use client'

import React from 'react'
import { Input } from '@/components/shared/ui/input'
import { Search, Tag } from 'lucide-react'

interface CommunitySearchFilterBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const POPULAR_TAGS = ['Ôn thi', 'Hỏi đáp', 'Góp ý', 'Từ vựng', 'Ngữ pháp', 'Kinh nghiệm']

export const CommunitySearchFilterBar = React.memo(function CommunitySearchFilterBar({
  searchQuery,
  setSearchQuery,
}: CommunitySearchFilterBarProps) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm thảo luận, tiêu đề, chủ đề ôn tập..."
          className="pl-11 h-11 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-[#5D7B6F] bg-slate-50/50"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
          <Tag className="w-3 h-3" /> Từ khóa hot:
        </span>
        {POPULAR_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setSearchQuery(searchQuery === t ? '' : t)}
            className={`px-3 py-1 rounded-full font-bold text-[11px] border transition-all shrink-0 ${
              searchQuery === t
                ? 'bg-[#5D7B6F] text-white border-[#5D7B6F]'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            #{t}
          </button>
        ))}
      </div>
    </div>
  )
})
