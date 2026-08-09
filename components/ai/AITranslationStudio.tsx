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
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bản dịch & Phân tích ngữ cảnh AI</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingFlashcard || savedSuccess}
              onClick={handleSaveToFlashcard}
              className="text-xs font-bold border-success-border text-success-fg hover:bg-success-bg rounded-xl"
            >
              {savingFlashcard ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : savedSuccess ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-success-fg mr-1.5" />
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
              className="text-xs font-bold text-muted-foreground hover:text-card-foreground rounded-xl"
            >
              Chỉnh sửa thông số
            </Button>
          </div>
        </div>

        {/* Source vs Translated Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-5 rounded-2xl border border-border space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Văn bản gốc ({sourceLanguage})</span>
            <p className="text-base font-semibold text-card-foreground leading-relaxed">{content.sourceText}</p>
          </div>
          <div className="bg-success-bg/70 p-5 rounded-2xl border border-success-border space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-success-fg">Bản dịch ({targetLanguage})</span>
            <p className="text-base font-bold text-success-fg leading-relaxed">{content.translatedText}</p>
            {content.transliteration && (
              <p className="text-xs font-mono text-success-fg/80 pt-1 italic">Phiên âm: {content.transliteration}</p>
            )}
          </div>
        </div>

        {/* Word by Word Breakdown */}
        {Array.isArray(content.wordByWord) && content.wordByWord.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-primary" /> Phân tích nghĩa từ/cụm từ theo ngữ cảnh
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {content.wordByWord.map((item: any, idx: number) => (
                <div key={idx} className="bg-card p-3.5 rounded-2xl border border-border shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-card-foreground text-sm">{item.source || item.word}</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                      {item.translated || item.translation}
                    </span>
                  </div>
                  {item.notes && <p className="text-[11px] text-muted-foreground leading-snug">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grammar Notes */}
        {content.grammarNotes && (
          <div className="bg-warning-bg/60 p-4 rounded-2xl border border-warning-border flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-warning-fg shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-warning-fg leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-warning-fg block">Ghi chú ngữ pháp & Cấu trúc</span>
              <p className="whitespace-pre-line font-medium">{content.grammarNotes}</p>
            </div>
          </div>
        )}

        {/* Alternatives */}
        {Array.isArray(content.alternatives) && content.alternatives.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Các phương án dịch thay thế</span>
            <div className="flex flex-wrap gap-2">
              {content.alternatives.map((alt: string, i: number) => (
                <span key={i} className="text-xs font-medium bg-muted text-card-foreground px-3 py-1.5 rounded-xl border border-border">
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
    <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-5 animate-in fade-in duration-200">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-card-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" /> Cấu hình Dịch thuật & Phân tích AI
        </h3>
        {currentResult && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('result')}
            className="text-xs font-bold text-primary hover:bg-muted rounded-xl"
          >
            Xem kết quả gần nhất
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Ngôn ngữ nguồn:</label>
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
              <SelectValue placeholder="Chọn ngôn ngữ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
              {languagesOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-muted">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Ngôn ngữ đích (Bản dịch):</label>
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
              <SelectValue placeholder="Chọn ngôn ngữ..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
              {languagesOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-muted">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground block mb-1.5">Văn bản / Câu cần dịch & phân tích:</label>
        <textarea
          value={translationText}
          onChange={(e) => setTranslationText(e.target.value)}
          placeholder="Nhập văn bản cần dịch tại đây..."
          rows={4}
          className="w-full border-2 border-border focus:border-primary rounded-2xl p-4 text-xs font-medium bg-muted/50 outline-none leading-relaxed text-card-foreground"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !translationText.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-7 rounded-2xl shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang dịch & phân tích...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" /> Dịch & Phân tích AI
            </>
          )}
        </Button>
      </div>
    </div>
  )
})
