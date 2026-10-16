'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/quiz/useSubmitAnswer'
import { QuizLoadingOverlay, useSessionLoader, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import dynamic from 'next/dynamic'

import { SessionLayout } from '@/components/quiz/session/SessionLayout'
import { QuestionDisplay } from '@/components/quiz/session/QuestionDisplay'
import { ExplanationPanel } from '@/components/quiz/session/ExplanationPanel'
import { useQuizSessionQueries } from '@/hooks/quiz/useQuizSessionQueries'
import { useSessionAnswerSync } from '@/hooks/quiz/useSessionAnswerSync'
import { useSessionActivityTracking } from '@/hooks/quiz/useSessionActivityTracking'
import { useSessionHydration } from '@/hooks/quiz/useSessionHydration'
import { useSessionFinalize } from '@/hooks/quiz/useSessionFinalize'
import { useAnimationPreference } from '@/hooks/quiz/useAnimationPreference'

const SessionModals = dynamic(
  () => import('@/components/quiz/session/SessionModals').then((mod) => mod.SessionModals),
  { ssr: false }
)

interface DesktopSessionContentProps {
  quizId: string
  sessionId: string
  resolvedQuizId: string
  resolvedSessionId: string
  setIsMobile: (v: boolean) => void
}

export function DesktopSessionContent({
  quizId,
  sessionId,
  resolvedQuizId,
  resolvedSessionId,
  setIsMobile,
}: DesktopSessionContentProps) {
  const router = useRouter()
  const [enableAnimation, setEnableAnimation] = useAnimationPreference(true)

  const storeSessionId = useQuizSessionStore((s) => s.sessionId)
  const currentQuestionIndex = useQuizSessionStore((s) => s.currentQuestionIndex)
  const answeredQuestions = useQuizSessionStore((s) => s.answeredQuestions)
  const lastAnswerResult = useQuizSessionStore((s) => s.lastAnswerResult)
  const navigateToQuestion = useQuizSessionStore((s) => s.navigateToQuestion)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const sessionLoader = useSessionLoader()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  const {
    initialData,
    isInitialLoading,
    isInitialFetching,
    isInitialError,
    initialError,
    activeData,
    currentQuestion,
    preloadedQuestions,
    isPreloading,
    isPreloadError,
  } = useQuizSessionQueries(resolvedSessionId, currentQuestionIndex)

  const { isReadyToRender } = useSessionHydration({
    resolvedSessionId,
    resolvedQuizId,
    quizId,
    sessionId,
    initialData,
    isInitialFetching,
    initialError,
  })

  const { finalizeMutation } = useSessionFinalize({
    sessionId,
    quizId,
  })

  const { mutate: submitAnswer, isPending: isSubmitting } = useSubmitAnswer(resolvedSessionId)

  const {
    selectedOptions,
    setSelectedOptions,
    submitted,
    feedbackByQuestion,
    handleSelectOption,
  } = useSessionAnswerSync({
    activeData,
    currentQuestionIndex,
    currentQuestion,
    preloadedQuestions,
    submitAnswer,
    isSubmitting,
  })

  const {
    exitConfirmOpen,
    setExitConfirmOpen,
    reportSessionActivity,
    inactivityPauseOpen,
    setInactivityPauseOpen,
    handleResumeInactivity,
    markExiting,
  } = useSessionActivityTracking({
    sessionId: resolvedSessionId,
    currentQuestionIndex,
    activeData,
    resolvedQuizId,
  })

  const handleSubmit = useCallback(() => setConfirmOpen(true), [])
  const handleExit = useCallback(() => setExitConfirmOpen(true), [setExitConfirmOpen])

  const sessionLoaderStartedRef = useRef(false)

  useEffect(() => {
    if (!sessionLoaderStartedRef.current) {
      sessionLoaderStartedRef.current = true
      if (!isQuizLoaderActive()) {
        sessionLoader.open('Loading questions...')
      }
    }
  }, [sessionLoader])

  useEffect(() => {
    const realQuizId = (activeData?.session as any)?.quiz_id
    if (realQuizId && (quizId === 'undefined' || quizId === 'mix') && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/quiz/${realQuizId}/session/${sessionId}`)
    }
  }, [activeData?.session, quizId, sessionId])

  const isStillLoading =
    isPreloading ||
    isInitialLoading ||
    !isReadyToRender ||
    !activeData ||
    activeData?.session.status === 'preparing'

  useEffect(() => {
    if (sessionLoaderStartedRef.current && sessionLoader.isOpen) {
      if (isInitialError) {
        sessionLoader.close()
      } else if (activeData?.session.status === 'preparing') {
        sessionLoader.setStatus('Shuffling quiz questions, please wait...')
      } else if (!isReadyToRender) {
        sessionLoader.setStatus('Preparing test environment...')
      } else if (!isStillLoading) {
        sessionLoader.complete()
      }
    }
  }, [isStillLoading, isReadyToRender, isInitialError, activeData?.session.status, sessionLoader])

  if (isPreloadError || isInitialError) {
    const errorMsg = (initialError as any)?.message || 'Unable to load test session.'
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
            Session Error
          </h2>
          <p className="mb-6 text-sm font-medium text-muted-foreground">{errorMsg}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/dashboard')
                }
              }}
              className="h-11 rounded-xl border-border text-xs font-bold"
            >
              Go Back
            </Button>
            <Button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if ((isStillLoading && !isQuizLoaderActive()) || !activeData) {
    return (
      <QuizLoadingOverlay
        isOpen={sessionLoader.isOpen}
        progress={sessionLoader.progress}
        status={sessionLoader.status || 'Loading questions...'}
      />
    )
  }

  const { session, question } = activeData
  const validAnsweredFromDb = session.user_answers
    .map((a) => a.question_index)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < session.totalQuestions)

  const answeredSet = new Set(validAnsweredFromDb)
  if (
    selectedOptions.length > 0 &&
    currentQuestionIndex >= 0 &&
    currentQuestionIndex < session.totalQuestions
  ) {
    answeredSet.add(currentQuestionIndex)
  }

  const isMatchingSessionStore = storeSessionId === resolvedSessionId
  const validStoreAnsweredCount = isMatchingSessionStore
    ? Array.from(answeredQuestions).filter(
        (i) => Number.isInteger(i) && i >= 0 && i < session.totalQuestions
      ).length
    : 0

  const answeredCount = Math.min(
    Math.max(validStoreAnsweredCount, answeredSet.size),
    session.totalQuestions
  )
  const showImmediateFeedback = session.mode === 'immediate' && submitted && lastAnswerResult !== null

  return (
    <>
      <QuizLoadingOverlay
        isOpen={sessionLoader.isOpen}
        progress={sessionLoader.progress}
        status={sessionLoader.status}
      />
      <SessionLayout
        sessionData={activeData}
        currentQuestionIndex={currentQuestionIndex}
        answeredCount={answeredCount}
        selectedOptions={selectedOptions}
        submitted={submitted}
        isPending={finalizeMutation.isPending}
        enableAnimation={enableAnimation}
        onToggleAnimation={setEnableAnimation}
        onSelectOption={handleSelectOption}
        onNavigate={navigateToQuestion}
        onSubmit={handleSubmit}
        onExit={handleExit}
        explanationContent={
          <ExplanationPanel
            question={question}
            sessionMode={session.mode}
            submitted={submitted}
            showImmediateFeedback={showImmediateFeedback}
            lastAnswerResult={lastAnswerResult}
            enableAnimation={enableAnimation}
          />
        }
      >
        <QuestionDisplay
          question={question}
          currentIndex={currentQuestionIndex}
          totalQuestions={session.totalQuestions}
          selectedOptions={selectedOptions}
          submitted={submitted}
          showImmediateFeedback={showImmediateFeedback}
          lastAnswerResult={lastAnswerResult}
          onSelectOption={handleSelectOption}
          onNavigate={navigateToQuestion}
          isPending={finalizeMutation.isPending}
          sessionMode={session.mode}
          enableAnimation={enableAnimation}
          courseCode={session.courseCode}
          quizTitle={session.title}
          quizId={(session as any).quiz_id || resolvedQuizId}
        />
        <SessionModals
          confirmOpen={confirmOpen}
          setConfirmOpen={setConfirmOpen}
          exitConfirmOpen={exitConfirmOpen}
          setExitConfirmOpen={setExitConfirmOpen}
          inactivityPauseOpen={inactivityPauseOpen}
          setInactivityPauseOpen={setInactivityPauseOpen}
          onResumeInactivity={handleResumeInactivity}
          answeredCount={answeredCount}
          totalQuestions={session.totalQuestions}
          isPending={finalizeMutation.isPending}
          enableAnimation={enableAnimation}
          onConfirmSubmit={() => {
            setConfirmOpen(false)
            sessionLoader.open('Submitting answers and compiling results...')
            finalizeMutation.mutate()
          }}
          onConfirmExit={() => {
            markExiting()
            setExitConfirmOpen(false)
            sessionLoader.open('Saving progress and exiting session...')
            void reportSessionActivity('pause')
            const targetQuizId =
              (session as any)?.quiz_id || (session as any)?.quizId || resolvedQuizId
            const targetUrl =
              session?.is_temp || !targetQuizId || targetQuizId === 'undefined'
                ? '/'
                : `/quiz/${targetQuizId}`
            sessionLoader.completeAndNavigate(() => {
              if (typeof window !== 'undefined') {
                window.location.href = targetUrl
              } else {
                router.push(targetUrl)
              }
            })
          }}
        />
      </SessionLayout>
    </>
  )
}
