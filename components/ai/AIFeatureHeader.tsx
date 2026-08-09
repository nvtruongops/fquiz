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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Xưởng Học Liệu AI Studio</h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Multi-Lang
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              Biên soạn bài học, phân tích ngữ pháp, đoạn văn & AI chấm bài viết tự động.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/ai/history">
            <Button variant="outline" className="rounded-2xl text-xs font-bold border-border text-foreground hover:bg-muted">
              Lịch sử AI
            </Button>
          </Link>
          <Link href="/student/dashboard">
            <Button variant="ghost" size="sm" className="rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground">
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
              className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md transform -translate-y-0.5'
                  : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {isActive && <span className="w-2 h-2 rounded-full bg-primary-foreground animate-ping" />}
              </div>
              <div className="mt-3">
                <h3 className="text-xs font-bold">{tab.label}</h3>
                <p className={`text-[10px] mt-0.5 line-clamp-1 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
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
          className="w-full bg-card p-4 rounded-2xl border-2 border-border shadow-xs flex items-center justify-between font-bold text-card-foreground text-sm cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {currentTabObj && <currentTabObj.icon className="w-4 h-4 text-primary" />}
            <span>{currentTabObj?.label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {mobileDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground rounded-2xl border border-border shadow-xl p-2 z-40 space-y-1">
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setMobileDropdownOpen(false)
                }}
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs font-bold cursor-pointer ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-card-foreground hover:bg-muted'
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
      <div className="bg-card text-card-foreground p-5 rounded-3xl border border-border shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Ngôn ngữ cần Học / Biên soạn:</label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
              <SelectValue placeholder="Chọn ngôn ngữ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-primary/10">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Trình độ CEFR / Khung chuẩn:</label>
          <Select value={cefrLevel} onValueChange={setCefrLevel}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
              <SelectValue placeholder="Chọn trình độ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
              {activeLevelOptions.map((lvl) => (
                <SelectItem key={lvl.code} value={lvl.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-primary/10">
                  {lvl.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Ngôn ngữ Giải thích / Dịch nghĩa:</label>
          <Select value={explanationLanguage} onValueChange={setExplanationLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
              <SelectValue placeholder="Ngôn ngữ giải thích..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-primary/10">
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
