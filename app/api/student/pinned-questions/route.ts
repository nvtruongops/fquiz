import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Types } from 'mongoose'
import { parseJsonBody } from '@/lib/core/api-helpers'

/**
 * Resolve the real course_code for a given quizId, following mix_config or quiz metadata.
 */
async function resolveCourseCodeForQuiz(quizId?: string, clientCourseCode?: string): Promise<{ courseCode: string; quizTitle?: string }> {
  let resolvedCode = clientCourseCode?.trim().toUpperCase() || 'GENERAL'
  let quizTitle: string | undefined

  if (quizId && Types.ObjectId.isValid(quizId)) {
    const quiz = await Quiz.findById(quizId).select('course_code title mix_config').lean() as any
    if (quiz) {
      quizTitle = quiz.title
      if (quiz.course_code && !quiz.course_code.startsWith('TEMP_') && quiz.course_code !== 'GENERAL') {
        resolvedCode = quiz.course_code.trim().toUpperCase()
      } else if (Array.isArray(quiz.mix_config?.quiz_ids) && quiz.mix_config.quiz_ids.length > 0) {
        const sourceQuizzes = await Quiz.find({ _id: { $in: quiz.mix_config.quiz_ids } })
          .select('course_code')
          .lean() as any[]
        const validCodes = sourceQuizzes.map((q) => q.course_code?.trim().toUpperCase()).filter(Boolean)
        if (validCodes.length > 0) {
          const firstCode = validCodes[0]
          if (validCodes.every((c) => c === firstCode)) {
            resolvedCode = firstCode
          }
        }
      }
    }
  }

  return { courseCode: resolvedCode, quizTitle }
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

    // Auto-heal legacy or temp-coded pins for this student if quiz_id is available
    const fixablePins = await PinnedQuestion.find({
      student_id: studentObjectId,
      $or: [
        { course_code: 'GENERAL' },
        { course_code: { $regex: /^TEMP_/i } },
        { course_code: { $exists: false } },
        { course_code: '' },
      ],
      quiz_id: { $exists: true, $ne: null },
    }).lean() as any[]

    if (fixablePins.length > 0) {
      for (const pin of fixablePins) {
        const { courseCode, quizTitle } = await resolveCourseCodeForQuiz(pin.quiz_id?.toString())
        if (courseCode && courseCode !== 'GENERAL' && !courseCode.startsWith('TEMP_')) {
          await PinnedQuestion.updateOne(
            { _id: pin._id },
            {
              $set: {
                course_code: courseCode,
                ...(quizTitle && !pin.quiz_title ? { quiz_title: quizTitle } : {}),
              },
            }
          )
        }
      }
    }

    const filter: any = { student_id: studentObjectId }
    if (courseCodeParam) {
      filter.course_code = courseCodeParam.trim().toUpperCase()
    }

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

    // Resolve authoritative course_code and title
    const { courseCode: resolvedCourseCode, quizTitle: resolvedQuizTitle } =
      await resolveCourseCodeForQuiz(quiz_id, course_code)

    const finalQuizTitle = quiz_title || resolvedQuizTitle || resolvedCourseCode

    // Check if question is already pinned by this student for this course
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
      quiz_id: quiz_id ? new Types.ObjectId(quiz_id) : undefined,
      quiz_title: finalQuizTitle,
      course_code: resolvedCourseCode,
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

    const filter: any = { student_id: new Types.ObjectId(payload.userId) }
    if (courseCodeParam) {
      filter.course_code = courseCodeParam.trim().toUpperCase()
    }

    const result = await PinnedQuestion.deleteMany(filter)
    return NextResponse.json({ success: true, deletedCount: result.deletedCount })
  } catch (error) {
    console.error('Error clearing pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
