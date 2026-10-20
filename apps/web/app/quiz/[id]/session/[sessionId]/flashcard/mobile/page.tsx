'use client'

import * as React from 'react'
import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFlashcardSessionState } from '@/hooks/quiz/useFlashcardSession'
import { Button } from '@/components/shared/ui/button'
import { MobileFlashcardView } from '@/components/quiz/flashcard/MobileFlashcardView'
import { MobileFlashcardHeader } from '@/components/quiz/flashcard/MobileFlashcardHeader'
import { MobileFlashcardModals } from '@/components/quiz/flashcard/MobileFlashcardModals'

export default function MobileFlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const router = useRouter()
  const resolvedQuizId = resolveRouteId(params?.id)
  const resolvedSessionId = resolveRouteId(params?.sessionId)
  const sessionState = useFlashcardSessionState(resolvedSessionId, resolvedQuizId)

  const [questionMapOpen, setQuestionMapOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const submissionInFlight = useRef(false)

  const submitFlashcardAnswer = (answer: { knows: boolean; questionIndex: number }) => submitMobileFlashcardAnswer(sessionState, submissionInFlight, answer)
  const handleAnswer = (knows: boolean) => submitMobileFlashcardChoice(sessionState, submissionInFlight, knows)
  const handleRetryAnswer = () => sessionState.failedAnswer && submitFlashcardAnswer(sessionState.failedAnswer)

  return (
    <MobileFlashcardRouteContent
      state={sessionState}
      router={router}
      questionMapOpen={questionMapOpen}
      setQuestionMapOpen={setQuestionMapOpen}
      exitConfirmOpen={exitConfirmOpen}
      setExitConfirmOpen={setExitConfirmOpen}
      onAnswer={handleAnswer}
      onRetryAnswer={handleRetryAnswer}
    />
  )
}

type MobileFlashcardSessionState = ReturnType<typeof useFlashcardSessionState>
type LoadedMobileFlashcardState = MobileFlashcardSessionState & {
  session: NonNullable<MobileFlashcardSessionState['session']>
  question: NonNullable<MobileFlashcardSessionState['question']>
}

function resolveRouteId(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? ''
}

function submitMobileFlashcardAnswer(state: MobileFlashcardSessionState, submissionInFlight: React.MutableRefObject<boolean>, answer: { knows: boolean; questionIndex: number }) {
  if (state.isSubmitting || submissionInFlight.current) return
  submissionInFlight.current = true
  state.submitAnswer(answer, {
    onSuccess: (data) => {
      state.setStats(data.stats)
      if (state.displayIndex !== null) state.setDisplayIndex(null)
    },
    onSettled: () => {
      submissionInFlight.current = false
    },
  })
}

function submitMobileFlashcardChoice(state: MobileFlashcardSessionState, submissionInFlight: React.MutableRefObject<boolean>, knows: boolean) {
  if (!state.session || !state.question) return
  submitMobileFlashcardAnswer(state, submissionInFlight, { knows, questionIndex: state.actualIndex })
}

function MobileFlashcardRouteContent({ state, router, questionMapOpen, setQuestionMapOpen, exitConfirmOpen, setExitConfirmOpen, onAnswer, onRetryAnswer }: {
  state: MobileFlashcardSessionState
  router: ReturnType<typeof useRouter>
  questionMapOpen: boolean
  setQuestionMapOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  onAnswer: (knows: boolean) => void
  onRetryAnswer: () => void
}) {
  if (state.isLoading) return <MobileFlashcardLoadingState />
  if (!hasMobileFlashcardSession(state)) return <MobileFlashcardFailureState router={router} />
  return (
    <MobileFlashcardActiveSession
      state={state}
      session={state.session}
      question={state.question}
      questionMapOpen={questionMapOpen}
      setQuestionMapOpen={setQuestionMapOpen}
      exitConfirmOpen={exitConfirmOpen}
      setExitConfirmOpen={setExitConfirmOpen}
      onAnswer={onAnswer}
      onRetryAnswer={onRetryAnswer}
      router={router}
    />
  )
}

function hasMobileFlashcardSession(state: MobileFlashcardSessionState): state is LoadedMobileFlashcardState {
  return Boolean(!state.error && state.session && state.question)
}

function MobileFlashcardLoadingState() {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )
}

function MobileFlashcardFailureState({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-background p-8">
      <Button
        onClick={() => router.push('/dashboard')}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs"
      >
        Back to Home
      </Button>
    </div>
  )
}

function MobileFlashcardRetryNotice({ state, onRetryAnswer }: { state: MobileFlashcardSessionState; onRetryAnswer: () => void }) {
  if (!state.answerError || !state.failedAnswer) return null
  return (
    <div role="alert" aria-live="assertive" className="mx-3 mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="min-w-0">Couldn’t save your answer: {state.answerError.message}</p>
      <Button type="button" variant="outline" aria-label="Retry saving this answer" disabled={state.isSubmitting} onClick={onRetryAnswer} className="h-11 shrink-0 rounded-lg border-destructive/40 px-3 font-bold text-destructive">
        Retry
      </Button>
    </div>
  )
}

function MobileFlashcardNavigationFooter({ state, effectiveTotal }: { state: MobileFlashcardSessionState; effectiveTotal: number }) {
  return (
    <footer className="sticky bottom-0 z-20 border-t-2 border-border bg-card p-3 shadow-lg flex-none">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" disabled={state.actualIndex <= 0} onClick={state.handleBack} className="h-12 flex-1 rounded-xl font-bold border-border text-foreground cursor-pointer disabled:opacity-40">
          <ChevronLeft className="mr-1 h-5 w-5 text-primary" />
          <span>Previous</span>
        </Button>
        <Button type="button" variant="outline" disabled={state.actualIndex >= effectiveTotal - 1} onClick={state.handleForward} className="h-12 flex-1 rounded-xl font-bold border-border text-foreground cursor-pointer disabled:opacity-40">
          <span>Next</span>
          <ChevronRight className="ml-1 h-5 w-5 text-primary" />
        </Button>
      </div>
    </footer>
  )
}

function MobileFlashcardActiveSession({ state, session, question, questionMapOpen, setQuestionMapOpen, exitConfirmOpen, setExitConfirmOpen, onAnswer, onRetryAnswer, router }: {
  state: MobileFlashcardSessionState
  session: NonNullable<MobileFlashcardSessionState['session']>
  question: NonNullable<MobileFlashcardSessionState['question']>
  questionMapOpen: boolean
  setQuestionMapOpen: (open: boolean) => void
  exitConfirmOpen: boolean
  setExitConfirmOpen: (open: boolean) => void
  onAnswer: (knows: boolean) => void
  onRetryAnswer: () => void
  router: ReturnType<typeof useRouter>
}) {
  const effectiveTotal = session.totalQuestions || 0
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden fixed inset-0 overscroll-none select-none">
      <MobileFlashcardHeader
        categoryName={session.categoryName}
        courseCode={session.courseCode}
        title={session.title}
        stats={state.stats}
        actualIndex={state.actualIndex}
        effectiveTotal={effectiveTotal}
        onOpenQuestionMap={() => setQuestionMapOpen(true)}
        onOpenExitConfirm={() => setExitConfirmOpen(true)}
      />

      <div className="flex-1 relative overflow-hidden">
        <MobileFlashcardView
          question={question}
          questionNumber={state.actualIndex + 1}
          totalQuestions={effectiveTotal}
          onAnswer={onAnswer}
          onBack={state.handleBack}
          onForward={state.handleForward}
          isLoading={state.isSubmitting}
          enableAnimation={state.enableAnimation}
          taggedStatus={state.taggedStatus}
        />
      </div>

      <MobileFlashcardRetryNotice state={state} onRetryAnswer={onRetryAnswer} />
      <MobileFlashcardNavigationFooter state={state} effectiveTotal={effectiveTotal} />

      <MobileFlashcardModals
        questionMapOpen={questionMapOpen}
        setQuestionMapOpen={setQuestionMapOpen}
        exitConfirmOpen={exitConfirmOpen}
        setExitConfirmOpen={setExitConfirmOpen}
        effectiveTotal={effectiveTotal}
        actualIndex={state.actualIndex}
        onSelectIndex={(i) => state.setDisplayIndex(i)}
        onConfirmExit={() => router.push('/dashboard')}
      />
    </div>
  )
}
