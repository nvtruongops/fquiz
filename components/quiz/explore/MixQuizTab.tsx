'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query'
import {
  Shuffle,
  AlertTriangle,
  AlertCircle,
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
import { Button } from '@/components/shared/ui/button'
import { Badge } from '@/components/shared/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import Link from 'next/link'

function QuotaExceededDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[32px] border border-white/80 bg-white/70 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-0 overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 shadow-inner text-amber-600">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <DialogTitle className="text-xl font-black text-slate-900 mb-2">
            Đã Đạt Giới Hạn Quota
          </DialogTitle>

          <DialogDescription className="text-xs font-bold text-slate-500 leading-relaxed mb-8 px-2">
            {message || 'Bạn đã đạt giới hạn tối đa 10 bài tự tạo + trộn (hoặc 1 bài/danh mục). Vui lòng xóa bớt bài cũ tại Bộ đề của tôi để tiếp tục.'}
          </DialogDescription>

          <div className="flex flex-col gap-3 w-full">
            <Button
              asChild
              className="h-13 rounded-2xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black shadow-lg shadow-[#5D7B6F]/20 active:scale-95 transition-all text-xs uppercase tracking-wider justify-center"
            >
              <Link href="/my-quizzes">
                Đi tới Bộ đề của tôi
              </Link>
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 font-bold text-slate-500 hover:bg-slate-50 text-xs"
            >
              Để sau
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
import { cn } from '@/lib/core/utils/cn'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { MIX_QUIZ_MAX_SELECT, MIX_QUIZ_QUESTION_OPTIONS } from '@/lib/modules/quiz/constants/mix-quiz'
import { useToast } from '@/store/shared/toast-store'
import { formatStudyDuration } from '@/lib/core/utils/format'

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#5D7B6F] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
            Quiz Trộn
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/80 text-slate-600 text-[10px] font-bold">
            {session.question_count} câu
          </span>
          <span className={cn('px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-bold', modeColor)}>
            {modeLabel}
          </span>
        </div>
        <p className="font-black text-slate-800 text-sm leading-snug line-clamp-2 break-words">
          {session.title.startsWith('Quiz Trộn · ') ? session.title.slice('Quiz Trộn · '.length) : session.title}
        </p>
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

function handleMixMutationError(
  err: any,
  setRateLimitReset: (reset: number | null) => void,
  setRateLimitMsg: (msg: string | null) => void,
  toast: any
) {
  if (err.status === 429) {
    const msg = `Bạn đã tạo quá ${err.data?.limit ?? 5} Quiz Trộn trong 1 giờ. Vui lòng thử lại sau ${err.data?.reset ? formatResetTime(err.data.reset) : 'ít phút'}.`
    setRateLimitReset(err.data?.reset ?? null)
    setRateLimitMsg(msg)
    toast.error(msg)
  } else {
    const errorMsg = err.data?.message || err.message || 'Có lỗi xảy ra khi tạo bộ đề trộn'
    toast.error(errorMsg)
    console.error('Mix Error Detail:', err.data || err)
  }
}

// ── MixQuizForm ────────────────────────────────────────────────────────────

function MixQuizForm({ onSessionCreated, embedded }: { onSessionCreated: (quizId: string, sessionId: string) => void; embedded?: boolean }) {
  // When embedded in a course page, the category is pre-selected via URL params.
  // Steps are renumbered: skip Step 1 (category), so Step 2→1, Step 3→2, Step 4→3.
  const stepOffset = embedded ? 0 : 1
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const categoryIdParam = searchParams.get('categoryId')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => categoryIdParam ?? '')
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [mode, setMode] = useState<'immediate' | 'review' | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [quotaErrorMsg, setQuotaErrorMsg] = useState<string | null>(null)
  const [poolWarning, setPoolWarning] = useState<string | null>(null)
  const mixFrom = searchParams.get('mix_from')
  const [isPreloading, setIsPreloading] = useState(false)

  // Sync selectedCategoryId if categoryIdParam changes
  useEffect(() => {
    if (categoryIdParam) {
      setSelectedCategoryId(categoryIdParam)
      setSelectedQuizIds(new Set())
    }
  }, [categoryIdParam])

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['mix', 'categories'],
    queryFn: fetchCategoriesForMix,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  useEffect(() => {
    setRateLimitMsg(null)
    setQuotaErrorMsg(null)
  }, [selectedQuizIds, questionCount, mode])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategoryId || selectedQuizIds.size < 2 || questionCount === null || mode === null) return
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
      if (data.actual_count && data.actual_count < (questionCount ?? 0)) {
        setPoolWarning(
          `Pool câu hỏi chỉ có ${data.actual_count} câu — đã lấy hết. Bắt đầu với ${data.actual_count} câu.`
        )
        setTimeout(() => onSessionCreated(data.quizId, data.sessionId), 1500)
      } else {
        onSessionCreated(data.quizId, data.sessionId)
      }
    },
    onError: (err: any) => {
      handleMixMutationError(err, setRateLimitReset, setRateLimitMsg, toast)
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

      {/* Step 1 — Category (hidden when embedded in course page) */}
      {!embedded && (
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
      )}

      {/* Step 2 — Quiz selection & Configuration (50% / 50% split on desktop) */}
      {selectedCategoryId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Left Column (50% / col-span-6) — Quiz Checklist */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white text-xs font-black shrink-0">{stepOffset + 1}</div>
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider sm:tracking-widest">Chọn bộ đề trộn</h2>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {totalPool > 0 && (
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 font-extrabold text-[10px] sm:text-xs bg-green-50 text-green-700 border-green-200">
                    Pool: {totalPool} câu
                  </Badge>
                )}
                <Badge variant="outline" className={cn(
                  'rounded-full px-2.5 py-0.5 font-extrabold text-[10px] sm:text-xs transition-colors',
                  selectedQuizIds.size >= 2 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                )}>
                  {selectedQuizIds.size}/{MIX_QUIZ_MAX_SELECT} ĐÃ CHỌN
                </Badge>
              </div>
            </div>

            <div className="bg-slate-50/60 rounded-2xl p-2 sm:p-3 border border-slate-200/60">
              {quizzesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-white border border-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : quizzes.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold bg-white rounded-xl border border-dashed border-slate-200 text-xs">
                  Không tìm thấy quiz nào trong danh mục này
                </div>
              ) : (
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 overflow-y-auto overscroll-contain p-1.5 pr-2.5 custom-scrollbar"
                  style={{ maxHeight: SCROLL_HEIGHT + 140 }}
                >
                  {quizzes.map((quiz, idx) => {
                    const isSelected = selectedQuizIds.has(quiz.id)
                    const isDisabled = !isSelected && selectedQuizIds.size >= MIX_QUIZ_MAX_SELECT
                    const hasScore = quiz.latestScoreOnTen !== null
                    const isPassed = (quiz.latestScoreOnTen ?? 0) >= 5
                    const isSentinel = idx === Math.min(LOAD_THRESHOLD - 1, quizzes.length - 1)

                    return (
                      <div
                        key={quiz.id}
                        ref={isSentinel ? sentinelRef : undefined}
                        onClick={() => !isDisabled && toggleQuiz(quiz.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            if (!isDisabled) toggleQuiz(quiz.id)
                          }
                        }}
                        className={cn(
                          'relative group w-full flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl border-2 transition-all cursor-pointer select-none',
                          isSelected
                            ? 'border-[#5D7B6F] bg-white shadow-sm ring-1 ring-[#5D7B6F]/40'
                            : isDisabled
                              ? 'border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed'
                              : 'border-white bg-white hover:border-[#5D7B6F]/20 hover:shadow-xs'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center w-5 h-5 rounded-md transition-colors shrink-0',
                          isSelected ? 'bg-[#5D7B6F] text-white' : 'bg-slate-100 text-slate-300 group-hover:bg-slate-200'
                        )}>
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 text-[11px] sm:text-xs truncate uppercase tracking-tight">{quiz.course_code}</p>
                          <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 truncate">{quiz.title}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-0.5">
                          {hasScore && (
                            <div className={cn('flex items-center gap-0.5 justify-end text-[10px] sm:text-[11px] font-black', isPassed ? 'text-green-600' : 'text-red-600')}>
                              <Trophy className="w-2.5 h-2.5" />
                              <span>{quiz.latestScoreOnTen!.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 justify-end text-[9px] font-bold text-slate-400">
                            <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-500 font-extrabold">{quiz.questionCount}c</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {isFetchingNextPage && (
                    <div className="col-span-full h-12 rounded-xl bg-white border border-slate-100 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (50% / col-span-6) — Steps 2 & 3 & Start Button (Always Visible) */}
          <div className="lg:col-span-6 space-y-3">
            {/* Step 2 — Question count */}
            <section className="space-y-2 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/60 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black shrink-0">{stepOffset + 2}</div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Số lượng câu muốn làm</h2>
              </div>

              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {(totalPool > 0 ? MIX_QUIZ_QUESTION_OPTIONS.filter((count) => count <= totalPool) : MIX_QUIZ_QUESTION_OPTIONS).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={cn(
                      'flex-1 min-w-[60px] py-1.5 sm:py-2 rounded-lg border-2 font-black text-xs transition-all cursor-pointer select-none',
                      questionCount === count
                        ? 'border-[#5D7B6F] bg-[#5D7B6F] text-white shadow-xs'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#5D7B6F]/30 hover:bg-white'
                    )}
                  >
                    {count} CÂU
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3 — Mode Selection */}
            <section className="space-y-2 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/60 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black shrink-0">{stepOffset + 3}</div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Chế độ làm bài</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Luyện tập */}
                <button
                  type="button"
                  onClick={() => setMode('immediate')}
                  className={cn(
                    'relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-left transition-all cursor-pointer select-none',
                    mode === 'immediate'
                      ? 'border-green-500 bg-green-50/20 shadow-xs ring-1 ring-green-500/20'
                      : 'border-slate-100 bg-slate-50 hover:border-green-200 hover:bg-white'
                  )}
                >
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs',
                    mode === 'immediate' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-500'
                  )}>
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-black text-xs', mode === 'immediate' ? 'text-slate-900' : 'text-slate-700')}>
                      Luyện tập
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 leading-none mt-0.5 truncate">
                      Xem giải thích từng câu
                    </p>
                  </div>
                  {mode === 'immediate' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  )}
                </button>

                {/* Kiểm tra */}
                <button
                  type="button"
                  onClick={() => setMode('review')}
                  className={cn(
                    'relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-left transition-all cursor-pointer select-none',
                    mode === 'review'
                      ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-white'
                  )}
                >
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs',
                    mode === 'review' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'
                  )}>
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-black text-xs', mode === 'review' ? 'text-slate-900' : 'text-slate-700')}>
                      Kiểm tra
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 leading-none mt-0.5 truncate">
                      Chấm điểm sau khi nộp
                    </p>
                  </div>
                  {mode === 'review' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  )}
                </button>
              </div>
            </section>

            {/* Hint Badge if less than 2 quizzes selected */}
            {selectedQuizIds.size < 2 && (
              <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-[11px] font-bold text-amber-800 leading-snug">
                  Vui lòng chọn từ 2 bộ đề trở lên ở cột bên trái để kích hoạt trộn bài.
                </p>
              </div>
            )}

            {rateLimitMsg && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-700 leading-snug">
                  {rateLimitMsg}
                </p>
              </div>
            )}

            {/* Start Button */}
            <div className="pt-0.5">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canStart || createMutation.isPending}
                className={cn(
                  "group relative w-full h-12 sm:h-14 rounded-xl text-white shadow-md transition-all active:scale-[0.98] overflow-hidden cursor-pointer",
                  canStart
                    ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/15"
                    : "bg-slate-300 opacity-80 cursor-not-allowed shadow-none"
                )}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2 font-black text-sm sm:text-base">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ĐANG KHỞI TẠO PHIÊN...
                  </span>
                ) : (
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full px-2">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-transform duration-500 shrink-0',
                      canStart && 'group-hover:rotate-12 group-hover:scale-110'
                    )}>
                      <Shuffle className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-widest text-white/60 leading-none mb-0.5 truncate">
                        {canStart ? 'Xác nhận thiết lập' : 'Cần chọn đủ từ 2 bộ đề'}
                      </p>
                      <p className="text-sm sm:text-base font-black tracking-tight truncate">
                        {canStart ? 'BẮT ĐẦU TRỘN QUIZ' : 'CHỌN ĐỦ ĐỀ ĐỂ BẮT ĐẦU'}
                      </p>
                    </div>
                    <ArrowRight className={cn("ml-auto sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-500 shrink-0", canStart ? "opacity-60 group-hover:translate-x-1.5" : "opacity-30")} />
                  </div>
                )}
                {canStart && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <QuotaExceededDialog
        open={!!quotaErrorMsg}
        onOpenChange={(open) => !open && setQuotaErrorMsg(null)}
        message={quotaErrorMsg || ''}
      />
    </div>
  )
}

// ── MixQuizTab (main export) ───────────────────────────────────────────────

export default function MixQuizTab({ embedded }: { embedded?: boolean } = {}) {
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
    const targetQuizId = quizId || 'mixed'
    router.push(`/quiz/${targetQuizId}/session/${sessionId}`)
  }

  if (activeLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#5D7B6F] animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header — hidden when embedded in course page */}
      {!embedded && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shuffle className="w-6 h-6 text-[#5D7B6F]" />
            <h2 className="text-2xl font-black text-gray-900">Trộn Quiz</h2>
          </div>
          <p className="text-gray-500 font-medium text-sm">
            Chọn tối đa {MIX_QUIZ_MAX_SELECT} quiz công khai, gộp câu hỏi và làm ngay.
          </p>
        </div>
      )}

      {hasActive && activeSession ? (
        <ActiveSessionBanner
          session={activeSession}
          onContinue={handleContinue}
          onCreateNew={handleCreateNew}
          isDeleting={isDeletingOld}
        />
      ) : (
        <MixQuizForm onSessionCreated={handleSessionCreated} embedded={embedded} />
      )}
    </div>
  )
}
