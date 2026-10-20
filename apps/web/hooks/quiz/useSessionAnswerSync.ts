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

function persistPendingDrafts(sessionId: string, answers: Record<number, AnswerDraft>) {
  if (typeof window === 'undefined') return
  const storageKey = `fquiz:answer-drafts:${sessionId}`
  const pending = Object.fromEntries(Object.entries(answers).filter(([, answer]) => answer.status !== 'saved'))
  try {
    if (Object.keys(pending).length === 0) window.sessionStorage.removeItem(storageKey)
    else window.sessionStorage.setItem(storageKey, JSON.stringify(pending))
  } catch {
    // Session storage is a best-effort recovery aid; the in-memory draft remains available.
  }
}

function hasValidDraftIndex(index: number) {
  return Number.isInteger(index) && index >= 0
}

function hasValidAnswerIndexes(answer: AnswerDraft) {
  return Array.isArray(answer?.answerIndexes) &&
    answer.answerIndexes.every((value) => Number.isInteger(value) && value >= 0)
}

function restoreDraftAnswer(
  rawIndex: string,
  answer: AnswerDraft,
  serverAnswers: Map<number, unknown>,
  immediate: boolean,
  getRequiredSelectionCount: (index: number) => number | null,
): [number, AnswerDraft] | null {
  const index = Number(rawIndex)
  if (!hasValidDraftIndex(index) || !hasValidAnswerIndexes(answer)) return null
  if (immediate && serverAnswers.has(index)) return null
  const required = getRequiredSelectionCount(index)
  const status: SaveStatus = required !== null && answer.answerIndexes.length === required ? 'error' : 'unsaved'
  return [index, { answerIndexes: answer.answerIndexes, status }]
}

function restoreDraftAnswers(
  parsed: Record<string, AnswerDraft>,
  serverAnswers: Map<number, unknown>,
  immediate: boolean,
  getRequiredSelectionCount: (index: number) => number | null,
): Record<number, AnswerDraft> {
  const entries = Object.entries(parsed).flatMap(([rawIndex, answer]) => {
    const restored = restoreDraftAnswer(rawIndex, answer, serverAnswers, immediate, getRequiredSelectionCount)
    return restored ? [restored] : []
  })
  return Object.fromEntries(entries)
}

function resolveCorrectAnswer(
  correctAnswer: number | number[] | undefined,
  isCorrect: boolean,
  selectedOptions: number[],
) {
  if (Array.isArray(correctAnswer)) return correctAnswer[0] ?? -1
  if (correctAnswer !== undefined) return correctAnswer
  return isCorrect ? selectedOptions[0] : -1
}

function resolveCorrectAnswers(
  correctAnswer: number | number[] | undefined,
  isCorrect: boolean,
  selectedOptions: number[],
) {
  if (Array.isArray(correctAnswer)) return correctAnswer
  if (correctAnswer !== undefined) return [correctAnswer]
  return isCorrect ? selectedOptions : []
}

function buildCurrentFeedback(
  submitted: boolean,
  draftFeedback: QuestionFeedback | null | undefined,
  existing: SessionData['session']['user_answers'][number] | undefined,
  currentQuestion: SessionQuestion | undefined,
  selectedOptions: number[],
): QuestionFeedback | null {
  if (!submitted) return null
  if (draftFeedback) return draftFeedback
  if (existing?.is_correct === undefined) return null

  const correctAnswer = currentQuestion?.correct_answer
  return {
    isCorrect: existing.is_correct,
    correctAnswer: resolveCorrectAnswer(correctAnswer, existing.is_correct, selectedOptions),
    correctAnswers: resolveCorrectAnswers(correctAnswer, existing.is_correct, selectedOptions),
    explanation: currentQuestion?.explanation,
  }
}

function getNextSelection(selected: number[], index: number, required: number, immediate: boolean) {
  if (required === 1 && !immediate) return [index]
  if (selected.includes(index)) return selected.filter((option) => option !== index)
  if (selected.length < required) return [...selected, index].sort((a, b) => a - b)
  return selected
}

function getPositiveSelectionCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function getQuestionSelectionCount(
  activeData: SessionData | undefined,
  currentQuestionIndex: number,
  preloadedQuestions: SessionQuestion[] | null,
  index: number,
) {
  const question = preloadedQuestions?.[index] ??
    (index === currentQuestionIndex ? activeData?.question : undefined)
  return getPositiveSelectionCount(question?.answer_selection_count)
}

function readDraftAnswers(sessionId: string): Record<string, AnswerDraft> | null {
  try {
    const stored = window.sessionStorage.getItem(`fquiz:answer-drafts:${sessionId}`)
    return stored ? JSON.parse(stored) as Record<string, AnswerDraft> : null
  } catch {
    try {
      window.sessionStorage.removeItem(`fquiz:answer-drafts:${sessionId}`)
    } catch {
      // Storage may be disabled by the browser.
    }
    return null
  }
}

function isUnacknowledgedEmptyDraft(
  next: number[],
  existing: SessionData['session']['user_answers'][number] | undefined,
  draft: AnswerDraft | undefined,
) {
  return next.length === 0 && !existing && draft?.status === 'unsaved' && !draft.acknowledged
}

function getSelectionChange(
  selectedOptions: number[],
  index: number,
  required: number,
  isImmediate: boolean,
  existing: SessionData['session']['user_answers'][number] | undefined,
  draft: AnswerDraft | undefined,
  canSelect: boolean,
) {
  if (!canSelect) return null
  const next = getNextSelection(selectedOptions, index, required, isImmediate)
  if (JSON.stringify(next) === JSON.stringify(selectedOptions)) return null
  return { next, discard: isUnacknowledgedEmptyDraft(next, existing, draft) }
}

function resolveSavedAnswerFeedback(data: any, pending: AnswerDraft): QuestionFeedback | null | undefined {
  return 'isCorrect' in data ? {
    isCorrect: data.isCorrect,
    correctAnswer: data.correctAnswer,
    correctAnswers: data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : []),
    explanation: data.explanation,
  } : pending.feedback
}

function saveAnswerDraft(
  sessionId: string | undefined,
  questionIndex: number,
  answerIndexes: number[],
  canWrite: () => boolean,
  sessionRef: { current: string | undefined },
  draftsRef: { current: Record<number, AnswerDraft> },
  isImmediate: boolean | undefined,
  preloadedQuestions: SessionQuestion[] | null,
  updateDraft: (index: number, draft: AnswerDraft) => void,
  submitAnswer: UseSessionAnswerSyncParams['submitAnswer'],
) {
  if (!sessionId || !canWrite() || draftsRef.current[questionIndex]?.status === 'saving') return
  const question = preloadedQuestions?.[questionIndex]
  const pending: AnswerDraft = {
    answerIndexes,
    status: 'saving',
    feedback: isImmediate
      ? computeQuestionFeedback(question?.correct_answer, answerIndexes, question?.explanation)
      : null,
  }
  updateDraft(questionIndex, pending)
  submitAnswer({ questionIndex, answerIndexes }, {
    onSuccess: (data: any) => {
      if (sessionRef.current !== sessionId) return
      const persistedAnswerIndexes = Array.isArray(data?.answerIndexes) ? data.answerIndexes : pending.answerIndexes
      updateDraft(questionIndex, {
        ...pending,
        answerIndexes: persistedAnswerIndexes,
        status: 'saved',
        feedback: resolveSavedAnswerFeedback(data, pending),
      })
    },
    onError: () => {
      if (sessionRef.current === sessionId) updateDraft(questionIndex, { ...pending, status: 'error' })
    },
  })
}

function useAnswerDraftState(
  sessionId: string | undefined,
  activeData: SessionData | undefined,
  getRequiredSelectionCount: (index: number) => number | null,
  canWrite: () => boolean,
) {
  const [draftState, setDraftState] = useState<{ sessionId?: string; answers: Record<number, AnswerDraft> }>({ answers: {} })
  const drafts = draftState.sessionId === sessionId ? draftState.answers : {}
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const sessionRef = useRef(sessionId)
  sessionRef.current = sessionId
  const permissionRef = useRef(canWrite)
  permissionRef.current = canWrite

  useEffect(() => {
    if (!sessionId || typeof window === 'undefined') return
    const parsed = readDraftAnswers(sessionId)
    if (!parsed) return
    const serverAnswers = new Map(activeData?.session.user_answers.map((answer) => [answer.question_index, answer]) ?? [])
    const answers = restoreDraftAnswers(
      parsed,
      serverAnswers,
      activeData?.session.mode === 'immediate',
      getRequiredSelectionCount,
    )
    draftsRef.current = answers
    setDraftState({ sessionId, answers })
    persistPendingDrafts(sessionId, answers)
  }, [sessionId, activeData?.session.mode, activeData?.session.user_answers, getRequiredSelectionCount])

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
    if (sessionId) persistPendingDrafts(sessionId, answers)
  }, [sessionId])

  const removeDraft = useCallback((index: number) => {
    const answers = { ...draftsRef.current }
    delete answers[index]
    draftsRef.current = answers
    setDraftState({ sessionId, answers })
    if (sessionId) persistPendingDrafts(sessionId, answers)
  }, [sessionId])

  return { drafts, draftsRef, sessionRef, permissionRef, updateDraft, removeDraft }
}

function getSelectedAnswerOptions(draft: AnswerDraft | undefined, existing: SessionData['session']['user_answers'][number] | undefined) {
  return draft?.answerIndexes ?? (existing?.answer_indexes?.length ? existing.answer_indexes : existing ? [existing.answer_index] : [])
}

function isAnswerSubmitted(
  isImmediate: boolean,
  draft: AnswerDraft | undefined,
  existing: SessionData['session']['user_answers'][number] | undefined,
) {
  return Boolean(isImmediate && (draft ? draft.status === 'saving' || draft.status === 'saved' : existing))
}

function getAnswerSaveStatus(
  drafts: Record<number, AnswerDraft>,
  draft: AnswerDraft | undefined,
  existing: SessionData['session']['user_answers'][number] | undefined,
): SaveStatus {
  const priority: SaveStatus[] = ['saving', 'error', 'unsaved']
  const status = priority.find((candidate) => Object.values(drafts).some((answer) => answer.status === candidate))
  return status ?? draft?.status ?? (existing ? 'saved' : 'idle')
}

function getUnsavedQuestionIndex(drafts: Record<number, AnswerDraft>) {
  return Object.entries(drafts).find(([, answer]) => answer.status === 'unsaved')?.[0]
}

function getAcknowledgedQuestionIndexes(drafts: Record<number, AnswerDraft>) {
  return new Set(Object.entries(drafts).filter(([, answer]) => answer.acknowledged).map(([index]) => Number(index)))
}

export function useSessionAnswerSync({
  activeData, currentQuestionIndex, currentQuestion, preloadedQuestions,
  submitAnswer, isSubmitting, canWrite = () => true,
}: UseSessionAnswerSyncParams) {
  const { setLastAnswerResult } = useQuizSessionStore()
  const sessionId = activeData?.session._id
  const getRequiredSelectionCount = useCallback(
    (index: number) => getQuestionSelectionCount(activeData, currentQuestionIndex, preloadedQuestions, index),
    [activeData, currentQuestionIndex, preloadedQuestions],
  )
  const { drafts, draftsRef, sessionRef, permissionRef, updateDraft, removeDraft } = useAnswerDraftState(
    sessionId,
    activeData,
    getRequiredSelectionCount,
    canWrite,
  )

  const existing = activeData?.session.user_answers.find((answer) => answer.question_index === currentQuestionIndex)
  const draft = drafts[currentQuestionIndex]
  const selectedOptions = useMemo(() => getSelectedAnswerOptions(draft, existing), [draft, existing])
  const isImmediate = activeData?.session.mode === 'immediate'
  const submitted = isAnswerSubmitted(Boolean(isImmediate), draft, existing)
  const feedback = useMemo(
    () => buildCurrentFeedback(submitted, draft?.feedback, existing, currentQuestion, selectedOptions),
    [submitted, draft?.feedback, existing, currentQuestion, selectedOptions],
  )

  useEffect(() => {
    setLastAnswerResult(feedback)
    // Feedback belongs to the visible question; late callbacks only update its draft.
  }, [sessionId, currentQuestionIndex, feedback, setLastAnswerResult])

  const hasUnsavedAnswers = useCallback(() =>
    Object.values(draftsRef.current).some((answer) => answer.status !== 'saved'), [])

  const saveAnswer = useCallback((questionIndex: number, answerIndexes: number[]) => {
    saveAnswerDraft(
      sessionId,
      questionIndex,
      answerIndexes,
      permissionRef.current,
      sessionRef,
      draftsRef,
      isImmediate,
      preloadedQuestions,
      updateDraft,
      submitAnswer,
    )
  }, [sessionId, isImmediate, preloadedQuestions, updateDraft, submitAnswer])

  const handleSelectOption = useCallback((index: number) => {
    const required = Math.max(activeData?.question.answer_selection_count ?? 1, 1)
    const selection = getSelectionChange(
      selectedOptions,
      index,
      required,
      isImmediate,
      existing,
      draftsRef.current[currentQuestionIndex],
      Boolean(activeData?.session && permissionRef.current() && !submitted && draftsRef.current[currentQuestionIndex]?.status !== 'saving'),
    )
    if (!selection) return
    if (selection.discard) {
      removeDraft(currentQuestionIndex)
      return
    }
    updateDraft(currentQuestionIndex, { answerIndexes: selection.next, status: 'unsaved' })
    if (selection.next.length === required) saveAnswer(currentQuestionIndex, selection.next)
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
    if (!failed) return
    const questionIndex = Number(failed[0])
    if ((getRequiredSelectionCount(questionIndex) ?? 1) !== failed[1].answerIndexes.length) {
      updateDraft(questionIndex, { ...failed[1], status: 'unsaved' })
      return
    }
    saveAnswer(questionIndex, failed[1].answerIndexes)
  }, [getRequiredSelectionCount, saveAnswer, updateDraft])

  const saveStatus = getAnswerSaveStatus(drafts, draft, existing)
  const unsavedQuestionIndex = getUnsavedQuestionIndex(drafts)
  const acknowledgedQuestions = getAcknowledgedQuestionIndexes(drafts)

  return { selectedOptions, submitted, handleSelectOption, saveStatus, retryFailedAnswer, hasUnsavedAnswers, discardUnsavedAnswer, unsavedQuestionIndex: unsavedQuestionIndex === undefined ? null : Number(unsavedQuestionIndex), acknowledgedQuestions }
}
