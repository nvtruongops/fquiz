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
  Sparkles,
  Loader2,
  FileText,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { ReadingSubMode } from '@/hooks/useAISession'

interface AIReadingStudioProps {
  viewMode: 'config' | 'result'
  setViewMode: (mode: 'config' | 'result') => void
  readingSubMode: ReadingSubMode
  setReadingSubMode: (mode: ReadingSubMode) => void
  selectedTopicSlug: string
  setSelectedTopicSlug: (val: string) => void
  customTopicInput: string
  setCustomTopicInput: (val: string) => void
  textGenre: string
  setTextGenre: (val: string) => void
  commonTopics: { code: string; label: string }[]
  textGenresOptions: { code: string; label: string }[]
  loading: boolean
  handleGenerate: () => void
  currentResult: any
  showParagraphTranslation: boolean
  setShowParagraphTranslation: (val: boolean) => void
  showStoryTranslation: boolean
  setShowStoryTranslation: (val: boolean) => void
  paraAnswers: Record<number, number>
  setParaAnswers: (val: Record<number, number>) => void
}

const SUBMODE_TABS: { id: ReadingSubMode; label: string }[] = [
  { id: 'sentence', label: 'Mẫu câu ứng dụng' },
  { id: 'paragraph', label: 'Bài đọc ngắn & Quiz' },
  { id: 'dialogue', label: 'Kịch bản Hội thoại' },
  { id: 'story', label: 'Truyện ngắn học tập' },
]

export const AIReadingStudio = React.memo(function AIReadingStudio({
  viewMode,
  setViewMode,
  readingSubMode,
  setReadingSubMode,
  selectedTopicSlug,
  setSelectedTopicSlug,
  customTopicInput,
  setCustomTopicInput,
  textGenre,
  setTextGenre,
  commonTopics,
  textGenresOptions,
  loading,
  handleGenerate,
  currentResult,
  showParagraphTranslation,
  setShowParagraphTranslation,
  showStoryTranslation,
  setShowStoryTranslation,
  paraAnswers,
  setParaAnswers,
}: AIReadingStudioProps) {
  const content = currentResult?.content

  const renderSentenceResult = () => {
    const list = Array.isArray(content) ? content : [content]
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" /> Danh sách mẫu câu ứng dụng thực tế ({list.length} câu)
        </h4>
        <div className="space-y-3">
          {list.map((item: any, idx: number) => (
            <div key={idx} className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-bold text-card-foreground leading-relaxed">{item.text}</p>
                  <p className="text-sm font-medium text-primary">{item.translation}</p>
                </div>
                {item.difficulty && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {item.difficulty}
                  </span>
                )}
              </div>

              {Array.isArray(item.vocabulary) && item.vocabulary.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {item.vocabulary.map((v: any, i: number) => (
                    <span key={i} className="text-xs bg-muted text-card-foreground px-2.5 py-1 rounded-xl border border-border">
                      <strong>{v.lemma || v.display}:</strong> {v.definition}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderParagraphResult = () => {
    if (!content) return null
    return (
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-lg font-black text-card-foreground">{content.title || 'Bài đọc hiểu'}</h3>
            {content.wordCount && <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">{content.wordCount} từ</span>}
          </div>

          <div className="text-base font-medium text-card-foreground leading-relaxed whitespace-pre-line">
            {content.body}
          </div>

          {content.translation && (
            <div className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowParagraphTranslation(!showParagraphTranslation)}
                className="text-xs font-bold text-primary border-primary/30 rounded-xl"
              >
                {showParagraphTranslation ? 'Ẩn bản dịch Tiếng Việt' : 'Xem bản dịch Tiếng Việt'}
              </Button>

              {showParagraphTranslation && (
                <div className="mt-3 p-4 rounded-2xl bg-success-bg/40 border border-success-border text-sm font-medium text-success-fg leading-relaxed animate-in fade-in">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extracted Vocabulary */}
        {Array.isArray(content.vocabulary) && content.vocabulary.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Từ vựng quan trọng trong bài đọc</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {content.vocabulary.map((v: any, i: number) => (
                <div key={i} className="bg-card p-3.5 rounded-2xl border border-border shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-card-foreground text-sm">{v.lemma || v.display}</span>
                    {v.cefrLevel && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{v.cefrLevel}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{v.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comprehension Quiz */}
        {Array.isArray(content.comprehensionQuestions) && content.comprehensionQuestions.length > 0 && (
          <div className="space-y-4 bg-success-bg/30 p-6 rounded-3xl border border-success-border">
            <h4 className="text-sm font-bold text-card-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> Câu hỏi kiểm tra mức độ hiểu bài ({content.comprehensionQuestions.length} câu)
            </h4>
            <div className="space-y-4">
              {content.comprehensionQuestions.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-card p-4 rounded-2xl border border-border space-y-3 text-xs">
                  <p className="font-bold text-card-foreground text-sm">{qIdx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const selected = paraAnswers[qIdx] === optIdx
                      const isCorrect = q.correctIndex === optIdx
                      let btnStyle = 'bg-muted border-border text-card-foreground hover:bg-muted/80'
                      if (paraAnswers[qIdx] !== undefined) {
                        if (isCorrect) btnStyle = 'bg-success-bg border-success-border text-success-fg font-bold'
                        else if (selected) btnStyle = 'bg-incorrect-bg border-incorrect-border text-incorrect-fg font-bold'
                      }
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setParaAnswers({ ...paraAnswers, [qIdx]: optIdx })}
                          className={`w-full text-left p-3 rounded-xl border font-medium transition-all ${btnStyle}`}
                        >
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDialogueResult = () => {
    if (!content) return null
    return (
      <div className="space-y-6">
        <div className="bg-card p-5 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-card-foreground">{content.title || 'Kịch bản Hội thoại Mẫu'}</h3>
            {content.setting && <p className="text-xs text-muted-foreground mt-1">Bối cảnh: {content.setting}</p>}
          </div>
          {Array.isArray(content.participants) && content.participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {content.participants.map((p: any, i: number) => (
                <span key={i} className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                  {p.name} ({p.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {Array.isArray(content.lines) && content.lines.length > 0 && (
          <div className="space-y-3">
            {content.lines.map((line: any, idx: number) => {
              const isEven = idx % 2 === 0
              return (
                <div key={idx} className={`flex items-start gap-3 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-xs ${isEven ? 'bg-primary' : 'bg-muted-foreground'}`}>
                    {line.speaker ? line.speaker[0].toUpperCase() : 'A'}
                  </div>
                  <div className={`max-w-xl p-4 rounded-3xl space-y-1.5 shadow-xs border ${isEven ? 'bg-success-bg/40 border-success-border rounded-tl-none text-card-foreground' : 'bg-card border-border rounded-tr-none text-card-foreground'}`}>
                    <span className={`text-[11px] font-bold block ${isEven ? 'text-primary' : 'text-muted-foreground'}`}>{line.speaker}</span>
                    <p className="text-sm font-bold text-card-foreground leading-relaxed">{line.text}</p>
                    <p className="text-xs font-medium text-muted-foreground border-t border-border/50 pt-1.5">{line.translation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderStoryResult = () => {
    if (!content) return null
    return (
      <div className="space-y-6">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="text-xl font-black text-card-foreground">{content.title || 'Truyện ngắn học tập'}</h3>
            {content.wordCount && <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">{content.wordCount} từ</span>}
          </div>

          <div className="text-base font-medium text-card-foreground leading-relaxed whitespace-pre-line">
            {content.body}
          </div>

          {content.moral && (
            <div className="bg-warning-bg/70 p-4 rounded-2xl border border-warning-border text-xs font-semibold text-warning-fg flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-warning-fg shrink-0 mt-0.5" />
              <div>
                <strong className="block text-warning-fg uppercase tracking-wider text-[10px]">Bài học rút ra:</strong>
                <span>{content.moral}</span>
              </div>
            </div>
          )}

          {content.translation && (
            <div className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStoryTranslation(!showStoryTranslation)}
                className="text-xs font-bold text-primary border-primary/30 rounded-xl"
              >
                {showStoryTranslation ? 'Ẩn dịch nghĩa tiếng Việt' : 'Xem dịch nghĩa tiếng Việt'}
              </Button>
              {showStoryTranslation && (
                <div className="mt-3 p-4 rounded-2xl bg-success-bg/40 border border-success-border text-sm font-medium text-success-fg leading-relaxed animate-in fade-in">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderActiveResult = () => {
    if (readingSubMode === 'sentence') return renderSentenceResult()
    if (readingSubMode === 'paragraph') return renderParagraphResult()
    if (readingSubMode === 'dialogue') return renderDialogueResult()
    if (readingSubMode === 'story') return renderStoryResult()
    return null
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Submode Switcher Tabs */}
      <div className="flex bg-card p-1.5 rounded-2xl border border-border shadow-xs max-w-xl">
        {SUBMODE_TABS.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setReadingSubMode(sub.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              readingSubMode === sub.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-card-foreground hover:bg-muted'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {viewMode === 'result' && currentResult ? (
        <div className="space-y-4">
          <div className="flex justify-end">
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
          {renderActiveResult()}
        </div>
      ) : (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-5">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-card-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Cấu hình Bài đọc & Mẫu câu AI
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
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Chủ đề bài đọc / bối cảnh:</label>
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

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Thể loại / Phong cách văn bản:</label>
              <Select value={textGenre} onValueChange={setTextGenre}>
                <SelectTrigger className="h-11 rounded-2xl border-2 border-border font-bold text-xs bg-muted/50 text-card-foreground">
                  <SelectValue placeholder="Chọn thể loại..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50">
                  {textGenresOptions.map((g) => (
                    <SelectItem key={g.code} value={g.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-muted">
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang soạn nội dung...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" /> Biên soạn bài đọc AI
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
