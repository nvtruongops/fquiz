'use client'

import React from 'react'
import QuizHeader from '@/components/quiz/QuizHeader'
import QuizSidebar from '@/components/quiz/QuizSidebar'
import { QuizTimer } from '@/components/QuizTimer'
import { SessionData } from '@/types/session'

interface SessionLayoutProps {
  sessionData: SessionData
  currentQuestionIndex: number
  answeredCount: number
  selectedOptions: number[]
  submitted: boolean
  isPending: boolean
  children: React.ReactNode
  onSelectOption: (idx: number) => void
  onNavigate: (idx: number) => void
  onSubmit: () => void
}

export function SessionLayout({
  sessionData,
  currentQuestionIndex,
  answeredCount,
  selectedOptions,
  submitted,
  isPending,
  children,
  onSelectOption,
  onNavigate,
  onSubmit
}: SessionLayoutProps) {
  const { session, question } = sessionData
  const effectiveTotal = session.totalQuestions || 0

  return (
    <div className="quiz-scroll h-screen overflow-auto bg-[#ececec] font-sans">
      <div className="flex min-h-full min-w-[820px] flex-col">
        <QuizHeader
          categoryName={session.categoryName}
          courseCode={session.courseCode}
          totalQuestions={effectiveTotal}
          currentIndex={currentQuestionIndex}
          answeredCount={answeredCount}
        >
          <QuizTimer
            startedAt={session.started_at}
            pausedAt={session.paused_at}
            totalPausedDurationMs={session.total_paused_duration_ms}
            className="text-[#5D7B6F]"
          />
        </QuizHeader>

        <div className="flex min-h-0 flex-1">
          <QuizSidebar
            onSelectOption={onSelectOption}
            onNavigate={onNavigate}
            onSubmit={onSubmit}
            currentIndex={currentQuestionIndex}
            totalQuestions={effectiveTotal}
            selectedOptions={selectedOptions}
            optionCount={question.options.length}
            isSubmitted={submitted}
            isPending={isPending}
            answeredCount={answeredCount}
          />

          <main className="min-w-0 flex-1 border-l-2 border-[#101010] bg-[#ececec]">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
