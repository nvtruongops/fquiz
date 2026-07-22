'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react'
import { FlashcardView, type FlashcardViewRef } from '@/components/quiz/session/FlashcardView'
import { useFlashcardSessionState } from '@/hooks/quiz/useFlashcardSession'

import MobileFlashcardSessionPage from '@/app/quiz/[id]/session/[sessionId]/flashcard/mobile/page'
import { QuizLoadingOverlay, useSessionLoader } from '@/components/quiz/shared/QuizLoader'
import { Button } from '@/components/shared/ui/button'
import { Card } from '@/components/shared/ui/card'
import { Switch } from '@/components/shared/ui/switch'

export default function FlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''

  // Check mobile FIRST before calling any hooks
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  
  // Handle responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Validate params before rendering
  if (!resolvedSessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">URL không hợp lệ</h2>
          <p className="text-muted-foreground mb-6">
            Không tìm thấy session ID trong URL
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Quay về Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // Early return for mobile - prevents desktop hooks from running
  if (isMobile) {
    return <MobileFlashcardSessionPage />
  }

  // Desktop-only code below
  return <DesktopFlashcardSession quizId={resolvedQuizId} sessionId={resolvedSessionId} />
}

function DesktopFlashcardSession({ quizId, sessionId }: { quizId: string; sessionId: string }) {
  const router = useRouter()
  const {
    session,
    question,
    isLoading,
    isPreloading,
    error,
    submitAnswer,
    isSubmitting,
    stats,
    setStats,
    displayIndex,
    setDisplayIndex,
    enableAnimation,
    setEnableAnimation,
    actualIndex,
    handleBack,
    handleForward,
  } = useFlashcardSessionState(sessionId, quizId)

  const sessionLoader = useSessionLoader()
  const sessionLoaderStartedRef = useRef(false)

  // Start loader immediately on mount so animation begins from 0
  useEffect(() => {
    if (!sessionLoaderStartedRef.current) {
      sessionLoaderStartedRef.current = true
      sessionLoader.open('Đang chuẩn bị bộ câu hỏi...')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Advance to 100 when loading completes
  useEffect(() => {
    if (!isLoading && !isPreloading && session) {
      sessionLoader.complete()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isPreloading, session])

  const flashcardRef = useRef<FlashcardViewRef>(null)

  // Lock submissions to prevent multi-hit logic
  const submittedRef = useRef(false)

  // Reset submit lock whenever question index changes
  useEffect(() => {
    submittedRef.current = false
  }, [actualIndex])

  const handleAnswer = useCallback((knows: boolean) => {
    // Prevent double clicking / concurrent key mashing
    if (!session || !question || submittedRef.current) return
    submittedRef.current = true

    submitAnswer(
      { knows, questionIndex: actualIndex },
      {
        onSuccess: (data) => {
          // Update local stats immediately for better UX
          setStats(data.stats)
          // If we were viewing a previous question, jump back to the latest question
          if (displayIndex !== null) {
            setDisplayIndex(null)
          }
        },
        onError: () => {
          // Unlock if failed to allow retry
          submittedRef.current = false
        }
      }
    )
  }, [session, question, submitAnswer, actualIndex, displayIndex, setStats, setDisplayIndex])

  const handleExit = () => {
    sessionLoader.open('Đang lưu tiến trình và thoát Flashcard...')
    sessionLoader.completeAndNavigate(() => {
      router.push(`/dashboard`)
    })
  }

  const handleBackgroundClick = () => {
    if (flashcardRef.current && !isSubmitting) {
      flashcardRef.current.flip()
    }
  }

  // Mouse swipe logic
  const [swipeState, setSwipeState] = useState({ startX: 0, isDragging: false })

  const handleMouseDown = (e: React.MouseEvent) => {
    setSwipeState({ startX: e.clientX, isDragging: true })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!swipeState.isDragging) return
    const diff = e.clientX - swipeState.startX
    if (diff > 100 && actualIndex > 0) {
      handleBack()
    } else if (diff < -100 && actualIndex < (session?.current_question_index ?? 0)) {
      handleForward()
    }
    setSwipeState({ startX: 0, isDragging: false })
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
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isSubmitting, question, handleAnswer])

  // Show loading while fetching initial data
  // Skip loading screen if we already have session data (from cache/prefetch)
  if (isLoading && !session) {
    return (
      <QuizLoadingOverlay
        isOpen={true}
        progress={sessionLoader.progress}
        status={sessionLoader.status || 'Đang chuẩn bị bộ câu hỏi...'}
      />
    )
  }

  // Show error if loading failed
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

  // Show error if data is missing after loading completed
  if (!session || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">Không tìm thấy dữ liệu</h2>
          <p className="text-muted-foreground mb-6">
            Phiên học không tồn tại hoặc đã hết hạn
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Quay về Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div 
      role="none"
      className="h-[100dvh] bg-background py-2 md:py-6 flex flex-col overflow-hidden" 
      onClick={handleBackgroundClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleBackgroundClick()
        }
      }}
    >
      {/* Compact Header Card */}
      <div role="none" className="container mx-auto px-4 mb-2 md:mb-4 flex-none" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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

            {/* Center: Stats & Navigation (6 cols) */}
            <div className="col-span-12 sm:col-span-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" onClick={handleBack} disabled={actualIndex === 0} className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-4 px-4">
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

              <Button variant="outline" size="icon" onClick={handleForward} disabled={actualIndex >= (session?.current_question_index ?? 0)} className="h-8 w-8 rounded-full">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Progress & Exit (3 cols) */}
            <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-3">
              <div className="flex items-center gap-2 mr-2">
                <Sparkles className={`w-4 h-4 ${enableAnimation ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <Switch 
                  checked={enableAnimation} 
                  onCheckedChange={setEnableAnimation} 
                  className="scale-75 data-[state=checked]:bg-amber-500"
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Tiến độ</p>
                <p className="font-semibold text-xs">
                  Câu {actualIndex + 1}/{session.totalQuestions}
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
      <div role="none" className="container mx-auto flex-1 min-h-0 px-2 sm:px-4 pb-2 md:pb-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="w-full h-full">
          <FlashcardView
            ref={flashcardRef}
            question={question}
            questionNumber={actualIndex + 1}
            totalQuestions={session.totalQuestions}
            onAnswer={handleAnswer}
            isLoading={isSubmitting}
            enableAnimation={enableAnimation}
          />
        </div>
      </div>
    </div>
  )
}
