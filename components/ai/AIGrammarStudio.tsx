'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import {
  BookOpen,
  Loader2,
  AlertTriangle,
  Zap,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react'

interface AIGrammarStudioProps {
  viewMode: 'config' | 'result'
  setViewMode: (mode: 'config' | 'result') => void
  grammarTopic: string
  setGrammarTopic: (val: string) => void
  targetLanguage: string
  englishTense: string
  setEnglishTense: (val: string) => void
  englishTensesOptions: { code: string; label: string }[]
  loading: boolean
  handleGenerate: () => void
  currentResult: any
  handleSaveToFlashcard: () => void
  savingFlashcard: boolean
  savedSuccess: boolean
}

export const AIGrammarStudio = React.memo(function AIGrammarStudio({
  viewMode,
  setViewMode,
  grammarTopic,
  setGrammarTopic,
  targetLanguage,
  englishTense,
  setEnglishTense,
  englishTensesOptions,
  loading,
  handleGenerate,
  currentResult,
  handleSaveToFlashcard,
  savingFlashcard,
  savedSuccess,
}: AIGrammarStudioProps) {
  const content = currentResult?.content

  const renderGrammarResult = () => {
    if (!content) return null

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kết quả Phân tích Ngữ pháp AI</span>
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
              {savedSuccess ? 'Đã lưu vào SRS' : 'Lưu mẫu Ngữ pháp vào SRS'}
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

        {/* Header Banner */}
        <div className="bg-primary p-6 rounded-3xl text-primary-foreground space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-primary-foreground/20 px-3 py-1 rounded-full text-primary-foreground">
              {content.cefrLevel ? `Trình độ ${content.cefrLevel}` : 'Điểm Ngữ pháp'}
            </span>
            {content.patternName && <span className="text-xs font-semibold opacity-90">{content.patternName}</span>}
          </div>
          <h3 className="text-xl font-black">{content.patternName || grammarTopic}</h3>
          {content.pattern && (
            <div className="bg-background/20 p-3.5 rounded-2xl border border-primary-foreground/20 font-mono text-sm font-bold text-primary-foreground">
              Công thức: {content.pattern}
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="bg-card p-5 rounded-3xl border border-border space-y-2 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giải thích nguyên lý sử dụng</h4>
          <p className="text-sm font-medium text-card-foreground leading-relaxed">{content.explanation}</p>
        </div>

        {/* Usage Rules */}
        {Array.isArray(content.rules) && content.rules.length > 0 && (
          <div className="bg-success-bg/30 p-5 rounded-3xl border border-success-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              Quy tắc cốt lõi ({content.rules.length} quy tắc)
            </h4>
            <div className="space-y-2">
              {content.rules.map((rule: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 bg-card p-3 rounded-xl border border-success-border text-xs font-medium text-card-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example sentences */}
        {Array.isArray(content.examples) && content.examples.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ví dụ câu áp dụng mẫu ngữ pháp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.examples.map((ex: any, i: number) => (
                <div key={i} className="bg-card p-4 rounded-2xl border border-border shadow-xs space-y-2">
                  <p className="text-sm font-bold text-card-foreground">{ex.sentence}</p>
                  <p className="text-xs font-medium text-primary">{ex.translation}</p>
                  {ex.breakdown && <p className="text-[11px] text-muted-foreground italic bg-muted p-2 rounded-lg">{ex.breakdown}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Mistakes */}
        {Array.isArray(content.commonMistakes) && content.commonMistakes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-incorrect-fg flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Các lỗi thường gặp cần tránh
            </h4>
            <div className="space-y-2">
              {content.commonMistakes.map((m: any, i: number) => (
                <div key={i} className="bg-incorrect-bg/50 p-4 rounded-2xl border border-incorrect-border space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-incorrect-fg font-semibold line-through">
                    <span>Lỗi:</span> {m.mistake}
                  </div>
                  <div className="flex items-center gap-2 text-success-fg font-bold">
                    <span>Sửa chuẩn:</span> {m.correction}
                  </div>
                  {m.explanation && <p className="text-muted-foreground text-[11px] pt-1 border-t border-incorrect-border">{m.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (viewMode === 'result' && currentResult) {
    return renderGrammarResult()
  }

  return (
    <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-5 animate-in fade-in duration-200">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-card-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Cấu hình Yêu cầu Ngữ Pháp AI
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
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Mẫu Ngữ pháp / Cấu trúc cần học:</label>
          <Input
            value={grammarTopic}
            onChange={(e) => setGrammarTopic(e.target.value)}
            placeholder="Ví dụ: Present Perfect vs Past Simple, Relative Clauses..."
            className="h-11 rounded-2xl border-2 border-border text-xs font-semibold focus:border-primary"
          />
        </div>

        {targetLanguage === 'English' && (
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1.5">Lọc theo Thì Ngữ pháp (Tùy chọn):</label>
            <Select value={englishTense} onValueChange={setEnglishTense}>
              <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
                <SelectValue placeholder="Chọn thì tiếng Anh..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
                {englishTensesOptions.map((tense) => (
                  <SelectItem key={tense.code} value={tense.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-muted">
                    {tense.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-11 px-7 rounded-2xl shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang phân tích ngữ pháp...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" /> Phân tích Ngữ pháp AI
            </>
          )}
        </Button>
      </div>
    </div>
  )
})
