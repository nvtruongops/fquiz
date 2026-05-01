'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  BookOpen,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { FlashcardReviewButton } from '@/components/quiz/FlashcardReviewButton'

interface HistoryQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number
  explanation: string | null
  image_url?: string
  submitted_answer: number | null
  is_correct: boolean
}

interface HistoryDetail {
  _id: string
  quiz_id: string
  quiz_title: string
  source_type: 'self_created' | 'saved_explore' | 'explore_public'
  source_label: string
  mode: 'immediate' | 'review' | 'flashcard'
  score: number
  total_questions: number
  completed_at: string
  started_at: string
  total_study_minutes: number
  flashcard_stats?: {
    total_cards: number
    cards_known: number
    cards_unknown: number
    time_spent_ms: number
    current_round: number
  }
  attempts: Array<{
    session_id: string
    score: number
    mode: 'immediate' | 'review' | 'flashcard'
    completed_at: string
    started_at: string
  }>
  questions: HistoryQuestion[]
  has_active_session?: boolean
  active_session_id?: string | null
  active_answered_count?: number
  active_total_count?: number
  active_started_at?: string | null
}

interface Highlight {
  _id: string
  question_id: string
  color_code: string
  text_segment: string
  offset: number
}

const HIGHLIGHT_COLORS: { color: string; label: string }[] = [
  { color: '#B0D4B8', label: 'Green' },
  { color: '#D7F9FA', label: 'Cyan' },
  { color: '#FFE082', label: 'Yellow' },
  { color: '#EF9A9A', label: 'Red' },
]

async function fetchHistoryDetail(id: string, sessionId: string): Promise<HistoryDetail> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history/${id}?sessionId=${sessionId}`)
  if (!res.ok) throw new Error('Failed to fetch history detail')
  return res.json()
}

async function fetchHighlightsForQuestion(questionId: string): Promise<Highlight[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/highlights?question_id=${questionId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.highlights ?? []
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ModeBadge({ mode }: { mode: 'immediate' | 'review' | 'flashcard' }) {
  const config = {
    immediate: { bg: '#D7F9FA', label: 'Luyện tập' },
    review:    { bg: '#EAE7D6', label: 'Kiểm tra' },
    flashcard: { bg: '#f3e8ff', label: 'Lật thẻ' },
  }
  const { bg, label } = config[mode] ?? config.immediate
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: bg, color: '#5D7B6F' }}
    >
      {label}
    </span>
  )
}

function ColorFilterBar({
  selected,
  onChange,
}: {
  selected: string | null
  onChange: (color: string | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium" style={{ color: '#5D7B6F' }}>
        Filter by highlight:
      </span>
      <button
        onClick={() => onChange(null)}
        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
        style={{
          backgroundColor: selected === null ? '#5D7B6F' : '#fff',
          color: selected === null ? '#fff' : '#5D7B6F',
          borderColor: '#5D7B6F',
        }}
      >
        All
      </button>
      {HIGHLIGHT_COLORS.map(({ color, label }) => (
        <button
          key={color}
          onClick={() => onChange(selected === color ? null : color)}
          title={label}
          className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: selected === color ? '#5D7B6F' : 'transparent',
            outline: selected === color ? '2px solid #5D7B6F' : 'none',
            outlineOffset: '2px',
          }}
          aria-label={`Filter by ${label}`}
          aria-pressed={selected === color}
        />
      ))}
    </div>
  )
}

function FlashcardHistoryCard({
  question,
  index,
}: {
  question: HistoryQuestion
  index: number
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const { text, options, correct_answer, explanation, image_url, is_correct, submitted_answer } = question
  
  // Check if this question was answered (in flashcard mode, submitted_answer is -1 if answered)
  const wasAnswered = submitted_answer !== null && submitted_answer !== undefined
  
  return (
    <div className="relative">
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {!isFlipped ? (
          // Front side - Question
          <div className="p-6 space-y-4 min-h-[200px] flex flex-col justify-center">
            <div className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: '#5D7B6F' }}
              >
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-lg font-medium text-gray-800 leading-relaxed">{text}</p>
              </div>
              {wasAnswered && (
                <div className="flex-shrink-0">
                  {is_correct ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã biết
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <XCircle className="w-3 h-3" />
                      Chưa biết
                    </span>
                  )}
                </div>
              )}
              {!wasAnswered && (
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                  <MinusCircle className="w-3 h-3" />
                  Chưa trả lời
                </span>
              )}
            </div>

            {image_url && (
              <div className="flex min-h-[180px] max-h-[300px] w-full items-center justify-center overflow-hidden rounded-lg bg-[#fafafa] border border-gray-100">
                <img
                  src={image_url}
                  alt={`Question ${index + 1}`}
                  className="h-full max-h-[300px] w-full object-contain"
                />
              </div>
            )}

            <div className="flex items-center justify-center pt-4">
              <span className="text-sm text-gray-400 italic">Nhấn để xem đáp án</span>
            </div>
          </div>
        ) : (
          // Back side - Answer
          <div className="p-6 space-y-4 min-h-[200px]">
            <div className="flex items-center justify-between mb-4">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: '#5D7B6F' }}
              >
                {index + 1}
              </span>
              <div className="flex items-center gap-2">
                {wasAnswered ? (
                  is_correct ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã biết
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-semibold text-red-600">
                      <XCircle className="w-4 h-4" />
                      Chưa biết
                    </span>
                  )
                ) : (
                  <span className="flex items-center gap-1 text-sm font-semibold text-gray-500">
                    <MinusCircle className="w-4 h-4" />
                    Chưa trả lời
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {options.map((option, optIdx) => {
                const isCorrectOpt = optIdx === correct_answer
                const bgClass = isCorrectOpt 
                  ? 'border-[#A4C3A2] bg-[#A4C3A2]/25' 
                  : 'bg-gray-50 border-gray-200'
                const textClass = isCorrectOpt 
                  ? 'text-green-800 font-medium' 
                  : 'text-gray-700'

                return (
                  <div
                    key={`${question._id}-${optIdx}`}
                    className={`px-4 py-2.5 rounded-lg border ${bgClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{
                          borderColor: isCorrectOpt ? '#A4C3A2' : '#9ca3af',
                          color: isCorrectOpt ? '#166534' : '#6b7280',
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className={`text-sm ${textClass} flex-1`}>{option}</span>
                      {isCorrectOpt && (
                        <span className="text-xs font-semibold text-green-700">✓ Đáp án đúng</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {explanation && (
              <div
                className="p-3 rounded-lg border text-sm text-gray-600 whitespace-pre-wrap"
                style={{ backgroundColor: '#D7F9FA33', borderColor: '#D7F9FA' }}
              >
                <span className="font-semibold text-gray-700">Giải thích: </span>
                {explanation}
              </div>
            )}

            <div className="flex items-center justify-center pt-2">
              <span className="text-sm text-gray-400 italic">Nhấn để xem câu hỏi</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  index,
  highlights,
}: {
  question: HistoryQuestion
  index: number
  highlights: Highlight[]
}) {
  const { submitted_answer, correct_answer, is_correct, options, text, explanation, image_url } = question
  const notAnswered = submitted_answer === null || submitted_answer === undefined
  const highlightColors = new Set(highlights.map((h) => h.color_code))

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-start gap-3">
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0.5"
          style={{ backgroundColor: '#5D7B6F' }}
        >
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {notAnswered ? (
              <MinusCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
            ) : is_correct ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <span className="text-xs font-medium text-gray-500">
              {notAnswered ? 'Not answered' : is_correct ? 'Correct' : 'Incorrect'}
            </span>
            {highlightColors.size > 0 && (
              <div className="flex items-center gap-1 ml-1">
                {Array.from(highlightColors).map((c) => (
                  <span
                    key={c}
                    className="w-3 h-3 rounded-full inline-block border border-gray-200"
                    style={{ backgroundColor: c }}
                    title={`Highlighted in ${c}`}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-gray-800 font-medium leading-snug" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{text}</p>
        </div>
      </div>

      {image_url && (
        <div className="flex min-h-[180px] max-h-[360px] w-full items-center justify-center overflow-hidden rounded-lg bg-[#fafafa] border border-gray-100">
          <img
            src={image_url}
            alt={`Question ${index + 1} illustration`}
            className="h-full max-h-[360px] w-full object-contain"
          />
        </div>
      )}

      <div className="space-y-2 pl-10">
        {options.map((option, optIdx) => {
          const isCorrectOpt = optIdx === correct_answer
          const isSubmitted = optIdx === submitted_answer
          const isWrongSubmission = isSubmitted && !is_correct

          let bgClass = 'bg-gray-50 border-gray-200'
          let textClass = 'text-gray-700'

          if (isCorrectOpt) {
            bgClass = 'border-[#A4C3A2] bg-[#A4C3A2]/25'
            textClass = 'text-green-800 font-medium'
          } else if (isWrongSubmission) {
            bgClass = 'border-red-300 bg-red-50'
            textClass = 'text-red-700'
          }

          const showBadge = isCorrectOpt || isWrongSubmission || (isSubmitted && is_correct)

          return (
            <div
              key={`${question._id}-${optIdx}`}
              className={`px-4 py-2.5 rounded-lg border ${bgClass}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{
                    borderColor: isCorrectOpt ? '#A4C3A2' : isWrongSubmission ? '#f87171' : '#9ca3af',
                    color: isCorrectOpt ? '#166534' : isWrongSubmission ? '#b91c1c' : '#6b7280',
                  }}
                >
                  {String.fromCodePoint(65 + optIdx)}
                </span>
                <span className={`text-sm ${textClass} flex-1`}>{option}</span>
              </div>
              {showBadge && (
                <div className="mt-1.5 pl-8 flex items-center gap-2 flex-wrap">
                  {isCorrectOpt && (
                    <span className="text-xs font-semibold text-green-700">
                      ✓ Correct
                    </span>
                  )}
                  {isWrongSubmission && (
                    <span className="text-xs font-semibold text-red-600">
                      Your answer
                    </span>
                  )}
                  {isSubmitted && is_correct && (
                    <span className="text-xs font-semibold text-green-700">
                      Your answer ✓
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {notAnswered && (
        <div className="pl-10">
          <p className="text-sm text-gray-400 italic">You did not answer this question.</p>
        </div>
      )}

      {explanation && (
        <div
          className="ml-10 p-3 rounded-lg border text-sm text-gray-600 whitespace-pre-wrap"
          style={{ backgroundColor: '#D7F9FA33', borderColor: '#D7F9FA' }}
        >
          <span className="font-semibold text-gray-700">Explanation: </span>
          {explanation}
        </div>
      )}
    </div>
  )
}

export default function HistoryAttemptDetailPage() {
  const params = useParams<{ id: string; sessionId: string }>()
  const id = params.id
  const sessionId = params.sessionId

  const [colorFilter, setColorFilter] = useState<string | null>(null)

  const {
    data,
    isLoading,
    isError,
  } = useQuery<HistoryDetail>({
    queryKey: ['history', id, sessionId],
    queryFn: () => fetchHistoryDetail(id, sessionId),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: !!id && !!sessionId,
  })

  const questionIds = data?.questions.map((q) => q._id) ?? []
  const highlightQueries = useQuery<Record<string, Highlight[]>>({
    queryKey: ['history-highlights', id, sessionId, questionIds],
    queryFn: async () => {
      if (questionIds.length === 0) return {}
      const results = await Promise.all(
        questionIds.map((qId) =>
          fetchHighlightsForQuestion(qId).then((hs) => ({ qId, hs }))
        )
      )
      return Object.fromEntries(results.map(({ qId, hs }) => [qId, hs]))
    },
    enabled: questionIds.length > 0,
    staleTime: 0,
  })

  const highlightMap: Record<string, Highlight[]> = highlightQueries.data ?? {}

  if (isLoading) {
    return (
      <main className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: '#EAE7D6' }}>
        <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded" style={{ backgroundColor: '#B0D4B8' }} />
          <div className="h-32 rounded-xl bg-white" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="h-40 rounded-xl bg-white" />
          ))}
        </div>
      </main>
    )
  }

  if (isError || !data) {
    return (
      <main className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: '#EAE7D6' }}>
        <div className="max-w-3xl mx-auto">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-sm mb-6"
            style={{ color: '#5D7B6F' }}
          >
            <ArrowLeft size={16} />
            Back to Attempts
          </Link>
          <div
            className="rounded-xl p-6 text-sm"
            style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
          >
            Failed to load session details. Please try again.
          </div>
        </div>
      </main>
    )
  }

  const { quiz_title, mode, score, total_questions, completed_at, questions } = data
  const percentage = total_questions > 0 ? Math.round((score / total_questions) * 100) : 0

  const visibleQuestions =
    colorFilter === null
      ? questions
      : questions.filter((q) => {
          const hs = highlightMap[q._id] ?? []
          return hs.some((h) => h.color_code === colorFilter)
        })

  // Flashcard mode display
  if (mode === 'flashcard' && data.flashcard_stats) {
    const flashcardPercentage = data.flashcard_stats.total_cards > 0 
      ? Math.round((data.flashcard_stats.cards_known / data.flashcard_stats.total_cards) * 100) 
      : 0
    
    const answeredCount = data.flashcard_stats.cards_known + data.flashcard_stats.cards_unknown
    const unansweredCount = data.flashcard_stats.total_cards - answeredCount
    const hasActiveSession = data.has_active_session && data.active_session_id
    
    // Session này đã completed, không thể tiếp tục
    // Chỉ có thể tiếp tục nếu có active session khác
    const canContinue = hasActiveSession

    return (
      <main className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: '#EAE7D6' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
              style={{ color: '#5D7B6F' }}
            >
              <ArrowLeft size={16} />
              Lịch sử
            </Link>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
              {/* Nếu có active session khác -> CHỈ hiện nút Tiếp tục */}
              {canContinue ? (
                <Link
                  href={`/quiz/${data.quiz_id}/session/${data.active_session_id}/flashcard`}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: '#5D7B6F' }}
                  title={`Tiếp tục session đang làm dở (${data.active_answered_count}/${data.active_total_count} câu)`}
                >
                  Tiếp tục ({data.active_answered_count}/{data.active_total_count})
                </Link>
              ) : (
                <>
                  {/* Nếu KHÔNG có active session -> hiện Ôn lại (nếu có) + Làm mới */}
                  {data.flashcard_stats.cards_unknown > 0 && (
                    <FlashcardReviewButton
                      sessionId={sessionId}
                      quizId={data.quiz_id}
                      unknownCount={data.flashcard_stats.cards_unknown}
                    />
                  )}
                  <Link
                    href={`/quiz/${data.quiz_id}`}
                    className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
                    style={{ backgroundColor: '#5D7B6F' }}
                  >
                    Làm mới
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Thông báo có session đang làm dở - ngắn gọn */}
          {canContinue && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  <span className="font-bold">Lưu ý:</span> Bạn có một session flashcard khác đang làm dở ở câu {data.active_answered_count}/{data.active_total_count}. 
                  Nhấn <span className="font-bold">"Tiếp tục"</span> để quay lại session đó.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate" style={{ color: '#5D7B6F' }}>
                    {quiz_title ?? 'Untitled Quiz'}
                  </h1>
                  {canContinue && (
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                      Session cũ
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <ModeBadge mode={mode} />
                  <span className="rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[10px] font-semibold" style={{ color: '#5D7B6F' }}>
                    {data.source_label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {formatDate(completed_at)}
                  </span>
                  <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-semibold">
                    Đã hoàn thành
                  </span>
                  {unansweredCount > 0 && (
                    <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">
                      {unansweredCount} thẻ bỏ qua
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-800">{data.flashcard_stats.total_cards}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Tổng số thẻ</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{data.flashcard_stats.cards_known}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Đã biết</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{data.flashcard_stats.cards_unknown}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Chưa biết</p>
              </div>
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <p className="text-3xl font-bold text-gray-500">{unansweredCount}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Bỏ qua</p>
              </div>
            </div>

            <div className="text-xs font-semibold" style={{ color: '#5D7B6F' }}>
              Tổng thời gian học của mã quiz này: {data.total_study_minutes} phút
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tỷ lệ biết (trong {answeredCount} thẻ đã trả lời)</span>
                <span className="font-semibold" style={{ color: '#5D7B6F' }}>
                  {answeredCount > 0 ? Math.round((data.flashcard_stats.cards_known / answeredCount) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={answeredCount > 0 ? Math.round((data.flashcard_stats.cards_known / answeredCount) * 100) : 0}
                className="h-2.5"
                style={{ '--progress-foreground': '#5D7B6F' } as React.CSSProperties}
              />
              <p className="text-xs text-gray-400 mt-1">
                {data.flashcard_stats.cards_known} đã biết / {answeredCount} đã trả lời / {data.flashcard_stats.total_cards} tổng
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#5D7B6F' }}>
              Danh sách thẻ ({data.flashcard_stats.total_cards} thẻ)
            </h2>
            {unansweredCount > 0 && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">⚠️ Lưu ý:</span> Trong session này, bạn đã bỏ qua {unansweredCount} thẻ (không đánh dấu biết/chưa biết). 
                  {data.flashcard_stats.cards_unknown > 0 ? (
                    <> Nhấn <span className="font-bold">"Ôn lại {data.flashcard_stats.cards_unknown} câu chưa biết"</span> để ôn tập các câu đã đánh dấu chưa biết, hoặc </>
                  ) : (
                    <> </>
                  )}
                  nhấn <span className="font-bold">"Làm mới"</span> để bắt đầu lại từ đầu.
                </p>
              </div>
            )}
            <div className="space-y-4">
              {questions.map((q, index) => (
                <FlashcardHistoryCard
                  key={q._id}
                  question={q}
                  index={index}
                />
              ))}
            </div>
          </div>

          <div className="pb-8" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: '#EAE7D6' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: '#5D7B6F' }}
          >
            <ArrowLeft size={16} />
            Lịch sử
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/quiz/${data.quiz_id}`}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#5D7B6F' }}
            >
              Làm lại
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate" style={{ color: '#5D7B6F' }}>
                {quiz_title ?? 'Untitled Quiz'}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <ModeBadge mode={mode} />
                <span className="rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[10px] font-semibold" style={{ color: '#5D7B6F' }}>
                  {data.source_label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {formatDate(completed_at)}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-1 px-4 py-2 rounded-full font-bold text-lg"
              style={{ backgroundColor: '#B0D4B8', color: '#5D7B6F' }}
            >
              <BookOpen size={18} />
              {score} / {total_questions}
            </div>
          </div>

          <div className="text-xs font-semibold" style={{ color: '#5D7B6F' }}>
            Tổng thời gian học của mã quiz này: {data.total_study_minutes} phút
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Score</span>
              <span className="font-semibold" style={{ color: '#5D7B6F' }}>{percentage}%</span>
            </div>
            <Progress
              value={percentage}
              className="h-2.5"
              style={{ '--progress-foreground': '#5D7B6F' } as React.CSSProperties}
            />
          </div>
        </div>


        <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
          <ColorFilterBar selected={colorFilter} onChange={setColorFilter} />
        </div>

        {visibleQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white">
            <p className="text-base font-medium" style={{ color: '#5D7B6F' }}>
              No questions with this highlight color.
            </p>
            <button
              onClick={() => setColorFilter(null)}
              className="mt-3 text-sm underline"
              style={{ color: '#A4C3A2' }}
            >
              Show all questions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleQuestions.map((q) => (
              <QuestionCard
                key={q._id}
                question={q}
                index={questions.indexOf(q)}
                highlights={highlightMap[q._id] ?? []}
              />
            ))}
          </div>
        )}

        <div className="pb-8" />
      </div>
    </main>
  )
}
