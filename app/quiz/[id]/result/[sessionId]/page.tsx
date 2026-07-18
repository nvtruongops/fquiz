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

  if (data.mode === 'flashcard' && data.flashcard_stats) {
    return <FlashcardResultView quizId={quizId} sessionId={sessionId} data={data} />
  }

  return <StandardResultView quizId={quizId} sessionId={sessionId} data={data} />
}

function FlashcardResultView({ quizId, sessionId, data }: { quizId: string; sessionId: string; data: ResultData }) {
  const { flashcard_stats, completed_at, is_temp } = data
  if (!flashcard_stats) return null
  const percentage = Math.round((flashcard_stats.cards_known / flashcard_stats.total_cards) * 100)
  const completedDate = new Date(completed_at).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-10 px-4">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="relative overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.05)] border border-white/90">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-bl-full blur-2xl" />
          <div className="relative p-8 md:p-10 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-black text-purple-600 uppercase tracking-[0.2em]">Flashcard Results</p>
                <p className="text-xs font-bold text-gray-400 mt-1">{completedDate}</p>
              </div>
              <Badge className="bg-purple-600 text-white border-none px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full shadow-md shadow-purple-500/20">
                Flashcard Mode
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-3xl font-black text-slate-800">{flashcard_stats.total_cards}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-black uppercase tracking-wider">Tổng thẻ</p>
              </div>
              <div className="text-center p-5 bg-emerald-50/80 rounded-2xl border border-emerald-100">
                <p className="text-3xl font-black text-emerald-600">{flashcard_stats.cards_known}</p>
                <p className="text-[10px] text-emerald-600/80 mt-1 font-black uppercase tracking-wider">Đã nhớ</p>
              </div>
              <div className="text-center p-5 bg-red-50/80 rounded-2xl border border-red-100">
                <p className="text-3xl font-black text-red-500">{flashcard_stats.cards_unknown}</p>
                <p className="text-[10px] text-red-500/80 mt-1 font-black uppercase tracking-wider">Cần ôn lại</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-500 uppercase tracking-wider font-black">Tỷ lệ nhớ bài</span>
                <span className="text-purple-600 font-black text-lg">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-3.5 rounded-full bg-purple-100" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {is_temp ? (
            <ExitMixQuizButton sessionId={sessionId} />
          ) : (
            <>
              <Link href={`/quiz/${quizId}/session/${sessionId}/flashcard`} className="flex-1">
                <Button className="w-full h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-purple-600/20 active:scale-[0.98] transition-all">
                  <RotateCcw className="mr-2 h-4 w-4" /> Luyện tập lại
                </Button>
              </Link>
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-black uppercase tracking-wider text-xs hover:bg-slate-50 active:scale-[0.98] transition-all">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StandardResultView({ quizId, sessionId, data }: { quizId: string; sessionId: string; data: ResultData }) {
  const { score, totalQuestions, mode, questions, completed_at, is_temp } = data
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const scoreOnTen = totalQuestions > 0 ? (score / totalQuestions) * 10 : 0
  const scoreOnTenDisplay = scoreOnTen % 1 === 0 ? scoreOnTen.toFixed(0) : scoreOnTen.toFixed(1)
  const completedDate = new Date(completed_at).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const gradeColor = percentage >= 80 ? 'text-[#5D7B6F]' : percentage >= 50 ? 'text-blue-600' : 'text-orange-500'
  const gradeLabel = percentage >= 80 ? 'Xuất sắc!' : percentage >= 50 ? 'Khá tốt!' : 'Cần cố gắng thêm!'

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-10 px-4">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.05)] border border-white/90">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#5D7B6F]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative p-8 md:p-10 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-black text-[#5D7B6F] uppercase tracking-[0.2em]">{gradeLabel}</p>
                <p className="text-xs font-bold text-gray-400 mt-1">{completedDate}</p>
              </div>
              <Badge className="bg-[#5D7B6F] text-white border-none px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full shadow-md shadow-[#5D7B6F]/20">
                {mode === 'immediate' ? 'Luyện tập' : 'Kiểm tra'}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-6xl font-black ${gradeColor} tracking-tight`}>{scoreOnTenDisplay}</span>
                  <span className="text-2xl font-black text-gray-400">/10</span>
                </div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mt-2">
                  {score}/{totalQuestions} câu đúng · Tỷ lệ: {percentage}%
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Progress
                value={percentage}
                className="h-3.5 rounded-full bg-slate-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 text-xs font-black text-amber-700">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                <span>{score} đúng</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50/80 border border-red-100 text-xs font-black text-red-600">
                <Target className="h-5 w-5 text-red-400 shrink-0" />
                <span>{totalQuestions - score} sai</span>
              </div>
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 text-xs font-black text-blue-600">
                <Clock className="h-5 w-5 text-blue-400 shrink-0" />
                <span>{totalQuestions} câu</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#5D7B6F]" />
            Chi tiết câu trả lời
          </h2>

          {questions.map((q, idx) => (
            <ResultQuestionItem key={q._id} question={q} index={idx} />
          ))}
        </div>

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

function ResultQuestionItem({ question: q, index: idx }: { question: any; index: number }) {
  const correctAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]
  const submittedAnswers = q.submitted_answer === null || q.submitted_answer === undefined
    ? []
    : Array.isArray(q.submitted_answer)
      ? q.submitted_answer
      : [q.submitted_answer]
  const notAnswered = submittedAnswers.length === 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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

      {q.image_url && (
        <div className="mb-4 flex justify-center rounded-xl bg-gray-50 p-2">
          <img
            src={
              /^(https?:\/\/|\/|data:image\/)/i.test(q.image_url) && !/javascript:/i.test(q.image_url)
                ? q.image_url
                : ''
            }
            alt="Question"
            className="max-h-64 object-contain rounded-lg"
          />
        </div>
      )}

      <div className="space-y-2 ml-11">
        {q.options.map((option: string, optIdx: number) => {
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
                {String.fromCodePoint(65 + optIdx)}
              </span>
              <span className={`text-sm ${textColor} flex-1 font-medium`}>{option}</span>
              {indicator}
            </div>
          )
        })}
      </div>

      {q.explanation && (
        <div className="mt-4 ml-11 p-4 rounded-xl bg-sky-50/50 border border-sky-100">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">Giải thích</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
        </div>
      )}
    </div>
  )
}
