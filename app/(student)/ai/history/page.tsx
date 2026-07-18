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
} from 'lucide-react'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
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
  params: Record<string, any>
  content: any
  userSubmission?: string
  evalResult?: any
  score?: number
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
  const config: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    writing_eval: { label: 'Đánh giá Luyện Viết', bg: 'bg-[#5D7B6F]/10', text: 'text-[#5D7B6F]', icon: PenTool },
    writing: { label: 'Đề Luyện Viết', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: PenTool },
    vocabulary: { label: 'Tra Từ vựng', bg: 'bg-blue-50', text: 'text-blue-700', icon: Languages },
    grammar: { label: 'Giải thích Ngữ pháp', bg: 'bg-purple-50', text: 'text-purple-700', icon: GraduationCap },
    paragraph: { label: 'Bài đọc theo chủ đề', bg: 'bg-amber-50', text: 'text-amber-700', icon: BookOpen },
    dialogue: { label: 'Kịch bản Hội thoại', bg: 'bg-teal-50', text: 'text-teal-700', icon: MessageSquare },
    story: { label: 'Truyện ngắn học tập', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: BookOpen },
    quiz: { label: 'Trắc nghiệm AI', bg: 'bg-rose-50', text: 'text-rose-700', icon: HelpCircle },
    translation: { label: 'Dịch thuật', bg: 'bg-cyan-50', text: 'text-cyan-700', icon: FileText },
  }

  const current = config[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700', icon: Sparkles }
  const Icon = current.icon

  return (
    <Badge variant="secondary" className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border-none ${current.bg} ${current.text}`}>
      <Icon className="w-3 h-3 mr-1 shrink-0" />
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

              {/* Type Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'writing_all', label: 'Luyện Viết & Đánh giá' },
                  { id: 'vocabulary', label: 'Từ vựng' },
                  { id: 'grammar', label: 'Ngữ pháp' },
                  { id: 'paragraph', label: 'Bài đọc & Hội thoại' },
                  { id: 'quiz', label: 'Trắc nghiệm AI' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTypeFilter(tab.id)
                      setPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      typeFilter === tab.id
                        ? 'bg-[#5D7B6F] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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

                      {/* Score Badge (for writing eval) */}
                      <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                        {typeof log.score === 'number' && (
                          <div className="flex flex-col items-center justify-center bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center">
                            <span className="text-lg font-black text-[#5D7B6F]">{log.score}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Điểm AI</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
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
                            onClick={() => {
                              if (confirm('Bạn có chắc chắn muốn xóa bản ghi lịch sử này?')) {
                                deleteMutation.mutate(log._id)
                              }
                            }}
                            className="rounded-xl font-bold text-xs text-rose-500 hover:bg-rose-50 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
              <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200">
                {/* Modal Header */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={selectedLog.type} />
                      <span className="text-xs font-bold text-slate-600">{selectedLog.language}</span>
                      {selectedLog.createdAt && (
                        <span className="text-xs text-slate-400">
                          {format(new Date(selectedLog.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{selectedLog.title}</h3>
                  </div>

                  <button
                    onClick={() => setSelectedLog(null)}
                    className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Content Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-medium text-slate-800">
                  {/* User Submission (if writing evaluation) */}
                  {selectedLog.userSubmission && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Bài viết bạn đã nộp:</span>
                      <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                        {selectedLog.userSubmission}
                      </p>
                    </div>
                  )}

                  {/* Writing Evaluation Detail View */}
                  {selectedLog.type === 'writing_eval' && selectedLog.evalResult && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-[#5D7B6F] text-white flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 block">Kết quả Chấm điểm AI</span>
                          <h4 className="text-xl font-black">{selectedLog.evalResult.rating}</h4>
                        </div>
                        {selectedLog.score !== undefined && (
                          <div className="bg-white text-[#5D7B6F] font-black text-xl px-4 py-2 rounded-2xl">
                            {selectedLog.score} / 100
                          </div>
                        )}
                      </div>

                      {selectedLog.evalResult.detailedFeedback && (
                        <p className="text-xs text-slate-600 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 leading-relaxed">
                          {selectedLog.evalResult.detailedFeedback}
                        </p>
                      )}

                      {selectedLog.evalResult.suggestedAnswer && (
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F] block">Bài sửa mẫu tối ưu:</span>
                          <p className="text-sm font-bold text-emerald-950 leading-relaxed">{selectedLog.evalResult.suggestedAnswer}</p>
                        </div>
                      )}

                      {Array.isArray(selectedLog.evalResult.corrections) && selectedLog.evalResult.corrections.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Chi tiết sửa lỗi:</span>
                          <div className="space-y-2">
                            {selectedLog.evalResult.corrections.map((corr: any, i: number) => (
                              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-rose-600 line-through">{corr.original}</span>
                                  <span className="text-emerald-700">➜ {corr.corrected}</span>
                                </div>
                                <p className="text-slate-600">{corr.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* General Generated Content View */}
                  {selectedLog.type !== 'writing_eval' && selectedLog.content && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Dữ liệu nội dung AI sinh ra:</span>
                      <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.content, null, 2)}
                      </pre>
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
