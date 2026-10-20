'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb, ArrowLeft, Info } from 'lucide-react'
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

const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[role="switch"]',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type FlashcardKeyboardAction = 'flip' | 'review' | 'master'

const FLASHCARD_KEYBOARD_ACTIONS: Record<string, FlashcardKeyboardAction> = {
  ' ': 'flip',
  '1': 'review',
  ArrowLeft: 'review',
  '2': 'master',
  ArrowRight: 'master',
}

function isInteractiveElement(element: EventTarget | null) {
  return element instanceof Element && element.closest(INTERACTIVE_SELECTOR) !== null
}

function shouldIgnoreFlashcardShortcut(
  event: KeyboardEvent,
  showGuideModal: boolean,
  isSubmitting: boolean,
  hasQuestion: boolean,
) {
  return [
    event.defaultPrevented,
    showGuideModal,
    isSubmitting,
    !hasQuestion,
    isInteractiveElement(event.target),
    isInteractiveElement(document.activeElement),
  ].some(Boolean)
}

function getFlashcardKeyboardAction(event: KeyboardEvent): FlashcardKeyboardAction | null {
  if (event.code === 'Space') return 'flip'
  return FLASHCARD_KEYBOARD_ACTIONS[event.key] ?? null
}

function handleFlashcardKeyboardShortcut(
  event: KeyboardEvent,
  showGuideModal: boolean,
  isSubmitting: boolean,
  hasQuestion: boolean,
  flipCard: () => void,
  handleAnswer: (knows: boolean) => void,
) {
  if (shouldIgnoreFlashcardShortcut(event, showGuideModal, isSubmitting, hasQuestion)) return
  const action = getFlashcardKeyboardAction(event)
  if (!action) return
  event.preventDefault()
  if (action === 'flip') {
    flipCard()
    return
  }
  handleAnswer(action === 'master')
}

type FlashcardSessionState = ReturnType<typeof useFlashcardSessionState>

type DesktopFlashcardRouteData = Pick<
  FlashcardSessionState,
  | 'session'
  | 'question'
  | 'isLoading'
  | 'isPreloading'
  | 'error'
  | 'isSubmitting'
  | 'answerError'
  | 'failedAnswer'
  | 'enableAnimation'
  | 'setEnableAnimation'
  | 'actualIndex'
  | 'taggedStatus'
>

type ActiveDesktopFlashcardData = Omit<DesktopFlashcardRouteData, 'session' | 'question'> & {
  session: NonNullable<FlashcardSessionState['session']>
  question: NonNullable<FlashcardSessionState['question']>
}

type DesktopFlashcardPresentation = {
  router: ReturnType<typeof useRouter>
  sessionLoader: ReturnType<typeof useSessionLoader>
  enableExplanation: boolean
  setEnableExplanation: (enabled: boolean) => void
  showGuideModal: boolean
  setShowGuideModal: (open: boolean) => void
}

function getFlashcardSwipeDirection(diff: number, actualIndex: number, currentQuestionIndex: number) {
  const shouldGoBack = diff > 100 && actualIndex > 0
  const shouldGoForward = diff < -100 && actualIndex < currentQuestionIndex
  const actionIndex = Number(shouldGoBack) + Number(shouldGoForward) * 2
  return ([null, 'back', 'forward'] as const)[actionIndex] ?? null
}

function useDesktopFlashcardLoader({
  isLoading,
  isPreloading,
  session,
  sessionLoader,
}: {
  isLoading: boolean
  isPreloading: boolean
  session: FlashcardSessionState['session']
  sessionLoader: ReturnType<typeof useSessionLoader>
}) {
  const sessionLoaderStartedRef = useRef(false)

  useEffect(() => {
    if (sessionLoaderStartedRef.current) return
    sessionLoaderStartedRef.current = true
    sessionLoader.open('Preparing flashcards...')
  }, [sessionLoader])

  useEffect(() => {
    const isReady = Boolean(session) && !isLoading && !isPreloading
    if (isReady) sessionLoader.complete()
  }, [isLoading, isPreloading, session, sessionLoader])
}

function useDesktopFlashcardInteractions({
  data,
  sessionLoader,
  router,
  showGuideModal,
}: {
  data: Pick<FlashcardSessionState,
    | 'session'
    | 'question'
    | 'submitAnswer'
    | 'failedAnswer'
    | 'isSubmitting'
    | 'setStats'
    | 'displayIndex'
    | 'setDisplayIndex'
    | 'actualIndex'
    | 'handleBack'
    | 'handleForward'
  >
  sessionLoader: ReturnType<typeof useSessionLoader>
  router: ReturnType<typeof useRouter>
  showGuideModal: boolean
}) {
  const flashcardRef = useRef<FlashcardViewRef>(null)
  const submittedRef = useRef(false)
  const [swipeState, setSwipeState] = useState({ startX: 0, isDragging: false })
  const currentQuestionIndex = data.session ? data.session.current_question_index : 0

  useEffect(() => {
    submittedRef.current = false
  }, [data.actualIndex])

  const handleAnswer = useCallback(
    (knows: boolean) => {
      if (!data.session || !data.question || submittedRef.current) return
      submittedRef.current = true

      data.submitAnswer(
        { knows, questionIndex: data.actualIndex },
        {
          onSuccess: (result) => {
            data.setStats(result.stats)
            if (data.displayIndex !== null) data.setDisplayIndex(null)
          },
          onError: () => {
            submittedRef.current = false
          },
        },
      )
    },
    [data],
  )

  const handleRetryAnswer = () => {
    if (!data.failedAnswer || data.isSubmitting) return
    submittedRef.current = true
    data.submitAnswer(data.failedAnswer, {
      onSuccess: (result) => {
        data.setStats(result.stats)
        if (data.displayIndex !== null) data.setDisplayIndex(null)
      },
      onError: () => {
        submittedRef.current = false
      },
    })
  }

  const handleExit = () => {
    sessionLoader.open('Saving progress and exiting flashcards...')
    sessionLoader.completeAndNavigate(() => router.push('/dashboard'))
  }

  const handleBackgroundClick = () => {
    if (flashcardRef.current && !data.isSubmitting) flashcardRef.current.flip()
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    setSwipeState({ startX: event.clientX, isDragging: true })
  }

  const handleMouseUp = (event: React.MouseEvent) => {
    if (!swipeState.isDragging) return
    const direction = getFlashcardSwipeDirection(event.clientX - swipeState.startX, data.actualIndex, currentQuestionIndex)
    if (direction === 'back') data.handleBack()
    if (direction === 'forward') data.handleForward()
    setSwipeState({ startX: 0, isDragging: false })
  }

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      handleFlashcardKeyboardShortcut(
        event,
        showGuideModal,
        data.isSubmitting,
        Boolean(data.question),
        () => flashcardRef.current?.flip(),
        handleAnswer,
      )
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [data.isSubmitting, data.question, handleAnswer, showGuideModal])

  return { flashcardRef, handleAnswer, handleRetryAnswer, handleExit, handleBackgroundClick, handleMouseDown, handleMouseUp }
}

function DesktopFlashcardGate({ data, interactions, presentation }: {
  data: DesktopFlashcardRouteData
  interactions: ReturnType<typeof useDesktopFlashcardInteractions>
  presentation: DesktopFlashcardPresentation
}) {
  if (data.isLoading && !data.session) {
    return (
      <QuizLoadingOverlay
        isOpen={true}
        progress={presentation.sessionLoader.progress}
        status={presentation.sessionLoader.status || 'Preparing flashcards...'}
      />
    )
  }

  return <DesktopFlashcardRouteStatus data={data} interactions={interactions} presentation={presentation} />
}

function FlashcardSessionErrorState({ error, router }: {
  error: NonNullable<FlashcardSessionState['error']>
  router: ReturnType<typeof useRouter>
}) {
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

function DesktopFlashcardRouteStatus({ data, interactions, presentation }: {
  data: DesktopFlashcardRouteData
  interactions: ReturnType<typeof useDesktopFlashcardInteractions>
  presentation: DesktopFlashcardPresentation
}) {
  if (data.error) {
    return <FlashcardSessionErrorState error={data.error} router={presentation.router} />
  }

  const { session, question } = data
  if (!session || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-4">No data found</h2>
          <p className="text-muted-foreground mb-6">Unable to load question details</p>
          <Button onClick={() => presentation.router.push('/dashboard')}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  return (
    <DesktopFlashcardReadyView
      data={{ ...data, session, question }}
      interactions={interactions}
      presentation={presentation}
    />
  )
}

function FlashcardAnswerRetryCard({ answerError, isSubmitting, onRetry }: {
  answerError: NonNullable<FlashcardSessionState['answerError']>
  isSubmitting: boolean
  onRetry: () => void
}) {
  return (
    <Card className="mt-4 flex w-full max-w-2xl items-center justify-between gap-4 p-4" role="alert">
      <p className="text-sm text-destructive">{answerError.message || 'Unable to save answer.'}</p>
      <Button onClick={onRetry} disabled={isSubmitting} size="sm">
        {isSubmitting ? 'Retrying…' : 'Retry answer'}
      </Button>
    </Card>
  )
}

function FlashcardAnswerError({ answerError, failedAnswer, isSubmitting, onRetry }: {
  answerError: FlashcardSessionState['answerError']
  failedAnswer: FlashcardSessionState['failedAnswer']
  isSubmitting: boolean
  onRetry: () => void
}) {
  if (!answerError || !failedAnswer) return null
  return <FlashcardAnswerRetryCard answerError={answerError} isSubmitting={isSubmitting} onRetry={onRetry} />
}

function DesktopFlashcardReadyView({ data, interactions, presentation }: {
  data: ActiveDesktopFlashcardData
  interactions: ReturnType<typeof useDesktopFlashcardInteractions>
  presentation: DesktopFlashcardPresentation
}) {
  const { session, question, isSubmitting, answerError, failedAnswer, enableAnimation, setEnableAnimation, actualIndex, taggedStatus } = data
  const {
    flashcardRef,
    handleAnswer,
    handleRetryAnswer,
    handleExit,
    handleBackgroundClick,
    handleMouseDown,
    handleMouseUp,
  } = interactions
  const { sessionLoader, enableExplanation, setEnableExplanation, showGuideModal, setShowGuideModal } = presentation

  return (
    <div
      className="min-h-dvh flex flex-col bg-background font-sans select-none overflow-x-hidden"
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
        onClick={(event) => event.stopPropagation()}
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
              aria-label="Effects"
              checked={enableAnimation}
              onCheckedChange={setEnableAnimation}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Explanation</span>
            <Switch
              aria-label="Explanation"
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
        onClick={(event) => event.stopPropagation()}
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
        <FlashcardAnswerError
          answerError={answerError}
          failedAnswer={failedAnswer}
          isSubmitting={isSubmitting}
          onRetry={handleRetryAnswer}
        />
      </main>
    </div>
  )
}

export function DesktopFlashcardView({ quizId, sessionId }: DesktopFlashcardViewProps) {
  const router = useRouter()
  const data = useFlashcardSessionState(sessionId, quizId)
  const [enableExplanation, setEnableExplanation] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const sessionLoader = useSessionLoader()

  useDesktopFlashcardLoader({
    isLoading: data.isLoading,
    isPreloading: data.isPreloading,
    session: data.session,
    sessionLoader,
  })

  const interactions = useDesktopFlashcardInteractions({
    data,
    sessionLoader,
    router,
    showGuideModal,
  })

  return (
    <DesktopFlashcardGate
      data={data}
      interactions={interactions}
      presentation={{
        router,
        sessionLoader,
        enableExplanation,
        setEnableExplanation,
        showGuideModal,
        setShowGuideModal,
      }}
    />
  )
}
