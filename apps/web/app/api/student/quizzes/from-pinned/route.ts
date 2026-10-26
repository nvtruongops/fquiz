import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { PinnedQuestion } from '@/lib/modules/quiz/models/PinnedQuestion'
import { Types } from 'mongoose'
import { convertPinnedQuestion } from '@/lib/modules/quiz/pinned-question-conversion'
import { parseJsonBody } from '@/lib/core/api-helpers'
import { ensureCategoryForCourseCode } from '@/lib/modules/quiz/utils/category-helper'

async function getPinnedQuestions(courseCode: string, userId: Types.ObjectId) {
  const targetCategory = await ensureCategoryForCourseCode(courseCode, userId)
  const escapedCode = courseCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // eslint-disable-next-line security/detect-non-literal-regexp
  const codeRegex = new RegExp(`^${escapedCode}(_.*)?$`, 'i')
  const categoryQuizIds: Types.ObjectId[] = []
  let categoryCourseCodes: string[] = []

  if (targetCategory?._id) {
    const quizzes = await Quiz.find({ category_id: targetCategory._id })
      .select('_id course_code')
      .lean() as any[]
    categoryQuizIds.push(...quizzes.map((quiz) => quiz._id))
    categoryCourseCodes = quizzes.map((quiz) => quiz.course_code?.trim().toUpperCase()).filter(Boolean)
  }

  const pinnedDocs = await PinnedQuestion.find({
    student_id: userId,
    $or: [
      { course_code: { $regex: codeRegex } },
      ...(categoryQuizIds.length ? [{ quiz_id: { $in: categoryQuizIds } }] : []),
      ...(categoryCourseCodes.length ? [{ course_code: { $in: categoryCourseCodes } }] : []),
    ],
  }).sort({ created_at: -1 }).lean()
  return { targetCategory, pinnedDocs }
}

async function loadPinnedAnswerSources(pinnedDocs: any[]) {
  const missing = pinnedDocs.filter((question) => !Array.isArray(question.correct_answer) || question.correct_answer.length === 0)
  const sourceQuizMap = new Map<string, any>()
  const standaloneQuestionMap = new Map<string, any>()
  if (missing.length === 0) return { sourceQuizMap, standaloneQuestionMap }

  const { Question } = await import('@/lib/modules/quiz/models/Question')
  const quizIds = Array.from(new Set(missing
    .map((question) => question.quiz_id && Types.ObjectId.isValid(question.quiz_id) ? String(question.quiz_id) : null)
    .filter(Boolean) as string[])).map((id) => new Types.ObjectId(id))
  const texts = Array.from(new Set(missing.map((question) => question.text?.trim()).filter(Boolean) as string[]))
  const [sourceQuizzes, standaloneQuestions] = await Promise.all([
    quizIds.length ? Quiz.find({ _id: { $in: quizIds } }).select('questions').lean() : Promise.resolve([]),
    texts.length ? Question.find({ text: { $in: texts } }).select('text correct_answer').lean() : Promise.resolve([]),
  ])
  for (const quiz of sourceQuizzes as any[]) sourceQuizMap.set(String(quiz._id), quiz)
  for (const question of standaloneQuestions as any[]) {
    if (question.text) standaloneQuestionMap.set(question.text.trim(), question)
  }
  return { sourceQuizMap, standaloneQuestionMap }
}

async function savePinnedQuiz(userId: Types.ObjectId, courseCode: string, title: string, categoryId: Types.ObjectId, questions: any[]) {
  const existing = await Quiz.findOne({
    created_by: userId,
    course_code: courseCode,
    is_saved_from_explore: { $ne: true },
    is_temp: { $ne: true },
  })
  const description = `Custom quiz created from ${questions.length} pinned questions of course ${courseCode}`
  if (existing) {
    existing.title = title
    existing.questions = questions
    existing.questionCount = questions.length
    existing.description = description
    existing.category_id = categoryId
    await existing.save()
    return existing
  }

  const quiz = { title, course_code: courseCode, description, category_id: categoryId, created_by: userId,
    is_public: false, status: 'published', questions, questionCount: questions.length }
  try {
    return await Quiz.create(quiz)
  } catch (error: any) {
    if (error?.code !== 11000) throw error
    return Quiz.create({ ...quiz, course_code: `${courseCode}_PINNED_${Date.now().toString().slice(-4)}` })
  }
}

/**
 * POST /api/student/quizzes/from-pinned
 * Body: { course_code: string, title?: string }
 * Creates a custom quiz from student's pinned questions of course_code.
 * Enforces max 10 custom quizzes quota limit.
 */
export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    const { course_code, title } = body as any
    if (!course_code || typeof course_code !== 'string') {
      return NextResponse.json({ error: 'Course code is required.' }, { status: 400 })
    }

    const normalizedCourseCode = course_code.trim().toUpperCase()
    const userObjectId = new Types.ObjectId(payload.userId)

    // 1. Quota Check — Max 10 custom/created/mix quizzes combined
    const totalCreatedAndMix = await Quiz.countDocuments({
      created_by: userObjectId,
      is_saved_from_explore: { $ne: true },
    })

    if (totalCreatedAndMix >= 10) {
      return NextResponse.json(
        {
          error: 'You have reached the maximum limit of 10 quizzes (custom + mix). Please delete an existing quiz before creating a new one.',
          quotaExceeded: true,
          code: 'TOTAL_QUOTA_EXCEEDED',
        },
        { status: 409 }
      )
    }

    const { targetCategory, pinnedDocs } = await getPinnedQuestions(normalizedCourseCode, userObjectId)

    if (!pinnedDocs || pinnedDocs.length === 0) {
      return NextResponse.json(
        { error: `No pinned questions found for course ${normalizedCourseCode}.` },
        { status: 400 }
      )
    }

    const { sourceQuizMap, standaloneQuestionMap } = await loadPinnedAnswerSources(pinnedDocs)
    const quizQuestions = pinnedDocs.map((question: any) =>
      convertPinnedQuestion(question, sourceQuizMap, standaloneQuestionMap)
    )

    // 5. Generate quiz title
    const customTitle = title && typeof title === 'string' && title.trim().length > 0
      ? title.trim()
      : `${normalizedCourseCode} - Pinned Quiz (${quizQuestions.length} QUESTIONS)`

    const quiz = await savePinnedQuiz(userObjectId, normalizedCourseCode, customTitle, targetCategory._id, quizQuestions)

    return NextResponse.json({
      quiz,
      message: `Successfully created pinned quiz (${quizQuestions.length} questions)!`,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating quiz from pinned questions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })
