import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, MinusCircle, BookOpen, LayoutDashboard, RotateCcw, Trophy, Target, Clock } from 'lucide-react'
import { Progress } from '@/components/shared/ui/progress'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import ExitMixQuizButton from '@/components/quiz/detail/ExitMixQuizButton'
import { FlashcardReviewButton } from '@/components/quiz/shared/FlashcardReviewButton'
import { ScrollToTopButton } from '@/components/shared/ui/ScrollToTopButton'
import { InteractiveResultViewer } from '@/components/quiz/detail/InteractiveResultViewer'
import { FlashcardResultView } from '@/components/quiz/detail/FlashcardResultView'

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



import { RetryWrongButton } from '@/components/quiz/detail/RetryWrongButton'

function StandardResultView({ quizId, sessionId, data }: { quizId: string; sessionId: string; data: ResultData }) {
  const { score, totalQuestions, mode, questions, completed_at, is_temp } = data
  const wrongCount = totalQuestions > score ? totalQuestions - score : 0
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
    <div className="w-full max-w-full h-full flex flex-col gap-2 overflow-hidden px-2 sm:px-0">
      {/* Top Header Card Summary Toolbar */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-xl shadow-xs border border-white/90 p-2.5 sm:px-4 sm:py-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3.5 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className={`text-xl sm:text-3xl font-extrabold ${gradeColor} tracking-tight`}>{scoreOnTenDisplay}</span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-400">/10</span>
              </div>
              <div className="h-5 sm:h-6 w-px bg-slate-200" />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-extrabold text-[#5D7B6F] uppercase tracking-wider">{gradeLabel}</p>
                <p className="text-[9.5px] sm:text-[11px] font-medium text-gray-500 truncate">
                  {score}/{totalQuestions} câu đúng · {percentage}%
                </p>
              </div>
            </div>

            <Badge className="sm:hidden shrink-0 bg-[#5D7B6F] text-white border-none px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider rounded-full shadow-xs">
              {mode === 'immediate' ? 'Luyện tập' : 'Kiểm tra'}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <Badge className="hidden sm:inline-flex bg-[#5D7B6F] text-white border-none px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-xs">
              {mode === 'immediate' ? 'Luyện tập' : 'Kiểm tra'}
            </Badge>
            {is_temp ? (
              <ExitMixQuizButton sessionId={sessionId} />
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                <RetryWrongButton quizId={quizId} sessionId={sessionId} wrongCount={wrongCount} />
                <Link href={`/quiz/${quizId}`} className="w-full sm:w-auto">
                  <Button className="h-7 sm:h-8 w-full px-1.5 sm:px-3 rounded-lg sm:rounded-xl bg-[#5D7B6F] hover:bg-[#4a6358] text-white font-bold text-[9.5px] sm:text-[11px] uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer justify-center">
                    <RotateCcw className="mr-1 h-3 w-3 shrink-0" /> Làm toàn bộ
                  </Button>
                </Link>
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" className="h-7 sm:h-8 w-full px-1.5 sm:px-3 rounded-lg sm:rounded-xl border-slate-200 font-bold text-[9.5px] sm:text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer justify-center">
                    <LayoutDashboard className="mr-1 h-3 w-3 shrink-0" /> Dashboard
                  </Button>
                </Link>
                <Link href="/history" className="w-full sm:w-auto">
                  <Button variant="outline" className="h-7 sm:h-8 w-full px-1.5 sm:px-3 rounded-lg sm:rounded-xl border-slate-200 font-bold text-[9.5px] sm:text-[11px] uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer justify-center">
                    <BookOpen className="mr-1 h-3 w-3 shrink-0" /> Lịch sử
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Interactive Question Matrix & Detail Viewer */}
      <InteractiveResultViewer questions={questions} />
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
