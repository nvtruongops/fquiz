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
}> {
  const { quiz_id, clientCourseCode, clientQuizTitle, text, question_id } = params
  const cleanText = text.trim()
  const cleanCourse = clientCourseCode?.trim().toUpperCase()

  // 1. If quiz_id points to a real non-temp quiz, use it directly!
  if (quiz_id && Types.ObjectId.isValid(quiz_id)) {
    const quiz = await Quiz.findById(quiz_id).select('course_code title is_temp mix_config').lean() as any
    if (quiz && !quiz.is_temp && !quiz.title?.startsWith('Quiz Trộn') && !quiz.course_code?.startsWith('TEMP_')) {
      return {
        originalQuizId: quiz._id,
        originalQuizTitle: quiz.title,
        originalCourseCode: quiz.course_code?.trim().toUpperCase() || cleanCourse || 'GENERAL',
      }
    }
  }

  // 2. Search for the real non-temp Quiz that owns this question (by question text or question_id)
  const queryCriteria: any[] = [{ 'questions.text': cleanText }]
  if (question_id && Types.ObjectId.isValid(question_id)) {
    queryCriteria.push({ question_refs: new Types.ObjectId(question_id) })
    queryCriteria.push({ 'questions._id': new Types.ObjectId(question_id) })
  }

  // Priority search: non-temp quiz in cleanCourse
  let realQuiz: any = null
  if (cleanCourse && cleanCourse !== 'GENERAL' && !cleanCourse.startsWith('TEMP_')) {
    realQuiz = await Quiz.findOne({
      is_temp: { $ne: true },
      title: { $not: /^Quiz Trộn/i },
      course_code: cleanCourse,
      $or: queryCriteria,
    }).select('course_code title').lean()
  }

  // Fallback search: any non-temp quiz matching the question
  if (!realQuiz) {
    realQuiz = await Quiz.findOne({
      is_temp: { $ne: true },
      title: { $not: /^Quiz Trộn/i },
      $or: queryCriteria,
    }).select('course_code title').lean()
  }

  if (realQuiz) {
    return {
      originalQuizId: realQuiz._id,
      originalQuizTitle: realQuiz.title,
      originalCourseCode: realQuiz.course_code?.trim().toUpperCase() || cleanCourse || 'GENERAL',
    }
  }

  // 3. Fallback if no non-temp quiz found
  const title = (clientQuizTitle && !clientQuizTitle.startsWith('Quiz Trộn'))
    ? clientQuizTitle
    : (cleanCourse && cleanCourse !== 'GENERAL' ? cleanCourse : 'GENERAL')

  return {
    originalQuizId: quiz_id && Types.ObjectId.isValid(quiz_id) ? new Types.ObjectId(quiz_id) : undefined,
    originalQuizTitle: title,
    originalCourseCode: cleanCourse || 'GENERAL',
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

    // Auto-heal legacy or temp-coded pins for this student to resolve original non-temp quiz & course code
    const allStudentPins = await PinnedQuestion.find({ student_id: studentObjectId }).lean() as any[]
    for (const pin of allStudentPins) {
      const needsHealing =
        !pin.course_code ||
        pin.course_code === 'GENERAL' ||
        pin.course_code.startsWith('TEMP_') ||
        !pin.quiz_title ||
        pin.quiz_title.startsWith('Quiz Trộn')

      if (needsHealing) {
        const { originalQuizId, originalQuizTitle, originalCourseCode } = await resolveOriginalQuizForQuestion({
          quiz_id: pin.quiz_id?.toString(),
          clientCourseCode: courseCodeParam || pin.course_code,
          clientQuizTitle: pin.quiz_title,
          text: pin.text,
          question_id: pin.question_id,
        })

        if (originalCourseCode && originalCourseCode !== 'GENERAL' && !originalCourseCode.startsWith('TEMP_')) {
          await PinnedQuestion.updateOne(
            { _id: pin._id },
            {
              $set: {
                course_code: originalCourseCode,
                quiz_title: originalQuizTitle,
                ...(originalQuizId ? { quiz_id: originalQuizId } : {}),
              },
            }
          )
        }
      }
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

    // Resolve authoritative non-temp original quiz and course_code
    const { originalQuizId, originalQuizTitle, originalCourseCode } = await resolveOriginalQuizForQuestion({
      quiz_id,
      clientCourseCode: course_code,
      clientQuizTitle: quiz_title,
      text,
      question_id,
    })

    // Check if question is already pinned by this student
    const existing = await PinnedQuestion.findOne({
      student_id: studentObjectId,
      $or: [
        ...(question_id ? [{ question_id }] : []),
        { text: text.trim() },
      ],
    })

    if (existing) {
      // Unpin
      await PinnedQuestion.deleteOne({ _id: existing._id })
      return NextResponse.json({ pinned: false, message: 'Đã bỏ ghim câu hỏi.' })
    }

    // Pin
    const newPin = await PinnedQuestion.create({
      student_id: studentObjectId,
      question_id: question_id || '',
      quiz_id: originalQuizId || (quiz_id ? new Types.ObjectId(quiz_id) : undefined),
      quiz_title: originalQuizTitle,
      course_code: originalCourseCode,
      text: text.trim(),
      options: Array.isArray(options) ? options : [],
      correct_answer: Array.isArray(correct_answer) ? correct_answer : [0],
      explanation: explanation || '',
      image_url: image_url || '',
    })

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
