'use client'

import React from 'react'
import { Input } from '@/components/shared/ui/input'
import { Search, Tag } from 'lucide-react'

interface CommunitySearchFilterBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  availableTags?: string[]
}

export const CommunitySearchFilterBar = React.memo(function CommunitySearchFilterBar({
  searchQuery,
  setSearchQuery,
  availableTags = [],
}: CommunitySearchFilterBarProps) {
  // Deduplicate and filter out empty strings
  const tagsToDisplay = Array.from(new Set(availableTags.map(t => t.trim()).filter(Boolean)))

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

      {tagsToDisplay.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3" /> Từ khóa hot:
          </span>
          {tagsToDisplay.map((t) => {
            const isActive = searchQuery.toLowerCase() === t.toLowerCase()
            return (
              <button
                key={t}
                onClick={() => setSearchQuery(isActive ? '' : t)}
                className={`px-3 py-1 rounded-full font-bold text-[11px] border transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-[#5D7B6F] hover:border-emerald-200'
                }`}
              >
                #{t}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
})

