'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import {
  Globe,
  Loader2,
  Languages,
  Sparkles,
  Zap,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'

interface AITranslationStudioProps {
  viewMode: 'config' | 'result'
  setViewMode: (mode: 'config' | 'result') => void
  translationText: string
  setTranslationText: (text: string) => void
  sourceLanguage: string
  setSourceLanguage: (lang: string) => void
  targetLanguage: string
  setTargetLanguage: (lang: string) => void
  languagesOptions: { code: string; label: string }[]
  loading: boolean
  handleGenerate: () => void
  currentResult: any
  handleSaveToFlashcard: () => void
  savingFlashcard: boolean
  savedSuccess: boolean
}

export const AITranslationStudio = React.memo(function AITranslationStudio({
  viewMode,
  setViewMode,
  translationText,
  setTranslationText,
  sourceLanguage,
  setSourceLanguage,
  targetLanguage,
  setTargetLanguage,
  languagesOptions,
  loading,
  handleGenerate,
  currentResult,
  handleSaveToFlashcard,
  savingFlashcard,
  savedSuccess,
}: AITranslationStudioProps) {
  const content = currentResult?.content

  const renderTranslationResult = () => {
    if (!content) return null

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bản dịch & Phân tích ngữ cảnh AI</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingFlashcard || savedSuccess}
              onClick={handleSaveToFlashcard}
              className="text-xs font-bold border-emerald-200 text-[#5D7B6F] hover:bg-emerald-50 rounded-xl"
            >
              {savingFlashcard ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : savedSuccess ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
              )}
              {savedSuccess ? 'Đã lưu vào SRS' : 'Lưu mẫu câu vào SRS'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('config')}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 rounded-xl"
            >
              Chỉnh sửa thông số
            </Button>
          </div>
        </div>

        {/* Source vs Translated Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Văn bản gốc ({sourceLanguage})</span>
            <p className="text-base font-semibold text-slate-800 leading-relaxed">{content.sourceText}</p>
          </div>
          <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F]">Bản dịch ({targetLanguage})</span>
            <p className="text-base font-bold text-emerald-950 leading-relaxed">{content.translatedText}</p>
            {content.transliteration && (
              <p className="text-xs font-mono text-emerald-700 pt-1 italic">Phiên âm: {content.transliteration}</p>
            )}
          </div>
        </div>

        {/* Word by Word Breakdown */}
        {Array.isArray(content.wordByWord) && content.wordByWord.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-[#5D7B6F]" /> Phân tích nghĩa từ/cụm từ theo ngữ cảnh
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {content.wordByWord.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{item.source || item.word}</span>
                    <span className="text-xs font-semibold text-[#5D7B6F] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {item.translated || item.translation}
                    </span>
                  </div>
                  {item.notes && <p className="text-[11px] text-slate-500 leading-snug">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grammar Notes */}
        {content.grammarNotes && (
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-amber-700 block">Ghi chú ngữ pháp & Cấu trúc</span>
              <p className="whitespace-pre-line font-medium">{content.grammarNotes}</p>
            </div>
          </div>
        )}

        {/* Alternatives */}
        {Array.isArray(content.alternatives) && content.alternatives.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Các phương án dịch thay thế</span>
            <div className="flex flex-wrap gap-2">
              {content.alternatives.map((alt: string, i: number) => (
                <span key={i} className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (viewMode === 'result' && currentResult) {
    return renderTranslationResult()
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#5D7B6F]" /> Cấu hình Dịch thuật & Phân tích AI
        </h3>
        {currentResult && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('result')}
            className="text-xs font-bold text-[#5D7B6F] hover:bg-emerald-50 rounded-xl"
          >
            Xem kết quả gần nhất
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Ngôn ngữ nguồn:</label>
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
              <SelectValue placeholder="Chọn ngôn ngữ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
              {languagesOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">Ngôn ngữ đích (Bản dịch):</label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
              <SelectValue placeholder="Chọn ngôn ngữ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
              {languagesOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 block mb-1.5">Văn bản / Câu cần dịch & phân tích:</label>
        <textarea
          value={translationText}
          onChange={(e) => setTranslationText(e.target.value)}
          placeholder="Nhập văn bản cần dịch tại đây..."
          rows={4}
          className="w-full border-2 border-slate-200 focus:border-[#5D7B6F] rounded-2xl p-4 text-xs font-medium bg-slate-50/50 outline-none leading-relaxed text-slate-900"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !translationText.trim()}
          className="bg-gradient-to-r from-emerald-800 to-[#5D7B6F] hover:from-emerald-900 hover:to-[#4a6358] text-white font-bold text-xs h-11 px-7 rounded-2xl shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang dịch & phân tích...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2 text-emerald-300" /> Dịch & Phân tích AI
            </>
          )}
        </Button>
      </div>
    </div>
  )
})
