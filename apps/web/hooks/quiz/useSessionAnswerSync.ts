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
  revision?: number
  locked?: boolean
}

interface UseSessionAnswerSyncParams {
  activeData: SessionData | undefined
  currentQuestionIndex: number
  currentQuestion: SessionQuestion | undefined
  preloadedQuestions: SessionQuestion[] | null
  submitAnswer: (vars: { questionIndex: number; answerIndexes: number[]; answerRevision?: number }, opts?: any) => void
  isSubmitting: boolean
  canWrite?: () => boolean
}

const revisionCounters = new Map<string, number>()

function nextAnswerRevision(sessionId: string, minimum = 0) {
  const key = `fquiz:answer-revision:${sessionId}`
  let previous = Math.max(revisionCounters.get(sessionId) ?? 0, minimum)
  try {
    const stored = Number(window.sessionStorage.getItem(key))
    if (Number.isSafeInteger(stored)) previous = Math.max(previous, stored)
  } catch { /* Storage may be unavailable; retain the in-memory monotonic counter. */ }
  const revision = Math.max(previous + 1, Date.now() * 1000)
  revisionCounters.set(sessionId, revision)
  try { window.sessionStorage.setItem(key, String(revision)) } catch { /* Best-effort reload recovery. */ }
  return revision
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
  const locked = immediate && (Boolean(answer.locked) || (required !== null && answer.answerIndexes.length === required))
  const status: SaveStatus = answer.status === 'error' ? 'error' : 'unsaved'
  return [index, { answerIndexes: answer.answerIndexes, revision: answer.revision, status, locked }]
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
  return question ? getPositiveSelectionCount(question.answer_selection_count) ?? 1 : null
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

function resolveSavedAnswerFeedback(data: any, pending: AnswerDraft): QuestionFeedback | null | undefined {
  return 'isCorrect' in data ? {
    isCorrect: data.isCorrect,
    correctAnswer: data.correctAnswer,
    correctAnswers: data.correctAnswers ?? (data.correctAnswer !== undefined ? [data.correctAnswer] : []),
    explanation: data.explanation,
  } : pending.feedback
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
  const restoredSessionRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!sessionId || typeof window === 'undefined' || restoredSessionRef.current === sessionId) return
    restoredSessionRef.current = sessionId
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
    const answers = { ...draftsRef.current, [index]: draft }
    draftsRef.current = answers
    setDraftState({ sessionId, answers })
    if (sessionId) persistPendingDrafts(sessionId, answers)
  }, [sessionId])

  return { drafts, draftsRef, sessionRef, permissionRef, updateDraft }
}

function getSelectedAnswerOptions(draft: AnswerDraft | undefined, existing: SessionData['session']['user_answers'][number] | undefined) {
  return draft?.answerIndexes ?? (Array.isArray(existing?.answer_indexes) ? existing.answer_indexes : existing ? [existing.answer_index] : [])
}

function isAnswerSubmitted(
  isImmediate: boolean,
  draft: AnswerDraft | undefined,
  existing: SessionData['session']['user_answers'][number] | undefined,
) {
  return Boolean(isImmediate && (draft ? draft.locked || draft.status === 'saving' || draft.status === 'saved' || draft.status === 'error' : existing))
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

function getQueuedAnswer(drafts: Record<number, AnswerDraft>, immediate: boolean) {
  return Object.entries(drafts).find(([, answer]) =>
    answer.status === 'unsaved' && (!immediate || answer.locked))
}

function getRevisionFloor(revisions: SessionData['session']['answer_revisions'], drafts: Record<number, AnswerDraft> = {}) {
  return Math.max(...Object.values(revisions ?? {}),
    ...Object.values(drafts).map((answer) => answer.revision ?? 0), 0)
}

function getAcknowledgedDraft(latest: AnswerDraft, pending: AnswerDraft, data: any): AnswerDraft {
  if (latest.revision !== pending.revision) return { ...latest, status: 'unsaved' }
  return {
    ...latest,
    status: 'saved',
    answerIndexes: Array.isArray(data?.answerIndexes) ? data.answerIndexes : pending.answerIndexes,
    feedback: resolveSavedAnswerFeedback(data, pending),
  }
}

function getPendingFeedback(immediate: boolean, question: SessionQuestion | undefined, answer: AnswerDraft) {
  return immediate ? computeQuestionFeedback(question?.correct_answer, answer.answerIndexes, question?.explanation) : null
}

function getRequiredSelectionCountForDraft(currentQuestion: SessionQuestion | undefined, activeData: SessionData) {
  return Math.max(currentQuestion?.answer_selection_count ?? activeData.question.answer_selection_count ?? 1, 1)
}

export function useSessionAnswerSync({
  activeData, currentQuestionIndex, currentQuestion, preloadedQuestions,
  submitAnswer, canWrite = () => true,
}: UseSessionAnswerSyncParams) {
  const { setLastAnswerResult } = useQuizSessionStore()
  const sessionId = activeData?.session._id
  const getRequiredSelectionCount = useCallback(
    (index: number) => getQuestionSelectionCount(activeData, currentQuestionIndex, preloadedQuestions, index),
    [activeData, currentQuestionIndex, preloadedQuestions],
  )
  const { drafts, draftsRef, sessionRef, permissionRef, updateDraft } = useAnswerDraftState(
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

  // Serialize all mutations so per-mutation React Query callbacks always run. Each
  // question retains its latest intent while the preceding request is in flight.
  const inFlight = useRef<{ sessionId: string; questionIndex: number; answer: AnswerDraft } | null>(null)
  if (inFlight.current?.sessionId !== sessionId) inFlight.current = null
  const pumpRef = useRef<() => void>(() => {})
  const pump = useCallback(() => {
    if (!sessionId || sessionRef.current !== sessionId || inFlight.current || !permissionRef.current()) return
    const entry = getQueuedAnswer(draftsRef.current, Boolean(isImmediate))
    if (!entry) return
    const questionIndex = Number(entry[0])
    const question = preloadedQuestions?.[questionIndex] ?? (questionIndex === currentQuestionIndex ? currentQuestion : undefined)
    const pending: AnswerDraft = {
      ...entry[1],
      revision: entry[1].revision ?? nextAnswerRevision(sessionId, getRevisionFloor(activeData?.session.answer_revisions)),
      status: 'saving',
      feedback: getPendingFeedback(Boolean(isImmediate), question, entry[1]),
    }
    const request = { sessionId, questionIndex, answer: pending }
    inFlight.current = request
    updateDraft(questionIndex, pending)
    submitAnswer({ questionIndex, answerIndexes: pending.answerIndexes, answerRevision: pending.revision }, {
      onSuccess: (data: any) => {
        if (sessionRef.current !== sessionId || inFlight.current !== request) return
        inFlight.current = null
        const latest = draftsRef.current[questionIndex]
        if (latest === undefined) return
        updateDraft(questionIndex, getAcknowledgedDraft(latest, pending, data))
        pumpRef.current()
      },
      onError: () => {
        if (sessionRef.current !== sessionId || inFlight.current !== request) return
        inFlight.current = null
        const latest = draftsRef.current[questionIndex]
        if (latest) updateDraft(questionIndex, { ...latest, status: 'error' })
        pumpRef.current()
      },
    })
  }, [sessionId, activeData?.session.answer_revisions, isImmediate, preloadedQuestions, currentQuestionIndex, currentQuestion, updateDraft, submitAnswer, draftsRef, permissionRef, sessionRef])
  pumpRef.current = pump
  const writable = canWrite()
  useEffect(() => { pump() }, [pump, drafts, writable])
  useEffect(() => () => { inFlight.current = null }, [sessionId])

  const hasUnsavedAnswers = useCallback(() => Object.values(draftsRef.current).some((answer) =>
    answer.status !== 'saved' && !(isImmediate && answer.status === 'unsaved' && !answer.locked)), [isImmediate, draftsRef])

  const handleSelectOption = useCallback((index: number) => {
    if (!activeData?.session || !permissionRef.current()) return
    const latest = draftsRef.current[currentQuestionIndex]
    if (isAnswerSubmitted(Boolean(isImmediate), latest, existing)) return
    const selected = getSelectedAnswerOptions(latest, existing)
    const required = getRequiredSelectionCountForDraft(currentQuestion, activeData)
    const next = getNextSelection(selected, index, required, Boolean(isImmediate))
    if (JSON.stringify(next) === JSON.stringify(selected)) return
    const revisionFloor = getRevisionFloor(activeData.session.answer_revisions, draftsRef.current)
    updateDraft(currentQuestionIndex, { answerIndexes: next, revision: nextAnswerRevision(sessionId!, revisionFloor),
      status: 'unsaved', locked: isImmediate && next.length === required })
    pump()
  }, [sessionId, activeData, currentQuestion, isImmediate, currentQuestionIndex, existing, updateDraft, pump, draftsRef, permissionRef])

  const retryFailedAnswer = useCallback(() => {
    if (!permissionRef.current()) return
    Object.entries(draftsRef.current).forEach(([index, answer]) => {
      if (answer.status === 'error') updateDraft(Number(index), { ...answer, status: 'unsaved' })
    })
    pump()
  }, [updateDraft, pump, draftsRef, permissionRef])

  const acknowledgedQuestions = new Set<number>()
  activeData?.session.user_answers.forEach((answer) => {
    const required = getRequiredSelectionCount(answer.question_index) ?? 1
    if (getSelectedAnswerOptions(undefined, answer).length === required) acknowledgedQuestions.add(answer.question_index)
  })
  Object.entries(drafts).forEach(([index, answer]) => {
    const questionIndex = Number(index)
    acknowledgedQuestions.delete(questionIndex)
    if (answer.status === 'saved' && answer.answerIndexes.length === (getRequiredSelectionCount(questionIndex) ?? 1)) {
      acknowledgedQuestions.add(questionIndex)
    }
  })
  const saveStatus = getAnswerSaveStatus(drafts, draft, existing)
  return { selectedOptions, submitted, handleSelectOption, saveStatus, retryFailedAnswer, hasUnsavedAnswers, acknowledgedQuestions }
}
