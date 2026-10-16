'use client'

import React from 'react'
import { XCircle } from 'lucide-react'
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

export default function QuizSessionMobilePage() {
  const ctrl = useMobileQuizSessionController()
  const { data: authData } = useAuth()
  const isDevOrAdmin = authData?.user?.role === 'dev' || authData?.user?.role === 'admin'
  const rawNoteMode = useQuizSessionStore((s) => s.isNoteMode)
  const toggleNoteMode = useQuizSessionStore((s) => s.toggleNoteMode)
  const isNoteMode = isDevOrAdmin ? rawNoteMode : false

  if (ctrl.isPreloadError || ctrl.isInitialError) {
    return (
      <div className="flex h-screen items-center justify-center bg-page-bg p-6 text-card-foreground">
        <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-black text-card-foreground">Exam Room Error</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {(ctrl.initialError as any)?.message || 'Please check your network connection and try again'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  ctrl.router.back()
                } else {
                  ctrl.router.push('/dashboard')
                }
              }}
              className="w-full py-6 font-bold border-border text-card-foreground hover:bg-muted cursor-pointer"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => ctrl.router.push('/dashboard')}
              className="w-full bg-primary py-6 text-primary-foreground hover:bg-primary/90 font-black cursor-pointer"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if ((ctrl.isStillLoading && !isQuizLoaderActive()) || !ctrl.activeData) {
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
  if (ctrl.selectedOptions.length > 0 && ctrl.currentQuestionIndex >= 0 && ctrl.currentQuestionIndex < effectiveTotal) {
    answeredFromSession.add(ctrl.currentQuestionIndex)
  }
  const isMatchingSessionStore = ctrl.storeSessionId === ctrl.resolvedSessionId
  const validStoreCount = isMatchingSessionStore
    ? Array.from(ctrl.answeredQuestions).filter((index) => Number.isInteger(index) && index >= 0 && index < effectiveTotal).length
    : 0

  const answeredCount = Math.min(Math.max(validStoreCount, answeredFromSession.size), effectiveTotal)
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
            isSubmitting={ctrl.submitMutation.isPending}
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
      />
    </div>
  )
}
