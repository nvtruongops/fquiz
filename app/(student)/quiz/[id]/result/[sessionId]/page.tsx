import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle, MinusCircle, BookOpen, LayoutDashboard, RotateCcw } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ResultQuestion {
  _id: string
  text: string
  options: string[]
  correct_answer: number | number[]  // Support both single and multiple answers
  explanation?: string
  image_url?: string
  submitted_answer: number | number[] | null  // Support both single and multiple answers
  is_correct: boolean
}

interface ResultData {
  sessionId: string
  quizId: string
  mode: 'immediate' | 'review'
  score: number
  totalQuestions: number
  completed_at: string
  user_answers: Array<{ question_index: number; answer_index: number; is_correct: boolean }>
  questions: ResultQuestion[]
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

  const { score, totalQuestions, mode, questions, completed_at } = data
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const scoreOnTen = totalQuestions > 0 ? (score / totalQuestions) * 10 : 0
  const scoreOnTenDisplay = Number.isInteger(scoreOnTen) ? scoreOnTen.toFixed(0) : scoreOnTen.toFixed(1)
  const completedDate = new Date(completed_at).toLocaleString()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EAE7D6' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Score Summary Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#5D7B6F' }}>Quiz Results</h1>
              <p className="text-sm text-gray-500 mt-0.5">{completedDate}</p>
            </div>
            <Badge
              className="text-sm px-3 py-1 capitalize"
              style={{ backgroundColor: '#5D7B6F', color: '#fff', border: 'none' }}
            >
              {mode === 'immediate' ? 'Immediate Mode' : 'Review Mode'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-700">
                Score: <span style={{ color: '#5D7B6F' }}>{scoreOnTenDisplay}</span>/10{' '}
                <span className="ml-2 text-sm text-gray-500">({score}/{totalQuestions} câu đúng)</span>
              </span>
              <span className="text-lg font-bold" style={{ color: '#5D7B6F' }}>{percentage}%</span>
            </div>
            <Progress
              value={percentage}
              className="h-3"
              style={{ '--progress-foreground': '#5D7B6F' } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            // Normalize to arrays for consistent handling
            const correctAnswers = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]
            const submittedAnswers = q.submitted_answer === null || q.submitted_answer === undefined 
              ? [] 
              : Array.isArray(q.submitted_answer) 
                ? q.submitted_answer 
                : [q.submitted_answer]
            const notAnswered = submittedAnswers.length === 0

            return (
              <div
                key={q._id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4"
              >
                {/* Question header */}
                <div className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white mt-0.5"
                    style={{ backgroundColor: '#5D7B6F' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notAnswered ? (
                        <MinusCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : q.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-gray-500">
                        {notAnswered ? 'Not answered' : q.is_correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium leading-snug" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{q.text}</p>
                  </div>
                </div>

                {/* Question image */}
                {q.image_url && (
                  <div className="flex min-h-[180px] max-h-[360px] w-full items-center justify-center overflow-hidden rounded-lg bg-[#fafafa] border border-gray-100">
                    <img
                      src={q.image_url}
                      alt={`Question ${idx + 1} illustration`}
                      className="h-full max-h-[360px] w-full object-contain"
                    />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2 pl-10">
                  {q.options.map((option, optIdx) => {
                    const isCorrect = correctAnswers.includes(optIdx)
                    const isSubmitted = submittedAnswers.includes(optIdx)
                    const isWrongSubmission = isSubmitted && !isCorrect

                    let bgStyle = 'bg-gray-50 border-gray-200'
                    let textStyle = 'text-gray-700'

                    if (isCorrect) {
                      bgStyle = 'border-[#A4C3A2] bg-[#A4C3A2]/25'
                      textStyle = 'text-green-800 font-medium'
                    } else if (isWrongSubmission) {
                      bgStyle = 'border-red-300 bg-red-50'
                      textStyle = 'text-red-700'
                    }

                    const showBadge = isCorrect || isWrongSubmission || (isSubmitted && isCorrect)

                    return (
                      <div
                        key={optIdx}
                        className={`px-4 py-2.5 rounded-lg border ${bgStyle}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5"
                            style={{
                              borderColor: isCorrect ? '#A4C3A2' : isWrongSubmission ? '#f87171' : '#9ca3af',
                              color: isCorrect ? '#166534' : isWrongSubmission ? '#b91c1c' : '#6b7280',
                            }}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className={`text-sm ${textStyle} flex-1`}>{option}</span>
                        </div>
                        {showBadge && (
                          <div className="mt-1.5 pl-8 flex items-center gap-2 flex-wrap">
                            {isCorrect && (
                              <span className="text-xs font-semibold text-green-700">✓ Correct</span>
                            )}
                            {isWrongSubmission && (
                              <span className="text-xs font-semibold text-red-600">Your answer</span>
                            )}
                            {isSubmitted && isCorrect && (
                              <span className="text-xs font-semibold text-green-700">Your answer ✓</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Not answered notice */}
                {notAnswered && (
                  <div className="pl-10">
                    <p className="text-sm text-gray-400 italic">You did not answer this question.</p>
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div
                    className="ml-10 p-3 rounded-lg border text-sm text-gray-600 whitespace-pre-wrap"
                    style={{ backgroundColor: '#D7F9FA33', borderColor: '#D7F9FA' }}
                  >
                    <span className="font-semibold text-gray-700">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-wrap gap-3 justify-between pt-2 pb-8">
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="flex items-center gap-2 border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/10"
              >
                <LayoutDashboard className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>

            <Link href={`/quiz/${quizId}`}>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-[#5D7B6F] text-[#5D7B6F] hover:bg-[#5D7B6F]/10"
              >
                <RotateCcw className="w-4 h-4" />
                Làm lại
              </Button>
            </Link>
          </div>

          <Link href="/history">
            <Button
              className="flex items-center gap-2 text-white"
              style={{ backgroundColor: '#5D7B6F' }}
            >
              <BookOpen className="w-4 h-4" />
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
