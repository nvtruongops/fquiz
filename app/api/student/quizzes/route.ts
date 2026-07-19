import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { connectDB } from '@/lib/core/db/mongodb'
import { Types } from 'mongoose'
import { Category } from '@/lib/modules/quiz/models/Category'
import { CreateStudentQuizSchema } from '@/lib/modules/quiz/schemas/quiz'
import { validateObjectId } from '@/lib/core/schemas/common'
import { generateQuestionId } from '@/lib/modules/quiz/question-id-generator'
import { providerFactory } from '@/lib/core/security/rate-limit/provider'
import { validationErrorResponse, parseJsonBody } from '@/lib/core/api-helpers'

function buildSourceMappings(quizzes: any[]) {
  const sourceQuizIdByDisplayId = new Map<string, string>()
  const originalSourceIds = new Set<string>()

  for (const quiz of quizzes) {
    const displayId = quiz._id.toString()
    const sourceId = quiz.is_saved_from_explore && quiz.original_quiz_id?._id
      ? quiz.original_quiz_id._id.toString()
      : displayId
    sourceQuizIdByDisplayId.set(displayId, sourceId)

    if (quiz.is_saved_from_explore && quiz.original_quiz_id?._id) {
      originalSourceIds.add(quiz.original_quiz_id._id.toString())
    }
  }

  return { sourceQuizIdByDisplayId, originalSourceIds }
}

async function fetchSourceAvailabilityMap(originalSourceIds: Set<string>) {
  const sourceAvailabilityByOriginalId = new Map<string, boolean>()
  if (originalSourceIds.size === 0) return sourceAvailabilityByOriginalId

  const originalMeta = await Quiz.find({ _id: { $in: Array.from(originalSourceIds).map((id) => new Types.ObjectId(id)) } })
    .select('_id status is_public')
    .lean()

  for (const meta of originalMeta as any[]) {
    sourceAvailabilityByOriginalId.set(
      meta._id.toString(),
      Boolean(meta.status === 'published' && meta.is_public)
    )
  }

  return sourceAvailabilityByOriginalId
}

async function fetchSessionMaps(userId: string, sourceQuizIdByDisplayId: Map<string, string>) {
  const sourceQuizIds = Array.from(new Set(Array.from(sourceQuizIdByDisplayId.values())))
    .map((id) => new Types.ObjectId(id))

  if (sourceQuizIds.length === 0) {
    return {
      latestSessionBySourceQuizId: new Map<string, any>(),
      durationBySourceQuizId: new Map<string, number>(),
    }
  }

  const [latestSessions, durationBySourceQuiz] = await Promise.all([
    QuizSession.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(userId),
          status: 'completed',
          quiz_id: { $in: sourceQuizIds },
        },
      },
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSession: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestSession' } },
    ]),
    QuizSession.aggregate([
      {
        $match: {
          student_id: new Types.ObjectId(userId),
          status: 'completed',
          quiz_id: { $in: sourceQuizIds },
        },
      },
      {
        $group: {
          _id: '$quiz_id',
          totalDurationMs: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ['$completed_at', '$started_at'] },
                    '$started_at',
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
  ])

  const latestSessionBySourceQuizId = new Map<string, any>()
  for (const session of latestSessions) {
    latestSessionBySourceQuizId.set(session.quiz_id.toString(), session)
  }

  const durationBySourceQuizId = new Map<string, number>()
  for (const item of durationBySourceQuiz) {
    durationBySourceQuizId.set(item._id.toString(), Number(item.totalDurationMs ?? 0))
  }

  return { latestSessionBySourceQuizId, durationBySourceQuizId }
}

function mapQuizzesForResponse(
  quizzes: any[],
  sourceQuizIdByDisplayId: Map<string, string>,
  sourceAvailabilityByOriginalId: Map<string, boolean>,
  latestSessionBySourceQuizId: Map<string, any>,
  durationBySourceQuizId: Map<string, number>
) {
  return quizzes.map((q: any) => {
    const original = q.original_quiz_id
    const ownQuestionsLength = Array.isArray(q.questions) ? q.questions.length : 0
    const originalQuestionsLength = Array.isArray(original?.questions) ? original.questions.length : 0
    const count =
      ownQuestionsLength ||
      Number(q.questionCount || 0) ||
      originalQuestionsLength ||
      Number(original?.questionCount || 0)

    const displayId = q._id.toString()
    const sourceId = sourceQuizIdByDisplayId.get(displayId) ?? displayId
    const latestSession = latestSessionBySourceQuizId.get(sourceId)
    const totalStudyMinutes = Math.round((durationBySourceQuizId.get(sourceId) ?? 0) / (60 * 1000))
    const latestCorrectCount = latestSession?.score ?? null
    const latestTotalCount = count
    const latestScoreOnTen =
      latestCorrectCount !== null && latestTotalCount > 0
        ? Number(((latestCorrectCount / latestTotalCount) * 10).toFixed(2))
        : null

    let sourceStatus: 'available' | 'source_locked' | 'not_applicable' = 'not_applicable'
    if (q.is_saved_from_explore) {
      const originalId = original?._id?.toString?.() || ''
      sourceStatus = sourceAvailabilityByOriginalId.get(originalId) ? 'available' : 'source_locked'
    }

    return {
      ...q,
      questionCount: count,
      latestCorrectCount,
      latestTotalCount,
      latestScoreOnTen,
      totalStudyMinutes,
      sourceStatus,
      questions: undefined,
      original_quiz_id: undefined,
    }
  })
}

const quizLimiter = providerFactory.createProvider(5, 60 * 1000)

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const rateLimitResult = await quizLimiter.check(payload.userId)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many quiz creation requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
          }
        }
      )
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    // Validate categoryId if provided
    if (categoryId && !validateObjectId(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID format' }, { status: 400 })
    }

    // Lấy tất cả bộ đề của user (bao gồm cả bộ soạn thảo và bộ lưu/shortcut)
    const query: any = { created_by: new Types.ObjectId(payload.userId), is_temp: { $ne: true } }
    if (categoryId) query.category_id = new Types.ObjectId(categoryId)

    const quizzes = await Quiz.find(query)
      .select('title course_code questionCount status is_public created_at category_id original_quiz_id is_saved_from_explore')
      .populate('category_id', 'name')
      .populate({
        path: 'original_quiz_id',
        select: 'questionCount'
      })
      .sort({ created_at: -1 })
      .lean()

    const { sourceQuizIdByDisplayId, originalSourceIds } = buildSourceMappings(quizzes as any[])
    const sourceAvailabilityByOriginalId = await fetchSourceAvailabilityMap(originalSourceIds)
    const { latestSessionBySourceQuizId, durationBySourceQuizId } = await fetchSessionMaps(payload.userId, sourceQuizIdByDisplayId)
    const formattedQuizzes = mapQuizzesForResponse(
      quizzes as any[],
      sourceQuizIdByDisplayId,
      sourceAvailabilityByOriginalId,
      latestSessionBySourceQuizId,
      durationBySourceQuizId
    )

    return NextResponse.json({ quizzes: formattedQuizzes })
  } catch (error) {
    console.error('Error fetching student quizzes:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
}
}, { roles: ['student'] })

export const POST = withAuth(async (req: Request, { payload }) => {
  try {
    await connectDB()
    const body = await parseJsonBody(req)
    if (body instanceof NextResponse) return body

    // Validate with schema
    const parsed = CreateStudentQuizSchema.safeParse(body)
    if (!parsed.success) {
      return validationErrorResponse(parsed.error)
    }

    const { course_code, category_id, questions, description } = parsed.data
    const normalizedCourseCode = course_code.trim().toUpperCase()

    const existingOwnedQuiz = await Quiz.findOne({
      created_by: new Types.ObjectId(payload.userId),
      is_saved_from_explore: { $ne: true },
      course_code: normalizedCourseCode,
    })
      .select('_id')
      .lean()

    if (existingOwnedQuiz) {
      return NextResponse.json(
        { error: `Mã quiz ${normalizedCourseCode} đã tồn tại trong bộ đề tự tạo của bạn.` },
        { status: 409 }
      )
    }

    // Verify category exists
    const category = await Category.findById(category_id)
    if (!category) {
      return NextResponse.json({ error: 'Danh mục không tồn tại.' }, { status: 404 })
    }

    // 1. Generate quiz ID first for image folder organization
    const quizId = new Types.ObjectId()

    // 2. Process questions (base64 images are no longer supported)
    const processedQuestions = questions.map((q) => {
      // Only accept direct image URLs, not base64
      const finalImageUrl = q.image_url?.startsWith('data:image') ? '' : q.image_url

      return {
        text: q.text || '',
        options: q.options || [],
        correct_answer: q.correct_answer || [],
        explanation: q.explanation || '',
        image_url: finalImageUrl || '',
        question_id: generateQuestionId(q),
      }
    })

    const quiz = await Quiz.create({
      _id: quizId,
      title: normalizedCourseCode,
      course_code: normalizedCourseCode,
      description: description || '',
      category_id,
      created_by: new Types.ObjectId(payload.userId),
      is_public: false, // Default to private for students
      status: 'published',
      questions: processedQuestions,
      questionCount: processedQuestions.length
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (error) {
    console.error('Error creating quiz:', error)
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Mã quiz đã tồn tại trong bộ đề tự tạo của bạn.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })