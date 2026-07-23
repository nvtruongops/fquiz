'use client'

import React from 'react'
import { Input } from '@/components/shared/ui/input'
import { Search } from 'lucide-react'

interface QuizSearchSortBarProps {
  search: string
  setSearch: (val: string) => void
  activeTab: 'personal' | 'saved' | 'mix'
  setActiveTab: (tab: 'personal' | 'saved' | 'mix') => void
  ownQuizTotal: number
  savedQuizTotal: number
  mixQuizTotal: number
}

const TABS: { id: 'personal' | 'saved' | 'mix'; label: string; getCount: (p: QuizSearchSortBarProps) => number }[] = [
  { id: 'personal', label: 'Quiz Tự Tạo', getCount: (p) => p.ownQuizTotal },
  { id: 'saved', label: 'Quiz Đã Lưu (Explore)', getCount: (p) => p.savedQuizTotal },
  { id: 'mix', label: 'Quiz Trộn', getCount: (p) => p.mixQuizTotal },
]

export const QuizSearchSortBar = React.memo(function QuizSearchSortBar(props: QuizSearchSortBarProps) {
  const { search, setSearch, activeTab, setActiveTab } = props

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      {/* Active Tab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 max-w-md">
        {TABS.map((tab) => {
          const count = tab.getCount(props)
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isActive ? 'bg-[#5D7B6F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-64">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã môn, tên bài..."
          className="pl-10 h-10 rounded-2xl border-2 border-slate-200 text-xs font-semibold focus:border-[#5D7B6F] bg-slate-50/50"
        />
      </div>
    </div>
  )
})
