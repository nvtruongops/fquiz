'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lightbulb, ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { FlashcardView, type FlashcardViewRef } from '@/components/quiz/session/FlashcardView'
import { useFlashcardSessionState } from '@/hooks/quiz/useFlashcardSession'
import { QuizLoadingOverlay, useSessionLoader } from '@/components/quiz/shared/QuizLoader'
import { Button } from '@/components/shared/ui/button'
import { Card } from '@/components/shared/ui/card'
import { Switch } from '@/components/shared/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog'

interface DesktopFlashcardViewProps {
  quizId: string
  sessionId: string
}

export function DesktopFlashcardView({ quizId, sessionId }: DesktopFlashcardViewProps) {
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
    taggedStatus,
    handleBack,
    handleForward,
  } = useFlashcardSessionState(sessionId, quizId)

  const [enableExplanation, setEnableExplanation] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)

  const sessionLoader = useSessionLoader()
  const sessionLoaderStartedRef = useRef(false)

  useEffect(() => {
    if (!sessionLoaderStartedRef.current) {
      sessionLoaderStartedRef.current = true
      sessionLoader.open('Preparing flashcards...')
    }
  }, [sessionLoader])

  useEffect(() => {
    if (!isLoading && !isPreloading && session) {
      sessionLoader.complete()
    }
  }, [isLoading, isPreloading, session, sessionLoader])

  const flashcardRef = useRef<FlashcardViewRef>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false
  }, [actualIndex])

  const handleAnswer = useCallback(
    (knows: boolean) => {
      if (!session || !question || submittedRef.current) return
      submittedRef.current = true

      submitAnswer(
        { knows, questionIndex: actualIndex },
        {
          onSuccess: (data) => {
            setStats(data.stats)
            if (displayIndex !== null) {
              setDisplayIndex(null)
            }
          },
          onError: () => {
            submittedRef.current = false
          },
        }
      )
    },
    [session, question, submitAnswer, actualIndex, displayIndex, setStats, setDisplayIndex]
  )

  const handleExit = () => {
    sessionLoader.open('Saving progress and exiting flashcards...')
    sessionLoader.completeAndNavigate(() => {
      router.push(`/dashboard`)
    })
  }

  const handleBackgroundClick = () => {
    if (flashcardRef.current && !isSubmitting) {
      flashcardRef.current.flip()
    }
  }

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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isSubmitting ||
        !question
      ) {
        return
      }

      const isSpace = e.key === ' ' || e.code === 'Space'
      const isLeft = e.key === '1' || e.key === 'ArrowLeft'
      const isRight = e.key === '2' || e.key === 'ArrowRight'

      if (!isSpace && !isLeft && !isRight) return

      e.preventDefault()
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      if (isSpace) {
        flashcardRef.current?.flip()
      } else {
        handleAnswer(isRight)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isSubmitting, question, handleAnswer])

  if (isLoading && !session) {
    return (
      <QuizLoadingOverlay
        isOpen={true}
        progress={sessionLoader.progress}
        status={sessionLoader.status || 'Preparing flashcards...'}
      />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">An error occurred</h2>
          <p className="text-muted-foreground mb-6">{error.message || 'Unable to load session'}</p>
          <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  if (!session || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">No data found</h2>
          <p className="text-muted-foreground mb-6">Unable to load question details</p>
          <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background font-sans select-none overflow-x-hidden"
      onClick={handleBackgroundClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <QuizLoadingOverlay
        isOpen={sessionLoader.isOpen}
        progress={sessionLoader.progress}
        status={sessionLoader.status}
      />

      {/* Top Navigation */}
      <header
        className="w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExit}
            className="rounded-full bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border shadow-xs text-xs font-bold gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit</span>
          </Button>

          <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-foreground text-xs font-semibold gap-1"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Shortcuts</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card text-card-foreground border-border">
              <DialogHeader>
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-warning-fg" />
                  Keyboard Shortcuts
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2 text-xs font-medium text-muted-foreground">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span>Flip card (Front / Back)</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-foreground">
                    Space
                  </kbd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span>Still Learning (Review again)</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-foreground">
                    1 or ←
                  </kbd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span>Mastered (Know it)</span>
                  <kbd className="px-2 py-0.5 bg-muted rounded font-mono font-bold text-foreground">
                    2 or →
                  </kbd>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Effects</span>
            <Switch
              checked={enableAnimation}
              onCheckedChange={setEnableAnimation}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Explanation</span>
            <Switch
              checked={enableExplanation}
              onCheckedChange={setEnableExplanation}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </header>

      {/* Main Flashcard Container */}
      <main
        className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-4 pb-8 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <FlashcardView
          ref={flashcardRef}
          question={question}
          questionNumber={actualIndex + 1}
          totalQuestions={session.totalQuestions}
          onAnswer={handleAnswer}
          isLoading={isSubmitting}
          enableAnimation={enableAnimation}
          enableExplanation={enableExplanation}
          taggedStatus={taggedStatus}
        />
      </main>
    </div>
  )
}
