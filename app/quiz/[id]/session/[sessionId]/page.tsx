'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/quiz/useSubmitAnswer'
import QuizSessionMobilePage from '@/app/quiz/[id]/session/[sessionId]/mobile/page'
import { QuizLoadingOverlay, useSessionLoader } from '@/components/quiz/shared/QuizLoader'
import { useToast } from '@/store/shared/toast-store'

// Sub-components
import { SessionLayout } from '@/components/quiz/session/SessionLayout'
import { QuestionDisplay } from '@/components/quiz/session/QuestionDisplay'
import { SessionModals } from '@/components/quiz/session/SessionModals'

import { useQuizSessionQueries } from '@/hooks/quiz/useQuizSessionQueries'
import { useSessionAnswerSync } from '@/hooks/quiz/useSessionAnswerSync'
import { useSessionActivityTracking } from '@/hooks/quiz/useSessionActivityTracking'
import { SessionApiError } from '@/lib/modules/quiz/session-api'
import { useSessionHydration } from '@/hooks/quiz/useSessionHydration'
import { useSessionFinalize } from '@/hooks/quiz/useSessionFinalize'


export default function QuizSessionPage() {
  const params = useParams()
  const quizId = params.id as string
  const sessionId = params.sessionId as string

  // Use base-64 decoded values to prevent router hydration differences
  const resolvedQuizId = typeof window !== 'undefined' ? quizId : ''
  const resolvedSessionId = typeof window !== 'undefined' ? sessionId : ''

  const [isMobile, setIsMobile] = useState(false)

  if (isMobile) {
    return <QuizSessionMobilePage />
  }

  return (
    <DesktopSessionContent
      quizId={quizId}
      sessionId={sessionId}
      resolvedQuizId={resolvedQuizId}
      resolvedSessionId={resolvedSessionId}
      setIsMobile={setIsMobile}
    />
  )
}

import { useAnimationPreference } from '@/hooks/quiz/useAnimationPreference'

function DesktopSessionContent({
  quizId,
  sessionId,
  resolvedQuizId,
  resolvedSessionId,
  setIsMobile,
}: {
  quizId: string
  sessionId: string
  resolvedQuizId: string
  resolvedSessionId: string
  setIsMobile: (v: boolean) => void
}) {
  const router = useRouter()
  const [enableAnimation, setEnableAnimation] = useAnimationPreference(true)

  const {
    currentQuestionIndex,
    answeredQuestions,
    lastAnswerResult,
    resumeSession,
    navigateToQuestion,
  } = useQuizSessionStore()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const sessionLoader = useSessionLoader()

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
    activeData,
    currentQuestion,
    preloadedQuestions,
    isPreloading,
    isPreloadError,
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

  const { finalizeMutation } = useSessionFinalize({
    sessionId,
    quizId,
  })

  const { mutate: submitAnswer, isPending: isSubmitting } = useSubmitAnswer(resolvedSessionId)

  const {
    selectedOptions,
    setSelectedOptions,
    submitted,
    feedbackByQuestion,
    handleSelectOption,
  } = useSessionAnswerSync({
    activeData,
    currentQuestionIndex,
    currentQuestion,
    preloadedQuestions,
    submitAnswer,
    isSubmitting,
  })

  const {
    exitConfirmOpen,
    setExitConfirmOpen,
    reportSessionActivity,
  } = useSessionActivityTracking({
    sessionId: resolvedSessionId,
    currentQuestionIndex,
    activeData,
    resolvedQuizId,
  })

  // Stable callbacks for React.memo-wrapped children.
  const handleSubmit = useCallback(() => setConfirmOpen(true), [])
  const handleExit = useCallback(() => setExitConfirmOpen(true), [])

  if (isPreloadError || isInitialError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f3f3] font-sans">
        <div className="max-w-sm border-2 border-[#101010] bg-white p-6 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-[26px] font-bold text-[#111111]">Lỗi phòng thi</h2>
          <p className="mt-2 text-[16px] text-[#444444]">
            {(initialError as any)?.message || 'Không thể tải dữ liệu'}
          </p>
          <Button type="button" onClick={() => router.back()} className="mt-5 rounded-none border-2 border-[#101010] bg-[#efefef] text-[18px] font-semibold text-[#111111] hover:bg-white">Quay lại</Button>
        </div>
      </div>
    )
  }

  const isStillLoading = isPreloading || isInitialLoading || !isReadyToRender || !activeData || activeData.session.status === 'preparing'

  if (isStillLoading) {
    const statusMessage = activeData?.session.status === 'preparing'
      ? 'Đang trộn bộ đề, vui lòng chờ trong giây lát...'
      : (!isReadyToRender ? 'Sẵn sàng...' : 'Đang tải bộ câu hỏi...')
    const progressValue = activeData?.session.status === 'preparing'
      ? 45
      : (!isReadyToRender ? 95 : 60)
    return <QuizLoadingOverlay isOpen={true} progress={progressValue} status={statusMessage} />
  }

  const { session, question } = activeData
  const answeredCount = Math.max(answeredQuestions.size, new Set(session.user_answers.map(a => a.question_index)).size + (selectedOptions.length > 0 ? 1 : 0))

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
      selectedOptions={selectedOptions}
      submitted={submitted}
      isPending={finalizeMutation.isPending}
      enableAnimation={enableAnimation}
      onToggleAnimation={setEnableAnimation}
      onSelectOption={handleSelectOption}
      onNavigate={navigateToQuestion}
      onSubmit={handleSubmit}
      onExit={handleExit}
    >
      <QuestionDisplay
        question={question}
        currentIndex={currentQuestionIndex}
        totalQuestions={session.totalQuestions}
        selectedOptions={selectedOptions}
        submitted={submitted}
        showImmediateFeedback={session.mode === 'immediate' && submitted && lastAnswerResult !== null}
        lastAnswerResult={lastAnswerResult}
        onSelectOption={handleSelectOption}
        isPending={finalizeMutation.isPending}
        sessionMode={session.mode}
        enableAnimation={enableAnimation}
      />
      <SessionModals
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        exitConfirmOpen={exitConfirmOpen}
        setExitConfirmOpen={setExitConfirmOpen}
        answeredCount={answeredCount}
        totalQuestions={session.totalQuestions}
        isPending={finalizeMutation.isPending}
        enableAnimation={enableAnimation}
        onConfirmSubmit={() => { setConfirmOpen(false); finalizeMutation.mutate(); }}
        onConfirmExit={() => { setExitConfirmOpen(false); reportSessionActivity('pause'); router.push(session.is_temp ? '/' : `/quiz/${resolvedQuizId}`); }}
      />
    </SessionLayout>
  </>
)
}

// Note: QuizSessionPage (above) handles isMobile detection and delegates to
// either QuizSessionMobilePage or DesktopSessionContent. DesktopSessionContent
// only mounts on desktop, avoiding wasted hooks/network calls on mobile.

