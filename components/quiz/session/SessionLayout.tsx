'use client'

import React from 'react'
import QuizHeader from '@/components/quiz/session/QuizHeader'
import QuizSidebar from '@/components/quiz/session/QuizSidebar'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { SessionData } from '@/lib/modules/quiz/types/session'

import { cn } from '@/lib/core/utils/cn'

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
  explanationContent?: React.ReactNode
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
  explanationContent,
  onSelectOption,
  onNavigate,
  onSubmit,
  onExit
}: SessionLayoutProps) {
  const { session, question } = sessionData
  const effectiveTotal = session.totalQuestions || 0

  const [isExplanationOpen, setIsExplanationOpen] = React.useState(false)
  const toggleExplanation = React.useCallback(() => setIsExplanationOpen(prev => !prev), [])

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

  // Inject explanation toggle props into children (QuestionDisplay & SessionModals)
  const augmentedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        isExplanationOpen,
        onToggleExplanation: toggleExplanation,
      } as any)
    }
    return child
  })

  const augmentedExplanation = React.isValidElement(explanationContent)
    ? React.cloneElement(explanationContent, {
        onClose: () => setIsExplanationOpen(false),
      } as any)
    : explanationContent

  return (
    <div className={cn(
      "h-screen max-h-screen overflow-hidden flex flex-col font-sans select-none",
      enableAnimation ? "bg-slate-100 dark:bg-slate-950" : "bg-[#ececec]"
    )}>
      {/* Header */}
      <QuizHeader
        categoryName={session.categoryName}
        courseCode={session.courseCode}
        totalQuestions={effectiveTotal}
        currentIndex={currentQuestionIndex}
        answeredCount={answeredCount}
        enableAnimation={enableAnimation}
        onToggleAnimation={onToggleAnimation}
        isExplanationOpen={isExplanationOpen}
        onToggleExplanation={toggleExplanation}
      >
        <QuizTimer
          startedAt={session.started_at}
          pausedAt={session.paused_at}
          totalPausedDurationMs={session.total_paused_duration_ms}
          className={enableAnimation ? "text-primary font-bold text-xs sm:text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20" : "text-[#5D7B6F]"}
        />
      </QuizHeader>

      {/* 3-Column Vertical Panels Workspace */}
      <div className="flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        {/* Column 1: Left Quiz Sidebar & Navigator */}
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

        {/* Column 2: Center Question & Options Display */}
        <main className={cn(
          "flex-1 min-w-0 h-full overflow-y-auto quiz-scroll",
          enableAnimation ? "bg-slate-50/50 dark:bg-slate-900/50" : "border-l-2 border-r-2 border-[#101010] bg-[#ececec]"
        )}>
          {augmentedChildren}
        </main>

        {/* Column 3: Right Detailed Explanation Panel (Collapsed by default, opens on toggle) */}
        {explanationContent && isExplanationOpen && (
          <aside className={cn(
            "w-[320px] lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-y-auto quiz-scroll p-4 sm:p-5 animate-in fade-in slide-in-from-right-4 duration-300",
            enableAnimation
              ? "border-l border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md"
              : "border-l-2 border-[#101010] bg-[#e9e9e9]"
          )}>
            {augmentedExplanation}
          </aside>
        )}
      </div>
    </div>
  )
})
