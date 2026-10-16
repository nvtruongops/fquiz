import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { connectDB } from '@/lib/core/db/mongodb'
import { Types } from 'mongoose'
import { validateObjectId } from '@/lib/core/schemas/common'
import { providerFactory } from '@/lib/core/security/rate-limit/provider'

function buildSourceMappings(quizzes: any[]) {
  const sourceQuizIdByDisplayId = new Map<string, string>()
  const originalSourceIds = new Set<string>()

  for (const quiz of quizzes) {
    const displayId = quiz._id.toString()
    const rawOrigId = quiz.original_quiz_id?._id ?? quiz.original_quiz_id
    const origIdStr = rawOrigId ? rawOrigId.toString() : null
    const sourceId = quiz.is_saved_from_explore && origIdStr
      ? origIdStr
      : displayId
    sourceQuizIdByDisplayId.set(displayId, sourceId)

    if (quiz.is_saved_from_explore && origIdStr) {
      originalSourceIds.add(origIdStr)
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
      const originalId = (original?._id ?? original)?.toString?.() || ''
      sourceStatus = sourceAvailabilityByOriginalId.get(originalId) ? 'available' : 'source_locked'
    }

    return {
      ...q,
      questionCount: count,
      latestCorrectCount,
      latestTotalCount,
      latestScoreOnTen,
      latestSessionId: latestSession ? latestSession._id.toString() : null,
      totalStudyMinutes,
      sourceStatus,
      questions: undefined,
      original_quiz_id: undefined,
    }
  })
}

const quizLimiter = providerFactory.createProvider(30, 60 * 1000)

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const rateLimitResult = await quizLimiter.check(payload.userId)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
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

    // Fetch all saved quizzes from Explore and user self-created/pinned quizzes (excluding temp quizzes is_temp: true)
    const query: any = { 
      created_by: new Types.ObjectId(payload.userId),
      is_temp: { $ne: true },
    }
    if (categoryId) {
      const catIds = categoryId.split(',').map((s) => s.trim()).filter(validateObjectId)
      if (catIds.length === 1) {
        query.category_id = new Types.ObjectId(catIds[0])
      } else if (catIds.length > 1) {
        query.category_id = { $in: catIds.map((id) => new Types.ObjectId(id)) }
      }
    }

    const quizzes = await Quiz.find(query)
      .select('title course_code questionCount status is_public created_at category_id original_quiz_id is_saved_from_explore is_temp')
      .sort({ created_at: -1 })
      .lean() as any[]

    const categoryIds = Array.from(new Set(quizzes.map((q: any) => q.category_id).filter(Boolean)))
    const originalQuizIds = Array.from(new Set(quizzes.map((q: any) => q.original_quiz_id).filter(Boolean)))

    const [categories, originalQuizzes] = await Promise.all([
      categoryIds.length > 0 ? Category.find({ _id: { $in: categoryIds } }).select('name').lean() : [],
      originalQuizIds.length > 0 ? Quiz.find({ _id: { $in: originalQuizIds } }).select('questionCount').lean() : [],
    ])

    const categoryMap = new Map((categories as any[]).map((c: any) => [c._id.toString(), c]))
    const originalQuizMap = new Map((originalQuizzes as any[]).map((oq: any) => [oq._id.toString(), oq]))

    for (const q of quizzes) {
      if (q.category_id) {
        q.category_id = categoryMap.get(q.category_id.toString()) ?? { _id: q.category_id, name: 'Uncategorized' }
      }
      if (q.original_quiz_id) {
        q.original_quiz_id = originalQuizMap.get(q.original_quiz_id.toString()) ?? { _id: q.original_quiz_id }
      }
    }

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