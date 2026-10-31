import { NextResponse } from 'next/server'
import { getClientIp, GUEST_ID_COOKIE_NAME } from '@fquiz/auth'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Category } from '@/lib/modules/quiz/models/Category'
import mongoose from 'mongoose'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { CreateSessionSchema } from '@/lib/modules/quiz/schemas/quiz'
import { enqueueUniqueStudentCountSync } from '@/lib/modules/quiz/quiz-stats-queue'
import { providerFactory, RateLimitStoreUnavailableError } from '@/lib/core/security/rate-limit/provider'
import { secureShuffle, shuffleQuestionOptions } from '@/lib/core/utils/shuffle'
import { createConcurrencyGate } from '@/lib/core/utils/concurrency-gate'
import { getAnswerSelectionCount } from '@/lib/modules/quiz/utils/question-selection-helper'
import { countAnsweredQuestionIndexes } from '@/lib/modules/quiz/session-utils'


const EMPTY_ACTIVE_SESSIONS = { assessmentSession: null, learningSession: null }

function getValidQuizId(request: Request): string | null {
  const quizId = new URL(request.url).searchParams.get('quiz_id')
  return quizId && mongoose.Types.ObjectId.isValid(quizId) ? quizId : null
}

function formatActiveSessionSummary(session: any, quizQuestionCount: number) {
  if (!session) return null
  return {
    sessionId: session._id,
    mode: session.mode,
    difficulty: session.difficulty,
    current_question_index: session.current_question_index,
    totalQuestions: session.questions_cache?.length || quizQuestionCount,
    answeredCount: countAnsweredQuestionIndexes(session.user_answers),
    started_at: session.started_at,
  }
}

async function getActiveSessionSummaries(quizId: string, studentId: string) {
  await connectDB()
  const now = new Date()
  const activeSessions = await QuizSession.find({
    student_id: new mongoose.Types.ObjectId(studentId),
    quiz_id: new mongoose.Types.ObjectId(quizId),
    status: 'active',
    $or: [{ expires_at: { $gt: now } }, { expires_at: { $exists: false } }],
  }).sort({ started_at: -1 }).lean() as any[]
  if (activeSessions.length === 0) return null

  const quiz = await Quiz.findById(quizId).select('questions question_refs').lean()
  const quizQuestionCount = quiz?.questions?.length || quiz?.question_refs?.length || 0
  const assessmentSession = activeSessions.find((session) => ['immediate', 'review'].includes(session.mode))
  const learningSession = activeSessions.find((session) => session.mode === 'flashcard')
  return {
    assessmentSession: formatActiveSessionSummary(assessmentSession, quizQuestionCount),
    learningSession: formatActiveSessionSummary(learningSession, quizQuestionCount),
  }
}

export const GET = withAuth(async (req, { payload }) => {
  try {
    if (!payload.userId) return NextResponse.json(EMPTY_ACTIVE_SESSIONS)
    const quizId = getValidQuizId(req)
    if (!quizId) return NextResponse.json(EMPTY_ACTIVE_SESSIONS)
    const summaries = await getActiveSessionSummaries(quizId, payload.userId)
    return NextResponse.json(summaries ?? EMPTY_ACTIVE_SESSIONS)
  } catch (err) {
    console.error('GET /api/sessions error:', err)
    return NextResponse.json(EMPTY_ACTIVE_SESSIONS)
  }
}, { roles: ['student'], allowGuest: true })

/**
 * POST /api/sessions
 * Creates a new quiz session for a student or anonymous guest.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.1
 */
async function resolveEffectiveQuiz(quiz: any) {
  if (quiz.questions?.length > 0) return { id: quiz._id, questions: quiz.questions }
  if (quiz.question_refs?.length > 0) {
    const { Question } = await import('@/lib/modules/quiz/models/Question')
    const refDocs = await Question.find({ _id: { $in: quiz.question_refs } }).lean()
    const docMap = new Map(refDocs.map((d: any) => [d._id.toString(), d]))
    const orderedQuestions = quiz.question_refs.map((id: any) => docMap.get(id.toString())).filter(Boolean)
    if (orderedQuestions.length > 0) return { id: quiz._id, questions: orderedQuestions }
  }
  if (quiz.original_quiz_id && mongoose.Types.ObjectId.isValid(quiz.original_quiz_id.toString())) {
    const original = await Quiz.findById(quiz.original_quiz_id).select('questions question_refs status is_public').lean() as any
    if (original && original.status === 'published' && original.is_public) {
      return resolveEffectiveQuiz(original)
    }
  }
  return null
}

function handleSessionConflicts(session: any, questions: any[], action: string | undefined, group: string) {
  if (action === 'continue') {
    const safeIdx = Math.min(session.current_question_index ?? 0, Math.max(questions.length - 1, 0))
    return NextResponse.json({ sessionId: session._id, mode: session.mode, difficulty: session.difficulty, resumed: true, totalQuestions: questions.length, currentQuestionIndex: safeIdx })
  }
  if (action === 'restart') return null // Signal to delete and restart

  const answered = countAnsweredQuestionIndexes(session.user_answers)
  return NextResponse.json({ error: `You have an unfinished ${group === 'learning' ? 'flashcard' : 'quiz'} session.`, code: 'ACTIVE_SESSION_EXISTS', activeSession: { sessionId: session._id, mode: session.mode, difficulty: session.difficulty, current_question_index: session.current_question_index, totalQuestions: questions.length, answeredCount: answered, started_at: session.started_at } }, { status: 409 })
}

const sessionLimiter = providerFactory.createProvider(10, 60 * 1000, { onStoreError: 'throw' })
const sessionCreationGate = createConcurrencyGate(5)

type PreparedSession = {
  quiz: any
  effective: { id: any; questions: any[] }
  now: Date
  questionOrder: number[]
  questionsCache: any[]
  mode: string
  difficulty: string
}

function createQuestionOrder(questionCount: number, difficulty: string) {
  return difficulty === 'random'
    ? secureShuffle([...new Array(questionCount).keys()])
    : Array.from({ length: questionCount }, (_, index) => index)
}

function cacheSessionQuestion(question: any, shuffleOptions: boolean) {
  const processed = shuffleOptions ? shuffleQuestionOptions(question) : question
  const correctAnswer = Array.isArray(processed.correct_answer)
    ? processed.correct_answer
    : typeof processed.correct_answer === 'number'
      ? [processed.correct_answer]
      : []
  return {
    _id: processed._id && mongoose.Types.ObjectId.isValid(processed._id.toString())
      ? new mongoose.Types.ObjectId(processed._id.toString())
      : new mongoose.Types.ObjectId(),
    text: processed.text,
    options: processed.options,
    correct_answer: correctAnswer,
    explanation: processed.explanation,
    ...(processed.image_url ? { image_url: processed.image_url } : {}),
  }
}

async function getAccessibleQuiz(quizId: string, payload: JWTPayload) {
  const quiz = await Quiz.findById(quizId)
    .select('questions question_refs original_quiz_id created_by is_public status is_saved_from_explore course_code title category_id').lean() as any
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
  const isOwner = payload.userId ? quiz.created_by?.toString() === payload.userId : false
  if (!isOwner && !(quiz.is_public && quiz.status === 'published')) {
    return NextResponse.json({ error: 'This quiz has been closed by Admin or is not public.' }, { status: 403 })
  }
  return quiz
}

async function prepareSession(quizId: string, mode: string, difficulty: string, shuffleOptions: boolean | undefined, payload: JWTPayload): Promise<PreparedSession | NextResponse> {
  const quiz = await getAccessibleQuiz(quizId, payload)
  if (quiz instanceof NextResponse) return quiz
  const effective = await resolveEffectiveQuiz(quiz)
  if (!effective) return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 })

  const now = new Date()
  const questionOrder = createQuestionOrder(effective.questions.length, difficulty)
  const shouldShuffleOptions = shuffleOptions ?? (difficulty === 'random')
  const questionsCache = effective.questions.map((question: any) => cacheSessionQuestion(question, shouldShuffleOptions))
  return { quiz, effective, now, questionOrder, questionsCache, mode, difficulty }
}

async function getCategoryDisplayName(categoryId: unknown): Promise<string> {
  if (!categoryId) return 'General'
  const category = await Category.findById(categoryId).select('name').lean() as any
  return category?.name || 'General'
}

function formatCachedQuestion(sessionMode: string, question: any) {
  const baseQuestion = {
    _id: question._id ? question._id.toString() : undefined,
    text: question.text,
    options: question.options,
    answer_selection_count: getAnswerSelectionCount(question),
    usage_count: 1,
    used_in_quizzes: [],
    ...(question.image_url ? { image_url: question.image_url } : {}),
  }
  return sessionMode === 'flashcard'
    ? { ...baseQuestion, correct_answer: question.correct_answer, explanation: question.explanation }
    : baseQuestion
}

function formatSessionQuestionCache(session: any, prepared: PreparedSession) {
  return prepared.questionOrder.map((sourceIndex) => {
    const question = prepared.questionsCache[sourceIndex] ?? prepared.questionsCache[0] ?? {}
    return formatCachedQuestion(session.mode, question)
  })
}

function buildInitialSessionRecord(session: any, prepared: PreparedSession, categoryName: string) {
  const { quiz, effective } = prepared
  return {
    _id: session._id.toString(),
    mode: session.mode,
    status: session.status,
    current_question_index: 0,
    user_answers: [],
    ...(session.mode === 'review' ? {} : { score: session.score ?? 0 }),
    totalQuestions: effective.questions.length,
    courseCode: quiz.course_code || '',
    categoryName,
    title: quiz.title || '',
    started_at: session.started_at ? session.started_at.toISOString() : new Date().toISOString(),
    paused_at: null,
    total_paused_duration_ms: 0,
    is_temp: Boolean(session.is_temp),
    quiz_id: session.quiz_id.toString(),
    ...(session.mode === 'flashcard' && session.flashcard_stats ? { flashcard_stats: session.flashcard_stats } : {}),
  }
}

async function buildInitialAndPreloadPayloads(session: any, prepared: PreparedSession) {
  const categoryName = await getCategoryDisplayName(prepared.quiz.category_id)
  const questions = formatSessionQuestionCache(session, prepared)
  return {
    initialData: {
      session: buildInitialSessionRecord(session, prepared, categoryName),
      question: questions[0] || null,
    },
    preloadData: {
      sessionId: session._id.toString(),
      mode: session.mode,
      difficulty: session.difficulty,
      status: session.status,
      totalQuestions: prepared.effective.questions.length,
      questions,
    },
  }
}

function getFlashcardStats(questionCount: number) {
  return { total_cards: questionCount, cards_known: 0, cards_unknown: 0, time_spent_ms: 0, current_round: 1 }
}

async function createGuestSession(prepared: PreparedSession, payload: JWTPayload) {
  const { effective, mode, difficulty, now, questionOrder, questionsCache } = prepared
  const guestId = payload.guestId ?? crypto.randomUUID()
  await enqueueUniqueStudentCountSync(effective.id, 120_000)
  const session = await QuizSession.create({
    student_id: null,
    is_guest: true,
    guest_id: guestId,
    quiz_id: effective.id,
    mode,
    difficulty,
    status: 'active',
    current_question_index: 0,
    question_order: questionOrder,
    user_answers: [],
    score: 0,
    questions_cache: questionsCache,
    flashcard_stats: mode === 'flashcard' ? getFlashcardStats(effective.questions.length) : undefined,
    expires_at: new Date(now.getTime() + 86400000),
    started_at: now,
    last_activity_at: now,
    total_paused_duration_ms: 0,
  })
  await Quiz.updateOne({ _id: effective.id }, { $inc: { studentCount: 1 } })
  enqueueUniqueStudentCountSync(effective.id).catch((err) => console.error('Failed to enqueue guest session stats sync:', err))

  const { initialData, preloadData } = await buildInitialAndPreloadPayloads(session, prepared)
  const response = NextResponse.json({
    sessionId: session._id,
    mode: session.mode,
    difficulty: session.difficulty,
    totalQuestions: effective.questions.length,
    isGuest: true,
    initialData,
    preloadData,
  }, { status: 201 })
  response.cookies.set(GUEST_ID_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
  })
  return response
}

async function getIncompleteFlashcardResponse(studentId: mongoose.Types.ObjectId, prepared: PreparedSession, action?: string) {
  if (!shouldCheckIncompleteFlashcard(prepared, action)) return null
  const completedSession = await findIncompleteFlashcard(studentId, prepared)
  return completedSession ? buildIncompleteFlashcardResponse(completedSession, prepared) : null
}

function shouldCheckIncompleteFlashcard(prepared: PreparedSession, action?: string) {
  return prepared.mode === 'flashcard' && action !== 'restart' && action !== 'continue'
}

async function findIncompleteFlashcard(studentId: mongoose.Types.ObjectId, prepared: PreparedSession) {
  return QuizSession.findOne({
    student_id: studentId,
    quiz_id: prepared.effective.id,
    mode: 'flashcard',
    status: 'completed',
    'flashcard_stats.cards_unknown': { $gt: 0 },
  }).sort({ completed_at: -1 }).lean() as any
}

function buildIncompleteFlashcardResponse(completedSession: any, prepared: PreparedSession) {
  const stats = completedSession.flashcard_stats || {}
  const totalCards = stats.total_cards || prepared.effective.questions.length
  return NextResponse.json({
    error: `You still have ${stats.cards_unknown}/${totalCards} unmemorized cards in this flashcard session.`,
    code: 'COMPLETED_FLASHCARD_HAS_UNKNOWN',
    activeSession: {
      sessionId: completedSession._id.toString(),
      mode: 'flashcard',
      cardsKnown: stats.cards_known || 0,
      cardsUnknown: stats.cards_unknown || 0,
      totalCards,
      answeredCount: stats.cards_known || 0,
      totalQuestions: totalCards,
    },
  }, { status: 409 })
}

async function resolveActiveSessionConflict(studentId: mongoose.Types.ObjectId, prepared: PreparedSession, action?: string) {
  const modeGroup = prepared.mode === 'flashcard' ? 'learning' : 'assessment'
  const groupModes = modeGroup === 'learning' ? ['flashcard'] : ['immediate', 'review']
  const activeSessions = await QuizSession.find({
    student_id: studentId,
    quiz_id: prepared.effective.id,
    status: 'active',
    $or: [{ expires_at: { $gt: new Date() } }, { expires_at: { $exists: false } }],
  }).sort({ started_at: -1 }).lean() as any[]
  const groupSession = activeSessions.find((session) => groupModes.includes(session.mode))
  if (!groupSession) return null

  const conflictResponse = handleSessionConflicts(groupSession, prepared.effective.questions, action, modeGroup)
  if (conflictResponse) return conflictResponse
  await QuizSession.deleteOne({ _id: groupSession._id })
  return action === 'restart' ? NextResponse.json({}, { status: 200 }) : null
}

async function createStudentSession(prepared: PreparedSession, payload: JWTPayload & { userId: string }, action?: string) {
  const studentId = new mongoose.Types.ObjectId(payload.userId)
  const incompleteFlashcard = await getIncompleteFlashcardResponse(studentId, prepared, action)
  if (incompleteFlashcard) return incompleteFlashcard
  await enqueueUniqueStudentCountSync(prepared.effective.id, 120_000)
  const conflictResponse = await resolveActiveSessionConflict(studentId, prepared, action)
  if (conflictResponse) return conflictResponse

  const modeGroup = prepared.mode === 'flashcard' ? 'learning' : 'assessment'
  const groupModes = modeGroup === 'learning' ? ['flashcard'] : ['immediate', 'review']
  await QuizSession.deleteMany({
    student_id: studentId,
    quiz_id: prepared.effective.id,
    mode: { $in: groupModes },
    status: { $ne: 'completed' },
  })
  const { effective, mode, difficulty, now, questionOrder, questionsCache } = prepared
  const session = await QuizSession.create({
    student_id: studentId,
    is_guest: false,
    quiz_id: effective.id,
    mode,
    difficulty,
    status: 'active',
    current_question_index: 0,
    question_order: questionOrder,
    user_answers: [],
    score: 0,
    questions_cache: questionsCache,
    flashcard_stats: mode === 'flashcard' ? getFlashcardStats(effective.questions.length) : undefined,
    expires_at: mode === 'flashcard' ? undefined : new Date(now.getTime() + 86400000),
    started_at: now,
    last_activity_at: now,
    total_paused_duration_ms: 0,
  })
  enqueueUniqueStudentCountSync(effective.id).catch((err) => console.error('Failed to enqueue session stats sync:', err))
  const { initialData, preloadData } = await buildInitialAndPreloadPayloads(session, prepared)
  return NextResponse.json({
    sessionId: session._id,
    mode: session.mode,
    difficulty: session.difficulty,
    totalQuestions: effective.questions.length,
    initialData,
    preloadData,
  }, { status: 201 })
}

async function createSession(quizId: string, mode: string, difficulty: string, action: string | undefined, shuffleOptions: boolean | undefined, payload: JWTPayload) {
  const prepared = await prepareSession(quizId, mode, difficulty, shuffleOptions, payload)
  if (prepared instanceof NextResponse) return prepared
  return payload.userId
    ? createStudentSession(prepared, payload, action)
    : createGuestSession(prepared, payload)
}

async function handleCreateSession(req: Request, payload: JWTPayload) {
  const rateLimitKey = payload.userId || getClientIp(req)
  const rateLimitResult = await sessionLimiter.check(rateLimitKey)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many session creation requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        },
      }
    )
  }
  const body = await req.json().catch(() => null)
  const parsed = CreateSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }
  const { quiz_id, mode, difficulty, action, shuffle_options } = parsed.data
  await connectDB()
  return createSession(quiz_id, mode, difficulty, action, shuffle_options, payload)
}

function isMongoCapacityError(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const typed = current as { name?: unknown; cause?: unknown } | null
    if (typeof typed?.name === 'string' && /MongoWaitQueueTimeoutError|MongooseServerSelectionError|MongoNetwork(?:Timeout)?Error/.test(typed.name)) {
      return true
    }
    current = typed?.cause
  }
  return false
}

function serviceUnavailableResponse() {
  return NextResponse.json(
    { error: 'Session service is busy. Please retry shortly.' },
    { status: 503, headers: { 'Retry-After': '2' } }
  )
}

export const POST = withAuth(async (req, { payload }) => {
  const release = sessionCreationGate.tryAcquire()
  if (!release) return serviceUnavailableResponse()

  try {
    return await handleCreateSession(req, payload)
  } catch (err) {
    console.error('POST /api/sessions error:', err)
    if (err instanceof RateLimitStoreUnavailableError || isMongoCapacityError(err)) {
      return serviceUnavailableResponse()
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    release()
  }
}, { roles: ['student'], allowGuest: true })
