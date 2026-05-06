'use client'

import React, { useState, useMemo } from 'react'
import { Search, BookOpen, Pin, PinOff, ChevronRight, Hash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Category {
  id: string
  name: string
  publishedQuizCount?: number
}

interface CategorySidebarProps {
  categories: Category[]
  pinnedIds: Set<string>
  selectedCategoryId: string | null
  onSelect: (id: string) => void
  onPin: (id: string) => void
  isLoading: boolean
}

export function CategorySidebar({
  categories,
  pinnedIds,
  selectedCategoryId,
  onSelect,
  onPin,
  isLoading
}: CategorySidebarProps) {
  const [search, setSearch] = useState('')

  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.id.toLowerCase().includes(search.toLowerCase())
    )
  }, [categories, search])

  const pinned = filteredCategories.filter(c => pinnedIds.has(c.id))
  const unpinned = filteredCategories.filter(c => !pinnedIds.has(c.id))

  const CategoryItem = ({ cat, isPinned }: { cat: Category; isPinned: boolean }) => {
    const isActive = selectedCategoryId === cat.id
    
    return (
      <div 
        className={cn(
          "group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200",
          isActive 
            ? "bg-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20 translate-x-1" 
            : "hover:bg-[#5D7B6F]/5 text-slate-600 hover:text-[#5D7B6F]"
        )}
        onClick={() => onSelect(cat.id)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            isActive ? "bg-white/20" : "bg-slate-100 group-hover:bg-[#5D7B6F]/10"
          )}>
            <Hash className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400 group-hover:text-[#5D7B6F]")} />
          </div>
          <div className="min-w-0">
            <p className={cn("text-[11px] font-black uppercase tracking-wider break-words leading-tight", isActive ? "text-white" : "text-slate-700")}>
              {cat.name}
            </p>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", isActive ? "text-white/60" : "text-slate-400")}>
              {cat.publishedQuizCount ?? 0} bộ đề
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(cat.id) }}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isActive ? "hover:bg-white/10 text-white" : "hover:bg-[#5D7B6F]/10 text-slate-300 hover:text-[#5D7B6F]"
            )}
          >
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          {!isActive && <ChevronRight className="w-3 h-3 text-slate-300" />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden sticky top-24">
      <div className="p-4 border-b border-slate-50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5D7B6F]">Danh mục môn học</h3>
          {isLoading && <div className="w-3 h-3 border-2 border-[#5D7B6F]/20 border-t-[#5D7B6F] rounded-full animate-spin" />}
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-[#5D7B6F] transition-colors" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã môn..."
            className="h-9 pl-9 pr-3 rounded-xl border-slate-100 bg-slate-50/50 text-xs font-bold placeholder:text-slate-300 focus-visible:ring-[#5D7B6F]/20"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div className="space-y-2">
              <p className="px-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Đã ghim</p>
              <div className="space-y-1">
                {pinned.map(cat => <CategoryItem key={cat.id} cat={cat} isPinned={true} />)}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="px-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Tất cả môn học</p>
            <div className="space-y-1">
              {unpinned.length > 0 ? (
                unpinned.map(cat => <CategoryItem key={cat.id} cat={cat} isPinned={false} />)
              ) : (
                <p className="px-3 py-4 text-[10px] font-medium text-slate-400 italic text-center">Không tìm thấy môn nào</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
