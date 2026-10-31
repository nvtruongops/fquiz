import { formatSessionResultQuestions, historicalResultEvidence, historicalResultQuestionOrder } from './session-result-mapping'
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Question } from '@/lib/modules/quiz/models/Question'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { JWTPayload } from '@/lib/modules/auth/auth'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'

export interface ValidateQuizSessionOptions {
  checkCompleted?: boolean
  checkExpired?: boolean
  lean?: boolean
  requireActive?: boolean
  select?: string
}

export function getSessionRequestErrorResponse(error: unknown): NextResponse {
  const isDatabaseUnavailable = error instanceof Error && error.message.includes('MongoDB connection failed')
  return isDatabaseUnavailable
    ? NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    : NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

const SESSION_OWNERSHIP_FIELDS = ['student_id', 'is_guest', 'guest_id']

export function activeSessionWriteFilter(now = new Date()) {
  return {
    status: 'active' as const,
    $or: [
      { expires_at: null },
      { expires_at: { $gt: now } },
    ],
  }
}

export function resolveEffectiveQuestionOrder(session: any, quiz?: any): number[] {
  const cachedCount = Array.isArray(session?.questions_cache) ? session.questions_cache.length : 0
  const quizCount = (Array.isArray(quiz?.questions) ? quiz.questions.length : 0) ||
    (Array.isArray(quiz?.question_refs) ? quiz.question_refs.length : 0)
  const questionCount = cachedCount || quizCount
  const order = session?.question_order
  const isPermutation = Array.isArray(order) &&
    order.length === questionCount &&
    questionCount > 0 &&
    new Set(order).size === questionCount &&
    order.every((index: number) => Number.isInteger(index) && index >= 0 && index < questionCount)

  return isPermutation ? order : Array.from({ length: questionCount }, (_, index) => index)
}

export function countAnsweredQuestionIndexes(answers: unknown): number {
  if (!Array.isArray(answers)) return 0
  const indices = answers
    .map((answer: any) => answer?.question_index)
    .filter((index: unknown) => Number.isInteger(index) && (index as number) >= 0)
  return new Set(indices).size
}

function resolveQuestionAtSourceIndex(
  session: any,
  quiz: any,
  sourceIndex: number,
  referencedQuestion?: IQuestion | null
): IQuestion | null {
  if (Array.isArray(session?.questions_cache) && session.questions_cache.length > 0) {
    return session.questions_cache[sourceIndex] ?? null
  }

  return referencedQuestion ?? (Array.isArray(quiz?.questions) ? quiz.questions[sourceIndex] : null) ?? null
}

export async function resolveEffectiveQuestionAtIndex(
  session: any,
  quiz: any,
  sourceIndex: number
): Promise<IQuestion | null> {
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0) return null

  if (Array.isArray(session?.questions_cache) && session.questions_cache.length > 0) {
    return resolveQuestionAtSourceIndex(session, quiz, sourceIndex)
  }
  if (Array.isArray(quiz?.questions) && quiz.questions.length > 0) {
    return resolveQuestionAtSourceIndex(session, quiz, sourceIndex)
  }

  const ref = Array.isArray(quiz?.question_refs) ? quiz.question_refs[sourceIndex] : null
  let referencedQuestion: IQuestion | null = null
  if (ref && mongoose.Types.ObjectId.isValid(ref)) {
    const question = await Question.findById(ref)
      .select('question_id text options correct_answer explanation image_url')
      .lean()
    if (question) referencedQuestion = question as unknown as IQuestion
  }

  return resolveQuestionAtSourceIndex(session, quiz, sourceIndex, referencedQuestion)
}

export async function resolveEffectiveQuestionDeck(
  session: any,
  quiz: any
): Promise<{ questions: Array<IQuestion | null>; questionOrder: number[] }> {
  const questionOrder = resolveEffectiveQuestionOrder(session, quiz)
  if (hasCachedQuestionDeck(session)) {
    return { questions: session.questions_cache, questionOrder }
  }
  if (hasEmbeddedQuestionDeck(quiz)) {
    return { questions: quiz.questions, questionOrder }
  }

  const refs = Array.isArray(quiz?.question_refs) ? quiz.question_refs : []
  const questionsById = await loadReferencedQuestions(refs)

  const questions = Array.from({ length: questionOrder.length }, (_, sourceIndex) => {
    const referencedQuestion = getReferencedQuestion(refs[sourceIndex], questionsById)
    return resolveQuestionAtSourceIndex(session, quiz, sourceIndex, referencedQuestion)
  })

  return { questions, questionOrder }
}

function hasCachedQuestionDeck(session: any): boolean {
  return Array.isArray(session?.questions_cache) && session.questions_cache.length > 0
}

function hasEmbeddedQuestionDeck(quiz: any): boolean {
  return Array.isArray(quiz?.questions) && quiz.questions.length > 0
}

async function loadReferencedQuestions(refs: any[]): Promise<Map<string, IQuestion>> {
  const validRefs = refs.filter((ref: any) => mongoose.Types.ObjectId.isValid(ref))
  if (validRefs.length === 0) return new Map()
  const resolved = await Question.find({ _id: { $in: validRefs } })
    .select('question_id text options correct_answer explanation image_url')
    .lean() as any[]
  return new Map(resolved.map((question) => [question._id.toString(), question as IQuestion]))
}

function getReferencedQuestion(ref: any, questionsById: Map<string, IQuestion>): IQuestion | null {
  if (!ref || !mongoose.Types.ObjectId.isValid(ref)) return null
  return questionsById.get(ref.toString()) ?? null
}

function getSessionStatusResponse(status: string, options: ValidateQuizSessionOptions): NextResponse | null {
  if (options.checkCompleted && status === 'completed') {
    return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
  }

  if (options.requireActive && status !== 'active') {
    return NextResponse.json(
      { error: status === 'completed' ? 'Session already completed' : 'Session is not active' },
      { status: 409 }
    )
  }

  return null
}

function isSessionOwnedByPayload(session: any, payload: JWTPayload): boolean {
  return session.is_guest
    ? Boolean(payload.guestId && session.guest_id === payload.guestId)
    : Boolean(payload.userId && session.student_id?.toString() === payload.userId)
}

function isExclusionOnlySelection(fields: string[]): boolean {
  return fields.length > 0 && fields.every((field) => field.startsWith('-'))
}

function applySessionSelection(query: any, select: string | undefined): void {
  if (!select) return
  const fields = select.trim().split(/\s+/).filter(Boolean)
  const selection = isExclusionOnlySelection(fields)
    ? fields.filter((field) => !SESSION_OWNERSHIP_FIELDS.includes(field.slice(1))).join(' ')
    : [...new Set([...fields, ...SESSION_OWNERSHIP_FIELDS])].join(' ')
  if (selection) query.select(selection)
}

function getSessionExpiryResponse(session: any, checkExpired: boolean | undefined): NextResponse | null {
  if (
    checkExpired !== false &&
    session.status === 'active' &&
    session.expires_at &&
    new Date(session.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
      { status: 410 }
    )
  }
  return null
}

function getSessionValidationResponse(
  session: any,
  payload: JWTPayload,
  options: ValidateQuizSessionOptions
): NextResponse | null {
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (!isSessionOwnedByPayload(session, payload)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expiryResponse = getSessionExpiryResponse(session, options.checkExpired)
  if (expiryResponse) return expiryResponse
  return getSessionStatusResponse(session.status, options)
}

export async function validateQuizSessionRequest(
  sessionId: string,
  payload: JWTPayload,
  options: ValidateQuizSessionOptions = {}
): Promise<
  | { isValid: true; session: any; response?: undefined }
  | { isValid: false; session?: undefined; response: NextResponse }
> {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Invalid session id' }, { status: 400 }),
    }
  }

  await connectDB()

  const lean = options.lean !== false
  const query = QuizSession.findById(sessionId)
  applySessionSelection(query, options.select)
  const session = await (lean ? query.lean() : query)
  const response = getSessionValidationResponse(session, payload, options)
  return response ? { isValid: false, response } : { isValid: true, session }
}

export const MAX_COMPLETED_SESSIONS_PER_QUIZ = 20

/**
 * Prunes older completed sessions for a given student, quiz, and mode group
 * if the total completed count exceeds MAX_COMPLETED_SESSIONS_PER_QUIZ.
 */
export async function pruneCompletedSessions(
  studentId: mongoose.Types.ObjectId | string | undefined | null,
  quizId: mongoose.Types.ObjectId | string,
  mode: string
): Promise<number> {
  if (!studentId) return 0
  try {
    await connectDB()
    const studentObjectId = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId
    const quizObjectId = typeof quizId === 'string' ? new mongoose.Types.ObjectId(quizId) : quizId

    const completedSessions = await QuizSession.find({
      student_id: studentObjectId,
      quiz_id: quizObjectId,
      mode,
      status: 'completed',
    })
      .sort({ completed_at: -1 })
      .select('_id')
      .lean()

    if (completedSessions.length > MAX_COMPLETED_SESSIONS_PER_QUIZ) {
      const toDeleteIds = completedSessions
        .slice(MAX_COMPLETED_SESSIONS_PER_QUIZ)
        .map((s: any) => s._id)

      const result = await QuizSession.deleteMany({ _id: { $in: toDeleteIds } })
      return result.deletedCount || 0
    }
    return 0
  } catch (err) {
    console.error('pruneCompletedSessions error:', err)
    return 0
  }
}

import type { UserAnswer } from '@/lib/modules/quiz/types/session'

export async function getQuizSessionResult(sessionId: string, userId?: string, guestId?: string) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return null
  await connectDB()

  const session = (await QuizSession.findById(sessionId).lean()) as any
  if (!session) return null
  const isOwnedSession = session.is_guest
    ? Boolean(guestId && session.guest_id === guestId)
    : Boolean(userId && session.student_id?.toString() === userId)
  if (!isOwnedSession) return null
  if (session.status !== 'completed') return null

  const quizDoc = (await Quiz.findById(session.quiz_id).select('questions question_refs updatedAt').lean()) as any
  const hasCachedQuestions = Array.isArray(session.questions_cache) && session.questions_cache.length > 0
  const quiz = hasCachedQuestions ? null : quizDoc

  const quizUpdatedAfterStart = Boolean(
    quizDoc?.updatedAt &&
    session.started_at &&
    new Date(quizDoc.updatedAt).getTime() > new Date(session.started_at).getTime()
  )

  const { questions: allQuestions, questionOrder: resolvedOrder } = await resolveEffectiveQuestionDeck(session, quizDoc)
  const sessionAnswers = (session.user_answers ?? []) as UserAnswer[]

  const evidence = historicalResultEvidence(session, quizDoc)
  const questionOrder = evidence.snapshot_unavailable
    ? historicalResultQuestionOrder(session, resolvedOrder)
    : resolvedOrder
  const questions = formatSessionResultQuestions(session, evidence.snapshot_unavailable ? [] : allQuestions, questionOrder)

  return {
    sessionId: session._id.toString(),
    quizId: session.quiz_id.toString(),
    mode: session.mode,
    score: session.score,
    totalQuestions: questionOrder.length,
    completed_at: session.completed_at?.toISOString() ?? new Date().toISOString(),
    user_answers: sessionAnswers,
    questions,
    is_temp: session.is_temp ?? false,
    is_guest: Boolean(session.is_guest),
    quiz_updated_after_start: quizUpdatedAfterStart,
    snapshot_unavailable: evidence.snapshot_unavailable,
    snapshot_source: evidence.snapshot_source,
    flashcard_stats: session.mode === 'flashcard' ? session.flashcard_stats : undefined,
  }
}

