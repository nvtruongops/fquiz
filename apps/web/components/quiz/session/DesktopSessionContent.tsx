'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/ui/button'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/quiz/useSubmitAnswer'
import { QuizLoadingOverlay, useSessionLoader, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import dynamic from 'next/dynamic'

import { SessionLayout } from '@/components/quiz/session/SessionLayout'
import { QuestionDisplay } from '@/components/quiz/session/QuestionDisplay'
import { PendingAnswerIndicator } from '@/components/quiz/session/PendingAnswerIndicator'
import { ExplanationPanel } from '@/components/quiz/session/ExplanationPanel'
import { useQuizSessionQueries } from '@/hooks/quiz/useQuizSessionQueries'
import { useSessionAnswerSync } from '@/hooks/quiz/useSessionAnswerSync'
import { useSessionActivityTracking } from '@/hooks/quiz/useSessionActivityTracking'
import { useSessionHydration } from '@/hooks/quiz/useSessionHydration'
import { useSessionFinalize } from '@/hooks/quiz/useSessionFinalize'
import { useAnimationPreference } from '@/hooks/quiz/useAnimationPreference'
import { useExamTabLease } from '@/hooks/quiz/useExamTabLease'
import {
  isQuestionNavigationReady,
  isSessionQuestionReady,
  shouldShowSessionSkeleton,
} from '@/hooks/quiz/session-rendering'
import { SessionSaveStatus } from '@/components/quiz/session/SessionSaveStatus'
import { SessionQueryError } from '@/components/quiz/session/SessionQueryError'
import { QuizSessionSkeleton } from '@/components/quiz/session/QuizSessionSkeleton'

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
  const [enableAnimation, setEnableAnimation] = useAnimationPreference(false)

  const storeSessionId = useQuizSessionStore((s) => s.sessionId)
  const currentQuestionIndex = useQuizSessionStore((s) => s.currentQuestionIndex)
  const answeredQuestions = useQuizSessionStore((s) => s.answeredQuestions)
  const lastAnswerResult = useQuizSessionStore((s) => s.lastAnswerResult)
  const navigateToQuestion = useQuizSessionStore((s) => s.navigateToQuestion)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const sessionLoader = useSessionLoader(true)

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
    refetchInitial,
    activeData,
    currentQuestion,
    preloadedQuestions,
    isPreloadError,
    preloadError,
    refetchPreload,
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

  const { isReadOnlyTab, takeOverLease, canWrite } = useExamTabLease(resolvedSessionId)
  const { mutate: submitAnswer, isPending: isSubmitting } = useSubmitAnswer(resolvedSessionId, canWrite)

  const {
    selectedOptions,
    submitted,
    handleSelectOption,
    saveStatus,
    retryFailedAnswer,
    hasUnsavedAnswers,
    discardUnsavedAnswer,
    unsavedQuestionIndex,
    acknowledgedQuestions,
  } = useSessionAnswerSync({
    activeData,
    currentQuestionIndex,
    currentQuestion,
    preloadedQuestions,
    submitAnswer,
    isSubmitting,
    canWrite,
  })

  const canFinalize = useCallback(() => canWrite() && !isSubmitting && !hasUnsavedAnswers(), [canWrite, isSubmitting, hasUnsavedAnswers])
  const { finalizeMutation } = useSessionFinalize({ sessionId, quizId, canFinalize })
  const submitDisabled = isReadOnlyTab || isSubmitting || hasUnsavedAnswers() || finalizeMutation.isPending

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
    canWrite,
  })

  const handleSubmit = useCallback(() => { if (canFinalize()) setConfirmOpen(true) }, [canFinalize])
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

  const isStillLoading = !isSessionQuestionReady({
    isInitialLoading,
    isReadyToRender,
    sessionStatus: activeData?.session.status,
  })

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

  const canNavigateQuestions = isQuestionNavigationReady(
    preloadedQuestions?.length,
    activeData?.session.totalQuestions ?? 0,
  )
  const handleNavigate = useCallback((index: number) => {
    const totalQuestions = activeData?.session.totalQuestions ?? 0
    if (!canNavigateQuestions || index < 0 || index >= totalQuestions) return
    navigateToQuestion(index)
  }, [activeData?.session.totalQuestions, canNavigateQuestions, navigateToQuestion])

  if (isPreloadError || isInitialError) {
    return (
      <SessionQueryError
        title="Session Error"
        message={initialError?.message || preloadError?.message || 'Unable to load test session.'}
        backLabel="Go Back"
        dashboardLabel="Dashboard"
        canRetry={(isInitialError && initialError?.status !== 404 && initialError?.status !== 410) ||
          (isPreloadError && preloadError?.status !== 404 && preloadError?.status !== 410)}
        onRetry={() => {
          if (isInitialError && initialError?.status !== 404 && initialError?.status !== 410) void refetchInitial()
          if (isPreloadError && preloadError?.status !== 404 && preloadError?.status !== 410) void refetchPreload()
        }}
        onBack={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
          } else {
            router.push('/dashboard')
          }
        }}
        onDashboard={() => router.push('/dashboard')}
      />
    )
  }

  if (isStillLoading || !activeData) {
    if (shouldShowSessionSkeleton(isStillLoading, sessionLoader.isOpen, isQuizLoaderActive())) {
      return <QuizSessionSkeleton />
    }
    return (
      <QuizLoadingOverlay
        isOpen={true}
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
  acknowledgedQuestions.forEach((index) => answeredSet.add(index))

  const isMatchingSessionStore = storeSessionId === resolvedSessionId
  if (isMatchingSessionStore) answeredQuestions.forEach((index) => { if (index >= 0 && index < session.totalQuestions) answeredSet.add(index) })
  const answeredCount = Math.min(answeredSet.size, session.totalQuestions)
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
        submitted={submitted}
        isPending={finalizeMutation.isPending}
        answersDisabled={isReadOnlyTab || isSubmitting || finalizeMutation.isPending}
        submitDisabled={submitDisabled}
        isReadOnlyTab={isReadOnlyTab}
        takeOverLease={takeOverLease}
        answeredSet={answeredSet}
        enableAnimation={enableAnimation}
        onToggleAnimation={setEnableAnimation}
        onSelectOption={handleSelectOption}
        onNavigate={handleNavigate}
        navigationDisabled={!canNavigateQuestions}
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
        <SessionSaveStatus status={saveStatus} onRetry={retryFailedAnswer} onReviewDraft={() => { if (unsavedQuestionIndex !== null) handleNavigate(unsavedQuestionIndex) }} onDiscardDraft={discardUnsavedAnswer} draftQuestionNumber={unsavedQuestionIndex === null ? null : unsavedQuestionIndex + 1} disabled={isReadOnlyTab || isSubmitting || finalizeMutation.isPending} />
        <PendingAnswerIndicator
          mode={session.mode}
          submitted={submitted}
          isPending={isSubmitting}
          showImmediateFeedback={showImmediateFeedback}
        />
        <QuestionDisplay
          question={question}
          currentIndex={currentQuestionIndex}
          totalQuestions={session.totalQuestions}
          selectedOptions={selectedOptions}
          submitted={submitted}
          showImmediateFeedback={showImmediateFeedback}
          lastAnswerResult={lastAnswerResult}
          onSelectOption={handleSelectOption}
          onNavigate={handleNavigate}
          isPending={isReadOnlyTab || isSubmitting || finalizeMutation.isPending}
          submitDisabled={submitDisabled}
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
          submitDisabled={submitDisabled}
          enableAnimation={enableAnimation}
          onConfirmSubmit={() => {
            if (!canFinalize() || finalizeMutation.isPending) return
            setConfirmOpen(false)
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
