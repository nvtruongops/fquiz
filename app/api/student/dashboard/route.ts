import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { User } from '@/models/User'
import { Types } from 'mongoose'

export const dynamic = 'force-dynamic'

type SourceType = 'self_created' | 'saved_explore' | 'explore_public'

function inferSourceType(quiz: any, studentUserId: string): SourceType {
  if (quiz?.is_saved_from_explore) return 'saved_explore'
  if (quiz?.created_by?.toString?.() === studentUserId) return 'self_created'
  return 'explore_public'
}

function sourceLabelFromType(sourceType: SourceType): string {
  if (sourceType === 'self_created') return 'Tự tạo'
  return 'Từ Explore'
}

export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (payload?.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const userId = new Types.ObjectId(payload.userId)

    // 1a. Fetch overwrite stats from latest completed session per quiz
    const latestStatsResult = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'completed' } },
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSession: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$latestSession',
        },
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz_id',
          foreignField: '_id',
          as: 'quizDoc',
        },
      },
      {
        $addFields: {
          quizDoc: { $arrayElemAt: ['$quizDoc', 0] },
        },
      },
      {
        $addFields: {
          totalQuestions: {
            $ifNull: [
              '$quizDoc.questionCount',
              { $size: { $ifNull: ['$quizDoc.questions', []] } },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          averageScore: {
            $avg: {
              $cond: [
                { $gt: ['$totalQuestions', 0] },
                { $multiply: [{ $divide: ['$score', '$totalQuestions'] }, 10] },
                0,
              ],
            },
          },
          totalCorrectAnswers: {
            $sum: {
              $size: {
                $filter: {
                  input: '$user_answers',
                  as: 'ans',
                  cond: { $eq: ['$$ans.is_correct', true] },
                },
              },
            },
          },
        },
      },
    ])

    // 1b. Fetch cumulative learning duration from ALL completed attempts
    const durationAggResult = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
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
    ])

    const stats = latestStatsResult[0] || {
      totalQuizzes: 0,
      averageScore: 0,
      totalCorrectAnswers: 0,
    }
    const totalDurationMs = durationAggResult[0]?.totalDurationMs || 0

    const learningHoursRaw = totalDurationMs / (60 * 60 * 1000)
    const learningMinutes = Math.round(totalDurationMs / (60 * 1000))

    // 2. Fetch Recent Activities (Top 5 latest-by-quiz), including active quizzes.
    const latestSessionIdsByQuiz = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'completed' } },
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSessionId: { $first: '$_id' },
          completedAt: { $first: '$completed_at' },
        },
      },
      { $sort: { completedAt: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, latestSessionId: 1 } },
    ])

    const sessionIds = latestSessionIdsByQuiz.map((x) => x.latestSessionId)
    const recentActivitiesRaw = await QuizSession.find({ _id: { $in: sessionIds } })
      .sort({ completed_at: -1 })
      .populate('quiz_id', 'title course_code questionCount questions')
      .lean()

    const latestActiveIdsByQuiz = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'active' } },
      { $sort: { started_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSessionId: { $first: '$_id' },
          startedAt: { $first: '$started_at' },
        },
      },
      { $sort: { startedAt: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, latestSessionId: 1 } },
    ])

    const activeSessionIds = latestActiveIdsByQuiz.map((x) => x.latestSessionId)
    const activeActivitiesRaw = await QuizSession.find({ _id: { $in: activeSessionIds } })
      .sort({ started_at: -1 })
      .populate('quiz_id', 'title course_code questionCount questions')
      .lean()

    const allRecentSessions = [...recentActivitiesRaw, ...activeActivitiesRaw] as any[]
    const uniqueQuizIds = Array.from(
      new Set(
        allRecentSessions
          .map((session) => session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || null)
          .filter((id): id is string => Boolean(id))
      )
    ).map((id) => new Types.ObjectId(id))

    const quizDocs = uniqueQuizIds.length
      ? await Quiz.find(
          { _id: { $in: uniqueQuizIds } },
          { category_id: 1, created_by: 1, is_saved_from_explore: 1, original_quiz_id: 1, course_code: 1 }
        ).lean()
      : []
    const quizMetaMap = new Map((quizDocs as any[]).map((quiz) => [quiz._id.toString(), quiz]))

    const categoryIds = Array.from(
      new Set(
        (quizDocs as any[])
          .map((quiz) => quiz?.category_id?.toString?.() ?? null)
          .filter((id): id is string => Boolean(id))
      )
    ).map((id) => new Types.ObjectId(id))

    const categories = categoryIds.length
      ? await Category.find({ _id: { $in: categoryIds } }, { name: 1 }).lean()
      : []
    const categoryNameMap = new Map((categories as any[]).map((category) => [category._id.toString(), category.name]))

    const originalSourceIds = Array.from(
      new Set(
        (quizDocs as any[])
          .filter((quiz) => quiz?.is_saved_from_explore && quiz?.original_quiz_id)
          .map((quiz) => quiz.original_quiz_id.toString())
      )
    ).map((id) => new Types.ObjectId(id))

    const originalSources = originalSourceIds.length
      ? await Quiz.find({ _id: { $in: originalSourceIds } }, { created_by: 1 }).lean()
      : []
    const originalCreatorMap = new Map((originalSources as any[]).map((quiz) => [quiz._id.toString(), quiz.created_by?.toString?.() ?? null]))

    const sourceCreatorIds = Array.from(
      new Set(
        (quizDocs as any[])
          .map((quiz) => {
            if (quiz?.is_saved_from_explore && quiz?.original_quiz_id) {
              return originalCreatorMap.get(quiz.original_quiz_id.toString()) ?? null
            }
            return quiz?.created_by?.toString?.() ?? null
          })
          .filter((id): id is string => Boolean(id))
      )
    ).map((id) => new Types.ObjectId(id))

    const sourceCreators = sourceCreatorIds.length
      ? await User.find({ _id: { $in: sourceCreatorIds } }, { username: 1 }).lean()
      : []
    const creatorNameMap = new Map((sourceCreators as any[]).map((u) => [u._id.toString(), u.username]))

    const completedActivities = recentActivitiesRaw.map((session: any) => {
      const quizId = session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || ''
      const quizMeta = quizMetaMap.get(quizId)
      const sourceType = inferSourceType(quizMeta, payload.userId)
      const sourceCreatorId = quizMeta?.is_saved_from_explore
        ? originalCreatorMap.get(quizMeta?.original_quiz_id?.toString?.() ?? '')
        : quizMeta?.created_by?.toString?.()

      const declaredCount = Number(session.quiz_id?.questionCount ?? 0)
      const derivedFromQuestions = Array.isArray(session.quiz_id?.questions)
        ? session.quiz_id.questions.length
        : 0
      let totalQuestions = session.user_answers.length
      if (declaredCount > 0) {
        totalQuestions = declaredCount
      } else if (derivedFromQuestions > 0) {
        totalQuestions = derivedFromQuestions
      }

      return {
        id: session._id.toString(),
        quizId,
        quizTitle: session.quiz_id?.title || 'Bộ đề không xác định',
        quizCode: quizMeta?.course_code || session.quiz_id?.course_code || 'N/A',
        categoryName: quizMeta?.category_id ? (categoryNameMap.get(quizMeta.category_id.toString()) ?? 'Chưa phân loại') : 'Chưa phân loại',
        sourceType,
        sourceLabel: sourceLabelFromType(sourceType),
        sourceCreatorName: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
        status: 'completed' as const,
        score: Number(((session.score / Math.max(totalQuestions, 1)) * 10).toFixed(2)),
        maxScore: 10,
        correctCount: session.user_answers.filter((a: any) => a.is_correct).length,
        totalCount: totalQuestions,
        activityAt: session.completed_at,
      }
    })

    const activeOnlyActivities = activeActivitiesRaw
      .map((session: any) => {
        const quizId = session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || ''
        const quizMeta = quizMetaMap.get(quizId)
        const sourceType = inferSourceType(quizMeta, payload.userId)
        const sourceCreatorId = quizMeta?.is_saved_from_explore
          ? originalCreatorMap.get(quizMeta?.original_quiz_id?.toString?.() ?? '')
          : quizMeta?.created_by?.toString?.()

        const declaredCount = Number(session.quiz_id?.questionCount ?? 0)
        const derivedFromQuestions = Array.isArray(session.quiz_id?.questions)
          ? session.quiz_id.questions.length
          : 0
        const totalQuestions = declaredCount > 0 ? declaredCount : derivedFromQuestions
        const answeredCount = Array.isArray(session.user_answers)
          ? new Set(
              session.user_answers
                .map((a: any) => a.question_index)
                .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
            ).size
          : 0

        return {
          id: session._id.toString(),
          quizId,
          quizTitle: session.quiz_id?.title || 'Bộ đề không xác định',
          quizCode: quizMeta?.course_code || session.quiz_id?.course_code || 'N/A',
          categoryName: quizMeta?.category_id ? (categoryNameMap.get(quizMeta.category_id.toString()) ?? 'Chưa phân loại') : 'Chưa phân loại',
          sourceType,
          sourceLabel: sourceLabelFromType(sourceType),
          sourceCreatorName: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
          status: 'active' as const,
          score: 0,
          maxScore: 10,
          correctCount: answeredCount,
          totalCount: Math.max(totalQuestions, 0),
          activityAt: session.started_at,
        }
      })
      .filter((activity) => !completedActivities.some((completed) => completed.quizId === activity.quizId))

    const recentActivities = [...completedActivities, ...activeOnlyActivities]
      .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime())
      .slice(0, 5)

    return NextResponse.json({
      stats: {
        totalQuizzes: stats.totalQuizzes,
        averageScore: stats.averageScore?.toFixed(1) || '0.0',
        totalCorrectAnswers: stats.totalCorrectAnswers,
        learningHours: Number(learningHoursRaw.toFixed(2)),
        learningMinutes,
      },
      recentActivities
    })
  } catch (error) {
    console.error('Dashboard Stats API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
