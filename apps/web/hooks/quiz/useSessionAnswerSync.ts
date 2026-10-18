'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useQuizSessionStore } from '@/store/quiz/quiz-session.store'
import { SessionData, SessionQuestion, QuestionFeedback } from '@/lib/modules/quiz/types/session'
import { computeQuestionFeedback } from '@/lib/modules/quiz/feedback-utils'

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'
interface AnswerDraft {
  answerIndexes: number[]
  status: SaveStatus
  feedback?: QuestionFeedback | null
  acknowledged?: boolean
  lastSaved?: { answerIndexes: number[]; feedback?: QuestionFeedback | null }
}

interface UseSessionAnswerSyncParams {
  activeData: SessionData | undefined
  currentQuestionIndex: number
  currentQuestion: SessionQuestion | undefined
  preloadedQuestions: SessionQuestion[] | null
  submitAnswer: (vars: { questionIndex: number; answerIndexes: number[] }, opts?: any) => void
  isSubmitting: boolean
  canWrite?: () => boolean
}

export function useSessionAnswerSync({
  activeData, currentQuestionIndex, currentQuestion, preloadedQuestions,
  submitAnswer, isSubmitting, canWrite = () => true,
}: UseSessionAnswerSyncParams) {
  const { setLastAnswerResult } = useQuizSessionStore()
  const sessionId = activeData?.session._id
  const [draftState, setDraftState] = useState<{ sessionId?: string; answers: Record<number, AnswerDraft> }>({ answers: {} })
  const drafts = draftState.sessionId === sessionId ? draftState.answers : {}
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId
  const permissionRef = useRef(canWrite)
  permissionRef.current = canWrite

  const updateDraft = useCallback((index: number, draft: AnswerDraft) => {
    const answers = { ...draftsRef.current, [index]: {
      ...draft,
      acknowledged: draft.status === 'saved' || draftsRef.current[index]?.acknowledged,
      lastSaved: draft.status === 'saved'
        ? { answerIndexes: draft.answerIndexes, feedback: draft.feedback }
        : draftsRef.current[index]?.lastSaved,
    } }
    draftsRef.current = answers
    setDraftState({ sessionId, answers })
  }, [sessionId])

  const removeDraft = useCallback((index: number) => {
    const answers = { ...draftsRef.current }
    delete answers[index]
    draftsRef.current = answers
    setDraftState({ sessionId, answers })
  }, [sessionId])

  const existing = activeData?.session.user_answers.find((answer) => answer.question_index === currentQuestionIndex)
  const draft = drafts[currentQuestionIndex]
  const selectedOptions = useMemo(() => draft?.answerIndexes ?? (existing?.answer_indexes?.length ? existing.answer_indexes : existing ? [existing.answer_index] : []), [draft, existing])
  const isImmediate = activeData?.session.mode === 'immediate'
  const submitted = Boolean(isImmediate && (draft ? draft.status === 'saving' || draft.status === 'saved' : existing))
  const feedback = useMemo(() => submitted
    ? draft?.feedback ?? (existing ? {
        isCorrect: existing.is_correct,
        correctAnswer: Array.isArray(currentQuestion?.correct_answer) ? currentQuestion.correct_answer[0] : currentQuestion?.correct_answer ?? (existing.is_correct ? selectedOptions[0] : -1),
        correctAnswers: Array.isArray(currentQuestion?.correct_answer) ? currentQuestion.correct_answer : currentQuestion?.correct_answer !== undefined ? [currentQuestion.correct_answer] : existing.is_correct ? selectedOptions : [],
        explanation: currentQuestion?.explanation,
      } : null)
    : null, [submitted, draft, existing, currentQuestion, selectedOptions])

  useEffect(() => {
    setLastAnswerResult(feedback)
    // Feedback belongs to the visible question; late callbacks only update its draft.
  }, [sessionId, currentQuestionIndex, feedback, setLastAnswerResult])

  const hasUnsavedAnswers = useCallback(() =>
    Object.values(draftsRef.current).some((answer) => answer.status !== 'saved'), [])

  const saveAnswer = useCallback((questionIndex: number, answerIndexes: number[]) => {
    if (!sessionId || !permissionRef.current() || isSubmitting || Object.values(draftsRef.current).some((answer) => answer.status === 'saving')) return
    const pending: AnswerDraft = {
      answerIndexes,
      status: 'saving',
      feedback: isImmediate ? computeQuestionFeedback(preloadedQuestions?.[questionIndex]?.correct_answer, answerIndexes, preloadedQuestions?.[questionIndex]?.explanation) : null,
    }
    updateDraft(questionIndex, pending)
    submitAnswer({ questionIndex, answerIndexes }, {
      onSuccess: (data: any) => {
        if (sessionRef.current !== sessionId) return
        const feedback = 'isCorrect' in data ? {
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          correctAnswers: data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : []),
          explanation: data.explanation,
        } : pending.feedback
        updateDraft(questionIndex, { ...pending, status: 'saved', feedback })
      },
      onError: () => {
        if (sessionRef.current === sessionId) updateDraft(questionIndex, { ...pending, status: 'error' })
      },
    })
  }, [sessionId, isSubmitting, isImmediate, preloadedQuestions, updateDraft, submitAnswer])

  const handleSelectOption = useCallback((index: number) => {
    if (!activeData?.session || !permissionRef.current() || submitted || isSubmitting || Object.values(draftsRef.current).some((answer) => answer.status === 'saving')) return
    const required = Math.max(activeData.question.answer_selection_count ?? 1, 1)
    const next = required === 1 && !isImmediate ? [index]
      : selectedOptions.includes(index) ? selectedOptions.filter((option) => option !== index)
      : selectedOptions.length < required ? [...selectedOptions, index].sort((a, b) => a - b) : selectedOptions
    if (JSON.stringify(next) === JSON.stringify(selectedOptions)) return
    if (next.length === 0 && !existing && draftsRef.current[currentQuestionIndex]?.status === 'unsaved' && !draftsRef.current[currentQuestionIndex]?.acknowledged) {
      removeDraft(currentQuestionIndex)
      return
    }
    updateDraft(currentQuestionIndex, { answerIndexes: next, status: 'unsaved' })
    if (next.length === required) saveAnswer(currentQuestionIndex, next)
  }, [activeData, submitted, isSubmitting, isImmediate, selectedOptions, currentQuestionIndex, existing, removeDraft, updateDraft, saveAnswer])

  const discardUnsavedAnswer = useCallback(() => {
    if (!permissionRef.current()) return
    const entry = Object.entries(draftsRef.current).find(([, answer]) => answer.status === 'unsaved')
    if (!entry) return
    const [index, answer] = entry
    if (answer.lastSaved) updateDraft(Number(index), { ...answer.lastSaved, status: 'saved' })
    else removeDraft(Number(index))
  }, [removeDraft, updateDraft])

  const retryFailedAnswer = useCallback(() => {
    const failed = Object.entries(draftsRef.current).find(([, answer]) => answer.status === 'error')
    if (failed) saveAnswer(Number(failed[0]), failed[1].answerIndexes)
  }, [saveAnswer])

  const statuses = Object.values(drafts).map((answer) => answer.status)
  const saveStatus: SaveStatus = statuses.includes('saving') ? 'saving' : statuses.includes('error') ? 'error' : statuses.includes('unsaved') ? 'unsaved' : draft?.status ?? (existing ? 'saved' : 'idle')
  const unsavedQuestionIndex = Object.entries(drafts).find(([, answer]) => answer.status === 'unsaved')?.[0]
  const acknowledgedQuestions = new Set(Object.entries(drafts).filter(([, answer]) => answer.acknowledged).map(([index]) => Number(index)))

  return { selectedOptions, submitted, handleSelectOption, saveStatus, retryFailedAnswer, hasUnsavedAnswers, discardUnsavedAnswer, unsavedQuestionIndex: unsavedQuestionIndex === undefined ? null : Number(unsavedQuestionIndex), acknowledgedQuestions }
}
