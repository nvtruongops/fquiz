import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { Types } from 'mongoose'
import { parseJsonBody } from '@/lib/core/api-helpers'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build flexible MongoDB filter matching course_code prefix/regex or Category quizzes.
 */
async function buildPinnedQuestionsFilter(studentId: Types.ObjectId, courseCodeParam?: string | null) {
  const filter: any = { student_id: studentId }
  if (!courseCodeParam || !courseCodeParam.trim()) return filter

  const cleanCode = courseCodeParam.trim()
  const escapedCode = escapeRegex(cleanCode)
  const codeRegex = new RegExp(`^${escapedCode}(_.*)?$`, 'i')

  // Find Category by name
  const category = await Category.findOne({
    name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
  }).select('_id').lean()

  let categoryQuizIds: Types.ObjectId[] = []
  let categoryCourseCodes: string[] = []

  if (category) {
    const quizzes = await Quiz.find({ category_id: category._id })
      .select('_id course_code')
      .lean() as any[]
    categoryQuizIds = quizzes.map((q) => q._id)
    categoryCourseCodes = quizzes.map((q) => q.course_code?.trim().toUpperCase()).filter(Boolean)
  }

  const orConditions: any[] = [
    { course_code: { $regex: codeRegex } },
    ...(categoryQuizIds.length > 0 ? [{ quiz_id: { $in: categoryQuizIds } }] : []),
    ...(categoryCourseCodes.length > 0 ? [{ course_code: { $in: categoryCourseCodes } }] : []),
  ]

  filter.$or = orConditions
  return filter
}

/**
 * Resolve the real original (non-temp) quiz and course_code for a question.
 */
async function findRealQuizForQuestion(quizId?: string, cleanCourse?: string, queryCriteria: any[] = []) {
  // Direct primary lookup by quiz_id if valid
  if (quizId && Types.ObjectId.isValid(quizId)) {
    const directQuiz = await Quiz.findById(quizId).select('_id course_code title questions question_refs is_temp').lean()
    if (directQuiz) return directQuiz
  }

  const baseFilter = { is_temp: { $ne: true }, title: { $not: /^Quiz Trộn/i }, $or: queryCriteria }
  if (cleanCourse && cleanCourse !== 'GENERAL' && !cleanCourse.startsWith('TEMP_')) {
    const matched = await Quiz.findOne({ ...baseFilter, course_code: cleanCourse }).select('_id course_code title questions question_refs').lean()
    if (matched) return matched
  }
  return Quiz.findOne(baseFilter).select('_id course_code title questions question_refs').lean()
}

async function findAnswerAndExplanation(realQuiz: any, cleanText: string, question_id?: string) {
  if (realQuiz?.questions && Array.isArray(realQuiz.questions)) {
    const qDoc = realQuiz.questions.find((q: any) => 
      (question_id && q._id?.toString() === question_id) ||
      (q.text && q.text.trim() === cleanText)
    )
    if (qDoc && (qDoc.correct_answer !== undefined && qDoc.correct_answer !== null)) {
      const correctAnswer = Array.isArray(qDoc.correct_answer) 
        ? qDoc.correct_answer 
        : typeof qDoc.correct_answer === 'number' 
          ? [qDoc.correct_answer] 
          : undefined
      return { correctAnswer, explanation: qDoc.explanation }
    }
  }

  const { Question } = await import('@/lib/modules/quiz/models/Question')
  const standalone = await Question.findOne({
    $or: [
      ...(question_id && Types.ObjectId.isValid(question_id) ? [{ _id: new Types.ObjectId(question_id) }] : []),
      { text: cleanText }
    ]
  }).select('correct_answer explanation').lean() as any

  if (standalone && (standalone.correct_answer !== undefined && standalone.correct_answer !== null)) {
    const correctAnswer = Array.isArray(standalone.correct_answer)
      ? standalone.correct_answer
      : typeof standalone.correct_answer === 'number'
        ? [standalone.correct_answer]
        : undefined
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
  question_id?: string
}): Promise<{
  originalQuizId?: Types.ObjectId
  originalQuizTitle: string
  originalCourseCode: string
  correctAnswer?: number[]
  explanation?: string
}> {
  const { quiz_id, clientCourseCode, clientQuizTitle, text, question_id } = params
  const cleanText = text.trim()
  const cleanCourse = clientCourseCode?.trim().toUpperCase()

  const queryCriteria: any[] = [{ 'questions.text': cleanText }]
  if (question_id && Types.ObjectId.isValid(question_id)) {
    queryCriteria.push({ question_refs: new Types.ObjectId(question_id) })
    queryCriteria.push({ 'questions._id': new Types.ObjectId(question_id) })
  }

  const realQuiz: any = await findRealQuizForQuestion(quiz_id, cleanCourse, queryCriteria)
  const { correctAnswer, explanation } = await findAnswerAndExplanation(realQuiz, cleanText, question_id)

  const title = realQuiz?.title ||
    ((clientQuizTitle && !clientQuizTitle.startsWith('Quiz Trộn'))
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

async function autoHealPin(pin: any, courseCodeParam: string | null) {
  const { originalQuizId, originalQuizTitle, originalCourseCode, correctAnswer, explanation } = await resolveOriginalQuizForQuestion({
    quiz_id: pin.quiz_id?.toString(),
    clientCourseCode: courseCodeParam || pin.course_code,
    clientQuizTitle: pin.quiz_title,
    text: pin.text,
    question_id: pin.question_id,
  })

  const updates: any = {}
  if (originalCourseCode && originalCourseCode !== 'GENERAL' && !originalCourseCode.startsWith('TEMP_') && pin.course_code !== originalCourseCode) {
    updates.course_code = originalCourseCode
    updates.quiz_title = originalQuizTitle
    if (originalQuizId) updates.quiz_id = originalQuizId
  }

  if (correctAnswer && correctAnswer.length > 0 && JSON.stringify(pin.correct_answer) !== JSON.stringify(correctAnswer)) {
    updates.correct_answer = correctAnswer
  }

  if (explanation && (!pin.explanation || pin.explanation.trim() === '')) {
    updates.explanation = explanation
  }

  if (Object.keys(updates).length > 0) {
    await PinnedQuestion.updateOne({ _id: pin._id }, { $set: updates })
  }
}

/**
 * GET /api/student/pinned-questions
 * Optional query: course_code=NWC303
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const courseCodeParam = searchParams.get('course_code')
    const studentObjectId = new Types.ObjectId(payload.userId)

    // Auto-heal legacy or temp-coded pins for this student
    const allStudentPins = await PinnedQuestion.find({ student_id: studentObjectId }).lean() as any[]
    for (const pin of allStudentPins) {
      await autoHealPin(pin, courseCodeParam)
    }

    const filter = await buildPinnedQuestionsFilter(studentObjectId, courseCodeParam)

    const pinnedQuestions = await PinnedQuestion.find(filter)
      .sort({ created_at: -1 })
      .lean()

    return NextResponse.json({ pinnedQuestions })
  } catch (error) {
    console.error('Error fetching pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

async function findExistingPin(studentObjectId: Types.ObjectId, question_id?: string, text?: string) {
  const cleanText = text?.trim() || ''
  const orConditions: any[] = [{ text: cleanText }]
  if (question_id) {
    orConditions.push({ question_id })
  }
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
    question_id: params.question_id || '',
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

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Nội dung câu hỏi là bắt buộc.' }, { status: 400 })
    }

    const studentObjectId = new Types.ObjectId(payload.userId)

    // Resolve authoritative non-temp original quiz, course_code, correct_answer & explanation
    const { originalQuizId, originalQuizTitle, originalCourseCode, correctAnswer: resolvedCorrectAnswer, explanation: resolvedExplanation } = await resolveOriginalQuizForQuestion({
      quiz_id,
      clientCourseCode: course_code,
      clientQuizTitle: quiz_title,
      text,
      question_id,
    })

    // Check if question is already pinned by this student
    const existing = await findExistingPin(studentObjectId, question_id, text)

    if (existing) {
      // Unpin
      await PinnedQuestion.deleteOne({ _id: existing._id })
      return NextResponse.json({ pinned: false, message: 'Đã bỏ ghim câu hỏi.' })
    }

    // Pin
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

    return NextResponse.json({ pinned: true, item: newPin, message: 'Đã ghim câu hỏi.' }, { status: 201 })

    return NextResponse.json({ pinned: true, item: newPin, message: 'Đã ghim câu hỏi.' }, { status: 201 })
  } catch (error) {
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

    const filter = await buildPinnedQuestionsFilter(studentObjectId, courseCodeParam)

    const result = await PinnedQuestion.deleteMany(filter)
    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    console.error('Error clearing pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
