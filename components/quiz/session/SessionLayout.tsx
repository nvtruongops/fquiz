'use client'

import React from 'react'
import QuizHeader from '@/components/quiz/session/QuizHeader'
import QuizSidebar from '@/components/quiz/session/QuizSidebar'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { SessionData } from '@/lib/modules/quiz/types/session'

interface SessionLayoutProps {
  sessionData: SessionData
  currentQuestionIndex: number
  answeredCount: number
  selectedOptions: number[]
  submitted: boolean
  isPending: boolean
  enableAnimation?: boolean
  onToggleAnimation?: (enabled: boolean) => void
  children: React.ReactNode
  onSelectOption: (idx: number) => void
  onNavigate: (idx: number) => void
  onSubmit: () => void
  onExit: () => void
}

export const SessionLayout = React.memo(function SessionLayout({
  sessionData,
  currentQuestionIndex,
  answeredCount,
  selectedOptions,
  submitted,
  isPending,
  enableAnimation = true,
  onToggleAnimation,
  children,
  onSelectOption,
  onNavigate,
  onSubmit,
  onExit
}: SessionLayoutProps) {
  const { session, question } = sessionData
  const effectiveTotal = session.totalQuestions || 0

  const answeredSet = React.useMemo(() => {
    const set = new Set<number>()
    session.user_answers?.forEach((ans) => {
      if (typeof ans.question_index === 'number') set.add(ans.question_index)
    })
    if (selectedOptions.length > 0) {
      set.add(currentQuestionIndex)
    }
    return set
  }, [session.user_answers, selectedOptions, currentQuestionIndex])

  return (
    <div className={enableAnimation ? "quiz-scroll h-screen overflow-auto bg-slate-100 dark:bg-slate-950 font-sans" : "quiz-scroll h-screen overflow-auto bg-[#ececec] font-sans"}>
      <div className="flex min-h-full min-w-[820px] flex-col">
        <QuizHeader
          categoryName={session.categoryName}
          courseCode={session.courseCode}
          totalQuestions={effectiveTotal}
          currentIndex={currentQuestionIndex}
          answeredCount={answeredCount}
          enableAnimation={enableAnimation}
          onToggleAnimation={onToggleAnimation}
        >
          <QuizTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            totalPausedDurationMs={session.total_paused_duration_ms}
            className={enableAnimation ? "text-primary font-bold text-xs sm:text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20" : "text-[#5D7B6F]"}
          />
        </QuizHeader>

        <div className="flex min-h-0 flex-1">
          <QuizSidebar
            onSelectOption={onSelectOption}
            onNavigate={onNavigate}
            onSubmit={onSubmit}
            onExit={onExit}
            currentIndex={currentQuestionIndex}
            totalQuestions={effectiveTotal}
            selectedOptions={selectedOptions}
            optionCount={question.options.length}
            isSubmitted={submitted}
            isPending={isPending}
            answeredCount={answeredCount}
            enableAnimation={enableAnimation}
            answeredSet={answeredSet}
          />

          <main className={enableAnimation ? "min-w-0 flex-1 bg-slate-50/50 dark:bg-slate-900/50" : "min-w-0 flex-1 border-l-2 border-[#101010] bg-[#ececec]"}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
})
