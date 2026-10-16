'use client'

import * as React from 'react'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFlashcardSessionState } from '@/hooks/quiz/useFlashcardSession'
import { Button } from '@/components/shared/ui/button'
import { MobileFlashcardView } from '@/components/quiz/flashcard/MobileFlashcardView'
import { MobileFlashcardHeader } from '@/components/quiz/flashcard/MobileFlashcardHeader'
import { MobileFlashcardModals } from '@/components/quiz/flashcard/MobileFlashcardModals'

export default function MobileFlashcardSessionPage() {
  const params = useParams<{ id?: string | string[]; sessionId?: string | string[] }>()
  const router = useRouter()
  const rawQuizId = params?.id
  const rawSessionId = params?.sessionId
  const resolvedQuizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId ?? ''
  const resolvedSessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId ?? ''

  const {
    session,
    question,
    isLoading,
    error,
    submitAnswer,
    isSubmitting,
    stats,
    setStats,
    displayIndex,
    setDisplayIndex,
    enableAnimation,
    actualIndex,
    taggedStatus,
    handleBack,
    handleForward,
  } = useFlashcardSessionState(resolvedSessionId, resolvedQuizId)

  const [questionMapOpen, setQuestionMapOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  const handleAnswer = (knows: boolean) => {
    if (!session || !question) return
    submitAnswer(
      { knows, questionIndex: actualIndex },
      {
        onSuccess: (data) => {
          setStats(data.stats)
          if (displayIndex !== null) setDisplayIndex(null)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !session || !question) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background p-8">
        <Button
          onClick={() => router.push('/dashboard')}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs"
        >
          Back to Home
        </Button>
      </div>
    )
  }

  const effectiveTotal = session.totalQuestions || 0

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden fixed inset-0 overscroll-none select-none">
      <MobileFlashcardHeader
        categoryName={session.categoryName}
        courseCode={session.courseCode}
        title={session.title}
        stats={stats}
        actualIndex={actualIndex}
        effectiveTotal={effectiveTotal}
        onOpenQuestionMap={() => setQuestionMapOpen(true)}
        onOpenExitConfirm={() => setExitConfirmOpen(true)}
      />

      <div className="flex-1 relative overflow-hidden">
        <MobileFlashcardView
          question={question}
          questionNumber={actualIndex + 1}
          totalQuestions={effectiveTotal}
          onAnswer={handleAnswer}
          onBack={handleBack}
          onForward={handleForward}
          isLoading={isSubmitting}
          enableAnimation={enableAnimation}
          taggedStatus={taggedStatus}
        />
      </div>

      <footer className="sticky bottom-0 z-20 border-t-2 border-border bg-card p-3 shadow-lg flex-none">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={actualIndex <= 0}
            onClick={handleBack}
            className="h-12 flex-1 rounded-xl font-bold border-border text-foreground cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-5 w-5 text-primary" />
            <span>Previous</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={actualIndex >= effectiveTotal - 1}
            onClick={handleForward}
            className="h-12 flex-1 rounded-xl font-bold border-border text-foreground cursor-pointer disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="ml-1 h-5 w-5 text-primary" />
          </Button>
        </div>
      </footer>

      <MobileFlashcardModals
        questionMapOpen={questionMapOpen}
        setQuestionMapOpen={setQuestionMapOpen}
        exitConfirmOpen={exitConfirmOpen}
        setExitConfirmOpen={setExitConfirmOpen}
        effectiveTotal={effectiveTotal}
        actualIndex={actualIndex}
        onSelectIndex={(i) => setDisplayIndex(i)}
        onConfirmExit={() => router.push('/dashboard')}
      />
    </div>
  )
}
