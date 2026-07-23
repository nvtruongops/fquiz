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
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-[#5D7B6F]" /> Danh sách mẫu câu ứng dụng thực tế ({list.length} câu)
        </h4>
        <div className="space-y-3">
          {list.map((item: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900 leading-relaxed">{item.text}</p>
                  <p className="text-sm font-medium text-[#5D7B6F]">{item.translation}</p>
                </div>
                {item.difficulty && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100 shrink-0">
                    {item.difficulty}
                  </span>
                )}
              </div>

              {Array.isArray(item.vocabulary) && item.vocabulary.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {item.vocabulary.map((v: any, i: number) => (
                    <span key={i} className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200">
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
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Bài đọc hiểu'}</h3>
            {content.wordCount && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{content.wordCount} từ</span>}
          </div>

          <div className="text-base font-medium text-slate-800 leading-relaxed whitespace-pre-line">
            {content.body}
          </div>

          {content.translation && (
            <div className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowParagraphTranslation(!showParagraphTranslation)}
                className="text-xs font-bold text-[#5D7B6F] border-emerald-200 rounded-xl"
              >
                {showParagraphTranslation ? 'Ẩn bản dịch Tiếng Việt' : 'Xem bản dịch Tiếng Việt'}
              </Button>

              {showParagraphTranslation && (
                <div className="mt-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-sm font-medium text-emerald-950 leading-relaxed animate-in fade-in">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extracted Vocabulary */}
        {Array.isArray(content.vocabulary) && content.vocabulary.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Từ vựng quan trọng trong bài đọc</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {content.vocabulary.map((v: any, i: number) => (
                <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{v.lemma || v.display}</span>
                    {v.cefrLevel && <span className="text-[10px] font-bold bg-emerald-50 text-[#5D7B6F] px-2 py-0.5 rounded-full">{v.cefrLevel}</span>}
                  </div>
                  <p className="text-xs text-slate-600 leading-tight">{v.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comprehension Quiz */}
        {Array.isArray(content.comprehensionQuestions) && content.comprehensionQuestions.length > 0 && (
          <div className="space-y-4 bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#5D7B6F]" /> Câu hỏi kiểm tra mức độ hiểu bài ({content.comprehensionQuestions.length} câu)
            </h4>
            <div className="space-y-4">
              {content.comprehensionQuestions.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{qIdx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const selected = paraAnswers[qIdx] === optIdx
                      const isCorrect = q.correctIndex === optIdx
                      let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      if (paraAnswers[qIdx] !== undefined) {
                        if (isCorrect) btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                        else if (selected) btnStyle = 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
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
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Kịch bản Hội thoại Mẫu'}</h3>
            {content.setting && <p className="text-xs text-slate-500 mt-1">Bối cảnh: {content.setting}</p>}
          </div>
          {Array.isArray(content.participants) && content.participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {content.participants.map((p: any, i: number) => (
                <span key={i} className="text-xs font-bold bg-emerald-50 text-[#5D7B6F] px-3 py-1 rounded-full border border-emerald-100">
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
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${isEven ? 'bg-[#5D7B6F]' : 'bg-slate-700'}`}>
                    {line.speaker ? line.speaker[0].toUpperCase() : 'A'}
                  </div>
                  <div className={`max-w-xl p-4 rounded-3xl space-y-1.5 shadow-xs border ${isEven ? 'bg-emerald-50/60 border-emerald-100 rounded-tl-none text-slate-800' : 'bg-white border-slate-200 rounded-tr-none text-slate-800'}`}>
                    <span className={`text-[11px] font-bold block ${isEven ? 'text-[#5D7B6F]' : 'text-slate-500'}`}>{line.speaker}</span>
                    <p className="text-sm font-bold text-slate-900 leading-relaxed">{line.text}</p>
                    <p className="text-xs font-medium text-slate-600 border-t border-slate-200/50 pt-1.5">{line.translation}</p>
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
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">{content.title || 'Truyện ngắn học tập'}</h3>
            {content.wordCount && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{content.wordCount} từ</span>}
          </div>

          <div className="text-base font-medium text-slate-800 leading-relaxed whitespace-pre-line">
            {content.body}
          </div>

          {content.moral && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-800 uppercase tracking-wider text-[10px]">Bài học rút ra:</strong>
                <span>{content.moral}</span>
              </div>
            </div>
          )}

          {content.translation && (
            <div className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStoryTranslation(!showStoryTranslation)}
                className="text-xs font-bold text-[#5D7B6F] border-emerald-200 rounded-xl"
              >
                {showStoryTranslation ? 'Ẩn dịch nghĩa tiếng Việt' : 'Xem dịch nghĩa tiếng Việt'}
              </Button>
              {showStoryTranslation && (
                <div className="mt-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-sm font-medium text-emerald-950 leading-relaxed animate-in fade-in">
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
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-xl">
        {SUBMODE_TABS.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setReadingSubMode(sub.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              readingSubMode === sub.id
                ? 'bg-[#5D7B6F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
              className="text-xs font-bold text-slate-500 hover:text-slate-900 rounded-xl"
            >
              Chỉnh sửa thông số
            </Button>
          </div>
          {renderActiveResult()}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#5D7B6F]" /> Cấu hình Bài đọc & Mẫu câu AI
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
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Chủ đề bài đọc / bối cảnh:</label>
              <Select value={selectedTopicSlug} onValueChange={setSelectedTopicSlug}>
                <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
                  <SelectValue placeholder="Chọn chủ đề..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
                  {commonTopics.map((top) => (
                    <SelectItem key={top.code} value={top.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
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
                  className="h-11 rounded-2xl border-2 border-slate-200 text-xs font-semibold mt-2 focus:border-[#5D7B6F]"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Thể loại / Phong cách văn bản:</label>
              <Select value={textGenre} onValueChange={setTextGenre}>
                <SelectTrigger className="h-11 rounded-2xl border-2 border-slate-200 font-bold text-xs bg-slate-50/50">
                  <SelectValue placeholder="Chọn thể loại..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
                  {textGenresOptions.map((g) => (
                    <SelectItem key={g.code} value={g.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
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
              className="bg-gradient-to-r from-emerald-800 to-[#5D7B6F] hover:from-emerald-900 hover:to-[#4a6358] text-white font-bold text-xs h-11 px-7 rounded-2xl shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang soạn nội dung...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 text-emerald-300" /> Biên soạn bài đọc AI
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})
