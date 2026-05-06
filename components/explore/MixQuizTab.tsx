'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query'
import {
  Shuffle,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  Trophy,
  Clock3,
  ArrowRight,
  BookOpen,
  Zap,
  CheckCircle2,
  PlayCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { withCsrfHeaders } from '@/lib/csrf'
import { MIX_QUIZ_MAX_SELECT, MIX_QUIZ_QUESTION_OPTIONS } from '@/lib/constants/mix-quiz'

// ── Types ──────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface QuizOption {
  id: string
  title: string
  course_code: string
  questionCount: number
  latestScoreOnTen: number | null
  latestCorrectCount: number | null
  latestTotalCount: number | null
  totalStudyMinutes: number | null
}

interface ActiveMixSession {
  sessionId: string
  quizId: string
  title: string
  question_count: number
  mode: 'immediate' | 'review'
  status: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatResetTime(resetMs: number): string {
  const diff = resetMs - Date.now()
  if (diff <= 0) return '0 phút'
  const minutes = Math.ceil(diff / (1000 * 60))
  return `${minutes} phút`
}

function formatStudyDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
}

// ── API calls ──────────────────────────────────────────────────────────────

async function fetchActiveMixSession(): Promise<{ hasActive: boolean; session?: ActiveMixSession }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix/active`)
  if (!res.ok) return { hasActive: false }
  return res.json()
}

async function fetchCategoriesForMix(): Promise<{ data: Category[] }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/public/categories`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

async function fetchQuizzesForCategory(
  categoryId: string,
  offset: number,
  limit: number
): Promise<{ data: QuizOption[]; hasMore: boolean }> {
  const p = new URLSearchParams({
    category_id: categoryId,
    sort: 'popular',
    limit: String(limit),
    offset: String(offset),
  })
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/explore/quizzes?${p}`)
  if (!res.ok) throw new Error('Failed to fetch quizzes')
  const json = await res.json()
  const data: QuizOption[] = (json.data ?? []).map((q: any) => ({
    id: q.id,
    title: q.title,
    course_code: q.course_code,
    questionCount: q.questionCount,
    latestScoreOnTen: q.latestScoreOnTen ?? null,
    latestCorrectCount: q.latestCorrectCount ?? null,
    latestTotalCount: q.latestTotalCount ?? null,
    totalStudyMinutes: q.totalStudyMinutes ?? null,
  }))
  return { data, hasMore: data.length === limit }
}

// ── ActiveSessionBanner ────────────────────────────────────────────────────

function ActiveSessionBanner({
  session,
  onContinue,
  onCreateNew,
  isDeleting,
}: {
  session: ActiveMixSession
  onContinue: () => void
  onCreateNew: () => void
  isDeleting: boolean
}) {
  const modeLabel = session.mode === 'immediate' ? 'Luyện tập' : 'Kiểm tra'
  const modeColor = session.mode === 'immediate' ? 'text-green-600' : 'text-blue-600'
  const modeBg = session.mode === 'immediate' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'

  return (
    <div className="bg-white rounded-[24px] border-2 border-[#5D7B6F]/20 p-6 space-y-5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/10 flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-[#5D7B6F]" />
        </div>
        <div>
          <h3 className="font-black text-gray-900">Bạn có một Quiz Trộn chưa hoàn thành</h3>
          <p className="text-sm text-gray-500">Tiếp tục hay tạo quiz mới?</p>
        </div>
      </div>

      <div className={cn('rounded-2xl p-4 border space-y-2', modeBg)}>
        <p className="font-black text-slate-800 text-sm">{session.title}</p>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="bg-white/80 px-2 py-0.5 rounded-full text-slate-500">{session.question_count} câu</span>
          <span className={cn('px-2 py-0.5 rounded-full bg-white/80', modeColor)}>
            {modeLabel}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onContinue}
          className="flex-1 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black rounded-2xl h-12 gap-2"
        >
          <PlayCircle className="w-4 h-4" />
          Làm tiếp
        </Button>
        <Button
          onClick={onCreateNew}
          disabled={isDeleting}
          variant="outline"
          className="flex-1 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 font-black rounded-2xl h-12 gap-2"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const ITEM_HEIGHT = 68
const VISIBLE_ITEMS = 5
const SCROLL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS
const LOAD_THRESHOLD = 8

// ── MixQuizForm ────────────────────────────────────────────────────────────

function MixQuizForm({ onSessionCreated }: { onSessionCreated: (quizId: string, sessionId: string) => void }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [mode, setMode] = useState<'immediate' | 'review' | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [poolWarning, setPoolWarning] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const mixFrom = searchParams.get('mix_from')
  const [isPreloading, setIsPreloading] = useState(false)

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['mix', 'categories'],
    queryFn: fetchCategoriesForMix,
    staleTime: 5 * 60 * 1000,
  })

  // Pre-load from existing mix if mix_from is present
  useEffect(() => {
    if (!mixFrom || !catData) return
    
    const loadFromMix = async () => {
      setIsPreloading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/student/quizzes/${mixFrom}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.mix_config) {
          setSelectedCategoryId(data.mix_config.category_id)
          setSelectedQuizIds(new Set(data.mix_config.quiz_ids))
          setQuestionCount(data.mix_config.question_count)
          setMode(data.mix_config.mode)
        }
      } catch (err) {
        console.error('Failed to load from mix:', err)
      } finally {
        setIsPreloading(false)
      }
    }
    
    loadFromMix()
  }, [mixFrom, catData])

  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data: quizPages,
    isLoading: quizzesLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<
    { data: QuizOption[]; hasMore: boolean },
    Error,
    { data: QuizOption[]; hasMore: boolean }[],
    ['mix', 'quizzes', string],
    number
  >({
    queryKey: ['mix', 'quizzes', selectedCategoryId],
    queryFn: ({ pageParam }) => fetchQuizzesForCategory(selectedCategoryId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((sum, p) => sum + p.data.length, 0)
    },
    select: (data) => data.pages,
    enabled: !!selectedCategoryId,
    staleTime: 2 * 60 * 1000,
  })

  const categories = catData?.data ?? []
  const quizzes = (quizPages ?? []).flatMap((p) => p.data)

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage() },
      { threshold: 0, rootMargin: '80px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, quizzes.length])

  const totalPool = quizzes
    .filter((q) => selectedQuizIds.has(q.id))
    .reduce((sum, q) => sum + q.questionCount, 0)

  useEffect(() => {
    if (totalPool > 0 && questionCount !== null && questionCount > totalPool) {
      setQuestionCount(null)
    }
  }, [totalPool, questionCount])

  const toggleQuiz = useCallback((id: string) => {
    setSelectedQuizIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else if (next.size < MIX_QUIZ_MAX_SELECT) { next.add(id) }
      return next
    })
  }, [])

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_ids: Array.from(selectedQuizIds),
          question_count: questionCount,
          mode,
          difficulty: 'random',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const err = new Error(data.error || 'Failed')
        ;(err as any).status = res.status
        ;(err as any).data = data
        throw err
      }
      return data
    },
    onSuccess: (data) => {
      if (data.actual_count < (questionCount ?? 0)) {
        setPoolWarning(
          `Pool câu hỏi chỉ có ${data.actual_count} câu — đã lấy hết. Bắt đầu với ${data.actual_count} câu.`
        )
        setTimeout(() => onSessionCreated(data.quizId, data.sessionId), 1500)
      } else {
        onSessionCreated(data.quizId, data.sessionId)
      }
    },
    onError: (err: any) => {
      if (err.status === 429) {
        setRateLimitReset(err.data?.reset ?? null)
        setRateLimitMsg(
          `Bạn đã tạo quá ${err.data?.limit ?? 5} Quiz Trộn trong 1 giờ. Vui lòng thử lại sau ${err.data?.reset ? formatResetTime(err.data.reset) : 'ít phút'}.`
        )
      }
    },
  })

  const canStart = selectedQuizIds.size >= 2 && questionCount !== null && mode !== null && !rateLimitReset

  useEffect(() => {
    if (!rateLimitReset) return
    const interval = setInterval(() => {
      if (Date.now() >= rateLimitReset) { setRateLimitReset(null); setRateLimitMsg(null) }
    }, 30_000)
    return () => clearInterval(interval)
  }, [rateLimitReset])

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {rateLimitMsg && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4 animate-in zoom-in-95 duration-300">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-700 font-bold">{rateLimitMsg}</p>
        </div>
      )}

      {poolWarning && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 animate-in zoom-in-95 duration-300">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-700 font-bold">{poolWarning}</p>
        </div>
      )}

      {/* Step 1 — Category */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-black">1</div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Chọn danh mục kiến thức</h2>
        </div>
        {catsLoading || isPreloading ? (
          <div className="h-14 rounded-2xl bg-slate-100 animate-pulse flex items-center px-4 text-xs font-bold text-slate-400">
            {isPreloading ? 'Đang khôi phục cấu hình...' : 'Đang tải danh mục...'}
          </div>
        ) : (
          <Select
            value={selectedCategoryId}
            onValueChange={(val) => { setSelectedCategoryId(val); setSelectedQuizIds(new Set()) }}
          >
            <SelectTrigger className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-white text-slate-700 font-bold shadow-sm transition-all hover:border-[#5D7B6F]/50 focus:ring-0">
              <SelectValue placeholder="Duyệt qua các danh mục câu hỏi..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-2 border-slate-100 shadow-2xl">
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="py-3 font-bold text-slate-600 hover:text-[#5D7B6F]">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </section>

      {/* Step 2 — Quiz selection */}
      {selectedCategoryId && (
        <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-black">2</div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Chọn quiz muốn trộn (2-5 bộ)</h2>
            </div>
            <Badge variant="outline" className={cn(
              'rounded-full px-3 py-1 font-black transition-colors',
              selectedQuizIds.size >= 2 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'
            )}>
              {selectedQuizIds.size}/{MIX_QUIZ_MAX_SELECT} ĐÃ CHỌN
            </Badge>
          </div>

          <div className="bg-slate-50/50 rounded-[24px] p-3 border border-slate-100">
            {quizzesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse" />
                ))}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-100">
                Không tìm thấy quiz nào trong danh mục này
              </div>
            ) : (
              <div
                className="overflow-y-auto overscroll-contain space-y-3 pr-2 custom-scrollbar"
                style={{ maxHeight: SCROLL_HEIGHT + 100 }}
              >
                {quizzes.map((quiz, idx) => {
                  const isSelected = selectedQuizIds.has(quiz.id)
                  const isDisabled = !isSelected && selectedQuizIds.size >= MIX_QUIZ_MAX_SELECT
                  const hasScore = quiz.latestScoreOnTen !== null
                  const isPassed = (quiz.latestScoreOnTen ?? 0) >= 5

                  return (
                    <React.Fragment key={quiz.id}>
                      <div
                        onClick={() => !isDisabled && toggleQuiz(quiz.id)}
                        className={cn(
                          'relative group w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer',
                          isSelected
                            ? 'border-[#5D7B6F] bg-white shadow-lg shadow-[#5D7B6F]/5 -translate-y-0.5'
                            : isDisabled
                              ? 'border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed'
                              : 'border-white bg-white hover:border-[#5D7B6F]/20 hover:shadow-md'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-lg transition-colors',
                          isSelected ? 'bg-[#5D7B6F] text-white' : 'bg-slate-100 text-slate-300 group-hover:bg-slate-200'
                        )}>
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{quiz.course_code}</p>
                          <p className="text-[11px] font-bold text-slate-400 truncate">{quiz.title}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          {hasScore && (
                            <div className={cn('flex items-center gap-1.5 justify-end text-xs font-black', isPassed ? 'text-green-600' : 'text-red-600')}>
                              <Trophy className="w-3 h-3" />
                              <span>{quiz.latestScoreOnTen!.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 justify-end text-[10px] font-black text-slate-400">
                            {quiz.totalStudyMinutes !== null && quiz.totalStudyMinutes > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock3 className="w-3 h-3 text-[#5D7B6F]/60" />
                                {formatStudyDuration(quiz.totalStudyMinutes)}
                              </span>
                            )}
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{quiz.questionCount} câu</span>
                          </div>
                        </div>
                      </div>
                      {idx === LOAD_THRESHOLD - 1 && <div ref={sentinelRef} className="h-px" />}
                    </React.Fragment>
                  )
                })}
                {isFetchingNextPage && (
                  <div className="h-20 rounded-2xl bg-white border border-slate-100 animate-pulse" />
                )}
              </div>
            )}
          </div>

          {totalPool > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-xl border border-green-100 animate-in fade-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-xs font-bold text-green-700">
                Tổng kho câu hỏi (Pool): <span className="text-lg ml-1 font-black">{totalPool}</span> CÂU
              </p>
            </div>
          )}
        </section>
      )}

      {/* Steps 3 & 4 — Question count + Mode */}
      {selectedQuizIds.size >= 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

          {/* Step 3 — Question count */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-black">3</div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Số lượng câu muốn làm</h2>
            </div>
            <div className="flex gap-3 flex-wrap">
              {MIX_QUIZ_QUESTION_OPTIONS.filter((count) => count <= totalPool).map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={cn(
                    'flex-1 min-w-[70px] py-3 rounded-xl border-2 font-black text-sm transition-all',
                    questionCount === count
                      ? 'border-[#5D7B6F] bg-[#5D7B6F] text-white shadow-lg shadow-[#5D7B6F]/20'
                      : 'border-slate-100 bg-white text-slate-500 hover:border-[#5D7B6F]/30 hover:bg-slate-50'
                  )}
                >
                  {count} CÂU
                </button>
              ))}
            </div>
          </section>

          {/* Step 4 — Mode: luyện tập hoặc kiểm tra (thứ tự luôn ngẫu nhiên) */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-black">4</div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Chế độ làm bài</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Luyện tập */}
              <button
                onClick={() => setMode('immediate')}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-[20px] border-2 text-left transition-all',
                  mode === 'immediate'
                    ? 'border-green-500 bg-white shadow-md ring-4 ring-green-500/5'
                    : 'border-slate-100 bg-white hover:border-green-200'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  mode === 'immediate' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-500'
                )}>
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-black text-sm', mode === 'immediate' ? 'text-slate-900' : 'text-slate-600')}>
                    Chế độ luyện tập
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-snug">
                    Xem đáp án và giải thích ngay sau mỗi câu
                  </p>
                </div>
                {mode === 'immediate' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                )}
              </button>

              {/* Kiểm tra */}
              <button
                onClick={() => setMode('review')}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-[20px] border-2 text-left transition-all',
                  mode === 'review'
                    ? 'border-blue-500 bg-white shadow-md ring-4 ring-blue-500/5'
                    : 'border-slate-100 bg-white hover:border-blue-200'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  mode === 'review' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'
                )}>
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-black text-sm', mode === 'review' ? 'text-slate-900' : 'text-slate-600')}>
                    Chế độ kiểm tra
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-snug">
                    Chấm điểm sau khi nộp bài
                  </p>
                </div>
                {mode === 'review' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                )}
              </button>
            </div>
          </section>

          {/* Start button */}
          <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canStart || createMutation.isPending}
              className="group relative w-full h-16 rounded-[20px] bg-slate-900 hover:bg-slate-800 text-white shadow-2xl transition-all active:scale-[0.98] overflow-hidden"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-3 font-black text-lg">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  ĐANG KHỞI TẠO PHIÊN...
                </span>
              ) : (
                <div className="flex items-center justify-center gap-4 w-full">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 transition-transform duration-500',
                    canStart && 'group-hover:rotate-12 group-hover:scale-110'
                  )}>
                    <Shuffle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">Xác nhận thiết lập</p>
                    <p className="text-lg font-black tracking-tight">BẮT ĐẦU TRỘN QUIZ</p>
                  </div>
                  <ArrowRight className="ml-2 w-6 h-6 opacity-40 group-hover:translate-x-2 transition-transform duration-500" />
                </div>
              )}
              {canStart && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MixQuizTab (main export) ───────────────────────────────────────────────

export default function MixQuizTab() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isDeletingOld, setIsDeletingOld] = useState(false)

  const { data: activeData, isLoading: activeLoading, refetch: refetchActive } = useQuery({
    queryKey: ['mix', 'active'],
    queryFn: fetchActiveMixSession,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })

  // Show form directly if no active session
  const hasActive = activeData?.hasActive && !showForm
  const activeSession = activeData?.session

  const handleContinue = () => {
    if (!activeSession?.sessionId || activeSession.sessionId === 'undefined') return
    router.push(`/quiz/${activeSession.quizId}/session/${activeSession.sessionId}`)
  }

  const handleCreateNew = async () => {
    if (!activeSession) {
      setShowForm(true)
      return
    }
    setIsDeletingOld(true)
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix/${activeSession.sessionId}`,
        { method: 'DELETE', headers: withCsrfHeaders({}) }
      )
    } catch {
      // Ignore — may already be deleted
    } finally {
      setIsDeletingOld(false)
      await refetchActive()
      setShowForm(true)
    }
  }

  const handleSessionCreated = (quizId: string, sessionId: string) => {
    if (!sessionId || sessionId === 'undefined') {
      console.error('Session creation returned invalid sessionId:', sessionId)
      return
    }
    router.push(`/quiz/${quizId}/session/${sessionId}`)
  }

  if (activeLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Shuffle className="w-6 h-6 text-[#5D7B6F]" />
          <h2 className="text-2xl font-black text-gray-900">Trộn Quiz</h2>
        </div>
        <p className="text-gray-500 font-medium text-sm">
          Chọn tối đa {MIX_QUIZ_MAX_SELECT} quiz công khai, gộp câu hỏi và làm ngay.
        </p>
      </div>

      {hasActive && activeSession ? (
        <ActiveSessionBanner
          session={activeSession}
          onContinue={handleContinue}
          onCreateNew={handleCreateNew}
          isDeleting={isDeletingOld}
        />
      ) : (
        <MixQuizForm onSessionCreated={handleSessionCreated} />
      )}
    </div>
  )
}
