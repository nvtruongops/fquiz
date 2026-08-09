'use client'

import React from 'react'
import { CheckCircle2, XCircle, Lightbulb, HelpCircle, Sparkles, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { SessionQuestion, QuestionFeedback } from '@/lib/modules/quiz/types/session'

interface ExplanationPanelProps {
  question: SessionQuestion
  sessionMode: 'immediate' | 'review' | 'flashcard'
  submitted: boolean
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  enableAnimation?: boolean
  onClose?: () => void
}

function StaticExplanationView({
  showImmediateFeedback,
  lastAnswerResult,
  explanationText,
  correctLetters,
  onClose,
}: {
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  explanationText?: string
  correctLetters?: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col font-sans space-y-3 text-card-foreground">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-none">
              Giải thích chi tiết
            </h3>
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              Phân tích đáp án & kiến thức
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showImmediateFeedback && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase',
                lastAnswerResult?.isCorrect
                  ? 'bg-success-bg text-success-fg border border-success-border'
                  : 'bg-incorrect-bg text-incorrect-fg border border-incorrect-border'
              )}
            >
              {lastAnswerResult?.isCorrect ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-success-fg" />
                  Đúng
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-destructive" />
                  Sai
                </>
              )}
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Thu gọn cột giải thích"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto quiz-scroll pr-1 space-y-3">
        {showImmediateFeedback ? (
          <div className="space-y-3">
            <div className="border border-border bg-card p-4 rounded-xl text-sm text-foreground space-y-2">
              <div className="flex items-center gap-2 font-bold">
                {lastAnswerResult?.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-success-fg shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className={lastAnswerResult?.isCorrect ? "text-success-fg" : "text-destructive"}>
                  {lastAnswerResult?.isCorrect ? 'Chính xác!' : 'Chưa đúng!'}
                </span>
              </div>
              {correctLetters && (
                <p className="font-semibold text-success-fg">
                  Đáp án đúng: {correctLetters}
                </p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                {explanationText || 'Hệ thống chưa có phần giải thích cho câu này.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border bg-muted p-4 rounded-xl text-xs text-muted-foreground">
            <p>Chưa có giải thích. Sau khi nộp đáp án ở chế độ luyện tập, giải thích chi tiết sẽ hiển thị tại đây.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AnimatedExplanationView({
  showImmediateFeedback,
  lastAnswerResult,
  explanationText,
  correctLetters,
  onClose,
}: {
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  explanationText?: string
  correctLetters?: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col font-sans space-y-3 text-card-foreground">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-none">
              Giải thích chi tiết
            </h3>
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              Phân tích đáp án & kiến thức
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showImmediateFeedback && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase',
                lastAnswerResult?.isCorrect
                  ? 'bg-success-bg text-success-fg border border-success-border'
                  : 'bg-incorrect-bg text-incorrect-fg border border-incorrect-border'
              )}
            >
              {lastAnswerResult?.isCorrect ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-success-fg" />
                  Đúng
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  Sai
                </>
              )}
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Thu gọn cột giải thích"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Panel Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto quiz-scroll pr-1 space-y-3">
        {showImmediateFeedback ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-300">
            {/* Status Banner */}
            <div
              className={cn(
                'p-3.5 rounded-xl border flex items-start gap-3 shadow-xs',
                lastAnswerResult?.isCorrect
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
              )}
            >
              {lastAnswerResult?.isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs sm:text-sm">
                  {lastAnswerResult?.isCorrect
                    ? 'Chính xác! Bạn đã trả lời đúng.'
                    : 'Chưa đúng! Vui lòng đọc giải thích bên dưới.'}
                </h4>
                {correctLetters && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                    Đáp án đúng: {correctLetters}
                  </p>
                )}
              </div>
            </div>

            {/* Detailed Explanation Content */}
            <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nội dung giải thích:</span>
              </div>
              <div className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-medium pt-1">
                {explanationText || 'Hệ thống chưa cung cấp phần giải thích cho câu hỏi này.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chưa có giải thích
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                Sau khi chọn đáp án ở chế độ luyện tập, giải thích chi tiết của câu hỏi sẽ hiển thị ngay tại đây.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const ExplanationPanel = React.memo(function ExplanationPanel({
  question,
  showImmediateFeedback,
  lastAnswerResult,
  enableAnimation = true,
  onClose,
}: ExplanationPanelProps) {
  const explanationText = lastAnswerResult?.explanation || question?.explanation

  const correctAnswersList = lastAnswerResult?.correctAnswers ??
    (lastAnswerResult?.correctAnswer !== undefined ? [lastAnswerResult.correctAnswer] : undefined) ??
    (Array.isArray(question?.correct_answer) ? question.correct_answer : typeof question?.correct_answer === 'number' ? [question.correct_answer] : [])

  const correctLetters = correctAnswersList
    .filter((idx) => typeof idx === 'number' && idx >= 0)
    .map((idx) => String.fromCodePoint(65 + idx))
    .join(', ')

  if (!enableAnimation) {
    return (
      <StaticExplanationView
        showImmediateFeedback={showImmediateFeedback}
        lastAnswerResult={lastAnswerResult}
        explanationText={explanationText}
        correctLetters={correctLetters}
        onClose={onClose}
      />
    )
  }

  return (
    <AnimatedExplanationView
      showImmediateFeedback={showImmediateFeedback}
      lastAnswerResult={lastAnswerResult}
      explanationText={explanationText}
      correctLetters={correctLetters}
      onClose={onClose}
    />
  )
})

export default ExplanationPanel
