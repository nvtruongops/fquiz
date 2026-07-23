import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Types } from 'mongoose'
import { parseJsonBody } from '@/lib/core/api-helpers'

/**
 * GET /api/student/pinned-questions
 * Optional query: course_code=NWC303
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const courseCodeParam = searchParams.get('course_code')

    const filter: any = { student_id: new Types.ObjectId(payload.userId) }
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

    if (!course_code || typeof course_code !== 'string' || !text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Mã môn học và nội dung câu hỏi là bắt buộc.' }, { status: 400 })
    }

    const normalizedCourseCode = course_code.trim().toUpperCase()
    const studentObjectId = new Types.ObjectId(payload.userId)

    // Check if question is already pinned by this student for this course
    const existing = await PinnedQuestion.findOne({
      student_id: studentObjectId,
      course_code: normalizedCourseCode,
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
      quiz_title: quiz_title || '',
      course_code: normalizedCourseCode,
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
