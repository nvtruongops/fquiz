'use client'

import React from 'react'
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Menu, Bookmark, Hand } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { cn } from '@/lib/core/utils/cn'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { QuizLoadingOverlay, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import { useMobileQuizSessionController } from '@/hooks/quiz/useMobileQuizSessionController'

/* eslint-disable sonarjs/cognitive-complexity */
export default function QuizSessionMobilePage() {
  const ctrl = useMobileQuizSessionController()

  if (ctrl.isPreloadError || ctrl.isInitialError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F9F9F7] p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-gray-100 bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-black text-gray-900">Lỗi phòng thi</h2>
          <p className="mb-6 text-sm text-gray-600">
            {(ctrl.initialError as any)?.message || 'Vui lòng kiểm tra kết nối mạng và thử lại'}
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
              className="w-full py-6 font-bold border-gray-300 text-gray-700"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              onClick={() => ctrl.router.push('/dashboard')}
              className="w-full bg-[#5D7B6F] py-6 text-white hover:bg-[#4a6358] font-black"
            >
              Về Dashboard
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
        status={ctrl.sessionLoader.status || 'Đang tải bộ câu hỏi...'}
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
      correct_answer: (question as any).correct_answer || [0],
      explanation: (question as any).explanation || '',
      image_url: question.image_url || '',
    })
  }

  return (
    <div className="flex h-screen flex-col bg-[#F9F9F7]">
      <QuizLoadingOverlay 
        isOpen={ctrl.sessionLoader.isOpen} 
        progress={ctrl.sessionLoader.progress} 
        status={ctrl.sessionLoader.status} 
      />
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b-2 border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => ctrl.setQuestionMapOpen(true)}
              className="h-10 w-10 rounded-xl bg-gray-50 text-[#5D7B6F] hover:bg-gray-100 cursor-pointer"
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
              onClick={ctrl.toggleHandedness}
              title={ctrl.isRightHanded ? 'Đang ở chế độ Tay phải (Nhấn để đổi Tay trái)' : 'Đang ở chế độ Tay trái (Nhấn để đổi Tay phải)'}
              className={cn(
                "h-10 w-10 rounded-xl transition-all flex items-center justify-center gap-0.5 cursor-pointer",
                ctrl.isRightHanded
                  ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                  : "bg-gray-50 text-[#5D7B6F] hover:bg-gray-100 border border-transparent"
              )}
            >
              <Hand className={cn("h-4 w-4 transition-transform duration-200", !ctrl.isRightHanded ? "scale-x-[-1]" : "")} />
              <span className="text-[9px] font-black tracking-tighter uppercase">{ctrl.isRightHanded ? 'R' : 'L'}</span>
            </Button>

            <div className="flex flex-col items-end">
              <QuizTimer
                startedAt={session.started_at}
                pausedAt={session.paused_at}
                totalPausedDurationMs={session.total_paused_duration_ms}
                sessionId={ctrl.resolvedSessionId}
                className="text-[#5D7B6F] text-sm"
              />
              <p className="text-[10px] font-bold text-gray-400">
                {answeredCount}/{effectiveTotal} câu
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => ctrl.setExitConfirmOpen(true)}
              className="h-10 w-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer"
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
          onTouchStart={ctrl.handleTouchStart}
          onTouchMove={ctrl.handleTouchMove}
          onTouchEnd={ctrl.handleTouchEnd}
          style={{
            transform: ctrl.touchState.offsetX !== 0 ? `translateX(${ctrl.touchState.offsetX}px)` : undefined,
            transition: ctrl.touchState.isDragging ? 'none' : 'transform 0.2s ease-out',
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
              disabled={ctrl.togglePinMutation.isPending}
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
          <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-900">
              {question.text}
            </p>

            {question.image_url && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={question.image_url}
                  alt="Question Attachment"
                  className="max-h-64 w-full object-contain bg-gray-50"
                />
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {question.options.map((optText, optIndex) => {
              const isSelected = ctrl.selectedOptions.includes(optIndex)
              let statusStyle = 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'

              if (showImmediateFeedback) {
                const isCorrect = correctAnswerSet.includes(optIndex)
                if (isCorrect) {
                  statusStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                } else if (isSelected) {
                  statusStyle = 'border-red-500 bg-red-50 text-red-900 font-bold'
                }
              } else if (isSelected) {
                statusStyle = 'border-[#5D7B6F] bg-[#5D7B6F]/10 text-[#5D7B6F] font-bold shadow-sm'
              }

              return (
                <button
                  key={optIndex}
                  type="button"
                  onClick={() => ctrl.handleSelectOption(optIndex)}
                  disabled={ctrl.submitted || ctrl.submitMutation.isPending}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99] cursor-pointer",
                    statusStyle
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-bold text-xs">
                    {String.fromCharCode(65 + optIndex)}
                  </div>
                  <span className="flex-1 text-sm font-medium leading-normal">{optText}</span>
                  {showImmediateFeedback && correctAnswerSet.includes(optIndex) && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  )}
                  {showImmediateFeedback && !correctAnswerSet.includes(optIndex) && isSelected && (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 z-10 border-t-2 border-gray-200 bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2">
          {ctrl.isRightHanded && (
            <Button
              type="button"
              onClick={ctrl.handleSubmit}
              className="h-12 flex-1 rounded-xl bg-[#5D7B6F] font-bold text-white hover:bg-[#4a6358] shadow-md cursor-pointer"
            >
              <span>Nộp bài</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={effectiveIndex <= 0}
            onClick={() => ctrl.handleNavigate(effectiveIndex - 1)}
            className="h-12 flex-1 rounded-xl font-bold border-gray-300 text-gray-700 cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            <span>Câu trước</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={effectiveIndex >= effectiveTotal - 1}
            onClick={() => ctrl.handleNavigate(effectiveIndex + 1)}
            className="h-12 flex-1 rounded-xl font-bold border-gray-300 text-gray-700 cursor-pointer disabled:opacity-40"
          >
            <span>Câu sau</span>
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>

          {!ctrl.isRightHanded && (
            <Button
              type="button"
              onClick={ctrl.handleSubmit}
              className="h-12 flex-1 rounded-xl bg-[#5D7B6F] font-bold text-white hover:bg-[#4a6358] shadow-md cursor-pointer"
            >
              <span>Nộp bài</span>
            </Button>
          )}
        </div>
      </footer>

      {/* Submit Confirmation Dialog */}
      <Dialog open={ctrl.confirmOpen} onOpenChange={ctrl.setConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-gray-900">Xác nhận nộp bài</DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-500">
              Bạn đã hoàn thành {answeredCount}/{effectiveTotal} câu hỏi. Bạn có chắc chắn muốn nộp bài?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              onClick={ctrl.handleConfirmSubmit}
              disabled={ctrl.finalizeMutation.isPending}
              className="w-full bg-[#5D7B6F] py-5 font-bold text-white hover:bg-[#4a6358]"
            >
              Đồng ý nộp bài
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => ctrl.setConfirmOpen(false)}
              className="w-full py-5 font-bold text-gray-500"
            >
              Làm tiếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={ctrl.exitConfirmOpen} onOpenChange={ctrl.setExitConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-gray-900">Thoát phòng thi?</DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-500">
              Tiến trình làm bài của bạn sẽ được lưu tự động. Bạn có thể tiếp tục làm lại sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              onClick={ctrl.handleConfirmExitQuiz}
              className="w-full bg-red-600 py-5 font-bold text-white hover:bg-red-700"
            >
              Thoát phòng thi
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => ctrl.setExitConfirmOpen(false)}
              className="w-full py-5 font-bold text-gray-500"
            >
              Ở lại làm tiếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
