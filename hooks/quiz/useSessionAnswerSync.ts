'use client'

import { useRef, useState, useCallback } from 'react'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { SessionData, SessionQuestion, QuestionFeedback } from '@/lib/modules/quiz/types/session'
import { computeQuestionFeedback } from '@/lib/modules/quiz/feedback-utils'

interface UseSessionAnswerSyncParams {
  activeData: SessionData | undefined
  currentQuestionIndex: number
  currentQuestion: SessionQuestion | undefined
  preloadedQuestions: SessionQuestion[] | null
  submitAnswer: (vars: { questionIndex: number; answerIndexes: number[] }, opts?: any) => void
  isSubmitting: boolean
}

interface UseSessionAnswerSyncResult {
  selectedOptions: number[]
  setSelectedOptions: (opts: number[]) => void
  submitted: boolean
  feedbackByQuestion: Record<number, QuestionFeedback>
  submitInImmediateMode: (answerIndexes: number[]) => void
  handleSelectOption: (idx: number) => void
}

export function useSessionAnswerSync({
  activeData,
  currentQuestionIndex,
  currentQuestion,
  preloadedQuestions,
  submitAnswer,
  isSubmitting,
}: UseSessionAnswerSyncParams): UseSessionAnswerSyncResult {
  const { setLastAnswerResult } = useQuizSessionStore()
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const submittedRef = useRef(false)
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<Record<number, QuestionFeedback>>({})
  const lastSyncedQuestionIndexRef = useRef<number | null>(null)

  // Answer-sync effect — restore state when navigating between questions
  // (This large effect is intentionally kept inline because it depends on
  //  component-local state that varies between desktop and mobile UIs.)
  // Note: the sync effect remains in the page component for now as it
  // references component-scoped state. Full extraction would require
  // hoisting more state into the hook.

  function submitInImmediateMode(answerIndexes: number[]) {
    if (!activeData?.session || submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)

    const feedback = computeQuestionFeedback(
      preloadedQuestions?.[currentQuestionIndex]?.correct_answer,
      answerIndexes,
      preloadedQuestions?.[currentQuestionIndex]?.explanation,
    )
    if (feedback) {
      setFeedbackByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: feedback }))
      setLastAnswerResult(feedback)
    }

    submitAnswer({ questionIndex: currentQuestionIndex, answerIndexes }, {
      onSuccess: (data: any) => {
        if ('isCorrect' in data) {
          setFeedbackByQuestion((prev) => ({
            ...prev,
            [currentQuestionIndex]: {
              isCorrect: data.isCorrect,
              correctAnswer: data.correctAnswer,
              correctAnswers: data.correctAnswers ?? [data.correctAnswer],
              explanation: data.explanation,
            },
          }))
        }
      },
      onError: () => {
        submittedRef.current = false
        setSubmitted(false)
      },
    })
  }

  const handleSelectOption = useCallback((idx: number) => {
    if (!activeData?.session || submitted || isSubmitting) return
    const required = Math.max(activeData.question.answer_selection_count ?? 1, 1)
    const exists = selectedOptions.includes(idx)
    let nextSelections: number[]
    if (required === 1 && activeData.session.mode === 'review') nextSelections = [idx]
    else if (exists) nextSelections = selectedOptions.filter((v) => v !== idx)
    else if (selectedOptions.length >= required) nextSelections = selectedOptions
    else nextSelections = [...selectedOptions, idx].sort((a, b) => a - b)

    if (JSON.stringify(nextSelections) === JSON.stringify(selectedOptions)) return
    setSelectedOptions(nextSelections)
    if (nextSelections.length === required) {
      if (activeData.session.mode === 'immediate') submitInImmediateMode(nextSelections)
      else submitAnswer({ questionIndex: currentQuestionIndex, answerIndexes: nextSelections })
    }
  }, [activeData?.session, activeData?.question, submitted, isSubmitting, selectedOptions, currentQuestionIndex, submitAnswer])

  return {
    selectedOptions,
    setSelectedOptions,
    submitted,
    feedbackByQuestion,
    submitInImmediateMode,
    handleSelectOption,
  }
}
