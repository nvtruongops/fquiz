'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Menu, Bookmark, Hand } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { useSubmitAnswer } from '@/hooks/quiz/useSubmitAnswer'
import { cn } from '@/lib/core/utils/cn'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { QuizLoadingOverlay, useSessionLoader, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import { type SessionApiError } from '@/lib/modules/quiz/session-api'
import { useQuizSessionQueries } from '@/hooks/quiz/useQuizSessionQueries'
import { useSessionAnswerSync } from '@/hooks/quiz/useSessionAnswerSync'
import { useSessionActivityTracking } from '@/hooks/quiz/useSessionActivityTracking'
import { useSessionHydration } from '@/hooks/quiz/useSessionHydration'
import { useSessionFinalize } from '@/hooks/quiz/useSessionFinalize'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'

export default function QuizSessionMobilePage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId
  const resolvedQuizId = quizId ?? ''
  const resolvedSessionId = sessionId ?? ''
  const router = useRouter()
  // Force non-animated mode on mobile web
  const enableAnimation = false

  const currentQuestionIndex = useQuizSessionStore((s) => s.currentQuestionIndex)
  const answeredQuestions = useQuizSessionStore((s) => s.answeredQuestions)
  const lastAnswerResult = useQuizSessionStore((s) => s.lastAnswerResult)
  const navigateToQuestion = useQuizSessionStore((s) => s.navigateToQuestion)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [questionMapOpen, setQuestionMapOpen] = useState(false)
  const sessionLoader = useSessionLoader()

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

  const { isReadyToRender, isHydratedFromServer } = useSessionHydration({
    resolvedSessionId,
    resolvedQuizId,
    quizId: resolvedQuizId,
    sessionId: resolvedSessionId,
    initialData,
    isInitialFetching,
    initialError,
  })

  const { finalizeMutation } = useSessionFinalize({
    sessionId: resolvedSessionId,
    quizId: resolvedQuizId,
  })

  const submitMutation = useSubmitAnswer(resolvedSessionId)

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
    submitAnswer: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
  })

  const {
    exitConfirmOpen,
    setExitConfirmOpen,
    reportSessionActivity,
    inactivityPauseOpen,
    setInactivityPauseOpen,
    handleResumeInactivity,
  } = useSessionActivityTracking({
    sessionId: resolvedSessionId,
    currentQuestionIndex,
    activeData,
    resolvedQuizId,
  })

  const courseCode = activeData?.session?.courseCode
  const { pinnedQuestions, togglePinMutation } = usePinnedQuestions(courseCode)
  const [isRightHanded, setIsRightHanded] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fquiz_mobile_handedness')
      if (saved === 'right') {
        setIsRightHanded(true)
      }
    }
  }, [])

  const toggleHandedness = () => {
    setIsRightHanded((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('fquiz_mobile_handedness', next ? 'right' : 'left')
      }
      return next
    })
  }

  const sessionLoaderStartedRef = useRef(false)

  const [touchState, setTouchState] = useState({
    startX: 0,
    startY: 0,
    offsetX: 0,
    isDragging: false,
  })

  useEffect(() => {
    if (!sessionLoaderStartedRef.current) {
      sessionLoaderStartedRef.current = true
      if (!isQuizLoaderActive()) {
        sessionLoader.open('Đang tải bộ câu hỏi...')
      }
    }
  }, [sessionLoader])

  // Single unified loading state — covers both data loading and hydration
  const isStillLoading = isPreloading || isInitialLoading || !isReadyToRender || !activeData || activeData?.session.status === 'preparing'

  useEffect(() => {
    if (sessionLoaderStartedRef.current && sessionLoader.isOpen) {
      if (isInitialError) {
        sessionLoader.close()
      } else if (activeData?.session.status === 'preparing') {
        sessionLoader.setStatus('Đang trộn bộ đề, vui lòng chờ trong giây lát...')
      } else if (!isReadyToRender) {
        sessionLoader.setStatus('Đang chuẩn bị giao diện...')
      } else if (!isStillLoading) {
        sessionLoader.complete()
      }
    }
  }, [isStillLoading, isReadyToRender, isInitialError, activeData?.session.status, sessionLoader])

  useEffect(() => {
    setTouchState({ startX: 0, startY: 0, offsetX: 0, isDragging: false })
  }, [currentQuestionIndex])

  function handleSubmit() {
    if (!activeData?.session) return
    setConfirmOpen(true)
  }

  function handleConfirmSubmit() {
    if (!activeData?.session || finalizeMutation.isPending || submitMutation.isPending) {
      setConfirmOpen(false)
      return
    }

    setConfirmOpen(false)
    sessionLoader.open('Đang nộp bài và tổng hợp kết quả...')
    finalizeMutation.mutate()
  }

  function handleConfirmExitQuiz() {
    reportSessionActivity('pause')
    setExitConfirmOpen(false)
    sessionLoader.open('Đang lưu tiến trình và thoát phòng thi...')
    sessionLoader.completeAndNavigate(() => {
      router.push(activeData?.session?.is_temp ? '/' : `/quiz/${resolvedQuizId}`)
    })
  }

  function handleNavigate(index: number) {
    if (!isHydratedFromServer) return
    const effectiveTotal = activeData?.session.totalQuestions || 0
    if (index < 0 || index >= effectiveTotal) return
    
    navigateToQuestion(index)
    setQuestionMapOpen(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    setTouchState({
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      offsetX: 0,
      isDragging: true,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.isDragging || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - touchState.startX
    const dy = e.touches[0].clientY - touchState.startY

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setTouchState((prev) => ({
        ...prev,
        offsetX: dx,
      }))
    }
  }

  const handleTouchEnd = () => {
    if (!touchState.isDragging) return
    const { offsetX } = touchState
    const threshold = 50
    const effectiveTotal = activeData?.session?.totalQuestions || 0

    if (offsetX < -threshold && currentQuestionIndex < effectiveTotal - 1) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(30) } catch {}
      }
      handleNavigate(currentQuestionIndex + 1)
    } else if (offsetX > threshold && currentQuestionIndex > 0) {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(30) } catch {}
      }
      handleNavigate(currentQuestionIndex - 1)
    }

    setTouchState({ startX: 0, startY: 0, offsetX: 0, isDragging: false })
  }

  // Show error if preload failed
  if (isPreloadError || isInitialError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F7] p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-gray-100 bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-black text-gray-900">Lỗi phòng thi</h2>
          <p className="mb-6 text-sm text-gray-600">
            {(initialError as any)?.message || 'Vui lòng kiểm tra kết nối mạng và thử lại'}
          </p>
          <Button
            type="button"
            onClick={() => router.push(`/quiz/${resolvedQuizId}`)}
            className="w-full bg-[#5D7B6F] py-6 text-white hover:bg-[#4a6358]"
          >
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  if ((isStillLoading && !isQuizLoaderActive()) || !activeData) {
    return (
      <QuizLoadingOverlay
        isOpen={true}
        progress={sessionLoader.progress}
        status={sessionLoader.status || 'Đang tải bộ câu hỏi...'}
      />
    )
  }

  const { session, question } = activeData
  const effectiveTotal = session.totalQuestions || 0
  const effectiveIndex = Math.min(currentQuestionIndex, Math.max(effectiveTotal - 1, 0))
  const answeredFromSession = new Set(
    session.user_answers
      .map((answer) => answer.question_index)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < effectiveTotal)
  )
  if (selectedOptions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < effectiveTotal) {
    answeredFromSession.add(currentQuestionIndex)
  }
  const validStoreCount = Array.from(answeredQuestions)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < effectiveTotal).length

  const answeredCount = Math.min(Math.max(validStoreCount, answeredFromSession.size), effectiveTotal)
  const showImmediateFeedback = session.mode === 'immediate' && submitted && lastAnswerResult !== null
  const requiredSelectionCount = Math.max(question.answer_selection_count ?? 1, 1)
  const correctAnswerSet = showImmediateFeedback
    ? lastAnswerResult?.correctAnswers ?? [lastAnswerResult?.correctAnswer ?? -1]
    : []

  const isQuestionPinned = pinnedQuestions.some(
    (p) => (p.question_id && p.question_id === question._id) || p.text === question.text
  )

  const handleTogglePin = () => {
    togglePinMutation.mutate({
      question_id: question._id,
      quiz_id: resolvedQuizId,
      quiz_title: session.title || session.courseCode,
      course_code: session.courseCode || 'GENERAL',
      text: question.text,
      options: question.options,
      correct_answer: (question as any).correct_answer || [0],
      explanation: (question as any).explanation || '',
      image_url: question.image_url || '',
    })
  }

  return (
    <div className="flex h-screen flex-col bg-[#F9F9F7]">
      <QuizLoadingOverlay 
        isOpen={sessionLoader.isOpen} 
        progress={sessionLoader.progress} 
        status={sessionLoader.status} 
      />
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuestionMapOpen(true)}
              className="h-10 w-10 rounded-xl bg-gray-50 text-[#5D7B6F] hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{session.categoryName}</p>
              <p className="text-sm font-black text-[#5D7B6F]">{session.courseCode}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleHandedness}
              title={isRightHanded ? 'Đang ở chế độ Tay phải (Nhấn để đổi Tay trái)' : 'Đang ở chế độ Tay trái (Nhấn để đổi Tay phải)'}
              className={cn(
                "h-10 w-10 rounded-xl transition-all flex items-center justify-center gap-0.5",
                isRightHanded
                  ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                  : "bg-gray-50 text-[#5D7B6F] hover:bg-gray-100 border border-transparent"
              )}
            >
              <Hand className={cn("h-4 w-4 transition-transform duration-200", !isRightHanded ? "scale-x-[-1]" : "")} />
              <span className="text-[9px] font-black tracking-tighter uppercase">{isRightHanded ? 'R' : 'L'}</span>
            </Button>

            <div className="flex flex-col items-end">
              <QuizTimer
                startedAt={session.started_at}
                pausedAt={session.paused_at}
                totalPausedDurationMs={session.total_paused_duration_ms}
                sessionId={resolvedSessionId}
                className="text-[#5D7B6F] text-sm"
              />
              <p className="text-[10px] font-bold text-gray-400">
                {answeredCount}/{effectiveTotal} câu
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExitConfirmOpen(true)}
              className="h-10 w-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#5D7B6F] transition-all duration-300"
            style={{ width: `${(answeredCount / effectiveTotal) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div
          key={question._id || effectiveIndex}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: touchState.offsetX !== 0 ? `translateX(${touchState.offsetX}px)` : undefined,
            transition: touchState.isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
          className="space-y-6 p-4 pb-24 touch-pan-y select-none"
        >
          {/* Question Number & Pin Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">
                Câu {effectiveIndex + 1}/{effectiveTotal}
              </h2>
              <p className="text-xs font-bold text-gray-500">
                {requiredSelectionCount === 1
                  ? '• Chọn 1 đáp án'
                  : `• Chọn ${requiredSelectionCount} đáp án`}
                <span className="hidden sm:inline"> • Vuốt 👈 👉 để lật câu</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={togglePinMutation.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm shrink-0",
                isQuestionPinned
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <Bookmark className={cn("w-3.5 h-3.5", isQuestionPinned && "fill-current text-amber-600")} />
              <span>{isQuestionPinned ? 'Đã ghim' : 'Ghim câu'}</span>
            </button>
          </div>

          {/* Question Text */}
          <div className={cn("rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm", enableAnimation && "transition-all duration-300 shadow-md")}>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-900">
              {question.text}
            </p>

            {question.image_url && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={
                    /^(https?:\/\/|\/|data:image\/)/i.test(question.image_url) && !/javascript:/i.test(question.image_url)
                      ? question.image_url
                      : ''
                  }
                  alt="Minh họa câu hỏi"
                  className={cn("h-auto w-full object-contain", enableAnimation && "transition-transform duration-500 hover:scale-102")}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <MobileOptionItem
                key={idx}
                option={option}
                idx={idx}
                isSelected={selectedOptions.includes(idx)}
                isCorrect={showImmediateFeedback && correctAnswerSet.includes(idx)}
                isWrongSelected={showImmediateFeedback && selectedOptions.includes(idx) && !correctAnswerSet.includes(idx)}
                submitted={submitted}
                enableAnimation={enableAnimation}
                onSelectOption={handleSelectOption}
              />
            ))}
          </div>

          {/* Immediate Feedback */}
          {session.mode === 'immediate' && (
            <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-gray-400">
                Giải thích
              </h3>
              {showImmediateFeedback ? (
                <div className="flex items-start gap-3">
                  {lastAnswerResult?.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                  )}
                  <div className="flex-1">
                    <p className="mb-2 font-bold text-gray-900">
                      {lastAnswerResult?.isCorrect ? 'Bạn đã trả lời đúng!' : 'Bạn trả lời chưa đúng.'}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                      {lastAnswerResult?.explanation || 'Hệ thống chưa có phần giải thích cho câu này.'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-gray-500">
                  Chưa có giải thích. Sau khi nộp đáp án, nội dung giải thích sẽ hiển thị tại đây.
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-gray-200 bg-white p-2 pb-8 md:pb-4 shadow-lg z-50">
        <div className={cn("flex items-center justify-between gap-3", isRightHanded && "flex-row-reverse")}>
          {/* Back/Next buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleNavigate(effectiveIndex - 1)}
              disabled={effectiveIndex === 0}
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-gray-200 p-0 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              onClick={() => handleNavigate(effectiveIndex + 1)}
              disabled={effectiveIndex === effectiveTotal - 1}
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-gray-200 p-0 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Submit button on the right */}
          <Button
            onClick={handleSubmit}
            disabled={finalizeMutation.isPending}
            className="h-12 flex-1 rounded-xl bg-[#5D7B6F] font-bold uppercase tracking-wider text-white hover:bg-[#4a6358]"
          >
            {finalizeMutation.isPending ? 'Đang nộp...' : 'Nộp bài'}
          </Button>
        </div>
      </div>

      {/* Question Map Dialog */}
      <Dialog open={questionMapOpen} onOpenChange={setQuestionMapOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[85vh] rounded-2xl p-0 sm:max-w-md flex flex-col overflow-hidden">
          <DialogHeader className="border-b border-gray-200 px-6 py-4 shrink-0">
            <DialogTitle className="text-lg font-black text-[#5D7B6F]">Danh sách câu hỏi</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Đã trả lời: {answeredCount}/{effectiveTotal} câu
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-5 gap-2 pb-2">
              {Array.from({ length: effectiveTotal }, (_, i) => {
                const isAnswered = answeredFromSession.has(i)
                const isCurrent = i === effectiveIndex

                return (
                  <button
                    key={i}
                    onClick={() => handleNavigate(i)}
                    className={cn(
                      'flex h-12 items-center justify-center rounded-xl font-bold transition-all active:scale-95',
                      isCurrent && 'ring-2 ring-[#5D7B6F] ring-offset-2',
                      isAnswered && !isCurrent && 'bg-[#5D7B6F] text-white',
                      !isAnswered && !isCurrent && 'border-2 border-gray-200 bg-white text-gray-600 hover:border-[#A4C3A2]'
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl px-6 py-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black text-[#5D7B6F]">
              Xác nhận nộp bài
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm text-gray-600">
              Bạn đã làm {answeredCount}/{effectiveTotal} câu. Bạn có chắc chắn muốn nộp không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-3 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-xl border-2 py-6 font-bold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={submitMutation.isPending || finalizeMutation.isPending}
              className="flex-1 rounded-xl bg-[#5D7B6F] py-6 font-bold text-white hover:bg-[#4a6358]"
            >
              {finalizeMutation.isPending ? 'Đang nộp...' : 'Nộp bài'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl px-6 py-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black text-[#5D7B6F]">
              Quiz chưa hoàn thành
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm text-gray-600">
              Bạn đang ở câu {effectiveIndex + 1}/{effectiveTotal}, đã trả lời {answeredCount}/{effectiveTotal} câu.
              <br />
              Bạn có muốn thoát không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-3 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExitConfirmOpen(false)}
              className="flex-1 rounded-xl border-2 py-6 font-bold"
            >
              Ở lại
            </Button>
            <Button
              type="button"
              onClick={handleConfirmExitQuiz}
              className="flex-1 rounded-xl bg-[#5D7B6F] py-6 font-bold text-white hover:bg-[#4a6358]"
            >
              Thoát
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5-minute Per-Question Inactivity Pause Dialog */}
      <Dialog open={inactivityPauseOpen} onOpenChange={setInactivityPauseOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl px-6 py-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black text-[#5D7B6F]">
              Đã tự động tạm dừng
            </DialogTitle>
            <DialogDescription className="pt-2 text-center text-sm text-gray-600">
              Bạn đã dừng thao tác trên câu hỏi này quá 5 phút. Bài thi đã tự động tạm dừng đếm giờ để bảo toàn tiến trình của bạn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-center">
            <Button
              type="button"
              onClick={handleResumeInactivity}
              className="w-full rounded-xl bg-[#5D7B6F] py-6 font-bold text-white hover:bg-[#4a6358]"
            >
              Tiếp tục làm bài
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MobileOptionItem({
  option,
  idx,
  isSelected,
  isCorrect,
  isWrongSelected,
  submitted,
  enableAnimation,
  onSelectOption,
}: {
  option: string
  idx: number
  isSelected: boolean
  isCorrect: boolean
  isWrongSelected: boolean
  submitted: boolean
  enableAnimation: boolean
  onSelectOption: (index: number) => void
}) {
  return (
    <button
      key={idx}
      onClick={() => onSelectOption(idx)}
      disabled={submitted}
      className={cn(
        'w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]',
        enableAnimation && 'duration-200 shadow-sm hover:shadow-md',
        isCorrect && 'border-green-500 bg-green-50',
        isWrongSelected && 'border-red-500 bg-red-50',
        !isCorrect && !isWrongSelected && isSelected && 'border-[#5D7B6F] bg-[#5D7B6F]/5 ring-2 ring-[#5D7B6F]/20',
        !isCorrect && !isWrongSelected && !isSelected && 'border-gray-200 bg-white hover:border-[#A4C3A2]',
        submitted && 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black',
            isCorrect && 'bg-green-500 text-white',
            isWrongSelected && 'bg-red-500 text-white',
            !isCorrect && !isWrongSelected && isSelected && 'bg-[#5D7B6F] text-white',
            !isCorrect && !isWrongSelected && !isSelected && 'bg-gray-100 text-gray-600'
          )}
        >
          {String.fromCodePoint(65 + idx)}
        </div>
        <p
          className={cn(
            'flex-1 text-sm leading-relaxed',
            isCorrect && 'font-bold text-green-700',
            isWrongSelected && 'font-bold text-red-700',
            !isCorrect && !isWrongSelected && isSelected && 'font-bold text-[#5D7B6F]',
            !isCorrect && !isWrongSelected && !isSelected && 'text-gray-700'
          )}
        >
          {option}
        </p>
      </div>
    </button>
  )
}
