'use client'

import React from 'react'
import QuizHeader from '@/components/quiz/session/QuizHeader'
import QuizSidebar from '@/components/quiz/session/QuizSidebar'
import { useAuth } from '@/hooks/auth/useAuth'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { SessionData } from '@/lib/modules/quiz/types/session'
import { useQuizKeyboardNavigation } from '@/hooks/quiz/useQuizKeyboardNavigation'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/core/utils/cn'

const QuizAIAssistantDrawer = dynamic(
  () => import('@/components/quiz/session/QuizAIAssistantDrawer').then((m) => m.QuizAIAssistantDrawer),
  { ssr: false }
)

interface SessionLayoutProps {
  sessionData: SessionData
  currentQuestionIndex: number
  answeredCount: number
  submitted: boolean
  isPending: boolean
  answersDisabled?: boolean
  submitDisabled?: boolean
  isReadOnlyTab: boolean
  takeOverLease: () => void
  answeredSet: Set<number>
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
  submitted,
  isPending,
  answersDisabled,
  submitDisabled,
  isReadOnlyTab,
  takeOverLease,
  answeredSet,
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

  const { data: authData } = useAuth()
  const isDevOrAdmin = authData?.user?.role === 'dev' || authData?.user?.role === 'admin'

  const rawNoteMode = useQuizSessionStore((s) => s.isNoteMode)
  const toggleNoteMode = useQuizSessionStore((s) => s.toggleNoteMode)

  const isNoteMode = isDevOrAdmin ? rawNoteMode : false
  const handleToggleNoteMode = isDevOrAdmin ? toggleNoteMode : undefined

  const [isExplanationOpen, setIsExplanationOpen] = React.useState(false)
  const toggleExplanation = React.useCallback(() => setIsExplanationOpen(prev => !prev), [])

  const { focusedOption } = useQuizKeyboardNavigation({
    currentIndex: currentQuestionIndex,
    totalQuestions: effectiveTotal,
    optionCount: question?.options?.length ?? 0,
    disabled: submitted || isPending || answersDisabled,
    onNavigate,
    onSelectOption,
  })

  // Inject explanation toggle props & focusedOption into children (QuestionDisplay & SessionModals)
  const augmentedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        isExplanationOpen,
        onToggleExplanation: toggleExplanation,
        isNoteMode,
        onToggleNoteMode: handleToggleNoteMode,
        focusedOption,
        onNavigate,
        onSubmit,
        onExit,
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
    <div className="h-dvh max-h-dvh min-h-dvh overflow-hidden flex flex-col font-sans bg-background text-foreground">
      {/* Multi-Tab Authoritative Lease Warning Banner */}
      {isReadOnlyTab && (
        <div className="bg-warning-bg border-b border-warning-border text-warning-fg px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium z-50">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Chế độ xem (Multi-tab Lock):</span>
            <span>Phiên thi này đang mở ở một tab khác. Tab này chỉ có quyền đọc để bảo toàn tiến độ thi.</span>
          </div>
          <button
            type="button"
            onClick={takeOverLease}
            className="bg-warning-fg text-warning-bg px-2.5 py-1 rounded text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            Tiếp tục làm tại tab này
          </button>
        </div>
      )}

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
        isNoteMode={isNoteMode}
        onToggleNoteMode={handleToggleNoteMode}
      >
        <QuizTimer
          startedAt={session.started_at}
          pausedAt={session.paused_at}
          totalPausedDurationMs={session.total_paused_duration_ms}
          sessionId={session._id || (session as any).id}
          className="text-primary font-bold text-xs sm:text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
        />
      </QuizHeader>

      {/* 3-Column Vertical Panels Workspace */}
      <div className="flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        {/* Column 1: Left Quiz Sidebar & Navigator (Only in Animated / Modern UI mode) */}
        {enableAnimation && (
          <QuizSidebar
            onNavigate={onNavigate}
            onSubmit={onSubmit}
            onExit={onExit}
            currentIndex={currentQuestionIndex}
            totalQuestions={effectiveTotal}
            isPending={isPending}
            submitDisabled={submitDisabled}
            answeredCount={answeredCount}
            enableAnimation={enableAnimation}
            answeredSet={answeredSet}
          />
        )}

        {/* Column 2: Center Question & Options Display */}
        <main data-quiz-content className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-background">
          {augmentedChildren}
        </main>

        {/* Column 3: Right Detailed Explanation Panel (Collapsed by default, opens on toggle) */}
        {explanationContent && isExplanationOpen && (
          <aside className={cn(
            "w-[320px] lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-y-auto quiz-scroll p-4 sm:p-5 border-l border-border bg-card text-card-foreground",
            enableAnimation && "animate-in fade-in slide-in-from-right-4 duration-300"
          )}>
            {augmentedExplanation}
          </aside>
        )}

        {/* AI Assistant Drawer - STRICTLY Practice Mode ONLY (Prohibited in Exam/Review mode) */}
        {session.mode === 'immediate' && (
          <QuizAIAssistantDrawer
            sessionId={session._id || (session as any).id}
            currentQuestionIndex={currentQuestionIndex}
            currentQuestion={question}
          />
        )}
      </div>
    </div>
  )
})
