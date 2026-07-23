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
  PenTool,
  Loader2,
  FileText,
  Sparkles,
  Zap,
  Edit3,
  Send,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  AlertCircle,
  Settings,
} from 'lucide-react'

interface AIWritingStudioProps {
  writingSubTab: 'config' | 'workspace' | 'eval'
  setWritingSubTab: (tab: 'config' | 'workspace' | 'eval') => void
  writingWordCount: number | string
  setWritingWordCount: (val: number | string) => void
  selectedTopicSlug: string
  setSelectedTopicSlug: (val: string) => void
  customTopicInput: string
  setCustomTopicInput: (val: string) => void
  textGenre: string
  setTextGenre: (val: string) => void
  situationalContext: string
  setSituationalContext: (val: string) => void
  userWritingInput: string
  setUserWritingInput: (val: string) => void
  userSubmissionLanguage: string
  setUserSubmissionLanguage: (lang: string) => void
  explanationLanguage: string
  setExplanationLanguage: (lang: string) => void
  commonTopics: { code: string; label: string }[]
  textGenresOptions: { code: string; label: string }[]
  languagesOptions: { code: string; label: string }[]
  loading: boolean
  handleGenerate: () => void
  currentResult: any
  evaluatingWriting: boolean
  writingEvalResult: any
  handleEvaluateWriting: () => void
  cefrLevel: string
  setResultCache: React.Dispatch<React.SetStateAction<Map<string, any>>>
}

export const AIWritingStudio = React.memo(function AIWritingStudio({
  writingSubTab,
  setWritingSubTab,
  writingWordCount,
  setWritingWordCount,
  selectedTopicSlug,
  setSelectedTopicSlug,
  customTopicInput,
  setCustomTopicInput,
  textGenre,
  setTextGenre,
  situationalContext,
  setSituationalContext,
  userWritingInput,
  setUserWritingInput,
  userSubmissionLanguage,
  setUserSubmissionLanguage,
  explanationLanguage,
  setExplanationLanguage,
  commonTopics,
  textGenresOptions,
  languagesOptions,
  loading,
  handleGenerate,
  currentResult,
  evaluatingWriting,
  writingEvalResult,
  handleEvaluateWriting,
  cefrLevel,
  setResultCache,
}: AIWritingStudioProps) {
  const content = currentResult?.content

  const renderWritingWorkspace = () => {
    if (!content) {
      return (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Chưa có văn bản bài đọc / đề bài nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy sang <strong>Tab Cấu hình bài tập</strong> để yêu cầu AI tự động biên soạn văn bản học liệu theo trình độ của bạn.
          </p>
          <Button
            onClick={() => setWritingSubTab('config')}
            className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl text-xs font-bold text-white px-5 h-9"
          >
            Đi tới Cấu hình bài tập
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Exercise Header Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Đề Luyện Viết AI'}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100">
                Level {content.cefrLevel || cefrLevel}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {content.sourceLanguage} {'->'} {content.targetLanguage}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Văn bản gốc / Đề bài ({content.sourceLanguage})
            </span>
            <p className="text-base font-bold text-slate-800 leading-relaxed whitespace-pre-line">
              {content.sourceText}
            </p>
          </div>
        </div>

        {/* User Submission Textarea */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#5D7B6F]" /> Bài làm của bạn ({userSubmissionLanguage || content.targetLanguage})
            </label>
            <span className="text-[11px] font-bold text-slate-400">
              {userWritingInput.trim() ? userWritingInput.trim().split(/\s+/).filter(Boolean).length : 0} từ đã viết
            </span>
          </div>

          <textarea
            value={userWritingInput}
            onChange={(e) => {
              const val = e.target.value
              setUserWritingInput(val)
              setResultCache(prev => {
                const existing = prev.get('writing')
                if (!existing) return prev
                return new Map(prev).set('writing', {
                  ...existing,
                  userWritingInput: val,
                })
              })
            }}
            placeholder={'Nhập bài viết hoặc bài dịch của bạn bằng ' + (userSubmissionLanguage || content.targetLanguage) + ' tại đây...'}
            rows={10}
            className="w-full border-2 border-slate-200 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 rounded-2xl p-5 text-base font-medium bg-slate-50/50 outline-none resize-y leading-relaxed text-slate-900 min-h-[240px]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Ngôn ngữ Giải thích / Dịch nghĩa:</span>
              <Select value={explanationLanguage} onValueChange={setExplanationLanguage}>
                <SelectTrigger className="h-10 w-44 rounded-xl border-2 border-slate-200/90 font-bold text-xs bg-white text-slate-800 focus:border-[#5D7B6F]">
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

            <Button
              type="button"
              onClick={handleEvaluateWriting}
              disabled={evaluatingWriting || !userWritingInput.trim()}
              className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 py-3 rounded-xl text-xs font-bold text-white ml-auto"
            >
              {evaluatingWriting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Nộp bài & AI Đánh giá
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderWritingEvalResult = () => {
    if (!writingEvalResult) {
      return (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Chưa có kết quả đánh giá từ AI</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy sang <strong>Tab Văn bản & Bài làm</strong> để hoàn thành bài viết của bạn và nhấn nút "Nộp bài & AI Đánh giá".
          </p>
          <Button
            onClick={() => setWritingSubTab('workspace')}
            className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl text-xs font-bold text-white px-5 h-9"
          >
            Đi tới Văn bản & Bài làm
          </Button>
        </div>
      )
    }

    return (
      <div className="bg-white p-6 rounded-3xl border-2 border-emerald-300 shadow-lg space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-[#5D7B6F] text-white shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 block">Kết quả Đánh giá AI</span>
            <h4 className="text-xl font-black">{writingEvalResult.rating}</h4>
            <p className="text-xs text-emerald-100/90 leading-relaxed">{writingEvalResult.detailedFeedback}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center bg-white text-[#5D7B6F] w-20 h-20 rounded-2xl shadow-md border-2 border-emerald-100 flex-col">
            <span className="text-2xl font-black leading-none">{writingEvalResult.score}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">/ 100 điểm</span>
          </div>
        </div>

        {writingEvalResult.suggestedAnswer && (
          <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" /> Phiên bản đề xuất chỉnh sửa tối ưu hơn
            </span>
            <p className="text-sm font-bold text-emerald-950 leading-relaxed whitespace-pre-line">{writingEvalResult.suggestedAnswer}</p>
          </div>
        )}

        {Array.isArray(writingEvalResult.corrections) && writingEvalResult.corrections.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Chi tiết các điểm cần sửa ({writingEvalResult.corrections.length} vị trí)
            </h4>
            <div className="space-y-2.5">
              {writingEvalResult.corrections.map((corr: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100 line-through">{corr.original}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">{'->'} {corr.corrected}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{corr.type}</span>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">{corr.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(writingEvalResult.strengths) && writingEvalResult.strengths.length > 0 && (
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-[#5D7B6F]" /> Điểm mạnh bài làm
              </span>
              <ul className="space-y-1 text-xs text-slate-700 font-medium">
                {writingEvalResult.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#5D7B6F] font-bold">{'•'}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(writingEvalResult.improvements) && writingEvalResult.improvements.length > 0 && (
            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Điểm cần cải thiện
              </span>
              <ul className="space-y-1 text-xs text-slate-700 font-medium">
                {writingEvalResult.improvements.map((imp: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">{'•'}</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWritingSubTab('workspace')}
            className="rounded-xl font-bold text-xs text-slate-700 border-slate-200 hover:bg-slate-100"
          >
            <Edit3 className="w-4 h-4 mr-1.5" /> Chỉnh sửa & Nộp lại
          </Button>
          <Button
            type="button"
            onClick={() => setWritingSubTab('config')}
            className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl font-bold text-xs text-white"
          >
            <Settings className="w-4 h-4 mr-1.5" /> Tạo bài học mới
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Writing Sub-tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
        <button
          onClick={() => setWritingSubTab('config')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            writingSubTab === 'config' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Cấu hình Bài tập
        </button>
        <button
          onClick={() => setWritingSubTab('workspace')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            writingSubTab === 'workspace' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Văn bản & Bài làm
        </button>
        <button
          onClick={() => setWritingSubTab('eval')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            writingSubTab === 'eval' ? 'bg-[#5D7B6F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          AI Chấm điểm
        </button>
      </div>

      {writingSubTab === 'config' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#5D7B6F]" /> Cấu hình Đề Luyện Viết AI
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Chủ đề luyện viết / Đề bài:</label>
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
                  placeholder="Nhập đề bài tùy chỉnh..."
                  className="h-11 rounded-2xl border-2 border-slate-200 text-xs font-semibold mt-2 focus:border-[#5D7B6F]"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Thể loại bài viết:</label>
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

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Số lượng từ dự kiến (Word Count):</label>
            <Input
              type="number"
              value={writingWordCount}
              onChange={(e) => setWritingWordCount(e.target.value)}
              placeholder="100"
              className="h-11 rounded-2xl border-2 border-slate-200 text-xs font-semibold max-w-xs focus:border-[#5D7B6F]"
            />
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang soạn đề bài...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 text-emerald-300" /> Tạo Đề Luyện Viết
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {writingSubTab === 'workspace' && renderWritingWorkspace()}
      {writingSubTab === 'eval' && renderWritingEvalResult()}
    </div>
  )
})
