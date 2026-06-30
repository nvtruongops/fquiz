import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, MinusCircle, BookOpen, LayoutDashboard, RotateCcw, Trophy, Target, Clock } from 'lucide-react'
import { Progress } from '@/components/shared/ui/progress'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import ExitMixQuizButton from '@/components/quiz/detail/ExitMixQuizButton'
import { FlashcardReviewButton } from '@/components/quiz/shared/FlashcardReviewButton'

interface ResultQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]
  explanation?: string
  image_url?: string
  submitted_answer: number | number[] | null
  is_correct: boolean
}

interface ResultData {
  sessionId: string
  quizId: string
  mode: 'immediate' | 'review' | 'flashcard'
  score: number
  totalQuestions: number
  completed_at: string
  user_answers: Array<{ question_index: number; answer_index: number; is_correct: boolean }>
  questions: ResultQuestion[]
  is_temp?: boolean
  flashcard_stats?: {
    total_cards: number
    cards_known: number
    cards_unknown: number
    time_spent_ms: number
    current_round: number
  }
}

async function getResult(sessionId: string): Promise<ResultData | null> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const res = await fetch(`${protocol}://${host}/api/sessions/${sessionId}/result`, {
    cache: 'no-store',
    headers: { cookie: headersList.get('cookie') ?? '' },
  })
  if (!res.ok) return null
  return res.json()
}

interface QuizResultPageProps {
  params: Promise<{ id: string; sessionId: string }>
}

export default async function QuizResultPage({ params }: Readonly<QuizResultPageProps>) {
  const { id: quizId, sessionId } = await params
  const data = await getResult(sessionId)

  if (!data) {
    redirect(`/quiz/${quizId}/session/${sessionId}`)
  }

  const { score, totalQuestions, mode, questions, completed_at, is_temp, flashcard_stats } = data
  const percentage = mode === 'flashcard' && flashcard_stats
    ? Math.round((flashcard_stats.cards_known / flashcard_stats.total_cards) * 100)
    : totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const scoreOnTen = totalQuestions > 0 ? (score / totalQuestions) * 10 : 0
  const scoreOnTenDisplay = scoreOnTen % 1 === 0 ? scoreOnTen.toFixed(0) : scoreOnTen.toFixed(1)
  const completedDate = new Date(completed_at).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Flashcard mode
  if (mode === 'flashcard' && flashcard_stats) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EAE7D6] to-white">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
          {/* Hero Score Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-purple-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full opacity-50" />
            <div className="relative p-8">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <p className="text-sm font-medium text-purple-500 uppercase tracking-wider">Flashcard Results</p>
                  <p className="text-xs text-gray-400 mt-1">{completedDate}</p>
                </div>
                <Badge className="bg-purple-500 hover:bg-purple-500 text-white border-none px-3 py-1 text-xs font-semibold">
                  Flashcard
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-800">{flashcard_stats.total_cards}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Tổng thẻ</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600">{flashcard_stats.cards_known}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Đã biết</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-2xl font-bold text-red-500">{flashcard_stats.cards_unknown}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Chưa biết</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Tỷ lệ ghi nhớ</span>
                  <span className="text-2xl font-bold text-purple-600">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-2.5 rounded-full" style={{ '--progress-foreground': '#9333ea' } as React.CSSProperties} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid gap-3 sm:grid-cols-2">
            {flashcard_stats.cards_unknown > 0 && (
              <div className="sm:col-span-2">
                <FlashcardReviewButton sessionId={sessionId} quizId={quizId} unknownCount={flashcard_stats.cards_unknown} />
              </div>
            )}
            <Link href={`/quiz/${quizId}`}>
              <Button className="w-full h-12 rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-semibold">
                <RotateCcw className="mr-2 h-4 w-4" /> Học lại toàn bộ
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full h-12 rounded-xl font-semibold">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>

          {is_temp && <ExitMixQuizButton sessionId={sessionId} />}
        </div>
      </div>
    )
  }

  // Regular quiz mode
  const gradeEmoji = percentage >= 90 ? '🏆' : percentage >= 70 ? '🎯' : percentage >= 50 ? '📚' : '💪'
  const gradeColor = percentage >= 90 ? 'text-amber-500' : percentage >= 70 ? 'text-emerald-500' : percentage >= 50 ? 'text-blue-500' : 'text-gray-500'
  const gradeBg = percentage >= 90 ? 'from-amber-50 to-yellow-50' : percentage >= 70 ? 'from-emerald-50 to-green-50' : percentage >= 50 ? 'from-blue-50 to-sky-50' : 'from-gray-50 to-slate-50'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAE7D6] to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Hero Score Card */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradeBg} shadow-sm border border-gray-100`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/30 rounded-bl-full" />
          <div className="relative p-8">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Kết quả bài làm</p>
                <p className="text-xs text-gray-400 mt-1">{completedDate}</p>
              </div>
              <Badge className="bg-[#5D7B6F] hover:bg-[#5D7B6F] text-white border-none px-3 py-1 text-xs font-semibold capitalize">
                {mode === 'immediate' ? 'Chấm ngay' : 'Ôn tập'}
              </Badge>
            </div>

            {/* Big Score */}
            <div className="flex items-end gap-4 mb-6">
              <span className="text-6xl">{gradeEmoji}</span>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-black ${gradeColor}`}>{scoreOnTenDisplay}</span>
                  <span className="text-2xl font-bold text-gray-400">/10</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {score}/{totalQuestions} câu đúng · {percentage}%
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <Progress
                value={percentage}
                className="h-2.5 rounded-full bg-white/60"
                style={{ '--progress-foreground': percentage >= 70 ? '#5D7B6F' : percentage >= 50 ? '#3b82f6' : '#6b7280' } as React.CSSProperties}
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-gray-600">{score} <span className="text-gray-400">đúng</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-red-400" />
                <span className="text-gray-600">{totalQuestions - score} <span className="text-gray-400">sai</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-gray-600">{totalQuestions} <span className="text-gray-400">câu</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#5D7B6F]" />
            Chi tiết từng câu
          </h2>

          {questions.map((q, idx) => {
            const correctAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]
            const submittedAnswers = q.submitted_answer === null || q.submitted_answer === undefined
              ? []
              : Array.isArray(q.submitted_answer)
                ? q.submitted_answer
                : [q.submitted_answer]
            const notAnswered = submittedAnswers.length === 0

            return (
              <div key={q._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                    notAnswered ? 'bg-gray-300' : q.is_correct ? 'bg-emerald-500' : 'bg-red-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {notAnswered ? (
                        <Badge className="bg-gray-100 text-gray-500 border-none text-xs font-medium">Chưa trả lời</Badge>
                      ) : q.is_correct ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-none text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3 mr-1 inline" />Đúng
                        </Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-600 border-none text-xs font-medium">
                          <XCircle className="h-3 w-3 mr-1 inline" />Sai
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-800 font-medium leading-relaxed">{q.text}</p>
                  </div>
                </div>

                {/* Image */}
                {q.image_url && (
                  <div className="mb-4 flex justify-center rounded-xl bg-gray-50 p-2">
                    <img src={q.image_url} alt="Question" className="max-h-64 object-contain rounded-lg" />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2 ml-11">
                  {q.options.map((option, optIdx) => {
                    const isCorrectAnswer = correctAnswers.includes(optIdx)
                    const isSubmittedAnswer = submittedAnswers.includes(optIdx)

                    let borderColor = 'border-gray-100'
                    let bgColor = 'bg-gray-50'
                    let textColor = 'text-gray-600'
                    let indicator = null

                    if (isCorrectAnswer && isSubmittedAnswer) {
                      borderColor = 'border-emerald-300'
                      bgColor = 'bg-emerald-50'
                      textColor = 'text-emerald-800'
                      indicator = <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    } else if (isCorrectAnswer) {
                      borderColor = 'border-emerald-200'
                      bgColor = 'bg-emerald-50/50'
                      textColor = 'text-emerald-700'
                      indicator = <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    } else if (isSubmittedAnswer && !isCorrectAnswer) {
                      borderColor = 'border-red-300'
                      bgColor = 'bg-red-50'
                      textColor = 'text-red-700'
                      indicator = <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    }

                    return (
                      <div key={optIdx} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borderColor} ${bgColor} transition-colors`}>
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold ${
                          isCorrectAnswer ? 'border-emerald-300 bg-white text-emerald-600' :
                          isSubmittedAnswer ? 'border-red-300 bg-white text-red-500' :
                          'border-gray-200 bg-white text-gray-400'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className={`text-sm ${textColor} flex-1 font-medium`}>{option}</span>
                        {indicator}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-4 ml-11 p-4 rounded-xl bg-sky-50/50 border border-sky-100">
                    <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">Giải thích</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-8">
          <div className="flex flex-wrap gap-3 flex-1">
            {is_temp ? (
              <ExitMixQuizButton sessionId={sessionId} />
            ) : (
              <>
                <Link href={`/quiz/${quizId}`}>
                  <Button className="h-11 rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-semibold">
                    <RotateCcw className="mr-2 h-4 w-4" /> Làm lại
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" className="h-11 rounded-xl font-semibold">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>
          {!is_temp && (
            <Link href="/history">
              <Button variant="outline" className="h-11 rounded-xl font-semibold w-full sm:w-auto">
                <BookOpen className="mr-2 h-4 w-4" /> Lịch sử
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
