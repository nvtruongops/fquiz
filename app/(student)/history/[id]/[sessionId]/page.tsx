'use client'

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
  Shuffle,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { FlashcardReviewButton } from '@/components/quiz/FlashcardReviewButton'
import { useState } from 'react'

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
  source_type: 'self_created' | 'saved_explore' | 'explore_public' | 'mix_quiz'
  source_label: string
  is_mix?: boolean
  status?: 'active' | 'completed'
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

async function fetchHistoryDetail(id: string, sessionId: string): Promise<HistoryDetail> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/history/${id}?sessionId=${sessionId}`)
  if (!res.ok) throw new Error('Failed to fetch history detail')
  return res.json()
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

function FlashcardHistoryCard({
  question,
  index,
}: {
  question: HistoryQuestion
  index: number
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const { text, options, correct_answer, explanation, image_url, is_correct, submitted_answer } = question
  const wasAnswered = submitted_answer !== null && submitted_answer !== undefined
  
  return (
    <div className="relative">
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {!isFlipped ? (
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
          <div className="p-6 space-y-4 min-h-[200px]">
            <div className="flex items-center justify-between mb-4">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: '#5D7B6F' }}
              >
                {index + 1}
              </span>
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
}: {
  question: HistoryQuestion
  index: number
}) {
  const { submitted_answer, correct_answer, is_correct, options, text, explanation, image_url } = question
  const notAnswered = submitted_answer === null || submitted_answer === undefined

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
              {notAnswered ? 'Chưa trả lời' : is_correct ? 'Đúng' : 'Sai'}
            </span>
          </div>
          <p className="text-gray-800 font-medium leading-snug" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{text}</p>
        </div>
      </div>

      {image_url && (
        <div className="flex min-h-[180px] max-h-[360px] w-full items-center justify-center overflow-hidden rounded-lg bg-[#fafafa] border border-gray-100">
          <img
            src={image_url}
            alt={`Question ${index + 1}`}
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
                      ✓ Đáp án đúng
                    </span>
                  )}
                  {isWrongSubmission && (
                    <span className="text-xs font-semibold text-red-600">
                      Đáp án của bạn
                    </span>
                  )}
                  {isSubmitted && is_correct && (
                    <span className="text-xs font-semibold text-green-700">
                      Đáp án của bạn ✓
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
          <p className="text-sm text-gray-400 italic">Bạn đã bỏ qua câu hỏi này.</p>
        </div>
      )}

      {explanation && (
        <div
          className="ml-10 p-3 rounded-lg border text-sm text-gray-600 whitespace-pre-wrap"
          style={{ backgroundColor: '#D7F9FA33', borderColor: '#D7F9FA' }}
        >
          <span className="font-semibold text-gray-700">Giải thích: </span>
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

  const {
    data,
    isLoading,
    isError,
  } = useQuery<HistoryDetail>({
    queryKey: ['history', id, sessionId],
    queryFn: () => fetchHistoryDetail(id, sessionId),
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    enabled: !!id && !!sessionId,
  })

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
            Quay lại
          </Link>
          <div
            className="rounded-xl p-6 text-sm"
            style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
          >
            Không thể tải dữ liệu phòng thi. Vui lòng thử lại.
          </div>
        </div>
      </main>
    )
  }

  const { quiz_title, mode, score, total_questions, completed_at, questions } = data
  const percentage = total_questions > 0 ? Math.round((score / total_questions) * 100) : 0

  if (mode === 'flashcard' && data.flashcard_stats) {
    const answeredCount = data.flashcard_stats.cards_known + data.flashcard_stats.cards_unknown
    const unansweredCount = data.flashcard_stats.total_cards - answeredCount
    const hasActiveSession = data.has_active_session && data.active_session_id
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
              {canContinue ? (
                <Link
                  href={`/quiz/${data.quiz_id}/session/${data.active_session_id}/flashcard`}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: '#5D7B6F' }}
                >
                  Tiếp tục ({data.active_answered_count}/{data.active_total_count})
                </Link>
              ) : (
                <>
                  {data.flashcard_stats.cards_unknown > 0 && (
                    <FlashcardReviewButton
                      sessionId={sessionId}
                      quizId={data.quiz_id}
                      unknownCount={data.flashcard_stats.cards_unknown}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quiz/${data.quiz_id}`}
                      className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
                      style={{ backgroundColor: '#5D7B6F' }}
                    >
                      Làm lại
                    </Link>
                    {data.is_mix && (
                      <Link
                        href={`/explore?tab=mix&mix_from=${data.quiz_id}`}
                        className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-[#5D7B6F] border border-[#5D7B6F] transition-colors hover:bg-[#5D7B6F] hover:text-white whitespace-nowrap"
                      >
                        Làm mới
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {canContinue && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  <span className="font-bold">Lưu ý:</span> Bạn có một session flashcard khác đang làm dở ở câu {data.active_answered_count}/{data.active_total_count}. 
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

            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tỷ lệ biết</span>
                <span className="font-semibold" style={{ color: '#5D7B6F' }}>
                  {answeredCount > 0 ? Math.round((data.flashcard_stats.cards_known / answeredCount) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={answeredCount > 0 ? Math.round((data.flashcard_stats.cards_known / answeredCount) * 100) : 0}
                className="h-2.5"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#5D7B6F' }}>
              Danh sách thẻ ({data.flashcard_stats.total_cards} thẻ)
            </h2>
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
            {data.is_mix ? (
              data.status === 'active' ? (
                <Link
                  href={`/quiz/${data.quiz_id}/session/${data._id}`}
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#5D7B6F' }}
                >
                  Tiếp tục làm
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/quiz/${data.quiz_id}`}
                    className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#5D7B6F' }}
                  >
                    Làm lại
                  </Link>
                  {data.is_mix && (
                    <Link
                      href={`/explore?tab=mix&mix_from=${data.quiz_id}`}
                      className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-[#5D7B6F] border border-[#5D7B6F] transition-colors hover:bg-[#5D7B6F] hover:text-white"
                    >
                      Làm mới
                    </Link>
                  )}
                </div>
              )
            ) : (
              <Link
                href={`/quiz/${data.quiz_id}`}
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5D7B6F' }}
              >
                Làm lại
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {data.is_mix && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-[#5D7B6F]/10 text-[#5D7B6F]">
                    <Shuffle className="w-3 h-3" />
                    Quiz Trộn
                  </span>
                )}
                <h1 className="text-xl font-bold truncate" style={{ color: '#5D7B6F' }}>
                  {data.is_mix
                    ? (quiz_title.startsWith('Quiz Trộn · ') ? quiz_title.slice('Quiz Trộn · '.length) : quiz_title)
                    : (quiz_title ?? 'Untitled Quiz')}
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <ModeBadge mode={mode} />
                <span className="rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[10px] font-semibold" style={{ color: '#5D7B6F' }}>
                  {data.source_label}
                </span>
                {data.status === 'active' && (
                  <span className="rounded-full bg-orange-100 text-orange-600 px-2 py-0.5 text-[10px] font-black uppercase">
                    Đang làm · {data.active_answered_count}/{data.active_total_count} câu
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {data.status === 'active' && data.started_at
                    ? formatDate(data.started_at)
                    : formatDate(completed_at)}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-1 px-4 py-2 rounded-full font-bold text-lg"
              style={{ backgroundColor: '#B0D4B8', color: '#5D7B6F' }}
            >
              <BookOpen size={18} />
              {data.status === 'active'
                ? `${data.active_answered_count ?? 0} / ${total_questions}`
                : `${score} / ${total_questions}`}
            </div>
          </div>

          <div className="text-xs font-semibold" style={{ color: '#5D7B6F' }}>
            Tổng thời gian học của mã quiz này: {data.total_study_minutes} phút
          </div>

          {data.status !== 'active' && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Điểm số</span>
                <span className="font-semibold" style={{ color: '#5D7B6F' }}>{percentage}%</span>
              </div>
              <Progress
                value={percentage}
                className="h-2.5"
              />
            </div>
          )}
        </div>

        {data.status === 'active' ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center space-y-3">
            <p className="text-sm font-bold text-gray-500">
              Phiên làm bài đang tiến hành — câu hỏi sẽ hiển thị sau khi hoàn thành.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <QuestionCard
                key={q._id}
                question={q}
                index={index}
              />
            ))}
          </div>
        )}

        <div className="pb-8" />
      </div>
    </main>
  )
}
