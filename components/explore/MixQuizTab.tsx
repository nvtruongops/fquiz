'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery, useQuery, useMutation } from '@tanstack/react-query'
import {
  Shuffle,
  Info,
  AlertTriangle,
  Clock,
  Loader2,
  CheckSquare,
  Square,
  Trophy,
  Clock3,
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
  expires_at: string
  status: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Đã hết hạn'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours} giờ ${minutes} phút`
  return `${minutes} phút`
}

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

// ── ActiveSessionDialog ────────────────────────────────────────────────────

function ActiveSessionDialog({
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
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(session.expires_at))

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(formatTimeLeft(session.expires_at)), 60_000)
    return () => clearInterval(interval)
  }, [session.expires_at])

  return (
    <div className="bg-white rounded-[24px] border-2 border-[#5D7B6F]/20 p-6 space-y-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#5D7B6F]/10 flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-[#5D7B6F]" />
        </div>
        <div>
          <h3 className="font-black text-gray-900">Bạn có một Quiz Trộn chưa hoàn thành</h3>
          <p className="text-sm text-gray-500">Tiếp tục hay tạo quiz mới?</p>
        </div>
      </div>

      <div className="bg-[#EAE7D6]/50 rounded-2xl p-4 space-y-1">
        <p className="font-bold text-[#5D7B6F] text-sm">{session.title}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
          <span>{session.question_count} câu</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Còn {timeLeft}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onContinue}
          className="flex-1 bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black rounded-2xl"
        >
          Tiếp tục làm
        </Button>
        <Button
          onClick={onCreateNew}
          disabled={isDeleting}
          variant="outline"
          className="flex-1 border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/10 font-black rounded-2xl"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tạo quiz mới'}
        </Button>
      </div>
    </div>
  )
}

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 10        // items per page
const ITEM_HEIGHT = 68      // px per quiz row (py-3 + border + gap ≈ 68px)
const VISIBLE_ITEMS = 5     // how many rows visible at once
const SCROLL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS  // 340px
const LOAD_THRESHOLD = 8    // trigger next page when item #8 is visible

// ── MixQuizForm ────────────────────────────────────────────────────────────

function MixQuizForm({ onSessionCreated }: { onSessionCreated: (quizId: string, sessionId: string) => void }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [mode, setMode] = useState<'immediate' | 'review' | null>(null)
  const [difficulty, setDifficulty] = useState<'sequential' | 'random' | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [poolWarning, setPoolWarning] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['mix', 'categories'],
    queryFn: fetchCategoriesForMix,
    staleTime: 5 * 60 * 1000,
  })

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
    queryFn: ({ pageParam }) =>
      fetchQuizzesForCategory(selectedCategoryId, pageParam, PAGE_SIZE),
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

  // IntersectionObserver — trigger when sentinel (item #LOAD_THRESHOLD) enters view
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage()
      },
      { threshold: 0, rootMargin: '80px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, quizzes.length])

  const totalPool = quizzes
    .filter((q) => selectedQuizIds.has(q.id))
    .reduce((sum, q) => sum + q.questionCount, 0)

  // Reset questionCount if selected count exceeds new pool size
  useEffect(() => {
    if (totalPool > 0 && questionCount !== null && questionCount > totalPool) {
      setQuestionCount(null)
    }
  }, [totalPool, questionCount])

  const toggleQuiz = useCallback((id: string) => {
    setSelectedQuizIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MIX_QUIZ_MAX_SELECT) {
        next.add(id)
      }
      return next
    })
  }, [])

  // ── Mode groups ──────────────────────────────────────────────────────────
  const modeGroups = [
    {
      group: 'Chế độ luyện tập',
      subtitle: 'Xem đáp án và giải thích ngay sau mỗi câu',
      options: [
        { label: 'Học nhanh', mode: 'immediate' as const, difficulty: 'random' as const },
        { label: 'Học sâu', mode: 'immediate' as const, difficulty: 'sequential' as const },
      ],
    },
    {
      group: 'Chế độ kiểm tra',
      subtitle: 'Chấm điểm sau khi nộp bài',
      options: [
        { label: 'Chế độ dễ', mode: 'review' as const, difficulty: 'sequential' as const },
        { label: 'Chế độ khó', mode: 'review' as const, difficulty: 'random' as const },
      ],
    },
  ]

  const isPresetActive = (m: 'immediate' | 'review', d: 'sequential' | 'random') =>
    mode === m && difficulty === d

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/sessions/mix`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          quiz_ids: Array.from(selectedQuizIds),
          question_count: questionCount,
          mode,
          difficulty,
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

  const canStart =
    selectedQuizIds.size >= 2 &&
    questionCount !== null &&
    mode !== null &&
    difficulty !== null &&
    !rateLimitReset

  useEffect(() => {
    if (!rateLimitReset) return
    const interval = setInterval(() => {
      if (Date.now() >= rateLimitReset) {
        setRateLimitReset(null)
        setRateLimitMsg(null)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [rateLimitReset])

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#D7F9FA]/40 border border-[#D7F9FA] rounded-2xl p-4">
        <Info className="w-4 h-4 text-[#5D7B6F] mt-0.5 shrink-0" />
        <p className="text-sm text-[#5D7B6F] font-medium">
          Quiz tạm thời — Tự động xóa sau 2 giờ. Không lưu vào lịch sử sau khi thoát.
        </p>
      </div>

      {/* Rate limit warning */}
      {rateLimitMsg && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">{rateLimitMsg}</p>
        </div>
      )}

      {/* Pool warning */}
      {poolWarning && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-700 font-medium">{poolWarning}</p>
        </div>
      )}

      {/* Category selector */}
      <div className="space-y-2">
        <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Chọn danh mục</label>
        {catsLoading ? (
          <div className="h-12 rounded-2xl bg-gray-100 animate-pulse" />
        ) : (
          <div className="relative">
            <Select
              value={selectedCategoryId}
              onValueChange={(val) => {
                setSelectedCategoryId(val)
                setSelectedQuizIds(new Set())
              }}
            >
              <SelectTrigger className="w-full h-12 px-4 rounded-2xl border-2 border-[#A4C3A2]/30 bg-white text-gray-700 font-bold focus:border-[#5D7B6F] focus:ring-0 transition-colors">
                <SelectValue placeholder="-- Chọn danh mục --" />
              </SelectTrigger>
              <SelectContent className="overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-h-[calc(5*2.75rem)]">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Quiz list — fixed height, hidden scrollbar, infinite scroll */}
      {selectedCategoryId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">
              Danh sách quiz
            </label>
            <span className="text-xs font-bold text-gray-400">
              Đã chọn: {selectedQuizIds.size}/{MIX_QUIZ_MAX_SELECT} quiz
              {totalPool > 0 && ` · Pool: ${totalPool} câu`}
            </span>
          </div>

          {quizzesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[68px] rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl">
              Không có quiz nào trong danh mục này
            </div>
          ) : (
            /* scrollbar-hide: overflow-y-auto + hide native scrollbar via CSS */
            <div
              className="overflow-y-auto overscroll-contain space-y-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: SCROLL_HEIGHT }}
            >
              {quizzes.map((quiz, idx) => {
                const isSelected = selectedQuizIds.has(quiz.id)
                const isDisabled = !isSelected && selectedQuizIds.size >= MIX_QUIZ_MAX_SELECT
                const hasScore = quiz.latestScoreOnTen !== null
                const isPassed = (quiz.latestScoreOnTen ?? 0) >= 5

                return (
                  <React.Fragment key={quiz.id}>
                    <button
                      onClick={() => !isDisabled && toggleQuiz(quiz.id)}
                      disabled={isDisabled}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-[#5D7B6F] bg-[#5D7B6F]/5'
                          : isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                            : 'border-[#A4C3A2]/20 bg-white hover:border-[#5D7B6F]/40 hover:bg-[#5D7B6F]/5'
                      )}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#5D7B6F] shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-800 text-sm truncate">{quiz.course_code}</p>
                        <p className="text-xs text-gray-500 truncate">{quiz.title}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-0.5">
                        {hasScore && (
                          <div className={cn('flex items-center gap-1 justify-end text-xs font-black', isPassed ? 'text-[#166534]' : 'text-[#B91C1C]')}>
                            <Trophy className="w-3 h-3" />
                            <span>{quiz.latestScoreOnTen!.toFixed(1)}/10</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 justify-end text-xs font-bold text-gray-400">
                          {quiz.totalStudyMinutes !== null && quiz.totalStudyMinutes > 0 && (
                            <>
                              <Clock3 className="w-3 h-3 text-[#5D7B6F]" />
                              <span>{formatStudyDuration(quiz.totalStudyMinutes)}</span>
                              <span className="text-gray-300">·</span>
                            </>
                          )}
                          <span>{quiz.questionCount} câu</span>
                        </div>
                      </div>
                    </button>
                    {/* Sentinel placed after item #LOAD_THRESHOLD (0-indexed) */}
                    {idx === LOAD_THRESHOLD - 1 && (
                      <div ref={sentinelRef} className="h-px" />
                    )}
                  </React.Fragment>
                )
              })}
              {/* Loading skeleton for next page */}
              {isFetchingNextPage && (
                <div className="h-[68px] rounded-2xl bg-gray-100 animate-pulse" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Question count */}
      <div className="space-y-2">
        <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Số câu muốn làm</label>
        <div className="flex gap-2 flex-wrap">
          {MIX_QUIZ_QUESTION_OPTIONS.filter((count) => totalPool === 0 || count <= totalPool).map((count) => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              className={cn(
                'px-5 py-2.5 rounded-2xl border-2 font-black text-sm transition-all',
                questionCount === count
                  ? 'border-[#5D7B6F] bg-[#5D7B6F] text-white'
                  : 'border-[#A4C3A2]/30 text-gray-600 hover:border-[#5D7B6F]/50'
              )}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Mode selection — 2 groups */}
      <div className="space-y-4">
        <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Chế độ làm bài</label>
        <div className="space-y-3">
          {modeGroups.map((group) => (
            <div key={group.group} className="space-y-2">
              {/* Group header */}
              <div>
                <p className="text-xs font-black text-gray-600 uppercase tracking-wider">{group.group}</p>
                <p className="text-xs text-gray-400 font-medium">{group.subtitle}</p>
              </div>
              {/* Options */}
              <div className="grid grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const isActive = isPresetActive(opt.mode, opt.difficulty)
                  return (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setMode(opt.mode)
                        setDifficulty(opt.difficulty)
                      }}
                      className={cn(
                        'px-4 py-3 rounded-2xl border-2 font-black text-sm transition-all text-left',
                        isActive
                          ? 'border-[#5D7B6F] bg-[#5D7B6F] text-white'
                          : 'border-[#A4C3A2]/30 text-gray-600 hover:border-[#5D7B6F]/50 bg-white'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <Button
        onClick={() => createMutation.mutate()}
        disabled={!canStart || createMutation.isPending}
        className="w-full h-14 rounded-2xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-black text-base tracking-wide disabled:opacity-50"
      >
        {createMutation.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang tạo...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Shuffle className="w-5 h-5" />
            Bắt đầu Trộn Quiz
          </span>
        )}
      </Button>

      {selectedQuizIds.size === 1 && (
        <p className="text-center text-xs text-gray-400 font-medium">
          Cần chọn ít nhất 2 quiz để trộn
        </p>
      )}
    </div>
  )
}

// ── MixQuizTab (main export) ───────────────────────────────────────────────

export default function MixQuizTab() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [isDeletingOld, setIsDeletingOld] = useState(false)

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['mix', 'active'],
    queryFn: fetchActiveMixSession,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })

  const hasActive = activeData?.hasActive && !showForm
  const activeSession = activeData?.session

  const handleContinue = () => {
    if (!activeSession) return
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
      // Ignore — TTL may have already deleted it
    } finally {
      setIsDeletingOld(false)
      setShowForm(true)
    }
  }

  const handleSessionCreated = (quizId: string, sessionId: string) => {
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
          <Badge className="bg-[#D7F9FA] text-[#5D7B6F] border-none text-xs font-black">
            Tạm thời
          </Badge>
        </div>
        <p className="text-gray-500 font-medium text-sm">
          Chọn tối đa {MIX_QUIZ_MAX_SELECT} quiz công khai, gộp câu hỏi và làm ngay.
        </p>
      </div>

      {hasActive && activeSession ? (
        <ActiveSessionDialog
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
