'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import {
  Bot,
  Sparkles,
  BookOpen,
  Languages,
  PenTool,
  Globe,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { AIFeatureType, LANGUAGES } from '@/hooks/useAISession'

interface AIFeatureHeaderProps {
  activeTab: AIFeatureType
  setActiveTab: (tab: AIFeatureType) => void
  mobileDropdownOpen: boolean
  setMobileDropdownOpen: (open: boolean) => void
  targetLanguage: string
  setTargetLanguage: (lang: string) => void
  cefrLevel: string
  setCefrLevel: (level: string) => void
  activeLevelOptions: { code: string; label: string }[]
  explanationLanguage: string
  setExplanationLanguage: (lang: string) => void
}

const FEATURE_TABS = [
  { id: 'vocabulary' as const, label: 'Từ vựng (Vocabulary)', icon: Languages, desc: 'Tra cứu & Mở rộng từ vựng' },
  { id: 'grammar' as const, label: 'Ngữ pháp (Grammar)', icon: BookOpen, desc: 'Cấu trúc & Quy tắc sử dụng' },
  { id: 'reading' as const, label: 'Bài đọc & Mẫu câu', icon: Sparkles, desc: 'Đoạn văn, Hội thoại & Truyện' },
  { id: 'translation' as const, label: 'Dịch thuật AI (Translation)', icon: Globe, desc: 'Dịch ngữ cảnh & Phân tích từ' },
  { id: 'writing' as const, label: 'Luyện viết & Chấm bài', icon: PenTool, desc: 'Viết luận, Email & AI Chấm điểm' },
]

export const AIFeatureHeader = React.memo(function AIFeatureHeader({
  activeTab,
  setActiveTab,
  mobileDropdownOpen,
  setMobileDropdownOpen,
  targetLanguage,
  setTargetLanguage,
  cefrLevel,
  setCefrLevel,
  activeLevelOptions,
  explanationLanguage,
  setExplanationLanguage,
}: AIFeatureHeaderProps) {
  const currentTabObj = FEATURE_TABS.find((t) => t.id === activeTab)

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5D7B6F] to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Xưởng Học Liệu AI Studio</h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100">
                Multi-Lang
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Biên soạn bài học, phân tích ngữ pháp, đoạn văn & AI chấm bài viết tự động.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/ai/history">
            <Button variant="outline" className="rounded-2xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50">
              Lịch sử AI
            </Button>
          </Link>
          <Link href="/student/dashboard">
            <Button variant="ghost" size="sm" className="rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-1" /> Trang chủ
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Selector Tabs Desktop */}
      <div className="hidden lg:grid grid-cols-5 gap-3">
        {FEATURE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-br from-emerald-900 to-[#5D7B6F] text-white border-transparent shadow-md transform -translate-y-0.5'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-200' : 'text-[#5D7B6F]'}`} />
                {isActive && <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />}
              </div>
              <div className="mt-3">
                <h3 className="text-xs font-bold">{tab.label}</h3>
                <p className={`text-[10px] mt-0.5 line-clamp-1 ${isActive ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                  {tab.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Mobile Selector Dropdown */}
      <div className="lg:hidden relative">
        <button
          onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
          className="w-full bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between font-bold text-slate-800 text-sm"
        >
          <div className="flex items-center gap-2">
            {currentTabObj && <currentTabObj.icon className="w-4 h-4 text-[#5D7B6F]" />}
            <span>{currentTabObj?.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {mobileDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-40 space-y-1">
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setMobileDropdownOpen(false)
                }}
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                  activeTab === tab.id ? 'bg-emerald-50 text-[#5D7B6F]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global Configuration Bar (Target Lang, CEFR Level, Explanation Lang) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Ngôn ngữ cần Học / Biên soạn:</label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
              <SelectValue placeholder="Chọn ngôn ngữ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Trình độ CEFR / Khung chuẩn:</label>
          <Select value={cefrLevel} onValueChange={setCefrLevel}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
              <SelectValue placeholder="Chọn trình độ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
              {activeLevelOptions.map((lvl) => (
                <SelectItem key={lvl.code} value={lvl.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
                  {lvl.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Ngôn ngữ Giải thích / Dịch nghĩa:</label>
          <Select value={explanationLanguage} onValueChange={setExplanationLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
              <SelectValue placeholder="Ngôn ngữ giải thích..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
})
