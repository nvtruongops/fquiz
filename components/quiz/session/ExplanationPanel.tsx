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
  onClose,
}: {
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  explanationText?: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="flex items-center justify-between border-b-2 border-[#101010] pb-2 mb-3">
        <h3 className="text-[20px] font-bold text-[#111111]">Giải thích chi tiết</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-bold text-[#111111] hover:underline"
            title="Thu gọn"
          >
            [X] Thu gọn
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto quiz-scroll pr-1">
        {showImmediateFeedback ? (
          <div className="border border-[#c7c7c7] bg-[#f5f5f5] p-3 text-[14px] text-[#111111] space-y-2">
            <div className="flex items-center gap-2 font-bold">
              {lastAnswerResult?.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <span>{lastAnswerResult?.isCorrect ? 'Chính xác!' : 'Chưa đúng!'}</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">
              {explanationText || 'Hệ thống chưa có phần giải thích cho câu này.'}
            </p>
          </div>
        ) : (
          <div className="border border-[#d0d0d0] bg-[#fafafa] p-3 text-[13px] text-[#555555]">
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
  onClose,
}: {
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  explanationText?: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-full flex-col font-sans space-y-3">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">
              Giải thích chi tiết
            </h3>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
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
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              )}
            >
              {lastAnswerResult?.isCorrect ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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

  if (!enableAnimation) {
    return (
      <StaticExplanationView
        showImmediateFeedback={showImmediateFeedback}
        lastAnswerResult={lastAnswerResult}
        explanationText={explanationText}
        onClose={onClose}
      />
    )
  }

  return (
    <AnimatedExplanationView
      showImmediateFeedback={showImmediateFeedback}
      lastAnswerResult={lastAnswerResult}
      explanationText={explanationText}
      onClose={onClose}
    />
  )
})

export default ExplanationPanel
