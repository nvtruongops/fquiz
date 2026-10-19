'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useQuizDetailState } from '@/hooks/quiz/useQuizDetailState'
import { QuizLoadingOverlay } from '@/components/quiz/shared/QuizLoader'
import { QuizDetailHeader } from '@/components/quiz/detail/QuizDetailHeader'
import { QuizStats } from '@/components/quiz/detail/QuizStats'
import { QuizHistory } from '@/components/quiz/detail/QuizHistory'
import { QuizActionCard } from '@/components/quiz/detail/QuizActionCard'
import { QuizDetailErrorView } from '@/components/quiz/detail/QuizDetailErrorView'
import { QuizDetailSkeleton } from '@/components/quiz/detail/QuizDetailSkeleton'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'

export default function QuizDetailPage() {
  const {
    router,
    resolvedQuizId,
    quiz,
    isLoading,
    isError,
    error,
    currentUser,
    historyData,
    isHistoryLoading,
    selectedMode,
    setSelectedMode,
    selectedDifficulty,
    setSelectedDifficulty,
    modeSelectOpen,
    setModeSelectOpen,
    resumeDialogOpen,
    setResumeDialogOpen,
    activeSessionInfo,
    loadingOverlay,
    isStarting,
    handleStart,
    handleResumeSession,
    handleContinueActiveSession,
    handleRestartActiveSession,
  } = useQuizDetailState()

  if (isLoading) return <QuizDetailSkeleton />
  if (isError) return <QuizDetailErrorView error={error as any} router={router} />

  const rawCode = quiz?.course_code || ''
  const baseCourseCode = rawCode ? rawCode.split('_')[0].toLowerCase() : ''

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <QuizLoadingOverlay {...loadingOverlay} />

      <div className="fixed inset-0 pointer-events-none overflow-hidden transform-gpu -z-10">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-emerald-500/5 to-transparent blur-3xl opacity-40 transform-gpu" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-3 sm:px-6 py-4 sm:py-8 pb-40 md:pb-32 max-w-7xl mx-auto w-full">
        {/* Back Navigation Bar & Quick Stats */}
        <div className="w-full mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              aria-label="Back to quiz list"
              onClick={() => {
                if (baseCourseCode) {
                  router.push(`/courses/${baseCourseCode}`)
                } else if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back()
                } else {
                  router.push('/explore')
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-card hover:bg-muted text-foreground border border-border shadow-xs text-xs font-bold transition-all hover:-translate-x-1 active:translate-x-0 cursor-pointer group shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
              <span>Back</span>
            </button>

            <QuizStats numQuestions={quiz?.num_questions ?? 0} numAttempts={quiz?.num_attempts ?? 0} />
          </div>
        </div>

        <GsapStaggerContainer selector=".quiz-detail-section" stagger={0.08} y={16} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start">
          {/* Header & Comments Column */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-8 order-1 lg:order-1">
            <div className="quiz-detail-section">
              <QuizDetailHeader quiz={quiz ?? null} resolvedQuizId={resolvedQuizId} />
            </div>

            <div className="quiz-detail-section hidden lg:block">
              <QuizHistory
                quizId={resolvedQuizId}
                numQuestions={quiz?.num_questions ?? 0}
                historyData={historyData}
                isLoading={isHistoryLoading}
                currentUser={currentUser}
                onResumeSession={handleResumeSession}
                onAuthRequired={() => {
                  const safeCallback = encodeURIComponent(`/quiz/${resolvedQuizId}`)
                  router.push(`/login?callbackUrl=${safeCallback}`)
                }}
              />
            </div>
          </div>

          {/* Action Card & Stats Column */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-8 lg:sticky lg:top-24 h-fit order-2 lg:order-2">
            <div className="quiz-detail-section">
              <QuizActionCard
                quizId={resolvedQuizId}
                selectedMode={selectedMode}
                selectedDifficulty={selectedDifficulty}
                onModeChange={setSelectedMode}
                onDifficultyChange={setSelectedDifficulty}
                onStart={handleStart}
                isStarting={isStarting}
                modeSelectOpen={modeSelectOpen}
                setModeSelectOpen={setModeSelectOpen}
                resumeDialogOpen={resumeDialogOpen}
                setResumeDialogOpen={setResumeDialogOpen}
                activeSessionInfo={activeSessionInfo}
                onContinue={handleContinueActiveSession}
                onRestart={handleRestartActiveSession}
                onCloseResumeDialog={() => {
                  setResumeDialogOpen(false)
                }}
                currentUser={currentUser}
                hasHistory={Boolean(historyData?.completed_at)}
                latestSessionId={historyData?.attempts?.[0]?.session_id ?? historyData?._id}
              />
            </div>

          </div>

          {/* Quiz History for Mobile Only */}
          <div className="lg:hidden order-3">
            <QuizHistory
              quizId={resolvedQuizId}
              numQuestions={quiz?.num_questions ?? 0}
              historyData={historyData}
              isLoading={isHistoryLoading}
              currentUser={currentUser}
              onResumeSession={handleResumeSession}
              onAuthRequired={() => {
                const safeCallback = encodeURIComponent(`/quiz/${resolvedQuizId}`)
                router.push(`/login?callbackUrl=${safeCallback}`)
              }}
            />
          </div>
        </GsapStaggerContainer>
      </main>
    </div>
  )
}
