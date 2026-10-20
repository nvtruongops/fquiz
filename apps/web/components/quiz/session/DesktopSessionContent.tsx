'use client'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  getSessionSubmitAvailability,
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

type DesktopSessionQueryData = ReturnType<typeof useQuizSessionQueries>
type DesktopActiveSessionData = NonNullable<DesktopSessionQueryData['activeData']>
type DesktopSessionLoader = ReturnType<typeof useSessionLoader>
type DesktopSessionActivity = ReturnType<typeof useSessionActivityTracking>
type DesktopSessionFinalizeMutation = ReturnType<typeof useSessionFinalize>['finalizeMutation']
type DesktopSessionAnswerSync = ReturnType<typeof useSessionAnswerSync>
type DesktopSessionAnswerState = Pick<DesktopSessionAnswerSync,
  'selectedOptions' | 'submitted' | 'saveStatus' | 'retryFailedAnswer' | 'unsavedQuestionIndex' | 'discardUnsavedAnswer'
>
type DesktopLastAnswerResult = ReturnType<typeof useQuizSessionStore.getState>['lastAnswerResult']

const SESSION_RETRY_BLOCKED_STATUSES = new Set([404, 410])

function canRetrySessionLoad(isError: boolean, error: { status?: number } | null | undefined) {
  return isError && !SESSION_RETRY_BLOCKED_STATUSES.has(error?.status ?? 0)
}

function hasRetryableSessionError(isInitialError: boolean, initialError: { status?: number } | null | undefined, isPreloadError: boolean, preloadError: { status?: number } | null | undefined) {
  return [
    canRetrySessionLoad(isInitialError, initialError),
    canRetrySessionLoad(isPreloadError, preloadError),
  ].some(Boolean)
}

function getSessionErrorMessage(initialError: { message?: string } | null | undefined, preloadError: { message?: string } | null | undefined) {
  return [initialError?.message, preloadError?.message].find(Boolean) || 'Unable to load test session.'
}

function retrySessionQueries(isInitialError: boolean, initialError: { status?: number } | null | undefined, isPreloadError: boolean, preloadError: { status?: number } | null | undefined, refetchInitial: () => unknown, refetchPreload: () => unknown) {
  if (canRetrySessionLoad(isInitialError, initialError)) void refetchInitial()
  if (canRetrySessionLoad(isPreloadError, preloadError)) void refetchPreload()
}

function navigateBackFromSession(router: ReturnType<typeof useRouter>) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/dashboard')
}

function getSessionExitUrl(session: DesktopActiveSessionData['session'], resolvedQuizId: string) {
  if (session.is_temp) return '/'
  return getQuizExitUrl(resolveSessionQuizId(session, resolvedQuizId))
}

function resolveSessionQuizId(session: DesktopActiveSessionData['session'], resolvedQuizId: string) {
  return (session as any).quiz_id ?? (session as any).quizId ?? resolvedQuizId
}

function getQuizExitUrl(quizId: string | null | undefined) {
  if (!quizId || quizId === 'undefined') return '/'
  return `/quiz/${quizId}`
}

function handleSessionExit(session: DesktopActiveSessionData['session'], resolvedQuizId: string, activity: DesktopSessionActivity, loader: DesktopSessionLoader, router: ReturnType<typeof useRouter>) {
  activity.markExiting()
  activity.setExitConfirmOpen(false)
  loader.open('Saving progress and exiting session...')
  void activity.reportSessionActivity('pause')
  const targetUrl = getSessionExitUrl(session, resolvedQuizId)
  loader.completeAndNavigate(() => {
    if (typeof window !== 'undefined') {
      window.location.href = targetUrl
      return
    }
    router.push(targetUrl)
  })
}

function handleSessionSubmit(canFinalize: () => boolean, isPending: boolean, setConfirmOpen: (open: boolean) => void, mutate: () => void) {
  if (!canFinalize() || isPending) return
  setConfirmOpen(false)
  mutate()
}

function submitFinalizedSession(canFinalize: () => boolean, finalizeMutation: DesktopSessionFinalizeMutation, setConfirmOpen: (open: boolean) => void) {
  handleSessionSubmit(canFinalize, finalizeMutation.isPending, setConfirmOpen, finalizeMutation.mutate)
}

function handleReviewUnsavedDraft(questionIndex: number | null, onNavigate: (index: number) => void) {
  if (questionIndex !== null) onNavigate(questionIndex)
}

function shouldShowImmediateFeedback(
  sessionMode: DesktopActiveSessionData['session']['mode'],
  submitted: boolean,
  lastAnswerResult: DesktopLastAnswerResult,
) {
  return sessionMode === 'immediate' && submitted && lastAnswerResult !== null
}

function areSessionAnswersDisabled(isReadOnlyTab: boolean, isSubmitting: boolean, isFinalizing: boolean) {
  return isReadOnlyTab || isSubmitting || isFinalizing
}

function getDraftQuestionNumber(questionIndex: number | null) {
  return questionIndex === null ? null : questionIndex + 1
}

function getSessionQuestionQuizId(session: DesktopActiveSessionData['session'], resolvedQuizId: string) {
  return (session as any).quiz_id || resolvedQuizId
}

function SessionFinalizationFailure({ isError }: { isError: boolean }) {
  if (!isError) return null
  return (
    <p role="alert" className="mx-4 my-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      Submission did not finish. Your answers are saved. Select Submit to try again.
    </p>
  )
}

function DesktopSessionQuestionBody({
  activeData,
  currentQuestionIndex,
  isReadOnlyTab,
  isSubmitting,
  submitDisabled,
  enableAnimation,
  handleSelectOption,
  handleNavigate,
  saveState,
  lastAnswerResult,
  showImmediateFeedback,
  resolvedQuizId,
  isFinalizing,
  hasFinalizationError,
}: {
  activeData: DesktopActiveSessionData
  currentQuestionIndex: number
  isReadOnlyTab: boolean
  isSubmitting: boolean
  submitDisabled: boolean
  enableAnimation: boolean
  handleSelectOption: (index: number) => void
  handleNavigate: (index: number) => void
  saveState: DesktopSessionAnswerState
  lastAnswerResult: DesktopLastAnswerResult
  showImmediateFeedback: boolean
  resolvedQuizId: string
  isFinalizing: boolean
  hasFinalizationError: boolean
}) {
  const { session, question } = activeData
  const answersDisabled = areSessionAnswersDisabled(isReadOnlyTab, isSubmitting, isFinalizing)
  return (
    <>
      <SessionSaveStatus
        status={saveState.saveStatus}
        onRetry={saveState.retryFailedAnswer}
        onReviewDraft={() => handleReviewUnsavedDraft(saveState.unsavedQuestionIndex, handleNavigate)}
        onDiscardDraft={saveState.discardUnsavedAnswer}
        draftQuestionNumber={getDraftQuestionNumber(saveState.unsavedQuestionIndex)}
        disabled={answersDisabled}
      />
      <SessionFinalizationFailure isError={hasFinalizationError} />
      <PendingAnswerIndicator mode={session.mode} submitted={saveState.submitted} isPending={isSubmitting} showImmediateFeedback={showImmediateFeedback} />
      <QuestionDisplay
        question={question}
        currentIndex={currentQuestionIndex}
        totalQuestions={session.totalQuestions}
        selectedOptions={saveState.selectedOptions}
        submitted={saveState.submitted}
        showImmediateFeedback={showImmediateFeedback}
        lastAnswerResult={lastAnswerResult}
        onSelectOption={handleSelectOption}
        onNavigate={handleNavigate}
        isPending={answersDisabled}
        submitDisabled={submitDisabled}
        sessionMode={session.mode}
        enableAnimation={enableAnimation}
        courseCode={session.courseCode}
        quizTitle={session.title}
        quizId={getSessionQuestionQuizId(session, resolvedQuizId)}
      />
    </>
  )
}

function DesktopSessionModalContent({
  activeData,
  activity,
  answeredCount,
  confirmOpen,
  setConfirmOpen,
  finalizeMutation,
  submitDisabled,
  enableAnimation,
  canFinalize,
  sessionLoader,
  resolvedQuizId,
  router,
}: {
  activeData: DesktopActiveSessionData
  activity: DesktopSessionActivity
  answeredCount: number
  confirmOpen: boolean
  setConfirmOpen: (open: boolean) => void
  finalizeMutation: DesktopSessionFinalizeMutation
  submitDisabled: boolean
  enableAnimation: boolean
  canFinalize: () => boolean
  sessionLoader: DesktopSessionLoader
  resolvedQuizId: string
  router: ReturnType<typeof useRouter>
}) {
  const { session } = activeData
  const handleConfirmSubmit = () => submitFinalizedSession(canFinalize, finalizeMutation, setConfirmOpen)
  const handleConfirmExit = () => handleSessionExit(session, resolvedQuizId, activity, sessionLoader, router)
  return (
    <SessionModals
      confirmOpen={confirmOpen}
      setConfirmOpen={setConfirmOpen}
      exitConfirmOpen={activity.exitConfirmOpen}
      setExitConfirmOpen={activity.setExitConfirmOpen}
      inactivityPauseOpen={activity.inactivityPauseOpen}
      setInactivityPauseOpen={activity.setInactivityPauseOpen}
      onResumeInactivity={activity.handleResumeInactivity}
      answeredCount={answeredCount}
      totalQuestions={session.totalQuestions}
      isPending={finalizeMutation.isPending}
      submitDisabled={submitDisabled}
      enableAnimation={enableAnimation}
      onConfirmSubmit={handleConfirmSubmit}
      onConfirmExit={handleConfirmExit}
    />
  )
}

function DesktopSessionErrorState({ router, isInitialError, initialError, isPreloadError, preloadError, refetchInitial, refetchPreload }: {
  router: ReturnType<typeof useRouter>
  isInitialError: boolean
  initialError: { message?: string; status?: number } | null | undefined
  isPreloadError: boolean
  preloadError: { message?: string; status?: number } | null | undefined
  refetchInitial: () => unknown
  refetchPreload: () => unknown
}) {
  return (
    <SessionQueryError
      title="Session Error"
      message={getSessionErrorMessage(initialError, preloadError)}
      backLabel="Go Back"
      dashboardLabel="Dashboard"
      canRetry={hasRetryableSessionError(isInitialError, initialError, isPreloadError, preloadError)}
      onRetry={() => retrySessionQueries(isInitialError, initialError, isPreloadError, preloadError, refetchInitial, refetchPreload)}
      onBack={() => navigateBackFromSession(router)}
      onDashboard={() => router.push('/dashboard')}
    />
  )
}

function DesktopSessionLoadingState({ isStillLoading, sessionLoader }: { isStillLoading: boolean; sessionLoader: DesktopSessionLoader }) {
  if (shouldShowSessionSkeleton(isStillLoading, sessionLoader.isOpen, isQuizLoaderActive())) return <QuizSessionSkeleton />
  return <QuizLoadingOverlay isOpen progress={sessionLoader.progress} status={sessionLoader.status || 'Loading questions...'} />
}

function DesktopSessionReadyContent({ data, controls, finalization }: {
  data: {
    activeData: DesktopActiveSessionData
    currentQuestionIndex: number
    answeredCount: number
    answeredSet: Set<number>
    isReadOnlyTab: boolean
    isSubmitting: boolean
    submitDisabled: boolean
    confirmSubmitDisabled: boolean
    saveState: DesktopSessionAnswerState
    lastAnswerResult: DesktopLastAnswerResult
  }
  controls: {
    takeOverLease: () => void
    enableAnimation: boolean
    setEnableAnimation: (enabled: boolean) => void
    confirmOpen: boolean
    setConfirmOpen: (open: boolean) => void
    handleSelectOption: (index: number) => void
    handleNavigate: (index: number) => void
    canNavigateQuestions: boolean
    onSubmit: () => void
    onExit: () => void
  }
  finalization: {
    activity: DesktopSessionActivity
    finalizeMutation: DesktopSessionFinalizeMutation
    sessionLoader: DesktopSessionLoader
    resolvedQuizId: string
    router: ReturnType<typeof useRouter>
    canFinalize: () => boolean
  }
}) {
  const {
    activeData,
    currentQuestionIndex,
    answeredCount,
    answeredSet,
    isReadOnlyTab,
    isSubmitting,
    submitDisabled,
    confirmSubmitDisabled,
    saveState,
    lastAnswerResult,
  } = data
  const {
    takeOverLease,
    enableAnimation,
    setEnableAnimation,
    confirmOpen,
    setConfirmOpen,
    handleSelectOption,
    handleNavigate,
    canNavigateQuestions,
    onSubmit,
    onExit,
  } = controls
  const { activity, finalizeMutation, sessionLoader, resolvedQuizId, router, canFinalize } = finalization
  const { session, question } = activeData
  const showImmediateFeedback = shouldShowImmediateFeedback(session.mode, saveState.submitted, lastAnswerResult)

  return (
    <>
      <QuizLoadingOverlay isOpen={sessionLoader.isOpen} progress={sessionLoader.progress} status={sessionLoader.status} />
      <SessionLayout
        sessionData={activeData}
        currentQuestionIndex={currentQuestionIndex}
        answeredCount={answeredCount}
        submitted={saveState.submitted}
        isPending={finalizeMutation.isPending}
        answersDisabled={areSessionAnswersDisabled(isReadOnlyTab, isSubmitting, finalizeMutation.isPending)}
        submitDisabled={submitDisabled}
        isReadOnlyTab={isReadOnlyTab}
        takeOverLease={takeOverLease}
        answeredSet={answeredSet}
        enableAnimation={enableAnimation}
        onToggleAnimation={setEnableAnimation}
        onSelectOption={handleSelectOption}
        onNavigate={handleNavigate}
        navigationDisabled={!canNavigateQuestions}
        onSubmit={onSubmit}
        onExit={onExit}
        explanationContent={
          <ExplanationPanel
            question={question}
            sessionMode={session.mode}
            submitted={saveState.submitted}
            showImmediateFeedback={showImmediateFeedback}
            lastAnswerResult={lastAnswerResult}
            enableAnimation={enableAnimation}
          />
        }
      >
        <DesktopSessionQuestionBody
          activeData={activeData}
          currentQuestionIndex={currentQuestionIndex}
          isReadOnlyTab={isReadOnlyTab}
          isSubmitting={isSubmitting}
          submitDisabled={submitDisabled}
          enableAnimation={enableAnimation}
          handleSelectOption={handleSelectOption}
          handleNavigate={handleNavigate}
          saveState={saveState}
          lastAnswerResult={lastAnswerResult}
          showImmediateFeedback={showImmediateFeedback}
          resolvedQuizId={resolvedQuizId}
          isFinalizing={finalizeMutation.isPending}
          hasFinalizationError={finalizeMutation.isError}
        />
        <DesktopSessionModalContent
          activeData={activeData}
          activity={activity}
          answeredCount={answeredCount}
          confirmOpen={confirmOpen}
          setConfirmOpen={setConfirmOpen}
          finalizeMutation={finalizeMutation}
          submitDisabled={confirmSubmitDisabled}
          enableAnimation={enableAnimation}
          canFinalize={canFinalize}
          sessionLoader={sessionLoader}
          resolvedQuizId={resolvedQuizId}
          router={router}
        />
      </SessionLayout>
    </>
  )
}

function getAnsweredQuestionSet(
  session: DesktopActiveSessionData['session'],
  acknowledgedQuestions: Set<number>,
  storeSessionId: string | null,
  resolvedSessionId: string,
  answeredQuestions: Set<number>,
) {
  const answeredSet = new Set(
    session.user_answers
      .map((answer) => answer.question_index)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < session.totalQuestions),
  )
  acknowledgedQuestions.forEach((index) => answeredSet.add(index))
  if (storeSessionId === resolvedSessionId) {
    answeredQuestions.forEach((index) => {
      if (index >= 0 && index < session.totalQuestions) answeredSet.add(index)
    })
  }
  return answeredSet
}

export function DesktopSessionContent({
  quizId,
  sessionId,
  resolvedQuizId,
  resolvedSessionId,
  setIsMobile,
}: DesktopSessionContentProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [enableAnimation, setEnableAnimation] = useAnimationPreference(false)
  const storeSessionId = useQuizSessionStore((state) => state.sessionId)
  const currentQuestionIndex = useQuizSessionStore((state) => state.currentQuestionIndex)
  const answeredQuestions = useQuizSessionStore((state) => state.answeredQuestions)
  const lastAnswerResult = useQuizSessionStore((state) => state.lastAnswerResult)
  const navigateToQuestion = useQuizSessionStore((state) => state.navigateToQuestion)
  const sessionLoader = useSessionLoader(true)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  const sessionQueries = useQuizSessionQueries(resolvedSessionId, currentQuestionIndex)
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
  } = sessionQueries
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
  const answerSync = useSessionAnswerSync({
    activeData,
    currentQuestionIndex,
    currentQuestion,
    preloadedQuestions,
    submitAnswer,
    isSubmitting,
    canWrite,
  })
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
  } = answerSync
  const canFinalize = useCallback(() => canWrite() && !isSubmitting && !hasUnsavedAnswers(), [canWrite, isSubmitting, hasUnsavedAnswers])
  const { finalizeMutation } = useSessionFinalize({ sessionId, quizId, canFinalize })
  const submitAvailability = getSessionSubmitAvailability({
    isReadOnlyTab,
    isAnswerSavePending: isSubmitting,
    hasUnsavedAnswers: hasUnsavedAnswers(),
    isFinalizing: finalizeMutation.isPending,
  })
  const submitDisabled = submitAvailability.submitActionDisabled
  const activity = useSessionActivityTracking({
    sessionId: resolvedSessionId,
    currentQuestionIndex,
    activeData,
    resolvedQuizId,
    canWrite,
  })
  const handleSubmit = useCallback(() => {
    if (canWrite() && !finalizeMutation.isPending) setConfirmOpen(true)
  }, [canWrite, finalizeMutation.isPending])
  const handleExit = useCallback(() => activity.setExitConfirmOpen(true), [activity.setExitConfirmOpen])
  const sessionLoaderStartedRef = useRef(false)

  useEffect(() => {
    if (sessionLoaderStartedRef.current) return
    sessionLoaderStartedRef.current = true
    if (!isQuizLoaderActive()) sessionLoader.open('Loading questions...')
  }, [sessionLoader])

  useEffect(() => {
    const realQuizId = (activeData?.session as any)?.quiz_id
    if (realQuizId && (quizId === 'undefined' || quizId === 'mix') && typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/quiz/' + realQuizId + '/session/' + sessionId)
    }
  }, [activeData?.session, quizId, sessionId])

  const isStillLoading = !isSessionQuestionReady({
    isInitialLoading,
    isReadyToRender,
    sessionStatus: activeData?.session.status,
  })

  useEffect(() => {
    if (!sessionLoaderStartedRef.current || !sessionLoader.isOpen) return
    if (isInitialError) sessionLoader.close()
    else if (activeData?.session.status === 'preparing') sessionLoader.setStatus('Shuffling quiz questions, please wait...')
    else if (!isReadyToRender) sessionLoader.setStatus('Preparing test environment...')
    else if (!isStillLoading) sessionLoader.complete()
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
      <DesktopSessionErrorState
        router={router}
        isInitialError={isInitialError}
        initialError={initialError}
        isPreloadError={isPreloadError}
        preloadError={preloadError}
        refetchInitial={refetchInitial}
        refetchPreload={refetchPreload}
      />
    )
  }

  if (isStillLoading || !activeData) {
    return <DesktopSessionLoadingState isStillLoading={isStillLoading} sessionLoader={sessionLoader} />
  }

  const answeredSet = getAnsweredQuestionSet(
    activeData.session,
    acknowledgedQuestions,
    storeSessionId,
    resolvedSessionId,
    answeredQuestions,
  )

  return (
    <DesktopSessionReadyContent
      data={{
        activeData,
        currentQuestionIndex,
        answeredCount: Math.min(answeredSet.size, activeData.session.totalQuestions),
        answeredSet,
        isReadOnlyTab,
        isSubmitting,
        submitDisabled,
        confirmSubmitDisabled: submitAvailability.confirmationDisabled,
        saveState: { selectedOptions, submitted, saveStatus, retryFailedAnswer, unsavedQuestionIndex, discardUnsavedAnswer },
        lastAnswerResult,
      }}
      controls={{
        takeOverLease,
        enableAnimation,
        setEnableAnimation,
        confirmOpen,
        setConfirmOpen,
        handleSelectOption,
        handleNavigate,
        canNavigateQuestions,
        onSubmit: handleSubmit,
        onExit: handleExit,
      }}
      finalization={{ activity, finalizeMutation, sessionLoader, resolvedQuizId, router, canFinalize }}
    />
  )
}
