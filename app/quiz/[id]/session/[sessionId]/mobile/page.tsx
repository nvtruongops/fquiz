'use client'

import React from 'react'
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Menu, Bookmark, Hand, PenTool } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shared/ui/dialog'
import { cn } from '@/lib/core/utils/cn'
import { ScrollArea } from '@/components/shared/ui/scroll-area'
import { QuizTimer } from '@/components/quiz/shared/QuizTimer'
import { QuizLoadingOverlay, isQuizLoaderActive } from '@/components/quiz/shared/QuizLoader'
import { useMobileQuizSessionController } from '@/hooks/quiz/useMobileQuizSessionController'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { InteractiveText } from '@/components/shared/selection/InteractiveText'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'

/* eslint-disable sonarjs/cognitive-complexity */
export default function QuizSessionMobilePage() {
  const ctrl = useMobileQuizSessionController()
  const isNoteMode = useQuizSessionStore((s) => s.isNoteMode)
  const toggleNoteMode = useQuizSessionStore((s) => s.toggleNoteMode)

  if (ctrl.isPreloadError || ctrl.isInitialError) {
    return (
      <div className="flex h-screen items-center justify-center bg-page-bg p-6 text-card-foreground">
        <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-black text-card-foreground">Lỗi phòng thi</h2>
          <p className="mb-6 text-sm text-muted-foreground">
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
              className="w-full py-6 font-bold border-border text-card-foreground hover:bg-muted cursor-pointer"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              onClick={() => ctrl.router.push('/dashboard')}
              className="w-full bg-primary py-6 text-primary-foreground hover:bg-primary/90 font-black cursor-pointer"
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
    <div className="flex h-screen flex-col bg-page-bg text-card-foreground">
      <QuizLoadingOverlay 
        isOpen={ctrl.sessionLoader.isOpen} 
        progress={ctrl.sessionLoader.progress} 
        status={ctrl.sessionLoader.status} 
      />
      
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm text-card-foreground">
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => ctrl.setQuestionMapOpen(true)}
              className="h-10 w-10 rounded-xl bg-muted text-primary hover:bg-muted/80 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{session.categoryName}</p>
              <p className="text-sm font-black text-primary">{session.courseCode}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNoteMode}
              title={isNoteMode ? 'Đang bật Bút Tra Từ (Nhấn để quay lại làm bài)' : 'Bật Bút Tra Từ (Để bôi đen tra từ không lo chọn nhầm đáp án)'}
              className={cn(
                "h-10 w-10 rounded-xl transition-all flex items-center justify-center cursor-pointer",
                isNoteMode
                  ? "bg-amber-500 text-white border border-amber-400 shadow-sm animate-pulse"
                  : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20"
              )}
            >
              <PenTool className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={ctrl.toggleHandedness}
              title={ctrl.isRightHanded ? 'Đang ở chế độ Tay phải (Nhấn để đổi Tay trái)' : 'Đang ở chế độ Tay trái (Nhấn để đổi Tay phải)'}
              className={cn(
                "h-10 w-10 rounded-xl transition-all flex items-center justify-center gap-0.5 cursor-pointer",
                ctrl.isRightHanded
                  ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                  : "bg-muted text-primary hover:bg-muted/80 border border-transparent"
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
                className="text-primary text-sm"
              />
              <p className="text-[10px] font-bold text-muted-foreground">
                {answeredCount}/{effectiveTotal} câu
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => ctrl.setExitConfirmOpen(true)}
              className="h-10 w-10 rounded-xl bg-incorrect-bg text-destructive hover:bg-incorrect-bg/80 cursor-pointer"
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(answeredCount / effectiveTotal) * 100}%` }}
          />
        </div>
      </header>

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
          {/* Note Mode Alert Banner */}
          {isNoteMode && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs font-bold text-amber-600 dark:text-amber-400">
              <PenTool className="h-4 w-4 text-amber-500 shrink-0 animate-bounce" />
              <span>Chế độ Tra từ đang bật: Bạn có thể tự do bôi đen text để tra từ (đáp án tạm ngưng click chọn).</span>
            </div>
          )}

          {/* Question Meta Bar */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary border border-primary/20">
                Câu {effectiveIndex + 1}/{effectiveTotal}
              </span>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                {requiredSelectionCount <= 1
                  ? '• Chọn 1 đáp án'
                  : `• Chọn ${requiredSelectionCount} đáp án`}
                <span className="hidden sm:inline"> • Vuốt 👈 👉 để lật câu</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleTogglePin}
                disabled={ctrl.togglePinMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm shrink-0",
                  isQuestionPinned
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-card text-card-foreground border-border hover:bg-muted"
                )}
              >
                <Bookmark className={cn("w-3.5 h-3.5", isQuestionPinned && "fill-current text-amber-600")} />
                <span>{isQuestionPinned ? 'Đã ghim' : 'Ghim câu'}</span>
              </button>

              {(session.mode === 'immediate' || (session.mode === 'review' && ctrl.submitted)) && (
                <UsageBadge
                  count={question.usage_count}
                  used_in_quizzes={question.used_in_quizzes}
                  size="sm"
                  align="right"
                />
              )}
            </div>
          </div>

          {/* Question Text */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-card-foreground">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-card-foreground">
              <InteractiveText content={question.text} sourceType="quiz" sourceId={question._id} />
            </p>

            {question.image_url && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <img
                  src={question.image_url}
                  alt="Question Attachment"
                  className="max-h-64 w-full object-contain bg-muted"
                />
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {question.options.map((optText, optIndex) => {
              const isSelected = ctrl.selectedOptions.includes(optIndex)
              let statusStyle = 'border-border bg-card text-card-foreground hover:border-primary/50 hover:bg-muted'

              if (showImmediateFeedback) {
                const isCorrect = correctAnswerSet.includes(optIndex)
                if (isCorrect) {
                  statusStyle = 'border-success-border bg-success-bg text-success-fg font-bold'
                } else if (isSelected) {
                  statusStyle = 'border-incorrect-border bg-incorrect-bg text-destructive font-bold'
                }
              } else if (isSelected) {
                statusStyle = 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
              }

              return (
                <button
                  key={optIndex}
                  type="button"
                  onClick={() => {
                    if (isNoteMode) return
                    ctrl.handleSelectOption(optIndex)
                  }}
                  disabled={ctrl.submitted || ctrl.submitMutation.isPending || isNoteMode}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer",
                    isNoteMode && "cursor-text border-dashed border-amber-500/40 bg-amber-500/5",
                    statusStyle
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border font-bold text-xs">
                    {String.fromCharCode(65 + optIndex)}
                  </div>
                  <span className="flex-1 text-sm font-medium leading-normal">
                    <InteractiveText content={optText} sourceType="quiz" sourceId={question._id} />
                  </span>
                  {showImmediateFeedback && correctAnswerSet.includes(optIndex) && (
                    <CheckCircle2 className="h-5 w-5 text-success-fg shrink-0" />
                  )}
                  {showImmediateFeedback && !correctAnswerSet.includes(optIndex) && isSelected && (
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Navigation Footer */}
      <footer className="sticky bottom-0 z-10 border-t border-border bg-card p-3 shadow-lg text-card-foreground">
        <div className="flex items-center gap-2">
          {ctrl.isRightHanded && (
            <Button
              type="button"
              onClick={ctrl.handleSubmit}
              className="h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            >
              <span>Nộp bài</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={effectiveIndex <= 0}
            onClick={() => ctrl.handleNavigate(effectiveIndex - 1)}
            className="h-12 flex-1 rounded-xl font-bold border-border text-card-foreground cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            <span>Câu trước</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={effectiveIndex >= effectiveTotal - 1}
            onClick={() => ctrl.handleNavigate(effectiveIndex + 1)}
            className="h-12 flex-1 rounded-xl font-bold border-border text-card-foreground cursor-pointer disabled:opacity-40"
          >
            <span>Câu sau</span>
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>

          {!ctrl.isRightHanded && (
            <Button
              type="button"
              onClick={ctrl.handleSubmit}
              className="h-12 flex-1 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            >
              <span>Nộp bài</span>
            </Button>
          )}
        </div>
      </footer>

      {/* Submit Confirmation Dialog */}
      <Dialog open={ctrl.confirmOpen} onOpenChange={ctrl.setConfirmOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-6 bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-card-foreground">Xác nhận nộp bài</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Bạn đã hoàn thành {answeredCount}/{effectiveTotal} câu hỏi. Bạn có chắc chắn muốn nộp bài?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              onClick={ctrl.handleConfirmSubmit}
              disabled={ctrl.finalizeMutation.isPending}
              className="w-full bg-primary py-5 font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Đồng ý nộp bài
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => ctrl.setConfirmOpen(false)}
              className="w-full py-5 font-bold text-muted-foreground"
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
            <DialogTitle className="text-center text-lg font-black text-foreground">Thoát phòng thi?</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Tiến trình làm bài của bạn sẽ được lưu tự động. Bạn có thể tiếp tục làm lại sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={ctrl.handleConfirmExitQuiz}
              className="w-full py-5 font-bold"
            >
              Thoát phòng thi
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => ctrl.setExitConfirmOpen(false)}
              className="w-full py-5 font-bold text-muted-foreground"
            >
              Ở lại làm tiếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Map Dialog (Danh sách câu hỏi 3 gạch menu) */}
      <Dialog open={ctrl.questionMapOpen} onOpenChange={ctrl.setQuestionMapOpen}>
        <DialogContent className="max-w-xs rounded-2xl p-5 bg-card text-card-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black text-card-foreground">Danh sách câu hỏi</DialogTitle>
          </DialogHeader>
          <div className="my-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: effectiveTotal }, (_, i) => {
                const isCurrent = i === effectiveIndex
                const isAnswered = answeredFromSession.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => ctrl.handleNavigate(i)}
                    className={cn(
                      "h-10 rounded-xl font-black text-xs border transition-all active:scale-95 cursor-pointer flex items-center justify-center relative",
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30"
                        : isAnswered
                          ? "bg-primary/10 text-primary border-primary/30 font-bold"
                          : "bg-muted text-card-foreground border-border hover:bg-muted/80"
                    )}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => ctrl.setQuestionMapOpen(false)} className="w-full h-10 rounded-xl font-bold border-border text-card-foreground">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
