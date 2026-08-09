'use client'

import React from 'react'
import { Input } from '@/components/shared/ui/input'
import { Search } from 'lucide-react'

interface QuizSearchSortBarProps {
  search: string
  setSearch: (val: string) => void
  activeTab: 'personal' | 'saved'
  setActiveTab: (tab: 'personal' | 'saved') => void
  ownQuizTotal: number
  savedQuizTotal: number
}

const TABS: { id: 'personal' | 'saved'; label: string; getCountText: (p: QuizSearchSortBarProps) => string }[] = [
  { id: 'personal', label: 'Quiz Tự Tạo', getCountText: (p) => `${p.ownQuizTotal}/10` },
  { id: 'saved', label: 'Quiz Đã Lưu (Explore)', getCountText: (p) => `${p.savedQuizTotal}` },
]

export const QuizSearchSortBar = React.memo(function QuizSearchSortBar(props: QuizSearchSortBarProps) {
  const { search, setSearch, activeTab, setActiveTab } = props

  return (
    <div className="bg-card p-5 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      {/* Active Tab Switcher */}
      <div className="flex bg-muted p-1 rounded-2xl border border-border max-w-md">
        {TABS.map((tab) => {
          const countText = tab.getCountText(props)
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isActive ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                {countText}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-64">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã môn, tên bài..."
          className="pl-10 h-10 rounded-2xl border-2 border-input text-xs font-semibold focus:border-primary bg-card text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
})
