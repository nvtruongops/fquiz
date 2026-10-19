'use client'

import React from 'react'
import { CheckCircle2, XCircle, Lightbulb, HelpCircle, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { SessionQuestion, QuestionFeedback } from '@/lib/modules/quiz/types/session'
import { InteractiveText } from '@/components/shared/selection/InteractiveText'

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
  questionId,
  onClose,
}: {
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  explanationText?: string
  correctLetters?: string
  questionId?: string
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
              Detailed Explanation
            </h3>
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              Answer analysis & concepts
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
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-destructive" />
                  Incorrect
                </>
              )}
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Collapse explanation panel"
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
                  {lastAnswerResult?.isCorrect ? 'Correct!' : 'Incorrect!'}
                </span>
              </div>
              {correctLetters && (
                <p className="font-semibold text-success-fg">
                  Correct answer: {correctLetters}
                </p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                {explanationText ? <InteractiveText content={explanationText} sourceType="quiz" sourceId={questionId} /> : 'No explanation available for this question.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border bg-muted p-4 rounded-xl text-xs text-muted-foreground">
            <p>No explanation yet. Detailed explanation will appear here after answering in practice mode.</p>
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
  questionId,
  onClose,
}: {
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  explanationText?: string
  correctLetters?: string
  questionId?: string
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
              Detailed Explanation
            </h3>
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              Answer analysis & concepts
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
                  : 'bg-incorrect-bg text-destructive border border-incorrect-border'
              )}
            >
              {lastAnswerResult?.isCorrect ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-success-fg" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 text-destructive" />
                  Incorrect
                </>
              )}
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-card-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Collapse explanation panel"
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
                  ? 'bg-success-bg border-success-border text-success-fg'
                  : 'bg-incorrect-bg border-incorrect-border text-destructive'
              )}
            >
              {lastAnswerResult?.isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-success-fg shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs sm:text-sm">
                  {lastAnswerResult?.isCorrect
                    ? 'Correct! You answered correctly.'
                    : 'Incorrect! Please read the explanation below.'}
                </h4>
                {correctLetters && (
                  <p className="text-xs font-semibold text-success-fg mt-1">
                    Correct answer: {correctLetters}
                  </p>
                )}
              </div>
            </div>

            {/* Detailed Explanation Content */}
            <div className="bg-card backdrop-blur-md rounded-2xl border border-border p-4 shadow-sm space-y-2 text-card-foreground">
              <div className="flex items-center gap-1.5 text-xs font-bold text-card-foreground">
                <Sparkles className="w-3.5 h-3.5 text-warning-fg" />
                <span>Explanation:</span>
              </div>
              <div className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium pt-1">
                {explanationText ? <InteractiveText content={explanationText} sourceType="quiz" sourceId={questionId} /> : 'No explanation provided for this question.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center bg-muted/50 rounded-2xl border border-dashed border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-card-foreground">
                No explanation yet
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                After choosing an answer in practice mode, the detailed explanation will appear here.
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
        questionId={question?._id}
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
      questionId={question?._id}
      onClose={onClose}
    />
  )
})

export default ExplanationPanel
