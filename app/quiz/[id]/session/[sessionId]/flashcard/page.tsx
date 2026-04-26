'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { FlashcardView, type FlashcardViewRef } from '@/components/quiz/FlashcardView'
import { useFlashcardSession } from '@/hooks/useFlashcardSession'
import MobileFlashcardSessionPage from './mobile/page'
import { QuizLoadingOverlay } from '@/components/quiz/QuizLoader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function FlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const router = useRouter()
  
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''

  const { session, question, isLoading, isPreloading, error, submitAnswer, isSubmitting } = 
    useFlashcardSession(resolvedSessionId)

  const [isMobile, setIsMobile] = useState(false)
  const [stats, setStats] = useState({ known: 0, unknown: 0, total: 0 })
  const flashcardRef = useRef<FlashcardViewRef>(null)
  
  // Handle responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Lock submissions to prevent multi-hit logic
  const submittedRef = useRef(false)

  // Update stats from session
  useEffect(() => {
    if (session?.flashcard_stats) {
      setStats({
        known: session.flashcard_stats.cards_known,
        unknown: session.flashcard_stats.cards_unknown,
        total: session.flashcard_stats.total_cards,
      })
    }
  }, [session])

  // Redirect to result page when completed
  useEffect(() => {
    if (session?.status === 'completed') {
      router.push(`/quiz/${resolvedQuizId}/result/${resolvedSessionId}`)
    }
  }, [session?.status, resolvedQuizId, resolvedSessionId, router])

  // Reset submit lock whenever question index changes
  useEffect(() => {
    submittedRef.current = false
  }, [session?.current_question_index])

  const handleAnswer = useCallback((knows: boolean) => {
    // Prevent double clicking / concurrent key mashing
    if (!session || !question || submittedRef.current) return
    submittedRef.current = true

    submitAnswer(
      { knows, questionIndex: session.current_question_index },
      {
        onSuccess: (data) => {
          // Update local stats immediately for better UX
          setStats(data.stats)
        },
        onError: () => {
          // Unlock if failed to allow retry
          submittedRef.current = false
        }
      }
    )
  }, [session, question, submitAnswer])

  const handleExit = () => {
    router.push(`/dashboard`)
  }

  const handleBackgroundClick = () => {
    if (flashcardRef.current && !isSubmitting) {
      flashcardRef.current.flip()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isSubmitting || !question) {
        return
      }

      // Space = flip
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault() // Prevent page scroll
        if (flashcardRef.current) {
          flashcardRef.current.flip()
        }
        return
      }
      // 1 = doesn't know
      if (e.key === '1') {
        handleAnswer(false)
        return
      }
      // 2 = knows
      if (e.key === '2') {
        handleAnswer(true)
        return
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isSubmitting, question, handleAnswer])

  if (isMobile) {
    return <MobileFlashcardSessionPage />
  }

  if (isLoading || isPreloading) {
    return (
      <QuizLoadingOverlay 
        isOpen={true} 
        progress={isPreloading ? 45 : 99} 
        status={isPreloading ? "Đang chuẩn bị bộ câu hỏi..." : "Đồng bộ phiên học..."} 
      />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">Có lỗi xảy ra</h2>
          <p className="text-muted-foreground mb-6">
            {error.message || 'Không thể tải session'}
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Quay về Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  if (!session || !question) {
    return (
      <QuizLoadingOverlay 
        isOpen={true} 
        progress={99} 
        status="Đang tải câu hỏi..." 
      />
    )
  }

  return (
    <div className="h-[100dvh] bg-background py-2 md:py-6 flex flex-col overflow-hidden" onClick={handleBackgroundClick}>
      {/* Compact Header Card */}
      <div className="container mx-auto px-4 mb-2 md:mb-4 flex-none" onClick={(e) => e.stopPropagation()}>
        <Card className="p-3">
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Left: Quiz Info (3 cols) */}
            <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Thông tin</p>
                <p className="font-medium text-xs truncate">{session.categoryName}</p>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground">Mã quiz</p>
                <p className="font-semibold text-xs">{session.courseCode}</p>
              </div>
            </div>

            {/* Center: Stats (6 cols) */}
            <div className="col-span-12 sm:col-span-6 flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">Tổng</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{stats.known}</p>
                <p className="text-[10px] text-muted-foreground">Biết</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">{stats.unknown}</p>
                <p className="text-[10px] text-muted-foreground">Chưa biết</p>
              </div>
            </div>

            {/* Right: Progress & Exit (3 cols) */}
            <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-3">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Tiến độ</p>
                <p className="font-semibold text-xs">
                  Câu {session.current_question_index + 1}/{session.totalQuestions}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExit} className="h-8 text-xs px-3">
                Thoát
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Flashcard */}
      <div className="container mx-auto flex-1 min-h-0 px-2 sm:px-4 pb-2 md:pb-0" onClick={(e) => e.stopPropagation()}>
        <div className="w-full h-full">
          <FlashcardView
            ref={flashcardRef}
            question={question}
            questionNumber={session.current_question_index + 1}
            totalQuestions={session.totalQuestions}
            onAnswer={handleAnswer}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    </div>
  )
}
