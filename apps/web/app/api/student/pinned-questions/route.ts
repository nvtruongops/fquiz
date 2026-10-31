import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Types } from 'mongoose'
import { parseJsonBody } from '@/lib/core/api-helpers'
import { getQuestionIdentity } from '@fquiz/models'
import { findStudentAccessibleQuiz, getStudentQuizVisibilityFilter, getUnexpiredQuizSessionFilter } from '@/lib/modules/quiz/utils/student-quiz-access'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const PINNED_QUESTIONS_PAGE_SIZE = 50
const CATEGORY_PIN_SCAN_BATCH_SIZE = 250
const CATEGORY_PIN_MAX_SCAN_BATCHES = 5

function parsePinnedQuestionsCursor(value: string | null) {
  if (!value) return null
  if (!Types.ObjectId.isValid(value)) return undefined
  return new Types.ObjectId(value)
}

/** Resolve the bounded course-code filter and optional category join for pin pages. */
async function buildPinnedQuestionsFilter(studentId: Types.ObjectId, courseCodeParam?: string | null) {
  const filter: any = { student_id: studentId }
  if (!courseCodeParam || !courseCodeParam.trim()) return { filter }

  const cleanCode = courseCodeParam.trim()
  const escapedCode = escapeRegex(cleanCode)
  // eslint-disable-next-line security/detect-non-literal-regexp
  const codeRegex = new RegExp(`^${escapedCode}(_.*)?$`, 'i')

  // Find Category by name
  const category = await Category.findOne({
    // eslint-disable-next-line security/detect-non-literal-regexp
    name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
  }).select('_id').lean()

  if (category) return { filter, codeRegex, categoryId: category._id }

  filter.course_code = { $regex: codeRegex }
  return { filter, codeRegex }
}

async function findCategoryPinnedQuestionPage(
  studentId: Types.ObjectId,
  categoryId: Types.ObjectId,
  codeRegex: RegExp,
  cursor: Types.ObjectId | null,
  pageSize: number,
) {
  let scanCursor = cursor
  let exhausted = false
  let scanBatches = 0
  const matchingPins: any[] = []

  while (matchingPins.length <= pageSize && scanBatches < CATEGORY_PIN_MAX_SCAN_BATCHES) {
    const candidates = await findPinnedQuestionCandidates(studentId, scanCursor)

    if (candidates.length === 0) {
      exhausted = true
      break
    }

    scanCursor = candidates.at(-1)._id
    const { categoryQuizIds, categoryCodeSet } = await loadCategoryPinMembership(categoryId, candidates)
    for (const pin of candidates) {
      if (isCategoryPinnedQuestion(pin, codeRegex, categoryQuizIds, categoryCodeSet)) matchingPins.push(pin)
    }

    scanBatches++
    if (candidates.length < CATEGORY_PIN_SCAN_BATCH_SIZE) {
      exhausted = true
      break
    }
  }

  const hasMoreMatches = matchingPins.length > pageSize
  const pins = matchingPins.slice(0, pageSize)
  const nextCursor = getCategoryPinsNextCursor(hasMoreMatches, exhausted, pins, scanCursor)
  return { pins, nextCursor }
}

async function findPinnedQuestionCandidates(studentId: Types.ObjectId, cursor: Types.ObjectId | null) {
  const filter: Record<string, unknown> = { student_id: studentId }
  if (cursor) filter._id = { $lt: cursor }
  return await PinnedQuestion.find(filter)
    .sort({ _id: -1 })
    .limit(CATEGORY_PIN_SCAN_BATCH_SIZE)
    .select('_id quiz_id course_code')
    .lean() as any[]
}

async function loadCategoryPinMembership(categoryId: Types.ObjectId, candidates: any[]) {
  const candidateQuizIds = Array.from(new Set(candidates.map((pin) => pin.quiz_id?.toString()).filter(Boolean)))
    .map((id) => new Types.ObjectId(id))
  const candidateCourseCodes = Array.from(new Set(candidates.map((pin) => pin.course_code).filter(Boolean)))
  const [categoryQuizzes, categoryCourseCodes] = await Promise.all([
    candidateQuizIds.length > 0
      ? Quiz.find({ _id: { $in: candidateQuizIds }, category_id: categoryId })
        .select('_id')
        .limit(CATEGORY_PIN_SCAN_BATCH_SIZE)
        .lean() as Promise<any[]>
      : Promise.resolve([]),
    candidateCourseCodes.length > 0
      ? Quiz.distinct('course_code', { category_id: categoryId, course_code: { $in: candidateCourseCodes } })
      : Promise.resolve([]),
  ])
  return {
    categoryQuizIds: new Set(categoryQuizzes.map((quiz: any) => quiz._id.toString())),
    categoryCodeSet: new Set(categoryCourseCodes.map((code: string) => code.trim().toUpperCase())),
  }
}

function isCategoryPinnedQuestion(
  pin: any,
  codeRegex: RegExp,
  categoryQuizIds: Set<string>,
  categoryCodeSet: Set<string>,
): boolean {
  const courseCode = pin.course_code?.trim().toUpperCase()
  return Boolean(
    codeRegex.test(pin.course_code ?? '') ||
    (pin.quiz_id && categoryQuizIds.has(pin.quiz_id.toString())) ||
    (courseCode && categoryCodeSet.has(courseCode)),
  )
}

function getCategoryPinsNextCursor(
  hasMoreMatches: boolean,
  exhausted: boolean,
  pins: any[],
  scanCursor: Types.ObjectId | null,
) {
  if (hasMoreMatches) return pins.at(-1)?._id ?? null
  if (exhausted) return null
  return scanCursor
}

/**
 * Resolve the real original (non-temp) quiz and course_code for a question.
 */
async function findRealQuizForQuestion(quizId: string | undefined, cleanCourse: string | undefined, queryCriteria: any[], studentId: string) {
  // Direct primary lookup by quiz_id if valid
  if (quizId && Types.ObjectId.isValid(quizId)) {
    const directQuiz = await findStudentAccessibleQuiz(quizId, studentId)
    if (directQuiz) return directQuiz
  }

  const baseFilter = {
    is_temp: { $ne: true },
    title: { $not: /^(Quiz Tr\u1ED9n|Mix Quiz)/i },
    $and: [getStudentQuizVisibilityFilter(studentId), { $or: queryCriteria }],
  }
  if (cleanCourse && cleanCourse !== 'GENERAL' && !cleanCourse.startsWith('TEMP_')) {
    const matched = await Quiz.findOne({ ...baseFilter, course_code: cleanCourse }).select('_id course_code title questions question_refs').lean()
    if (matched) return matched
  }
  return Quiz.findOne(baseFilter).select('_id course_code title questions question_refs').lean()
}

async function findAnswerAndExplanation(realQuiz: any, cleanText: string, options: string[], question_id?: string) {
  const { findQuestionSnapshot, remapPublishedAnswer } = await import('@fquiz/models')
  const target = { text: cleanText, options, question_id }
  if (realQuiz?.questions && Array.isArray(realQuiz.questions)) {
    const qDoc: any = findQuestionSnapshot(realQuiz.questions, target)
    if (qDoc && (qDoc.correct_answer !== undefined && qDoc.correct_answer !== null)) {
      const correctAnswer = remapPublishedAnswer(qDoc, options) ?? undefined
      return { correctAnswer, explanation: qDoc.explanation }
    }
  }

  const { Question } = await import('@/lib/modules/quiz/models/Question')
  const standalone = await Question.findOne({
    $or: [
      ...(question_id && Types.ObjectId.isValid(question_id) ? [{ _id: new Types.ObjectId(question_id) }] : []),
      { text: cleanText }
    ]
  }).select('text options question_id question_id_aliases correct_answer explanation').lean() as any

  if (standalone && (standalone.correct_answer !== undefined && standalone.correct_answer !== null)) {
    const matching = findQuestionSnapshot([standalone], target)
    const correctAnswer = matching ? remapPublishedAnswer(standalone, options) ?? undefined : undefined
    return { correctAnswer, explanation: standalone.explanation }
  }

  return { correctAnswer: undefined, explanation: undefined }
}

/**
 * Resolve the real original quiz, course_code, correct_answer, and explanation for a question.
 */
async function resolveOriginalQuizForQuestion(params: {
  quiz_id?: string
  clientCourseCode?: string
  clientQuizTitle?: string
  text: string
  options: string[]
  question_id?: string
  studentId: string
}): Promise<{
  originalQuizId?: Types.ObjectId
  originalQuizTitle: string
  originalCourseCode: string
  correctAnswer?: number[]
  explanation?: string
}> {
  const { quiz_id, clientCourseCode, clientQuizTitle, text, options, question_id } = params
  const cleanText = text.trim()
  const cleanCourse = clientCourseCode?.trim().toUpperCase()

  const queryCriteria: any[] = [{ 'questions.text': cleanText }]
  if (question_id) queryCriteria.unshift({ 'questions.question_id': question_id }, { 'questions.question_id_aliases': question_id })
  if (question_id && Types.ObjectId.isValid(question_id)) {
    queryCriteria.push({ question_refs: new Types.ObjectId(question_id) })
    queryCriteria.push({ 'questions._id': new Types.ObjectId(question_id) })
  }

  const realQuiz: any = await findRealQuizForQuestion(quiz_id, cleanCourse, queryCriteria, params.studentId)
  const { correctAnswer, explanation } = await findAnswerAndExplanation(realQuiz, cleanText, options, question_id)

  const title = realQuiz?.title ||
    ((clientQuizTitle && !clientQuizTitle.startsWith('Quiz Tr\u1ED9n') && !clientQuizTitle.startsWith('Mix Quiz'))
      ? clientQuizTitle
      : (cleanCourse && cleanCourse !== 'GENERAL' ? cleanCourse : 'GENERAL'))

  const courseCode = realQuiz?.course_code?.trim().toUpperCase() || cleanCourse || 'GENERAL'
  const resolvedQuizId = realQuiz?._id || (quiz_id && Types.ObjectId.isValid(quiz_id) ? new Types.ObjectId(quiz_id) : undefined)

  return {
    originalQuizId: resolvedQuizId,
    originalQuizTitle: title,
    originalCourseCode: courseCode,
    correctAnswer,
    explanation,
  }
}

/**
 * GET /api/student/pinned-questions
 * Optional query: course_code=NWC303&cursor=<last_pin_id>
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const courseCodeParam = searchParams.get('course_code')
    const cursor = parsePinnedQuestionsCursor(searchParams.get('cursor'))
    if (cursor === undefined) return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
    const studentObjectId = new Types.ObjectId(payload.userId)

    const { filter, codeRegex, categoryId } = await buildPinnedQuestionsFilter(studentObjectId, courseCodeParam)
    const categoryPage = categoryId && codeRegex
      ? await findCategoryPinnedQuestionPage(studentObjectId, categoryId, codeRegex, cursor, PINNED_QUESTIONS_PAGE_SIZE)
      : null
    const pinSources = categoryPage
      ? categoryPage.pins
      : await PinnedQuestion.find(cursor ? { $and: [filter, { _id: { $lt: cursor } }] } : filter)
        .sort({ _id: -1 })
        .limit(PINNED_QUESTIONS_PAGE_SIZE + 1)
        .select('_id quiz_id')
        .lean() as any[]
    const hasMore = pinSources.length > PINNED_QUESTIONS_PAGE_SIZE
    const pagePins = pinSources.slice(0, PINNED_QUESTIONS_PAGE_SIZE)
    const nextPin = pagePins.at(-1)
    const nextCursor = hasMore && nextPin
      ? nextPin._id.toString()
      : categoryPage?.nextCursor?.toString() ?? null
    const quizIds = Array.from(new Set(pagePins.map((pin: any) => pin.quiz_id?.toString()).filter(Boolean)))
    if (quizIds.length === 0) return NextResponse.json({ pinnedQuestions: [], nextCursor })

    const candidateIds = quizIds.map((id) => new Types.ObjectId(id))
    const ownedSessions = await QuizSession.find({
      student_id: studentObjectId,
      is_temp: true,
      quiz_id: { $in: candidateIds },
      ...getUnexpiredQuizSessionFilter(),
    })
      .select('quiz_id')
      .lean() as any[]
    const temporaryQuizIds = ownedSessions.map((session: any) => session.quiz_id)
    const visibleQuizzes = await Quiz.find({
      _id: { $in: candidateIds },
      ...getStudentQuizVisibilityFilter(payload.userId, temporaryQuizIds),
    }).select('_id').lean() as any[]
    const accessibleQuizIds = visibleQuizzes.map((quiz: any) => quiz._id)
    if (accessibleQuizIds.length === 0) return NextResponse.json({ pinnedQuestions: [], nextCursor })

    const visiblePins = await PinnedQuestion.find({
      ...filter,
      _id: { $in: pagePins.map((pin: any) => pin._id) },
      quiz_id: { $in: accessibleQuizIds },
    }).sort({ _id: -1 }).limit(PINNED_QUESTIONS_PAGE_SIZE).lean()

    return NextResponse.json({ pinnedQuestions: visiblePins, nextCursor })
  } catch (error) {
    console.error('Error fetching pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

async function findExistingPin(studentObjectId: Types.ObjectId, question_id?: string, text?: string, options: string[] = []) {
  const cleanText = text?.trim() || ''
  const identity = getQuestionIdentity({ text: cleanText, options, question_id })
  const orConditions: any[] = [{ question_id: identity.question_id }, { text: cleanText, options }]
  return PinnedQuestion.findOne({
    student_id: studentObjectId,
    $or: orConditions,
  })
}

async function createPinDocument(params: {
  studentObjectId: Types.ObjectId
  question_id?: string
  originalQuizId?: Types.ObjectId
  originalQuizTitle: string
  originalCourseCode: string
  text: string
  options: string[]
  resolvedCorrectAnswer?: number[]
  correct_answer?: any
  resolvedExplanation?: string
  explanation?: string
  image_url?: string
}) {
  const finalCorrectAnswer = (params.resolvedCorrectAnswer && params.resolvedCorrectAnswer.length > 0)
    ? params.resolvedCorrectAnswer
    : (Array.isArray(params.correct_answer) && params.correct_answer.length > 0 ? params.correct_answer : [])

  return PinnedQuestion.create({
    student_id: params.studentObjectId,
    ...getQuestionIdentity({ text: params.text, options: params.options, question_id: params.question_id }),
    quiz_id: params.originalQuizId,
    quiz_title: params.originalQuizTitle,
    course_code: params.originalCourseCode,
    text: params.text.trim(),
    options: Array.isArray(params.options) ? params.options : [],
    correct_answer: finalCorrectAnswer,
    explanation: params.resolvedExplanation || params.explanation || '',
    image_url: params.image_url || '',
  })
}

function getPinnedQuestionValidationError(text: unknown, options: unknown): NextResponse | null {
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Question content is required.' }, { status: 400 })
  }
  if (!Array.isArray(options) || options.length < 2 || options.some(option => typeof option !== 'string' || !option.trim())) {
    return NextResponse.json({ error: 'Complete question options are required to identify this question.' }, { status: 400 })
  }
  return null
}

async function toggleStudentPinnedQuestion(params: {
  studentObjectId: Types.ObjectId
  studentId: string
  question_id?: string
  quiz_id?: string
  quiz_title?: string
  course_code?: string
  text: string
  options: string[]
  correct_answer?: any
  explanation?: string
  image_url?: string
}): Promise<NextResponse> {
  const { studentObjectId, studentId, question_id, quiz_id, quiz_title, course_code, text, options, correct_answer, explanation, image_url } = params
  const { originalQuizId, originalQuizTitle, originalCourseCode, correctAnswer: resolvedCorrectAnswer, explanation: resolvedExplanation } = await resolveOriginalQuizForQuestion({
    quiz_id,
    clientCourseCode: course_code,
    clientQuizTitle: quiz_title,
    text,
    options,
    question_id,
    studentId,
  })

  const existing = await findExistingPin(studentObjectId, question_id, text, options)
  if (existing) {
    await PinnedQuestion.deleteOne({ _id: existing._id })
    return NextResponse.json({ pinned: false, message: 'Question unpinned successfully.' })
  }

  const newPin = await createPinDocument({
    studentObjectId,
    question_id,
    originalQuizId: originalQuizId || (quiz_id && Types.ObjectId.isValid(quiz_id) ? new Types.ObjectId(quiz_id) : undefined),
    originalQuizTitle,
    originalCourseCode,
    text,
    options,
    resolvedCorrectAnswer,
    correct_answer,
    resolvedExplanation,
    explanation,
    image_url,
  })
  return NextResponse.json({ pinned: true, item: newPin, message: 'Question pinned successfully.' }, { status: 201 })
}

/**
 * POST /api/student/pinned-questions
 * Body: { question_id, quiz_id, quiz_title, course_code, text, options, correct_answer, explanation, image_url }
 * Toggles pin state for the student.
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const {
      question_id,
      quiz_id,
      quiz_title,
      course_code,
      text,
      options,
      correct_answer,
      explanation,
      image_url,
    } = body as any

    const validationError = getPinnedQuestionValidationError(text, options)
    if (validationError) return validationError

    const studentObjectId = new Types.ObjectId(payload.userId)

    if (quiz_id && !await findStudentAccessibleQuiz(String(quiz_id), payload.userId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    return await toggleStudentPinnedQuestion({
      studentObjectId,
      studentId: payload.userId,
      question_id,
      quiz_id,
      quiz_title,
      course_code,
      text,
      options,
      correct_answer,
      explanation,
      image_url,
    })
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'This legacy pin conflicts with an existing question variant. Refresh your pinned questions before retrying.', code: 'PIN_IDENTITY_CONFLICT' }, { status: 409 })
    }
    console.error('Error toggling pinned question:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

/**
 * DELETE /api/student/pinned-questions
 * Query: course_code (optional) - clears all pinned questions for student or specific course
 */
export const DELETE = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const courseCodeParam = searchParams.get('course_code')
    const studentObjectId = new Types.ObjectId(payload.userId)

    const { filter, codeRegex, categoryId } = await buildPinnedQuestionsFilter(studentObjectId, courseCodeParam)
    if (!categoryId || !codeRegex) {
      const result = await PinnedQuestion.deleteMany(filter)
      return NextResponse.json({ success: true, deletedCount: result.deletedCount })
    }

    let deletedCount = 0
    let cursor: Types.ObjectId | null = null
    while (true) {
      const page = await findCategoryPinnedQuestionPage(studentObjectId, categoryId, codeRegex, cursor, CATEGORY_PIN_SCAN_BATCH_SIZE)
      if (page.pins.length > 0) {
        const ids = page.pins.map((pin) => pin._id)
        const result = await PinnedQuestion.deleteMany({ student_id: studentObjectId, _id: { $in: ids } })
        deletedCount += result.deletedCount ?? 0
      }
      if (!page.nextCursor) break
      cursor = page.nextCursor
    }
    return NextResponse.json({ success: true, deletedCount })
  } catch (error) {
    console.error('Error clearing pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
