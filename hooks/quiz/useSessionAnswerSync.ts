'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
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

  // Keep a ref of feedbackByQuestion so the effect can read it without re-triggering
  const feedbackByQuestionRef = useRef(feedbackByQuestion)
  feedbackByQuestionRef.current = feedbackByQuestion

  // Keep refs for unstable dependencies to avoid re-triggering the effect
  const activeDataRef = useRef(activeData)
  activeDataRef.current = activeData
  const setLastAnswerResultRef = useRef(setLastAnswerResult)
  setLastAnswerResultRef.current = setLastAnswerResult

  // Answer-sync effect — restore state when navigating between questions
  // Only depends on currentQuestionIndex and currentQuestion identity
  useEffect(() => {
    const data = activeDataRef.current
    if (!data?.session) return

    // Guard: skip if already synced for this question index
    if (lastSyncedQuestionIndexRef.current === currentQuestionIndex) return
    lastSyncedQuestionIndexRef.current = currentQuestionIndex

    const state = getRestoredAnswerState(data, currentQuestionIndex, currentQuestion, feedbackByQuestionRef.current)

    if (state.hasAnswer) {
      setSelectedOptions(state.restored)
      setSubmitted(state.submitted)
      submittedRef.current = state.submitted
      if (state.feedback) {
        setFeedbackByQuestion((prev) => {
          const existing = prev[currentQuestionIndex]
          if (existing && existing.isCorrect === state.feedback!.isCorrect && existing.correctAnswer === state.feedback!.correctAnswer) return prev
          return { ...prev, [currentQuestionIndex]: state.feedback! }
        })
      }
      setLastAnswerResultRef.current(state.feedback)
    } else if (state.useLocalFeedback) {
      setSubmitted(true)
      submittedRef.current = true
      setLastAnswerResultRef.current(state.feedback)
    } else {
      setSelectedOptions([])
      setSubmitted(false)
      submittedRef.current = false
      setLastAnswerResultRef.current(null)
    }
  }, [currentQuestionIndex, currentQuestion])

  const submitInImmediateMode = useCallback((answerIndexes: number[]) => {
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
  }, [activeData?.session, currentQuestionIndex, preloadedQuestions, setLastAnswerResult, submitAnswer])

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
  }, [activeData?.session, activeData?.question, submitted, isSubmitting, selectedOptions, currentQuestionIndex, submitAnswer, submitInImmediateMode])

  return {
    selectedOptions,
    setSelectedOptions,
    submitted,
    feedbackByQuestion,
    submitInImmediateMode,
    handleSelectOption,
  }
}

function getRestoredAnswerState(
  activeData: any,
  currentQuestionIndex: number,
  currentQuestion: any,
  feedbackByQuestion: Record<number, QuestionFeedback>,
) {
  const existing = activeData?.session?.user_answers.find((a: any) => a.question_index === currentQuestionIndex)
  if (existing) {
    const restored = existing.answer_indexes && existing.answer_indexes.length > 0
      ? existing.answer_indexes : [existing.answer_index]
    const isImmediate = activeData.session.mode === 'immediate'
    let feedback = isImmediate ? feedbackByQuestion[currentQuestionIndex] : undefined
    if (isImmediate && !feedback && currentQuestion?.correct_answer !== undefined) {
      const correctAnswerIndexes = Array.isArray(currentQuestion.correct_answer)
        ? currentQuestion.correct_answer : [currentQuestion.correct_answer]
      feedback = {
        isCorrect: existing.is_correct,
        correctAnswer: correctAnswerIndexes[0],
        correctAnswers: correctAnswerIndexes,
        explanation: currentQuestion.explanation,
      }
    }
    return {
      hasAnswer: true,
      restored,
      submitted: isImmediate,
      feedback: feedback ?? null,
      useLocalFeedback: false,
    }
  }

  const localFeedback = activeData?.session?.mode === 'immediate' ? feedbackByQuestion[currentQuestionIndex] : undefined
  if (localFeedback) {
    return {
      hasAnswer: false,
      restored: [],
      submitted: true,
      feedback: localFeedback,
      useLocalFeedback: true,
    }
  }

  return {
    hasAnswer: false,
    restored: [],
    submitted: false,
    feedback: null,
    useLocalFeedback: false,
  }
}
