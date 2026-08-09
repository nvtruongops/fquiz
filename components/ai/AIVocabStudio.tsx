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
  Languages,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Send,
  Zap,
} from 'lucide-react'

interface AIVocabStudioProps {
  viewMode: 'config' | 'result'
  setViewMode: (mode: 'config' | 'result') => void
  wordInput: string
  setWordInput: (val: string) => void
  selectedTopicSlug: string
  setSelectedTopicSlug: (val: string) => void
  customTopicInput: string
  setCustomTopicInput: (val: string) => void
  commonTopics: { code: string; label: string }[]
  loading: boolean
  handleGenerate: () => void
  currentResult: any
  savingVocabIds: Record<string, boolean>
  savedVocabIds: Record<string, boolean>
  handleSaveSingleVocabulary: (wordItem: any, idx: number) => void
  handleSaveToFlashcard: () => void
  savingFlashcard: boolean
  savedSuccess: boolean
}

export const AIVocabStudio = React.memo(function AIVocabStudio({
  viewMode,
  setViewMode,
  wordInput,
  setWordInput,
  selectedTopicSlug,
  setSelectedTopicSlug,
  customTopicInput,
  setCustomTopicInput,
  commonTopics,
  loading,
  handleGenerate,
  currentResult,
  savingVocabIds,
  savedVocabIds,
  handleSaveSingleVocabulary,
  handleSaveToFlashcard,
  savingFlashcard,
  savedSuccess,
}: AIVocabStudioProps) {
  const content = currentResult?.content

  const renderVocabularyResult = () => {
    if (!content) return null
    const list = Array.isArray(content) ? content : [content]

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-primary" /> Danh sách từ vựng chi tiết ({list.length} từ)
          </h4>

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
              {savedSuccess ? 'Đã lưu vào SRS' : 'Lưu tất cả vào Flashcard SRS'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((wordItem: any, idx: number) => {
            const vocabKey = wordItem.lemma || `word-${idx}`
            return (
              <div key={idx} className="bg-card p-5 rounded-3xl border border-border shadow-xs space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-black text-card-foreground">{wordItem.lemma || wordItem.display}</h3>
                      {wordItem.ipa && (
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                          /{wordItem.ipa}/
                        </span>
                      )}
                    </div>
                    {wordItem.display && wordItem.display !== wordItem.lemma && (
                      <span className="text-xs text-muted-foreground italic">Hiển thị: {wordItem.display}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {wordItem.partOfSpeech && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-card-foreground uppercase tracking-wider">
                        {wordItem.partOfSpeech}
                      </span>
                    )}
                    {wordItem.cefrLevel && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        {wordItem.cefrLevel}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={savingVocabIds[vocabKey]}
                      onClick={() => handleSaveSingleVocabulary(wordItem, idx)}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-primary shrink-0"
                      title="Lưu từ vựng này vào Flashcard SRS"
                    >
                      {savingVocabIds[vocabKey] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : savedVocabIds[vocabKey] ? (
                        <BookmarkCheck className="w-4 h-4 text-success-fg animate-in zoom-in-50" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-success-bg/40 p-3.5 rounded-2xl border border-success-border">
                  <p className="text-xs font-medium text-card-foreground leading-relaxed">
                    <strong className="text-primary">Định nghĩa:</strong> {wordItem.definition}
                  </p>
                </div>

                {Array.isArray(wordItem.examples) && wordItem.examples.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Ví dụ minh họa:</span>
                    <ul className="space-y-1">
                      {wordItem.examples.map((ex: string, i: number) => (
                        <li key={i} className="text-xs font-medium text-card-foreground flex items-start gap-2 bg-muted p-2.5 rounded-xl border border-border">
                          <span className="text-primary font-bold">•</span>
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(wordItem.synonyms?.length > 0 || wordItem.antonyms?.length > 0) && (
                  <div className="flex flex-wrap gap-2 text-[11px] pt-2 border-t border-border">
                    {wordItem.synonyms?.length > 0 && (
                      <span className="text-success-fg font-medium">
                        <strong>Đồng nghĩa:</strong> {wordItem.synonyms.join(', ')}
                      </span>
                    )}
                    {wordItem.antonyms?.length > 0 && (
                      <span className="text-incorrect-fg font-medium">
                        <strong>Trái nghĩa:</strong> {wordItem.antonyms.join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (viewMode === 'result' && currentResult) {
    return renderVocabularyResult()
  }

  return (
    <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-5 animate-in fade-in duration-200">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-card-foreground flex items-center gap-2">
          <Languages className="w-5 h-5 text-primary" /> Cấu hình Yêu cầu Từ Vựng AI
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
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Từ vựng cụ thể (Không bắt buộc):</label>
          <Input
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="Ví dụ: Resilience, Innovation, Ubiquitous..."
            className="h-11 rounded-2xl border-2 border-border text-xs font-semibold focus:border-primary"
          />
          <p className="text-[11px] text-muted-foreground mt-1">Để trống nếu bạn muốn AI tự gợi ý từ vựng theo chủ đề.</p>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1.5">Chủ đề bài học Từ Vựng:</label>
          <Select value={selectedTopicSlug} onValueChange={setSelectedTopicSlug}>
            <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
              <SelectValue placeholder="Chọn chủ đề..." />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
              {commonTopics.map((top) => (
                <SelectItem key={top.code} value={top.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-muted">
                  {top.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTopicSlug === 'custom' && (
            <Input
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              placeholder="Nhập chủ đề tùy chỉnh của bạn..."
              className="h-11 rounded-2xl border-2 border-border text-xs font-semibold mt-2 focus:border-primary"
            />
          )}
        </div>
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
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tổng hợp từ vựng...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" /> Sinh bài học Từ vựng AI
            </>
          )}
        </Button>
      </div>
    </div>
  )
})
