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
  mode: 'immediate' | 'review'
  score: number
  total_questions: number
  completed_at: string
  started_at: string
  total_study_minutes: number
  attempts: Array<{
    session_id: string
    score: number
    mode: 'immediate' | 'review'
    completed_at: string
    started_at: string
  }>
  questions: HistoryQuestion[]
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

function ModeBadge({ mode }: { mode: 'immediate' | 'review' }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{
        backgroundColor: mode === 'immediate' ? '#D7F9FA' : '#EAE7D6',
        color: '#5D7B6F',
      }}
    >
      {mode === 'immediate' ? 'Immediate' : 'Review'}
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
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
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
          <p className="text-gray-800 font-medium leading-snug">{text}</p>
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

          return (
            <div
              key={`${question._id}-${optIdx}`}
              className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border ${bgClass}`}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5"
                style={{
                  borderColor: isCorrectOpt ? '#A4C3A2' : isWrongSubmission ? '#f87171' : '#9ca3af',
                  color: isCorrectOpt ? '#166534' : isWrongSubmission ? '#b91c1c' : '#6b7280',
                }}
              >
                {String.fromCodePoint(65 + optIdx)}
              </span>
              <span className={`text-sm ${textClass}`}>{option}</span>
              {isCorrectOpt && (
                <span className="ml-auto text-xs font-semibold text-green-700 flex-shrink-0">
                  ✓ Correct
                </span>
              )}
              {isWrongSubmission && (
                <span className="ml-auto text-xs font-semibold text-red-600 flex-shrink-0">
                  Your answer
                </span>
              )}
              {isSubmitted && is_correct && (
                <span className="ml-auto text-xs font-semibold text-green-700 flex-shrink-0">
                  Your answer ✓
                </span>
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
          className="ml-10 p-3 rounded-lg border text-sm text-gray-600"
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
            href={`/history/${id}`}
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

  return (
    <main className="min-h-screen p-6 sm:p-10" style={{ backgroundColor: '#EAE7D6' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/history/${id}`}
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: '#5D7B6F' }}
          >
            <ArrowLeft size={16} />
            Back to Attempts
          </Link>

          <Link
            href={`/quiz/${data.quiz_id}`}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#5D7B6F' }}
          >
            Làm lại
          </Link>
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

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <p className="text-sm font-semibold" style={{ color: '#5D7B6F' }}>Các lần làm trước đó</p>
          <div className="space-y-2">
            {data.attempts.map((attempt) => (
              <Link
                key={attempt.session_id}
                href={`/history/${id}/${attempt.session_id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                style={{
                  borderColor: sessionId === attempt.session_id ? '#5D7B6F' : undefined,
                  backgroundColor: sessionId === attempt.session_id ? '#B0D4B833' : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  <ModeBadge mode={attempt.mode} />
                  <span className="text-xs text-gray-500">{formatDate(attempt.completed_at)}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#5D7B6F' }}>
                  {attempt.score}/{total_questions}
                </span>
              </Link>
            ))}
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
