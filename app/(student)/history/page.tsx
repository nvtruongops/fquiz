'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, BookOpen, CheckCircle } from 'lucide-react'

interface HistoryItem {
  _id: string
  quiz_id: string
  latest_session_id: string
  quiz_title: string | null
  quiz_code: string | null
  category_name: string | null
  source_type: 'self_created' | 'saved_explore' | 'explore_public'
  source_label: string
  source_creator_name: string | null
  score: number
  total_questions: number
  mode: 'immediate' | 'review'
  completed_at: string
  started_at: string
  total_study_minutes: number
  attempt_count: number
}

interface InProgressItem {
  _id: string
  quiz_id: string
  active_session_id: string
  quiz_title: string | null
  quiz_code: string | null
  category_name: string | null
  source_type: 'self_created' | 'saved_explore' | 'explore_public'
  source_label: string
  source_creator_name: string | null
  started_at: string
  answered_count: number
  total_questions: number
  current_question_index: number
}

interface HistoryDisplayItem {
  quiz_id: string
  quiz_title: string | null
  quiz_code: string | null
  category_name: string | null
  source_type: 'self_created' | 'saved_explore' | 'explore_public'
  source_label: string
  source_creator_name: string | null
  latest: HistoryItem | null
  active: InProgressItem | null
}

interface HistoryResponse {
  history: HistoryItem[]
  inProgress: InProgressItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type SourceFilter = 'all' | 'self_created' | 'from_explore'

async function fetchHistory(page: number): Promise<HistoryResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history?page=${page}&limit=10`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl animate-pulse" style={{ backgroundColor: '#fff' }}>
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded w-1/3" style={{ backgroundColor: '#B0D4B8' }} />
        <div className="h-3 rounded w-1/4" style={{ backgroundColor: '#EAE7D6' }} />
      </div>
      <div className="h-8 w-16 rounded" style={{ backgroundColor: '#B0D4B8' }} />
    </div>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? score / total : 0
  const color = pct >= 0.8 ? '#5D7B6F' : pct >= 0.5 ? '#A4C3A2' : '#ef4444'
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
      style={{ backgroundColor: pct >= 0.8 ? '#B0D4B8' : pct >= 0.5 ? '#EAE7D6' : '#fee2e2', color }}
    >
      <CheckCircle size={14} />
      {score}/{total}
    </span>
  )
}

function ModeBadge({ mode }: { mode: 'immediate' | 'review' }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: mode === 'immediate' ? '#D7F9FA' : '#EAE7D6',
        color: '#5D7B6F',
      }}
    >
      {mode === 'immediate' ? 'Immediate' : 'Review'}
    </span>
  )
}

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const { data, isLoading, isError } = useQuery<HistoryResponse>({
    queryKey: ['history', page],
    queryFn: () => fetchHistory(page),
    staleTime: 1000 * 30,
  })

  const mergedMap = new Map<string, HistoryDisplayItem>()

  for (const item of data?.history ?? []) {
    mergedMap.set(item.quiz_id, {
      quiz_id: item.quiz_id,
      quiz_title: item.quiz_title,
      quiz_code: item.quiz_code,
      category_name: item.category_name,
      source_type: item.source_type,
      source_label: item.source_label,
      source_creator_name: item.source_creator_name,
      latest: item,
      active: null,
    })
  }

  for (const activeItem of data?.inProgress ?? []) {
    const existing = mergedMap.get(activeItem.quiz_id)
    if (existing) {
      existing.active = activeItem
      continue
    }

    mergedMap.set(activeItem.quiz_id, {
      quiz_id: activeItem.quiz_id,
      quiz_title: activeItem.quiz_title,
      quiz_code: activeItem.quiz_code,
      category_name: activeItem.category_name,
      source_type: activeItem.source_type,
      source_label: activeItem.source_label,
      source_creator_name: activeItem.source_creator_name,
      latest: null,
      active: activeItem,
    })
  }

  const mergedItems = Array.from(mergedMap.values()).sort((a, b) => {
    const aLatest = a.latest?.completed_at ? new Date(a.latest.completed_at).getTime() : 0
    const aActive = a.active?.started_at ? new Date(a.active.started_at).getTime() : 0
    const bLatest = b.latest?.completed_at ? new Date(b.latest.completed_at).getTime() : 0
    const bActive = b.active?.started_at ? new Date(b.active.started_at).getTime() : 0
    return Math.max(bLatest, bActive) - Math.max(aLatest, aActive)
  })

  const filteredItems = mergedItems.filter((item) => {
    if (sourceFilter === 'all') return true
    if (sourceFilter === 'self_created') return item.source_type === 'self_created'
    return item.source_type !== 'self_created'
  })

  function sourceText(sourceLabel: string, sourceCreatorName: string | null) {
    if (!sourceCreatorName) return sourceLabel
    return `${sourceLabel} • ${sourceCreatorName}`
  }

  function displayQuizName(item: HistoryDisplayItem) {
    if (item.quiz_code && item.category_name) {
      return `${item.category_name} - ${item.quiz_code}`
    }
    if (item.quiz_code) {
      return item.quiz_code
    }
    return item.quiz_title ?? 'Untitled Quiz'
  }

  return (
    <main className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: '#EAE7D6' }}>
      <h1 className="text-3xl font-bold mb-8" style={{ color: '#5D7B6F' }}>
        Quiz History
      </h1>

      {isError && (
        <div className="rounded-xl p-4 mb-6 text-sm" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
          Failed to load history. Please try again.
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'Tất cả nguồn' },
          { id: 'self_created', label: 'Tự tạo' },
          { id: 'from_explore', label: 'Từ Explore' },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSourceFilter(opt.id as SourceFilter)}
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: '#5D7B6F',
              backgroundColor: sourceFilter === opt.id ? '#5D7B6F' : '#fff',
              color: sourceFilter === opt.id ? '#fff' : '#5D7B6F',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : filteredItems.length === 0
          ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ backgroundColor: '#fff' }}
            >
              <BookOpen size={48} style={{ color: '#A4C3A2' }} className="mb-4" />
              <p className="text-lg font-medium" style={{ color: '#5D7B6F' }}>No quiz history yet</p>
              <p className="text-sm mt-1" style={{ color: '#A4C3A2' }}>
                Complete a quiz to see your results here.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5D7B6F' }}
              >
                Browse Quizzes
              </Link>
            </div>
          )
          : filteredItems.map((item) => (
            <div key={item.quiz_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl bg-white hover:shadow-md transition-shadow">
              <Link href={`/history/${item.quiz_id}`} className="flex-1 min-w-0 w-full">
                <p className="font-semibold truncate text-base" style={{ color: '#5D7B6F' }}>
                  {displayQuizName(item)}
                </p>
                
                {/* First row: Time and source */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {item.latest?.completed_at ? (
                    <>
                      <Clock size={12} style={{ color: '#A4C3A2' }} />
                      <span className="text-xs" style={{ color: '#A4C3A2' }}>
                        {formatDate(item.latest.completed_at)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold" style={{ color: '#A4C3A2' }}>
                      Chưa có lần nộp hoàn thành
                    </span>
                  )}
                  <span className="rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap" style={{ color: '#5D7B6F' }}>
                    {sourceText(item.source_label, item.source_creator_name)}
                  </span>
                </div>

                {/* Second row: Stats and mode */}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {item.latest && (
                    <>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#5D7B6F' }}>
                        Đã học: {item.latest.total_study_minutes} phút
                      </span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#5D7B6F' }}>
                        Số lần: {item.latest.attempt_count}
                      </span>
                      <ModeBadge mode={item.latest.mode} />
                    </>
                  )}
                  {item.active && (
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#5D7B6F' }}>
                      Đang làm dở: {item.active.answered_count}/{item.active.total_questions}
                    </span>
                  )}
                </div>
              </Link>
              <Link
                href={`/history/${item.quiz_id}`}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap self-end sm:self-center"
                style={{ backgroundColor: '#5D7B6F' }}
              >
                Xem chi tiết
              </Link>
            </div>
          ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#B0D4B8', color: '#5D7B6F' }}
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          <span className="text-sm" style={{ color: '#5D7B6F' }}>
            Page {page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#B0D4B8', color: '#5D7B6F' }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </main>
  )
}
