'use client'

import React from 'react'
import { Button } from '@/components/shared/ui/button'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { QuizLoadingOverlay, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import { useMobileQuizSessionController } from '@/hooks/quiz/useMobileQuizSessionController'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useAuth } from '@/hooks/auth/useAuth'
import { MobileSessionHeader } from '@/components/quiz/mobile/MobileSessionHeader'
import { MobileSessionQuestionCard } from '@/components/quiz/mobile/MobileSessionQuestionCard'
import { MobileSessionFooter } from '@/components/quiz/mobile/MobileSessionFooter'
import { MobileSessionDialogs } from '@/components/quiz/mobile/MobileSessionDialogs'
import { SessionSaveStatus } from '@/components/quiz/session/SessionSaveStatus'
import { SessionQueryError } from '@/components/quiz/session/SessionQueryError'
import { QuizSessionSkeleton } from '@/components/quiz/session/QuizSessionSkeleton'

export default function QuizSessionMobilePage() {
  const ctrl = useMobileQuizSessionController()
  const { data: authData } = useAuth()
  const isDevOrAdmin = authData?.user?.role === 'dev' || authData?.user?.role === 'admin'
  const rawNoteMode = useQuizSessionStore((s) => s.isNoteMode)
  const toggleNoteMode = useQuizSessionStore((s) => s.toggleNoteMode)
  const isNoteMode = isDevOrAdmin ? rawNoteMode : false

  if (ctrl.isPreloadError || ctrl.isInitialError) {
    return (
      <SessionQueryError
        title="Exam Room Error"
        message={ctrl.initialError?.message || ctrl.preloadError?.message || 'Please check your network connection and try again'}
        backLabel="Back"
        dashboardLabel="Back to Dashboard"
        mobile
        canRetry={(ctrl.isInitialError && ctrl.initialError?.status !== 404 && ctrl.initialError?.status !== 410) ||
          (ctrl.isPreloadError && ctrl.preloadError?.status !== 404 && ctrl.preloadError?.status !== 410)}
        onRetry={() => {
          if (ctrl.isInitialError && ctrl.initialError?.status !== 404 && ctrl.initialError?.status !== 410) void ctrl.refetchInitial()
          if (ctrl.isPreloadError && ctrl.preloadError?.status !== 404 && ctrl.preloadError?.status !== 410) void ctrl.refetchPreload()
        }}
        onBack={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            ctrl.router.back()
          } else {
            ctrl.router.push('/dashboard')
          }
        }}
        onDashboard={() => ctrl.router.push('/dashboard')}
      />
    )
  }

  if ((ctrl.isStillLoading && !isQuizLoaderActive()) || !ctrl.activeData) {
    if (!ctrl.sessionLoader.isOpen) {
      return <QuizSessionSkeleton />
    }
    return (
      <QuizLoadingOverlay
        isOpen={true}
        progress={ctrl.sessionLoader.progress}
        status={ctrl.sessionLoader.status || 'Loading questions...'}
      />
    )
  }

  const { session, question } = ctrl.activeData
  const effectiveTotal = session.totalQuestions || 0
  const effectiveIndex = Math.min(ctrl.currentQuestionIndex, Math.max(effectiveTotal - 1, 0))
  const answeredFromSession = new Set(
    session.user_answers
      .map((answer) => answer.question_index)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < effectiveTotal)
  )
  ctrl.acknowledgedQuestions.forEach((index) => answeredFromSession.add(index))
  const isMatchingSessionStore = ctrl.storeSessionId === ctrl.resolvedSessionId
  if (isMatchingSessionStore) ctrl.answeredQuestions.forEach((index) => { if (index >= 0 && index < effectiveTotal) answeredFromSession.add(index) })
  const answeredCount = Math.min(answeredFromSession.size, effectiveTotal)
  const showImmediateFeedback = session.mode === 'immediate' && ctrl.submitted && ctrl.lastAnswerResult !== null
  const requiredSelectionCount = Math.max(question.answer_selection_count ?? 1, 1)
  const correctAnswerSet = showImmediateFeedback
    ? ctrl.lastAnswerResult?.correctAnswers ?? [ctrl.lastAnswerResult?.correctAnswer ?? -1]
    : []

  const isQuestionPinned = ctrl.pinnedQuestions.some(
    (p) => (p.question_id && p.question_id === question._id) || p.text === question.text
  )

  const handleTogglePin = () => {
    ctrl.togglePinMutation.mutate({
      question_id: question._id,
      quiz_id: ctrl.resolvedQuizId,
      quiz_title: session.title || session.courseCode,
      course_code: session.courseCode || 'GENERAL',
      text: question.text,
      options: question.options,
      correct_answer: (question as any).correct_answer || (ctrl.lastAnswerResult?.correctAnswers ? ctrl.lastAnswerResult.correctAnswers : []),
      explanation: (question as any).explanation || '',
      image_url: question.image_url || '',
    })
  }

  return (
    <div className="flex h-screen flex-col bg-page-bg text-card-foreground">
      <QuizLoadingOverlay
        isOpen={ctrl.sessionLoader.isOpen}
        progress={ctrl.sessionLoader.progress}
        status={ctrl.sessionLoader.status}
      />

      {ctrl.isReadOnlyTab && (
        <div className="flex items-center justify-between gap-2 border-b border-warning-border bg-warning-bg px-4 py-2 text-xs text-warning-fg">
          <span>Read-only: session open in another tab.</span>
          <button type="button" onClick={ctrl.takeOverLease} className="shrink-0 font-semibold underline">Continue here</button>
        </div>
      )}
      <SessionSaveStatus status={ctrl.saveStatus} onRetry={ctrl.retryFailedAnswer} onReviewDraft={() => { if (ctrl.unsavedQuestionIndex !== null) ctrl.handleNavigate(ctrl.unsavedQuestionIndex) }} onDiscardDraft={ctrl.discardUnsavedAnswer} draftQuestionNumber={ctrl.unsavedQuestionIndex === null ? null : ctrl.unsavedQuestionIndex + 1} disabled={ctrl.isReadOnlyTab || ctrl.submitMutation.isPending || ctrl.finalizeMutation.isPending} />

      {/* Mobile Header */}
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

      {/* Main Content */}
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
            correctAnswerSet={correctAnswerSet}
            selectedOptions={ctrl.selectedOptions}
            submitted={ctrl.submitted}
            isSubmitting={ctrl.isReadOnlyTab || ctrl.submitMutation.isPending || ctrl.finalizeMutation.isPending}
            onSelectOption={ctrl.handleSelectOption}
            mode={session.mode}
            currentCourseCode={session.courseCode}
          />
        </div>
      </ScrollArea>

      {/* Navigation Footer */}
      <MobileSessionFooter
        isRightHanded={ctrl.isRightHanded}
        effectiveIndex={effectiveIndex}
        effectiveTotal={effectiveTotal}
        onNavigate={ctrl.handleNavigate}
        onSubmit={ctrl.handleSubmit}
        submitDisabled={ctrl.submitDisabled}
      />

      {/* Dialogs */}
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
        isFinalizePending={ctrl.finalizeMutation.isPending}
        submitDisabled={ctrl.submitDisabled}
      />
    </div>
  )
}
