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
        <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border text-center space-y-3 shadow-xs">
          <FileText className="w-8 h-8 text-muted-foreground/60 mx-auto" />
          <h3 className="text-sm font-bold text-card-foreground">Chưa có văn bản bài đọc / đề bài nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Hãy sang <strong>Tab Cấu hình bài tập</strong> để yêu cầu AI tự động biên soạn văn bản học liệu theo trình độ của bạn.
          </p>
          <Button
            onClick={() => setWritingSubTab('config')}
            className="bg-primary hover:bg-primary/90 rounded-xl text-xs font-bold text-primary-foreground px-5 h-9"
          >
            Đi tới Cấu hình bài tập
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Exercise Header Card */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-2">
            <h3 className="text-lg font-black text-card-foreground">{content.title || 'Đề Luyện Viết AI'}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Level {content.cefrLevel || cefrLevel}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-muted text-card-foreground">
                {content.sourceLanguage} {'->'} {content.targetLanguage}
              </span>
            </div>
          </div>

          <div className="bg-muted/50 p-5 rounded-2xl border border-border space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Văn bản gốc / Đề bài ({content.sourceLanguage})
            </span>
            <p className="text-base font-bold text-card-foreground leading-relaxed whitespace-pre-line">
              {content.sourceText}
            </p>
          </div>
        </div>

        {/* User Submission Textarea */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-primary" /> Bài làm của bạn ({userSubmissionLanguage || content.targetLanguage})
            </label>
            <span className="text-[11px] font-bold text-muted-foreground">
              {userWritingInput.trim() ? userWritingInput.trim().split(/\s+/).filter(Boolean).length : 0} từ đã viết
            </span>
          </div>

          <textarea
            value={userWritingInput}
            onFocus={(e) => {
              if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                const target = e.currentTarget
                setTimeout(() => {
                  try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch (_err) { /* ignore */ }
                }, 250)
              }
            }}
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
            className="w-full border-2 border-border focus:border-primary focus:ring-4 focus:ring-ring/20 rounded-2xl p-5 text-base font-medium bg-muted/30 outline-none resize-y leading-relaxed text-card-foreground min-h-[240px] scroll-m-20"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Ngôn ngữ Giải thích / Dịch nghĩa:</span>
              <Select value={explanationLanguage} onValueChange={setExplanationLanguage}>
                <SelectTrigger className="h-10 w-44 rounded-xl border-2 border-border font-bold text-xs bg-card text-card-foreground focus:border-primary">
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

            <Button
              type="button"
              onClick={handleEvaluateWriting}
              disabled={evaluatingWriting || !userWritingInput.trim()}
              className="bg-primary hover:bg-primary/90 shadow-md px-6 py-3 rounded-xl text-xs font-bold text-primary-foreground ml-auto"
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
        <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border text-center space-y-3 shadow-xs">
          <Sparkles className="w-8 h-8 text-muted-foreground/60 mx-auto" />
          <h3 className="text-sm font-bold text-card-foreground">Chưa có kết quả đánh giá từ AI</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Hãy sang <strong>Tab Văn bản & Bài làm</strong> để hoàn thành bài viết của bạn và nhấn nút &quot;Nộp bài & AI Đánh giá&quot;.
          </p>
          <Button
            onClick={() => setWritingSubTab('workspace')}
            className="bg-primary hover:bg-primary/90 rounded-xl text-xs font-bold text-primary-foreground px-5 h-9"
          >
            Đi tới Văn bản & Bài làm
          </Button>
        </div>
      )
    }

    return (
      <div className="bg-card p-6 rounded-3xl border-2 border-primary/30 shadow-lg space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-primary text-primary-foreground shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80 block">Kết quả Đánh giá AI</span>
            <h4 className="text-xl font-black">{writingEvalResult.rating}</h4>
            <p className="text-xs opacity-90 leading-relaxed">{writingEvalResult.detailedFeedback}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center bg-card text-card-foreground w-20 h-20 rounded-2xl shadow-md border-2 border-border flex-col">
            <span className="text-2xl font-black leading-none text-primary">{writingEvalResult.score}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5">/ 100 điểm</span>
          </div>
        </div>

        {writingEvalResult.suggestedAnswer && (
          <div className="bg-success-bg p-5 rounded-2xl border border-success-border space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-success-fg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success-fg" /> Phiên bản đề xuất chỉnh sửa tối ưu hơn
            </span>
            <p className="text-sm font-bold text-success-fg leading-relaxed whitespace-pre-line">{writingEvalResult.suggestedAnswer}</p>
          </div>
        )}

        {Array.isArray(writingEvalResult.corrections) && writingEvalResult.corrections.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-warning-fg" /> Chi tiết các điểm cần sửa ({writingEvalResult.corrections.length} vị trí)
            </h4>
            <div className="space-y-2.5">
              {writingEvalResult.corrections.map((corr: any, idx: number) => (
                <div key={idx} className="bg-muted/40 p-4 rounded-2xl border border-border space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <span className="font-bold text-incorrect-fg bg-incorrect-bg px-2.5 py-0.5 rounded-lg border border-incorrect-border line-through">{corr.original}</span>
                    <span className="font-bold text-success-fg bg-success-bg px-2.5 py-0.5 rounded-lg border border-success-border">{'->'} {corr.corrected}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-card-foreground">{corr.type}</span>
                  </div>
                  <p className="text-card-foreground font-medium leading-relaxed">{corr.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(writingEvalResult.strengths) && writingEvalResult.strengths.length > 0 && (
            <div className="bg-success-bg/40 p-4 rounded-2xl border border-success-border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-success-fg flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-success-fg" /> Điểm mạnh bài làm
              </span>
              <ul className="space-y-1 text-xs text-card-foreground font-medium">
                {writingEvalResult.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-success-fg font-bold">{'•'}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(writingEvalResult.improvements) && writingEvalResult.improvements.length > 0 && (
            <div className="bg-warning-bg/40 p-4 rounded-2xl border border-warning-border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warning-fg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-warning-fg" /> Điểm cần cải thiện
              </span>
              <ul className="space-y-1 text-xs text-card-foreground font-medium">
                {writingEvalResult.improvements.map((imp: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-warning-fg font-bold">{'•'}</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWritingSubTab('workspace')}
            className="rounded-xl font-bold text-xs text-card-foreground border-border hover:bg-muted"
          >
            <Edit3 className="w-4 h-4 mr-1.5" /> Chỉnh sửa & Nộp lại
          </Button>
          <Button
            type="button"
            onClick={() => setWritingSubTab('config')}
            className="bg-primary hover:bg-primary/90 rounded-xl font-bold text-xs text-primary-foreground"
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
      <div className="flex bg-card p-1.5 rounded-2xl border border-border shadow-xs max-w-md">
        <button
          onClick={() => setWritingSubTab('config')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            writingSubTab === 'config' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Cấu hình Bài tập
        </button>
        <button
          onClick={() => setWritingSubTab('workspace')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            writingSubTab === 'workspace' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Văn bản & Bài làm
        </button>
        <button
          onClick={() => setWritingSubTab('eval')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            writingSubTab === 'eval' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          AI Chấm điểm
        </button>
      </div>

      {writingSubTab === 'config' && (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-xs space-y-5">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="text-base font-black text-card-foreground flex items-center gap-2">
              <PenTool className="w-5 h-5 text-primary" /> Cấu hình Đề Luyện Viết AI
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Chủ đề luyện viết / Đề bài:</label>
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
                  placeholder="Nhập đề bài tùy chỉnh..."
                  className="h-11 rounded-2xl border-2 border-border text-xs font-semibold mt-2 focus:border-primary"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">Thể loại bài viết:</label>
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

          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1.5">Số lượng từ dự kiến (Word Count):</label>
            <Input
              type="number"
              value={writingWordCount}
              onChange={(e) => setWritingWordCount(e.target.value)}
              placeholder="100"
              className="h-11 rounded-2xl border-2 border-border text-xs font-semibold max-w-xs focus:border-primary"
            />
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang soạn đề bài...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" /> Tạo Đề Luyện Viết
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
