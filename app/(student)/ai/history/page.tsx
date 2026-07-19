'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  PenTool,
  GraduationCap,
  BookOpen,
  Languages,
  MessageSquare,
  HelpCircle,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  X,
  FileText,
  BookmarkCheck,
  Layers,
  AlertCircle,
  Settings,
  Edit3,
} from 'lucide-react'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { formatDistanceToNow, format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface AILearningLogItem {
  _id: string
  type: string
  title: string
  language: string
  cefrLevel?: string
  topic?: string
  params?: Record<string, any>
  prompt?: string
  content?: any
  response?: string
  userSubmission?: string
  evalResult?: any
  score?: number
  metadata?: Record<string, any>
  createdAt: string
}

interface HistoryResponse {
  success: boolean
  history: AILearningLogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function fetchAIHistory(page: number, typeFilter: string, search: string): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
  })
  if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
  if (search) params.append('search', search)

  const res = await fetch(`/api/v1/ai/history?${params.toString()}`)
  if (!res.ok) throw new Error('Không thể tải lịch sử học AI')
  return res.json()
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    writing_eval: { label: 'Đánh giá Luyện Viết', bg: 'bg-[#5D7B6F]/10', text: 'text-[#5D7B6F]' },
    writing: { label: 'Đề Luyện Viết', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    vocabulary: { label: 'Tra Từ vựng', bg: 'bg-blue-50', text: 'text-blue-700' },
    grammar: { label: 'Giải thích Ngữ pháp', bg: 'bg-purple-50', text: 'text-purple-700' },
    paragraph: { label: 'Bài đọc theo chủ đề', bg: 'bg-amber-50', text: 'text-amber-700' },
    dialogue: { label: 'Kịch bản Hội thoại', bg: 'bg-teal-50', text: 'text-teal-700' },
    story: { label: 'Truyện ngắn học tập', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    quiz: { label: 'Trắc nghiệm AI', bg: 'bg-rose-50', text: 'text-rose-700' },
    translation: { label: 'Dịch thuật', bg: 'bg-cyan-50', text: 'text-cyan-700' },
    flashcard: { label: 'Bộ thẻ Flashcards', bg: 'bg-[#5D7B6F]/15', text: 'text-[#5D7B6F]' },
  }

  const current = config[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700' }

  return (
    <Badge variant="secondary" className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border-none whitespace-nowrap shrink-0 ${current.bg} ${current.text}`}>
      {current.label}
    </Badge>
  )
}

export default function AILearningHistoryPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<AILearningLogItem | null>(null)

  const logContent = useMemo(() => {
    if (!selectedLog) return null
    if (selectedLog.content) return selectedLog.content
    if (!selectedLog.response) return null

    const raw = typeof selectedLog.response === 'string'
      ? selectedLog.response
      : JSON.stringify(selectedLog.response)

    // 1) Thử parse trực tiếp
    try {
      return JSON.parse(raw)
    } catch {
      // 2) JSON bị cắt ngắn → cố gắng sửa chữa
    }

    // Tìm object hoàn chỉnh cuối cùng trong mảng JSON bị cắt
    // Ví dụ: [{"lemma":"a",...},{"lemma":"b"  → lấy đến },
    try {
      const lastCompleteObj = raw.lastIndexOf('},')
      const lastCloseBrace = raw.lastIndexOf('}')

      let repairedStr = ''
      if (lastCompleteObj > 0) {
        // Có ít nhất 1 object hoàn chỉnh trước dấu },{
        repairedStr = raw.substring(0, lastCompleteObj + 1) + ']'
      } else if (lastCloseBrace > 0 && raw.trimStart().startsWith('[')) {
        // Chỉ 1 object duy nhất kết thúc bằng }
        repairedStr = raw.substring(0, lastCloseBrace + 1) + ']'
      } else if (lastCloseBrace > 0 && raw.trimStart().startsWith('{')) {
        // Không phải mảng, chỉ là 1 object
        repairedStr = raw.substring(0, lastCloseBrace + 1)
      }

      if (repairedStr) {
        const parsed = JSON.parse(repairedStr)
        // Đánh dấu _partial để UI biết dữ liệu không đầy đủ
        if (Array.isArray(parsed)) {
          return Object.assign(parsed, { _partial: true })
        }
        return { ...parsed, _partial: true }
      }
    } catch {
      // Không thể sửa chữa
    }

    return null
  }, [selectedLog])

  // Interactive states for history preview modal
  const [showParagraphTranslation, setShowParagraphTranslation] = useState(false)
  const [showStoryTranslation, setShowStoryTranslation] = useState(false)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)
  const [writingModalSubTab, setWritingModalSubTab] = useState<'config' | 'eval'>('eval')

  // Reset interactive states when selected log changes
  React.useEffect(() => {
    setShowParagraphTranslation(false)
    setShowStoryTranslation(false)
    setFlashcardIndex(0)
    setIsFlipped(false)
    setShowHint(false)
    setWritingModalSubTab('eval')
  }, [selectedLog])

  const logParams = useMemo(() => {
    if (!selectedLog) return {}
    if (selectedLog.metadata?.params) return selectedLog.metadata.params
    if (selectedLog.params) return selectedLog.params
    if (selectedLog.prompt) {
      try {
        return typeof selectedLog.prompt === 'string' ? JSON.parse(selectedLog.prompt) : selectedLog.prompt
      } catch {}
    }
    return {}
  }, [selectedLog])

  const userSubmission = useMemo(() => {
    if (!selectedLog) return ''
    return (
      selectedLog.userSubmission ||
      selectedLog.metadata?.userSubmission ||
      logParams.userAnswer ||
      ''
    )
  }, [selectedLog, logParams])

  const evalResult = useMemo(() => {
    if (!selectedLog) return null
    if (selectedLog.evalResult) return selectedLog.evalResult
    if (selectedLog.metadata?.evalResult) return selectedLog.metadata.evalResult
    if (selectedLog.type === 'writing_eval' && logContent) return logContent
    return null
  }, [selectedLog, logContent])

  const writingSourceText = useMemo(() => {
    if (!selectedLog) return ''
    if (selectedLog.type === 'writing' && logContent?.sourceText) {
      return logContent.sourceText
    }
    if (logParams.sourceText) {
      return logParams.sourceText
    }
    if (logContent?.sourceText) {
      return logContent.sourceText
    }
    return ''
  }, [selectedLog, logContent, logParams])

  const writingScore = useMemo(() => {
    if (!selectedLog) return undefined
    if (selectedLog.score !== undefined) return selectedLog.score
    if (selectedLog.metadata?.score !== undefined) return selectedLog.metadata.score
    if (evalResult?.score !== undefined) return evalResult.score
    return undefined
  }, [selectedLog, evalResult])

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['ai-history', page, typeFilter, search],
    queryFn: () => fetchAIHistory(page, typeFilter, search),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/ai/history/${id}`, {
        method: 'DELETE',
        headers: withCsrfHeaders(),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Lỗi xóa lịch sử')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Đã xóa bản ghi lịch sử thành công')
      queryClient.invalidateQueries({ queryKey: ['ai-history'] })
      if (selectedLog) setSelectedLog(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Không thể xóa bản ghi lịch sử')
    },
  })

  // UI Renderers for detailed logs
  const renderTranslationHistory = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-4 text-xs font-semibold text-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Văn bản gốc</span>
            <p className="text-sm font-bold text-slate-800 leading-relaxed">{content.sourceText}</p>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7B6F]">Bản dịch</span>
            <p className="text-sm font-bold text-emerald-950 leading-relaxed">{content.translatedText}</p>
            {content.transliteration && (
              <p className="text-[11px] font-mono text-emerald-700 pt-1 italic">Phiên âm: {content.transliteration}</p>
            )}
          </div>
        </div>

        {Array.isArray(content.wordByWord) && content.wordByWord.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phân tích từ vựng theo ngữ cảnh</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {content.wordByWord.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{item.source || item.word}</span>
                    <span className="text-[10px] font-bold text-[#5D7B6F] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {item.translated || item.translation}
                    </span>
                  </div>
                  {item.notes && <p className="text-[10px] text-slate-500 leading-snug">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {content.grammarNotes && (
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-amber-700 text-[10px] block">Ghi chú cấu trúc & Ngữ pháp</span>
              <p className="whitespace-pre-line font-medium text-xs text-amber-900">{content.grammarNotes}</p>
            </div>
          </div>
        )}

        {Array.isArray(content.alternatives) && content.alternatives.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Các phương án dịch khác</span>
            <div className="flex flex-wrap gap-1.5">
              {content.alternatives.map((alt: string, i: number) => (
                <span key={i} className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200">
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderWritingHistory = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-4 text-xs font-medium text-slate-800">
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-800 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Trạng thái bài tập: Chưa trả lời / Chưa nộp bài làm cho AI đánh giá</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 gap-2">
            <h3 className="text-sm font-black text-slate-900">{content.title || 'Bài Học Luyện Viết AI'}</h3>
            <div className="flex items-center gap-1.5">
              {content.cefrLevel && (
                <span className="text-[10px] font-bold bg-[#5D7B6F] text-white px-2 py-0.5 rounded-full">
                  Level {content.cefrLevel}
                </span>
              )}
              {content.wordCount && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {content.wordCount} từ
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Văn bản gốc / Nội dung bài viết ({content.sourceLanguage || 'Chính'})
            </span>
            <p className="text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              {content.sourceText}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderVocabularyHistory = (content: any) => {
    const list = Array.isArray(content) ? content : [content]
    return (
      <div className="space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Từ vựng đã biên soạn:</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((wordItem: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base font-black text-slate-900 leading-snug">{wordItem.lemma || wordItem.display}</h3>
                    {wordItem.ipa && (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        /{wordItem.ipa}/
                      </span>
                    )}
                  </div>
                  {wordItem.display && wordItem.display !== wordItem.lemma && (
                    <span className="text-[10px] text-slate-400 italic block">Hiển thị: {wordItem.display}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {wordItem.partOfSpeech && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                      {wordItem.partOfSpeech}
                    </span>
                  )}
                  {wordItem.cefrLevel && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#5D7B6F] text-white">
                      {wordItem.cefrLevel}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  <strong className="text-[#5D7B6F]">Nghĩa:</strong> {wordItem.definition}
                </p>
              </div>

              {Array.isArray(wordItem.examples) && wordItem.examples.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ví dụ:</span>
                  <ul className="space-y-1.5">
                    {wordItem.examples.map((ex: string, i: number) => (
                      <li key={i} className="text-xs font-medium text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        <span className="text-[#5D7B6F] font-bold shrink-0">•</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderGrammarHistory = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-4 text-xs font-medium text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-900">{content.patternName || 'Mẫu Ngữ Pháp'}</h3>
            {content.cefrLevel && <span className="text-[10px] font-bold bg-[#5D7B6F] text-white px-2 py-0.5 rounded-full">{content.cefrLevel}</span>}
          </div>
          <p className="text-sm font-bold text-emerald-950 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">{content.pattern}</p>
          <div className="space-y-1">
            <strong className="text-[#5D7B6F] text-[10px] uppercase tracking-wider block">Giải thích ý nghĩa:</strong>
            <p className="text-slate-700 leading-relaxed font-semibold">{content.explanation}</p>
          </div>
        </div>

        {Array.isArray(content.rules) && content.rules.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Quy tắc & Cấu trúc chính</span>
            <ul className="space-y-1.5">
              {content.rules.map((rule: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-slate-700 leading-relaxed font-semibold">
                  <span className="text-[#5D7B6F] font-bold">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(content.examples) && content.examples.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ví dụ áp dụng</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {content.examples.map((ex: any, i: number) => (
                <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="font-bold text-slate-900 text-xs">{ex.sentence}</p>
                  <p className="font-bold text-[#5D7B6F]">{ex.translation}</p>
                  {ex.breakdown && <p className="text-[10px] text-slate-400 italic bg-slate-50 p-1.5 rounded">{ex.breakdown}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(content.commonMistakes) && content.commonMistakes.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Các lỗi cần tránh</span>
            <div className="space-y-2">
              {content.commonMistakes.map((m: any, i: number) => (
                <div key={i} className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-700 font-semibold line-through">
                    <span>Sai:</span> {m.mistake}
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <span>Đúng:</span> {m.correction}
                  </div>
                  {m.explanation && <p className="text-slate-600 text-[10px] pt-1.5 border-t border-rose-100">{m.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSentenceHistory = (content: any) => {
    const list = Array.isArray(content) ? content : [content]
    return (
      <div className="space-y-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Mẫu câu ví dụ:</span>
        <div className="space-y-2.5">
          {list.map((item: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 leading-relaxed">{item.text}</p>
                <p className="text-xs font-semibold text-[#5D7B6F]">{item.translation}</p>
              </div>
              {Array.isArray(item.vocabulary) && item.vocabulary.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  {item.vocabulary.map((v: any, i: number) => (
                    <span key={i} className="text-[10px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
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

  const renderParagraphHistory = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-4 text-xs font-medium text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-900">{content.title || 'Bài Đọc Hiểu'}</h3>
            {content.wordCount && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{content.wordCount} từ</span>}
          </div>
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
            {content.body}
          </div>

          {content.translation && (
            <div className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowParagraphTranslation(!showParagraphTranslation)}
                className="text-[10px] font-bold text-[#5D7B6F] border-emerald-200 rounded-lg h-7"
              >
                {showParagraphTranslation ? 'Ẩn bản dịch tiếng Việt' : 'Xem bản dịch tiếng Việt'}
              </Button>
              {showParagraphTranslation && (
                <div className="mt-2 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs font-medium text-emerald-950 leading-relaxed">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>

        {Array.isArray(content.vocabulary) && content.vocabulary.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Từ vựng trọng tâm trong bài</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {content.vocabulary.map((v: any, i: number) => (
                <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{v.lemma || v.display}</span>
                    {v.cefrLevel && <span className="text-[9px] font-bold bg-emerald-50 text-[#5D7B6F] px-1.5 py-0.2 rounded">{v.cefrLevel}</span>}
                  </div>
                  <p className="text-[10px] text-slate-600 leading-snug">{v.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(content.comprehensionQuestions) && content.comprehensionQuestions.length > 0 && (
          <div className="space-y-3 bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#5D7B6F]" /> Câu hỏi đọc hiểu & Đáp án chuẩn:
            </span>
            <div className="space-y-3">
              {content.comprehensionQuestions.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-900">{qIdx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isCorrect = q.correctIndex === optIdx
                      let btnStyle = 'bg-slate-50 border-slate-200 text-slate-600'
                      if (isCorrect) btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-lg border text-xs leading-normal flex items-center gap-2 ${btnStyle}`}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
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

  const renderDialogueHistory = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-4 text-xs font-medium text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <h3 className="text-sm font-black text-slate-900">{content.title || 'Hội Thoại Mẫu'}</h3>
          {content.setting && <p className="text-[11px] text-slate-500">Bối cảnh: {content.setting}</p>}
        </div>

        {Array.isArray(content.lines) && content.lines.length > 0 && (
          <div className="space-y-3">
            {content.lines.map((line: any, idx: number) => {
              const isEven = idx % 2 === 0
              return (
                <div key={idx} className={`flex items-start gap-2.5 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-xs ${isEven ? 'bg-[#5D7B6F]' : 'bg-slate-600'}`}>
                    {line.speaker ? line.speaker[0].toUpperCase() : 'A'}
                  </div>
                  <div className={`max-w-md p-3.5 rounded-2xl space-y-1 shadow-xs border ${isEven ? 'bg-emerald-50/50 border-emerald-100 rounded-tl-none' : 'bg-white border-slate-200 rounded-tr-none'}`}>
                    <span className="text-[9px] font-bold text-slate-500 block">{line.speaker}</span>
                    <p className="text-xs font-bold text-slate-900 leading-relaxed">{line.text}</p>
                    <p className="text-[11px] text-slate-600 border-t border-slate-100 pt-1">{line.translation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderStoryHistory = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-4 text-xs font-medium text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-900">{content.title || 'Truyện Ngắn Học Tập'}</h3>
            {content.wordCount && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{content.wordCount} từ</span>}
          </div>
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
            {content.body}
          </div>

          {content.moral && (
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-[11px] font-semibold text-amber-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-800 uppercase tracking-wider text-[9px]">Bài học rút ra:</strong>
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
                className="text-[10px] font-bold text-[#5D7B6F] border-emerald-200 rounded-lg h-7"
              >
                {showStoryTranslation ? 'Ẩn dịch nghĩa tiếng Việt' : 'Xem dịch nghĩa tiếng Việt'}
              </Button>
              {showStoryTranslation && (
                <div className="mt-2 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs font-medium text-emerald-950 leading-relaxed">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderQuizHistory = (content: any) => {
    if (!content) return null
    const questions = content.questions || []
    return (
      <div className="space-y-4 text-xs font-medium text-slate-800">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <h3 className="text-sm font-black text-slate-900">{content.title || 'Đề trắc nghiệm AI'}</h3>
          {content.description && <p className="text-[11px] text-slate-500 mt-0.5">{content.description}</p>}
        </div>

        <div className="space-y-3">
          {questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-900">Câu {qIdx + 1}: {q.text}</span>
                {q.difficulty && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">{q.difficulty}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {q.options?.map((opt: any, optIdx: number) => {
                  const isCorrect = opt.isCorrect
                  let style = 'bg-slate-50 border-slate-200 text-slate-600'
                  if (isCorrect) style = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                  return (
                    <div
                      key={optIdx}
                      className={`p-2.5 rounded-lg border text-xs leading-normal flex items-center gap-2 ${style}`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  )
                })}
              </div>

              {q.explanation && (
                <div className="bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100 text-[11px] text-[#5D7B6F] space-y-1 font-medium">
                  <strong className="text-[#5D7B6F] block">Giải thích:</strong>
                  <p>{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderFlashcardHistory = (content: any) => {
    const cards = Array.isArray(content) ? content : [content]
    if (!cards || cards.length === 0) return null
    return (
      <div className="space-y-4 text-xs font-semibold text-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Danh sách bộ Flashcard ({cards.length} thẻ):</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-slate-400">Thẻ #{idx + 1}</span>
                {card.cefrLevel && (
                  <span className="text-[9px] font-bold bg-[#5D7B6F] text-white px-2 py-0.5 rounded-full">
                    {card.cefrLevel}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Mặt trước (Khái niệm/Từ vựng)</span>
                  <p className="text-sm font-bold text-slate-900 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">{card.front}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#5D7B6F] block">Mặt sau (Giải thích/Đáp án)</span>
                  <p className="text-xs font-bold text-emerald-950 leading-relaxed bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">{card.back}</p>
                </div>
              </div>

              {card.hint && (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/50">
                  <strong>Gợi ý:</strong> {card.hint}
                </p>
              )}

              {card.example && (
                <p className="text-[10px] italic text-slate-600 bg-slate-50 p-2 rounded-lg">
                  <strong>Ví dụ:</strong> "{card.example}"
                </p>
              )}

              {card.mnemonic && (
                <p className="text-[10px] font-medium text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-100">
                  <strong>Mẹo nhớ:</strong> {card.mnemonic}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DevOnlyGuard featureName="Lịch Sử Học AI">
      <div className="min-h-screen bg-slate-50/50 pb-24">
        <div className="w-full space-y-6">
          {/* Header Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="rounded-xl text-slate-500 hover:text-slate-900 p-1.5 h-8">
                  <Link href="/ai">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Trang Trợ Lý AI
                  </Link>
                </Button>
              </div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-6 h-6 text-[#5D7B6F]" /> Lịch Sử Học Tập & Luyện AI
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Theo dõi tất cả các bài luyện viết, tra từ vựng, giải thích ngữ pháp và bài tập AI bạn đã thực hiện.
              </p>
            </div>

            <Button asChild className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md rounded-xl text-xs font-bold text-white shrink-0">
              <Link href="/ai">
                <Sparkles className="w-4 h-4 mr-2" /> Tạo Bài Học AI Mới
              </Link>
            </Button>
          </div>

          {/* Search & Type Filter Tabs */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Tìm kiếm chủ đề, từ vựng hoặc ngôn ngữ..."
                  className="pl-9 border-slate-200 focus:border-[#5D7B6F] rounded-2xl text-xs font-medium"
                />
              </div>

              {/* Type Filter Select Dropdown */}
              <div className="w-full md:w-56 shrink-0">
                <Select
                  value={typeFilter}
                  onValueChange={(val) => {
                    setTypeFilter(val)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-2xl border-slate-200 bg-white font-bold text-xs text-slate-800 focus:border-[#5D7B6F]">
                    <SelectValue placeholder="Chọn loại bài..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
                    {[
                      { id: 'all', label: 'Tất cả loại bài' },
                      { id: 'writing_all', label: 'Luyện Viết & Đánh giá' },
                      { id: 'vocabulary', label: 'Tra Từ vựng' },
                      { id: 'grammar', label: 'Giải thích Ngữ pháp' },
                      { id: 'paragraph', label: 'Bài đọc & Hội thoại' },
                      { id: 'flashcard', label: 'Bộ thẻ Flashcards' },
                      { id: 'quiz', label: 'Trắc nghiệm AI' },
                    ].map((tab) => (
                      <SelectItem
                        key={tab.id}
                        value={tab.id}
                        className="rounded-xl font-bold text-xs py-2 cursor-pointer hover:bg-emerald-50"
                      >
                        {tab.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400 font-bold text-sm">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-[#5D7B6F]" /> Đang tải lịch sử học AI...
            </div>
          )}

          {/* Empty state */}
          {!isLoading && (!data?.history || data.history.length === 0) && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Chưa có lịch sử học AI nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy thực hiện các yêu cầu sinh bài đọc, tra từ vựng hoặc luyện viết ở trang Trợ lý AI để bắt đầu lưu vết tiến độ.
              </p>
              <Button asChild className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl text-xs font-bold text-white">
                <Link href="/ai">Bắt đầu học ngay</Link>
              </Button>
            </div>
          )}

          {/* History List */}
          {!isLoading && data?.history && data.history.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {data.history.map((log) => (
                  <Card key={log._id} className="border-slate-200/90 shadow-xs hover:border-[#5D7B6F] transition-all rounded-2xl bg-white overflow-hidden">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <TypeBadge type={log.type} />
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {log.language}
                          </span>
                          {log.cefrLevel && (
                            <span className="text-xs font-bold text-[#5D7B6F] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              CEFR {log.cefrLevel}
                            </span>
                          )}
                          {log.type === 'writing' && (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> Chưa nộp bài làm
                            </span>
                          )}
                          {log.type === 'writing_eval' && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã hoàn thành
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: vi }) : ''}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-slate-900 hover:text-[#5D7B6F] transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                            {log.title}
                          </h3>
                          {log.topic && <p className="text-xs font-medium text-slate-500">Chủ đề: {log.topic}</p>}
                        </div>
                      </div>

                      {/* Score Badge or Status Badge */}
                      <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                        {log.type === 'writing' && (
                          <div className="flex flex-col items-center justify-center bg-amber-50/90 border border-amber-200 px-3.5 py-1.5 rounded-2xl text-center">
                            <span className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Chưa nộp bài
                            </span>
                            <span className="text-[10px] font-bold text-amber-600">Chưa hoàn thành</span>
                          </div>
                        )}
                        {typeof log.score === 'number' && (
                          <div className="flex flex-col items-center justify-center bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center">
                            <span className="text-lg font-black text-[#5D7B6F]">{log.score}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Điểm AI</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 relative">
                          {deletingLogId === log._id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-xl animate-in fade-in slide-in-from-right-2 duration-200 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingLogId(null)}
                                className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-200 rounded-lg"
                              >
                                Hủy
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  deleteMutation.mutate(log._id)
                                  setDeletingLogId(null)
                                }}
                                className="h-7 px-2 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                              >
                                Xóa
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                                className="rounded-xl font-bold text-xs text-[#5D7B6F] border-emerald-200 hover:bg-emerald-50"
                              >
                                Xem chi tiết
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingLogId(log._id)}
                                className="rounded-xl font-bold text-xs text-rose-500 hover:bg-rose-50 p-2"
                                title="Xóa bản ghi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-medium text-slate-500">
                    Trang {data.page} / {data.totalPages} ({data.total} bản ghi)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="rounded-xl text-xs font-bold"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === data.totalPages}
                      onClick={() => setPage(page + 1)}
                      className="rounded-xl text-xs font-bold"
                    >
                      Sau <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal / Drawer View for Selected Session Log */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200">
                {/* Modal Header */}
                <div className="p-3.5 sm:p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <TypeBadge type={selectedLog.type} />
                      <span className="text-[11px] sm:text-xs font-bold text-slate-600 whitespace-nowrap">{selectedLog.language}</span>
                      {selectedLog.createdAt && (
                        <span className="text-[11px] sm:text-xs text-slate-400 whitespace-nowrap">
                          {format(new Date(selectedLog.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">{selectedLog.title}</h3>
                  </div>

                  <button
                    onClick={() => setSelectedLog(null)}
                    className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Content Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-medium text-slate-800">
                  {(selectedLog.type === 'writing' || selectedLog.type === 'writing_eval') ? (
                    <div className="space-y-5">
                      {/* Sub-tab switcher bar inside modal */}
                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setWritingModalSubTab('config')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold sm:text-xs transition-all text-center whitespace-nowrap cursor-pointer ${
                            writingModalSubTab === 'config'
                              ? 'bg-[#5D7B6F] text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          Cấu hình
                        </button>

                        <button
                          type="button"
                          onClick={() => setWritingModalSubTab('eval')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold sm:text-xs transition-all flex items-center justify-center gap-1.5 text-center whitespace-nowrap cursor-pointer ${
                            writingModalSubTab === 'eval'
                              ? 'bg-[#5D7B6F] text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          <span>AI Đánh giá & Bài làm</span>
                          {writingScore !== undefined && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
                              {writingScore}/100
                            </span>
                          )}
                        </button>
                      </div>

                      {/* SUB-TAB 1: CẤU HÌNH */}
                      {writingModalSubTab === 'config' && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                          <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                            Thông số cấu hình AI đã tạo bài tập
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ngôn ngữ AI sinh ra</span>
                              <p className="font-bold text-slate-900">{logParams.targetLanguage || selectedLog.language || 'Tiếng Anh'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số lượng từ yêu cầu</span>
                              <p className="font-bold text-slate-900">{logParams.writingWordCount || logContent?.wordCount || '200'} từ</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ngôn ngữ Giải thích / Nhận xét</span>
                              <p className="font-bold text-slate-900">{logParams.explanationLanguage || logParams.sourceLanguage || 'Tiếng Việt'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trình độ Khung Đánh giá</span>
                              <p className="font-bold text-slate-900">Level {logParams.cefrLevel || logParams.cefr || selectedLog.cefrLevel || 'B1'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tùy chọn Thì Tiếng Anh</span>
                              <p className="font-bold text-slate-900">{logParams.englishTense || 'Tất cả thì (Tự động)'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chủ đề bài học</span>
                              <p className="font-bold text-slate-900">{logParams.customTopicInput || logParams.selectedTopicSlug || selectedLog.topic || 'Ngẫu nhiên / Tự do'}</p>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5 sm:col-span-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thể loại văn bản & Cách viết</span>
                              <p className="font-bold text-slate-900">{logParams.textGenre || 'Bài báo & Tin tức (News Report)'}</p>
                            </div>

                            {logParams.situationalContext && (
                              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-0.5 sm:col-span-2">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Bối cảnh / Tình huống cụ thể</span>
                                <p className="font-bold text-emerald-950">{logParams.situationalContext}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 2: AI ĐÁNH GIÁ (ĐOẠN AI TẠO - BÀI CỦA BẠN - AI ĐÁNH GIÁ) */}
                      {writingModalSubTab === 'eval' && (
                        <div className="space-y-5">
                          {/* PHẦN 1: ĐOẠN AI TẠO */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h4 className="text-sm font-black text-slate-900">Đoạn AI tạo (Đề bài & Văn bản gốc)</h4>
                              <span className="text-[10px] font-bold bg-[#5D7B6F] text-white px-2.5 py-0.5 rounded-full">
                                Level {logParams.cefrLevel || logParams.cefr || selectedLog.cefrLevel || 'B1'}
                              </span>
                            </div>

                            {(logContent?.title || selectedLog.title) && (
                              <h5 className="text-xs font-bold text-slate-800">{logContent?.title || selectedLog.title}</h5>
                            )}

                            <p className="text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                              {writingSourceText || logContent?.sourceText || 'Đoạn văn bản bài học do AI biên soạn...'}
                            </p>
                          </div>

                          {/* PHẦN 2: BÀI CỦA BẠN */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h4 className="text-sm font-black text-slate-900">Bài của bạn (Nội dung đã làm)</h4>
                              {userSubmission ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                  {userSubmission.trim().split(/\s+/).filter(Boolean).length} từ đã viết
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                                  Chưa nộp bài làm
                                </span>
                              )}
                            </div>

                            {userSubmission ? (
                              <p className="text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-line bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80">
                                {userSubmission}
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Người dùng chưa trả lời / Chưa nộp bài làm cho AI đánh giá.</span>
                              </div>
                            )}
                          </div>

                          {/* PHẦN 3: AI ĐÁNH GIÁ */}
                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-2">
                              <h4 className="text-sm font-black text-slate-900">AI đánh giá & Chấm điểm</h4>
                              {writingScore !== undefined && (
                                <span className="text-xs font-extrabold bg-[#5D7B6F] text-white px-2.5 py-0.5 rounded-lg shadow-xs whitespace-nowrap shrink-0">
                                  {writingScore}/100 điểm
                                </span>
                              )}
                            </div>

                            {evalResult ? (
                              <div className="space-y-4">
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-[#5D7B6F] text-white flex items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">Xếp loại & Đánh giá</span>
                                    <h4 className="text-sm sm:text-base font-black">{evalResult.rating || 'Đã chấm điểm thành công'}</h4>
                                  </div>
                                  {writingScore !== undefined && (
                                    <div className="bg-white text-[#5D7B6F] font-black text-xs sm:text-sm px-2.5 py-1.5 rounded-xl shrink-0 whitespace-nowrap shadow-xs">
                                      {writingScore} / 100
                                    </div>
                                  )}
                                </div>

                                {evalResult.detailedFeedback && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nhận xét chi tiết từ AI:</span>
                                    <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
                                      {evalResult.detailedFeedback}
                                    </p>
                                  </div>
                                )}

                                {evalResult.suggestedAnswer && (
                                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F] block">Bài sửa mẫu tối ưu:</span>
                                    <p className="text-xs font-bold text-emerald-950 leading-relaxed whitespace-pre-line">{evalResult.suggestedAnswer}</p>
                                  </div>
                                )}

                                {Array.isArray(evalResult.corrections) && evalResult.corrections.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Danh sách sửa lỗi chi tiết:</span>
                                    <div className="space-y-2">
                                      {evalResult.corrections.map((corr: any, i: number) => (
                                        <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                                          <div className="flex flex-wrap items-center justify-between font-bold gap-2">
                                            <span className="text-rose-600 line-through">{corr.original}</span>
                                            <span className="text-emerald-700">➜ {corr.corrected}</span>
                                          </div>
                                          {corr.explanation && <p className="text-slate-600 text-[11px] font-medium">{corr.explanation}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Chưa có kết quả AI đánh giá cho bài tập này. Vui lòng quay lại phần Luyện viết để nộp bài làm.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ghi chú nhỏ khi dữ liệu bị cắt ngắn nhưng đã sửa chữa được */}
                      {logContent._partial && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-amber-700 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Bản ghi cũ — một số nội dung có thể không đầy đủ.</span>
                        </div>
                      )}
                      <div className="space-y-6">
                        {selectedLog.type === 'writing' && renderWritingHistory(logContent)}
                        {selectedLog.type === 'vocabulary' && renderVocabularyHistory(logContent)}
                        {selectedLog.type === 'grammar' && renderGrammarHistory(logContent)}
                        {selectedLog.type === 'translation' && renderTranslationHistory(logContent)}
                        {selectedLog.type === 'sentence' && renderSentenceHistory(logContent)}
                        {selectedLog.type === 'paragraph' && renderParagraphHistory(logContent)}
                        {selectedLog.type === 'dialogue' && renderDialogueHistory(logContent)}
                        {selectedLog.type === 'story' && renderStoryHistory(logContent)}
                        {selectedLog.type === 'quiz' && renderQuizHistory(logContent)}
                        {selectedLog.type === 'flashcard' && renderFlashcardHistory(logContent)}
                      </div>
                    </div>
                  )}

                  {/* Không có nội dung */}
                  {selectedLog.type !== 'writing_eval' && !logContent && (
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Không có dữ liệu nội dung cho bản ghi này.</span>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                  <Button variant="outline" onClick={() => setSelectedLog(null)} className="rounded-xl text-xs font-bold">
                    Đóng cửa sổ
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DevOnlyGuard>
  )
}
