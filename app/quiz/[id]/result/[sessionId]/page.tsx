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

import { getQuizSessionResult } from '@/lib/modules/quiz/session-utils'

async function getResult(sessionId: string): Promise<ResultData | null> {
  try {
    const directResult = await getQuizSessionResult(sessionId)
    if (directResult) return directResult as unknown as ResultData
  } catch (err) {
    console.error('Direct getQuizSessionResult error, falling back to fetch:', err)
  }

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
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-8 text-center bg-card rounded-2xl border border-border shadow-xl">
          <h2 className="text-xl font-black text-foreground mb-2">Không tìm thấy kết quả</h2>
          <p className="text-xs font-bold text-muted-foreground mb-6">
            Kết quả làm bài không tồn tại, phiên làm bài đã bị xóa hoặc bạn không có quyền truy cập bài làm này.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-bold border-border">
                Về Dashboard
              </Button>
            </Link>
            <Link href="/history">
              <Button className="w-full h-11 rounded-xl text-xs font-black bg-primary text-primary-foreground">
                Xem Lịch sử
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
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

  const gradeColor = percentage >= 80 ? 'text-success-fg' : percentage >= 50 ? 'text-primary' : 'text-warning-fg'
  const gradeLabel = percentage >= 80 ? 'XUẤT SẮC!' : percentage >= 50 ? 'KHÁ TỐT!' : 'CẦN CỐ GẮNG THÊM!'

  return (
    <div className="w-full max-w-full min-h-[calc(100vh-4rem)] md:h-full flex flex-col gap-3 overflow-hidden px-1.5 sm:px-0">
      {/* Top Header Card Summary Toolbar */}
      <div className="relative overflow-hidden rounded-2xl bg-card backdrop-blur-xl shadow-2xs border border-border p-3.5 sm:px-5 sm:py-3.5 shrink-0 space-y-3">
        {/* Top Summary Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-black ${gradeColor} tracking-tight`}>{scoreOnTenDisplay}</span>
              <span className="text-xs font-black text-muted-foreground">/10</span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="min-w-0">
              <p className="text-xs font-black text-foreground uppercase tracking-wider">{gradeLabel}</p>
              <p className="text-[11px] font-bold text-muted-foreground truncate">
                {score}/{totalQuestions} câu đúng · {percentage}%
              </p>
            </div>
          </div>

          <Badge className="shrink-0 bg-primary text-primary-foreground border-none px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full shadow-2xs">
            {mode === 'immediate' ? 'LUYỆN TẬP' : 'KIỂM TRA'}
          </Badge>
        </div>

        {/* Action Buttons: Full-width stacked on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t sm:border-t-0 border-border">
          {wrongCount > 0 && (
            <RetryWrongButton 
              quizId={quizId} 
              sessionId={sessionId} 
              wrongCount={wrongCount} 
              className="h-10 sm:h-8 w-full sm:w-auto text-xs sm:text-[11px] rounded-2xl sm:rounded-xl"
            />
          )}

          <Link href={`/quiz/${quizId}`} className="w-full sm:w-auto">
            <Button className="h-10 sm:h-8 w-full px-3 rounded-2xl sm:rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-xs sm:text-[11px] uppercase tracking-wider shadow-2xs transition-all active:scale-95 cursor-pointer justify-center">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5 shrink-0" /> Làm lại toàn bộ
            </Button>
          </Link>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="h-10 sm:h-8 w-full px-3 rounded-2xl sm:rounded-xl border-border font-black text-xs sm:text-[11px] uppercase tracking-wider hover:bg-muted transition-all active:scale-95 cursor-pointer justify-center text-muted-foreground bg-muted/30">
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5 shrink-0" /> Dashboard
              </Button>
            </Link>

            <Link href="/history" className="w-full sm:w-auto">
              <Button variant="outline" className="h-10 sm:h-8 w-full px-3 rounded-2xl sm:rounded-xl border-border font-black text-xs sm:text-[11px] uppercase tracking-wider hover:bg-muted transition-all active:scale-95 cursor-pointer justify-center text-muted-foreground bg-muted/30">
                <BookOpen className="mr-1.5 h-3.5 w-3.5 shrink-0" /> Lịch sử
              </Button>
            </Link>
          </div>

          {is_temp && <ExitMixQuizButton sessionId={sessionId} />}
        </div>
      </div>

      {is_temp && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-success-bg border border-success-border text-success-fg rounded-2xl px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 shrink-0 text-success-fg" />
            <p className="text-xs font-black">
              Bài Quiz Trộn này đã được tự động lưu trữ tại <span className="underline">Bộ đề của tôi → Tab Quiz Tự Tạo</span>!
            </p>
          </div>
          <Link href="/my-quizzes" className="shrink-0 w-full sm:w-auto">
            <Button size="sm" className="h-8 w-full sm:w-auto px-3.5 rounded-2xl sm:rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-black text-[10px] uppercase tracking-wider cursor-pointer">
              Xem Bộ đề của tôi
            </Button>
          </Link>
        </div>
      )}

      {/* Main Content Area: Interactive Question Matrix & Detail Viewer */}
      <InteractiveResultViewer questions={questions} />
    </div>
  )
}
