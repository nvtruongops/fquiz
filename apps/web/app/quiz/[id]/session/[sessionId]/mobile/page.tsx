'use client'

import React from 'react'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { QuizLoadingOverlay, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import { useMobileQuizSessionController } from '@/hooks/quiz/useMobileQuizSessionController'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useAuth } from '@/hooks/auth/useAuth'
import { MobileSessionHeader } from '@/components/quiz/mobile/MobileSessionHeader'
import { MobileSessionQuestionCard } from '@/components/quiz/mobile/MobileSessionQuestionCard'
import { PendingAnswerIndicator } from '@/components/quiz/session/PendingAnswerIndicator'
import { MobileSessionFooter } from '@/components/quiz/mobile/MobileSessionFooter'
import { MobileSessionDialogs } from '@/components/quiz/mobile/MobileSessionDialogs'
import { SessionSaveStatus } from '@/components/quiz/session/SessionSaveStatus'
import { SessionQueryError } from '@/components/quiz/session/SessionQueryError'
import { QuizSessionSkeleton } from '@/components/quiz/session/QuizSessionSkeleton'
import { shouldShowSessionSkeleton } from '@/hooks/quiz/session-rendering'

type MobileSessionController = ReturnType<typeof useMobileQuizSessionController>
type MobileSessionData = NonNullable<MobileSessionController['activeData']>
type MobileSession = MobileSessionData['session']
type MobileQuestion = MobileSessionData['question']

const MOBILE_RETRY_BLOCKED_STATUSES = new Set([404, 410])

function canRetryMobileSessionLoad(isError: boolean, error: { status?: number } | null | undefined) {
  return isError && !MOBILE_RETRY_BLOCKED_STATUSES.has(error?.status ?? 0)
}

function getMobileSessionErrorMessage(ctrl: MobileSessionController) {
  return [ctrl.initialError?.message, ctrl.preloadError?.message].find(Boolean)
    || 'Please check your network connection and try again'
}

function hasRetryableMobileSessionError(ctrl: MobileSessionController) {
  return [
    canRetryMobileSessionLoad(ctrl.isInitialError, ctrl.initialError),
    canRetryMobileSessionLoad(ctrl.isPreloadError, ctrl.preloadError),
  ].some(Boolean)
}

function retryMobileSessionQueries(ctrl: MobileSessionController) {
  const retryActions = [
    { shouldRetry: canRetryMobileSessionLoad(ctrl.isInitialError, ctrl.initialError), refetch: ctrl.refetchInitial },
    { shouldRetry: canRetryMobileSessionLoad(ctrl.isPreloadError, ctrl.preloadError), refetch: ctrl.refetchPreload },
  ]
  retryActions.filter((action) => action.shouldRetry).forEach((action) => void action.refetch())
}

function navigateBackFromMobileSession(router: MobileSessionController['router']) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/dashboard')
}

function MobileSessionErrorState({ ctrl }: { ctrl: MobileSessionController }) {
  return (
    <SessionQueryError
      title="Exam Room Error"
      message={getMobileSessionErrorMessage(ctrl)}
      backLabel="Back"
      dashboardLabel="Back to Dashboard"
      mobile
      canRetry={hasRetryableMobileSessionError(ctrl)}
      onRetry={() => retryMobileSessionQueries(ctrl)}
      onBack={() => navigateBackFromMobileSession(ctrl.router)}
      onDashboard={() => ctrl.router.push('/dashboard')}
    />
  )
}

function MobileSessionLoadingState({ ctrl }: { ctrl: MobileSessionController }) {
  if (shouldShowSessionSkeleton(ctrl.isStillLoading, ctrl.sessionLoader.isOpen, isQuizLoaderActive())) {
    return <QuizSessionSkeleton />
  }
  return (
    <QuizLoadingOverlay
      isOpen
      progress={ctrl.sessionLoader.progress}
      status={ctrl.sessionLoader.status || 'Loading questions...'}
    />
  )
}

function isValidAnsweredQuestionIndex(index: number, totalQuestions: number) {
  return Number.isInteger(index) && index >= 0 && index < totalQuestions
}

function getMobileAnsweredQuestionSet(ctrl: MobileSessionController, session: MobileSession, effectiveTotal: number) {
  const answeredQuestions = new Set([...ctrl.acknowledgedQuestions].filter((index) =>
    isValidAnsweredQuestionIndex(index, effectiveTotal)))
  return answeredQuestions
}

function shouldShowMobileImmediateFeedback(
  sessionMode: MobileSession['mode'],
  submitted: boolean,
  lastAnswerResult: MobileSessionController['lastAnswerResult'],
) {
  return sessionMode === 'immediate' && submitted && lastAnswerResult !== null
}

function getMobileCorrectAnswerSet(
  showImmediateFeedback: boolean,
  lastAnswerResult: MobileSessionController['lastAnswerResult'],
) {
  if (!showImmediateFeedback) return []
  return getMobileCorrectAnswers(lastAnswerResult)
}

function getMobileCorrectAnswers(lastAnswerResult: MobileSessionController['lastAnswerResult']) {
  const answer = lastAnswerResult ?? ({} as NonNullable<MobileSessionController['lastAnswerResult']>)
  return answer.correctAnswers ?? [answer.correctAnswer ?? -1]
}

function isMobileQuestionPinned(pinnedQuestions: MobileSessionController['pinnedQuestions'], question: MobileQuestion) {
  return pinnedQuestions.some((pinned) => (pinned.question_id && pinned.question_id === question._id) || pinned.text === question.text)
}

function handleMobileQuestionPin(ctrl: MobileSessionController, session: MobileSession, question: MobileQuestion) {
  ctrl.togglePinMutation.mutate({
    question_id: question._id,
    quiz_id: ctrl.resolvedQuizId,
    quiz_title: getMobileQuizTitle(session),
    course_code: getMobileCourseCode(session),
    text: question.text,
    options: question.options,
    correct_answer: getMobileQuestionCorrectAnswer(question, ctrl.lastAnswerResult),
    explanation: getOptionalQuestionText((question as any).explanation),
    image_url: getOptionalQuestionText(question.image_url),
  })
}

function getMobileQuizTitle(session: MobileSession) {
  return session.title || session.courseCode
}

function getMobileCourseCode(session: MobileSession) {
  return session.courseCode || 'GENERAL'
}

function getMobileQuestionCorrectAnswer(question: MobileQuestion, lastAnswerResult: MobileSessionController['lastAnswerResult']) {
  const correctAnswer = (question as any).correct_answer
  if (correctAnswer) return correctAnswer
  return lastAnswerResult?.correctAnswers || []
}

function getOptionalQuestionText(value: string | null | undefined) {
  return value || ''
}

function areMobileSessionAnswersDisabled(isReadOnlyTab: boolean, isFinalizing: boolean) {
  return isReadOnlyTab || isFinalizing
}

function getMobileReadyViewState(ctrl: MobileSessionController, activeData: MobileSessionData) {
  const { session, question } = activeData
  const effectiveTotal = session.totalQuestions || 0
  const effectiveIndex = Math.min(ctrl.currentQuestionIndex, Math.max(effectiveTotal - 1, 0))
  const answeredFromSession = getMobileAnsweredQuestionSet(ctrl, session, effectiveTotal)
  const showImmediateFeedback = shouldShowMobileImmediateFeedback(session.mode, ctrl.submitted, ctrl.lastAnswerResult)
  return {
    effectiveTotal,
    effectiveIndex,
    answeredFromSession,
    answeredCount: Math.min(answeredFromSession.size, effectiveTotal),
    showImmediateFeedback,
    requiredSelectionCount: Math.max(question.answer_selection_count ?? 1, 1),
    correctAnswerSet: getMobileCorrectAnswerSet(showImmediateFeedback, ctrl.lastAnswerResult),
    isQuestionPinned: isMobileQuestionPinned(ctrl.pinnedQuestions, question),
  }
}

function MobileSessionReadOnlyNotice({ isReadOnlyTab, takeOverLease }: { isReadOnlyTab: boolean; takeOverLease: () => void }) {
  if (!isReadOnlyTab) return null
  return (
    <div className="flex items-center justify-between gap-2 border-b border-warning-border bg-warning-bg px-4 py-2 text-xs text-warning-fg">
      <span>Read-only: session open in another tab.</span>
      <button type="button" onClick={takeOverLease} className="shrink-0 font-semibold underline">Continue here</button>
    </div>
  )
}

function MobileSessionFinalizationFailure({ isError }: { isError: boolean }) {
  if (!isError) return null
  return (
    <p role="alert" className="mx-4 my-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      Submission did not finish. Your answers are saved. Select Submit to try again.
    </p>
  )
}

function MobileSessionAnswerStatus({ ctrl }: { ctrl: MobileSessionController }) {
  return (
    <>
      <SessionSaveStatus
        status={ctrl.saveStatus}
        onRetry={ctrl.retryFailedAnswer}
        disabled={areMobileSessionAnswersDisabled(ctrl.isReadOnlyTab, ctrl.finalizeMutation.isPending)}
      />
      <MobileSessionFinalizationFailure isError={ctrl.finalizeMutation.isError} />
    </>
  )
}

function MobileSessionReadyContent({
  ctrl,
  activeData,
  isDevOrAdmin,
  isNoteMode,
  toggleNoteMode,
}: {
  ctrl: MobileSessionController
  activeData: MobileSessionData
  isDevOrAdmin: boolean
  isNoteMode: boolean
  toggleNoteMode: () => void
}) {
  const { session, question } = activeData
  const {
    effectiveTotal,
    effectiveIndex,
    answeredFromSession,
    answeredCount,
    showImmediateFeedback,
    requiredSelectionCount,
    correctAnswerSet,
    isQuestionPinned,
  } = getMobileReadyViewState(ctrl, activeData)
  const handleTogglePin = () => handleMobileQuestionPin(ctrl, session, question)

  return (
    <div className="flex h-screen flex-col bg-page-bg text-card-foreground">
      <QuizLoadingOverlay
        isOpen={ctrl.sessionLoader.isOpen}
        progress={ctrl.sessionLoader.progress}
        status={ctrl.sessionLoader.status}
      />
      <PendingAnswerIndicator
        mode={session.mode}
        submitted={ctrl.submitted}
        isPending={ctrl.submitMutation.isPending}
        showImmediateFeedback={showImmediateFeedback}
      />
      <MobileSessionReadOnlyNotice isReadOnlyTab={ctrl.isReadOnlyTab} takeOverLease={ctrl.takeOverLease} />
      <MobileSessionAnswerStatus ctrl={ctrl} />
      <MobileSessionHeader
        categoryName={session.categoryName}
        courseCode={session.courseCode}
        isDevOrAdmin={isDevOrAdmin}
        isNoteMode={isNoteMode}
        toggleNoteMode={toggleNoteMode}
        isRightHanded={ctrl.isRightHanded}
        toggleHandedness={ctrl.toggleHandedness}
        startedAt={session.started_at}
        pausedAt={session.paused_at}
        totalPausedDurationMs={session.total_paused_duration_ms}
        sessionId={ctrl.resolvedSessionId}
        answeredCount={answeredCount}
        effectiveTotal={effectiveTotal}
        onOpenQuestionMap={() => ctrl.setQuestionMapOpen(true)}
        onOpenExitConfirm={() => ctrl.setExitConfirmOpen(true)}
      />
      <ScrollArea className="flex-1">
        <div
          key={question._id || effectiveIndex}
          ref={ctrl.cardContainerRef}
          onTouchStart={ctrl.handleTouchStart}
          onTouchMove={ctrl.handleTouchMove}
          onTouchEnd={ctrl.handleTouchEnd}
          className="space-y-4 p-4 pb-20 transition-transform duration-150 ease-out"
        >
          <MobileSessionQuestionCard
            question={question}
            effectiveIndex={effectiveIndex}
            effectiveTotal={effectiveTotal}
            requiredSelectionCount={requiredSelectionCount}
            isQuestionPinned={isQuestionPinned}
            isPinPending={ctrl.togglePinMutation.isPending}
            onTogglePin={handleTogglePin}
            isNoteMode={isNoteMode}
            showImmediateFeedback={showImmediateFeedback}
            answerIsCorrect={ctrl.lastAnswerResult?.isCorrect ?? null}
            correctAnswerSet={correctAnswerSet}
            selectedOptions={ctrl.selectedOptions}
            submitted={ctrl.submitted}
            isSubmitting={areMobileSessionAnswersDisabled(ctrl.isReadOnlyTab, ctrl.finalizeMutation.isPending)}
            onSelectOption={ctrl.handleSelectOption}
            mode={session.mode}
            currentCourseCode={session.courseCode}
          />
        </div>
      </ScrollArea>
      <MobileSessionFooter
        isRightHanded={ctrl.isRightHanded}
        effectiveIndex={effectiveIndex}
        effectiveTotal={effectiveTotal}
        onNavigate={ctrl.handleNavigate}
        onSubmit={ctrl.handleSubmit}
        submitDisabled={ctrl.submitDisabled}
        navigationDisabled={ctrl.navigationDisabled}
      />
      <MobileSessionDialogs
        confirmOpen={ctrl.confirmOpen}
        setConfirmOpen={ctrl.setConfirmOpen}
        exitConfirmOpen={ctrl.exitConfirmOpen}
        setExitConfirmOpen={ctrl.setExitConfirmOpen}
        questionMapOpen={ctrl.questionMapOpen}
        setQuestionMapOpen={ctrl.setQuestionMapOpen}
        answeredCount={answeredCount}
        effectiveTotal={effectiveTotal}
        effectiveIndex={effectiveIndex}
        answeredFromSession={answeredFromSession}
        onConfirmSubmit={ctrl.handleConfirmSubmit}
        onConfirmExitQuiz={ctrl.handleConfirmExitQuiz}
        onNavigate={ctrl.handleNavigate}
        navigationDisabled={ctrl.navigationDisabled}
        isFinalizePending={ctrl.finalizeMutation.isPending}
        submitDisabled={ctrl.confirmSubmitDisabled}
      />
    </div>
  )
}

export default function QuizSessionMobilePage() {
  const ctrl = useMobileQuizSessionController()
  const { data: authData } = useAuth()
  const isDevOrAdmin = authData?.user?.role === 'dev' || authData?.user?.role === 'admin'
  const rawNoteMode = useQuizSessionStore((state) => state.isNoteMode)
  const toggleNoteMode = useQuizSessionStore((state) => state.toggleNoteMode)
  const isNoteMode = isDevOrAdmin ? rawNoteMode : false

  if (ctrl.isPreloadError || ctrl.isInitialError) return <MobileSessionErrorState ctrl={ctrl} />
  if (ctrl.isStillLoading || !ctrl.activeData) return <MobileSessionLoadingState ctrl={ctrl} />
  return (
    <MobileSessionReadyContent
      ctrl={ctrl}
      activeData={ctrl.activeData}
      isDevOrAdmin={isDevOrAdmin}
      isNoteMode={isNoteMode}
      toggleNoteMode={toggleNoteMode}
    />
  )
}
