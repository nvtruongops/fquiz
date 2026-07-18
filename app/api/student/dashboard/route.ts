import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Types } from 'mongoose'
import {
  inferSourceType,
  sourceLabelFromType,
  mixQuizDisplayCode,
  buildOriginalCreatorMap,
  buildCategoryNameMap,
  buildCreatorNameMap,
  resolveSourceCreatorId,
} from '@/lib/modules/quiz/quiz-source-utils'
import { UserService } from '@/lib/modules/auth/services/UserService'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
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
            $cond: [
              { $ne: ['$quizDoc', null] },
              // Quiz exists: use questionCount or questions array length
              {
                $ifNull: [
                  '$quizDoc.questionCount',
                  { $size: { $ifNull: ['$quizDoc.questions', []] } },
                ],
              },
              // Quiz deleted: fallback to user_answers length (best effort)
              { $size: { $ifNull: ['$user_answers', []] } },
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

    // 1b. (removed: duration, weekly activity, streak)

    const stats = latestStatsResult[0] || {
      totalQuizzes: 0,
      averageScore: 0,
      totalCorrectAnswers: 0,
    }

    // 2. Fetch Recent Activities — completed sessions (thường + mix quiz)
    const latestSessionIdsByQuiz = await QuizSession.aggregate([
      {
        $match: {
          student_id: userId,
          status: 'completed',
        },
      },
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: { quiz_id: '$quiz_id', mode_group: { $cond: [{ $in: ['$mode', ['flashcard']] }, 'learning', 'assessment'] } },
          latestSessionId: { $first: '$_id' },
          completedAt: { $first: '$completed_at' },
        },
      },
      { $sort: { completedAt: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, latestSessionId: 1 } },
    ])

    const sessionIds = latestSessionIdsByQuiz.map((x) => x.latestSessionId)
    const recentActivitiesRaw = await QuizSession.find({ _id: { $in: sessionIds } })
      .sort({ completed_at: -1 })
      .populate('quiz_id', 'title course_code questionCount questions category_id created_by is_saved_from_explore original_quiz_id')
      .lean()

    const latestActiveIdsByQuiz = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'active' } },
      { $sort: { started_at: -1 } },
      {
        $group: {
          _id: { quiz_id: '$quiz_id', mode_group: { $cond: [{ $in: ['$mode', ['flashcard']] }, 'learning', 'assessment'] } },
          latestSessionId: { $first: '$_id' },
          startedAt: { $first: '$started_at' },
        },
      },
      { $sort: { startedAt: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, latestSessionId: 1 } },
    ])

    const activeSessionIds = latestActiveIdsByQuiz.map((x) => x.latestSessionId)
    const activeActivitiesRaw = await QuizSession.find({ _id: { $in: activeSessionIds } })
      .sort({ started_at: -1 })
      .populate('quiz_id', 'title course_code questionCount questions category_id created_by is_saved_from_explore original_quiz_id')
      .lean()

    // Build a set of ALL (quizId + mode_group) that have completed sessions — used to filter activeOnlyActivities
    // Query separately (no limit) so active sessions aren't incorrectly shown when a completed session exists outside top 10
    const allCompletedGroupsAgg = await QuizSession.aggregate([
      {
        $match: {
          student_id: userId,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            quiz_id: '$quiz_id',
            mode_group: { $cond: [{ $in: ['$mode', ['flashcard']] }, 'learning', 'assessment'] },
          },
        },
      },
      { $project: { _id: 1 } },
    ])
    const completedQuizModeGroups = new Set(
      allCompletedGroupsAgg.map((x: any) => `${x._id.quiz_id.toString()}::${x._id.mode_group}`)
    )

    const allRecentSessions = [...recentActivitiesRaw, ...activeActivitiesRaw] as any[]
    const uniqueQuizIds = Array.from(
      new Set(
        allRecentSessions
          .map((session) => session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || null)
          .filter((id): id is string => Boolean(id))
      )
    ).map((id) => new Types.ObjectId(id))

    const quizDocs: any[] = []
    const seenQuizIds = new Set<string>()
    for (const session of allRecentSessions) {
      if (session.quiz_id && typeof session.quiz_id === 'object') {
        const qId = session.quiz_id._id.toString()
        if (!seenQuizIds.has(qId)) {
          seenQuizIds.add(qId)
          quizDocs.push(session.quiz_id)
        }
      }
    }
    const quizMetaMap = new Map(quizDocs.map((quiz) => [quiz._id.toString(), quiz]))

    // Lấy category IDs từ populated data
    const sessionCategoryIds = [...recentActivitiesRaw, ...activeActivitiesRaw]
      .map((session: any) => session.quiz_id?.category_id?.toString?.() ?? null)
      .filter((id): id is string => Boolean(id))
    const categoryNameMap = await buildCategoryNameMap(sessionCategoryIds)

    const originalCreatorMap = await buildOriginalCreatorMap(quizDocs)
    const creatorNameMap = await buildCreatorNameMap(quizDocs, originalCreatorMap, new UserService())

    const completedActivities = recentActivitiesRaw.map((session: any) =>
      mapSessionToActivity(session, payload.userId, quizMetaMap, categoryNameMap, originalCreatorMap, creatorNameMap)
    )

    // Map active sessions by "quizId::modeGroup" for precise lookup
    const LEARNING_MODES = ['flashcard']
    const activeSessionsByQuizMode = new Map<string, any>()
    activeActivitiesRaw.forEach((session: any) => {
      const quizId = session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || ''
      if (quizId) {
        const group = LEARNING_MODES.includes(session.mode) ? 'learning' : 'assessment'
        activeSessionsByQuizMode.set(`${quizId}::${group}`, session)
      }
    })

    const enhancedCompletedActivities = completedActivities.map((activity) => {
      const completedIsLearning = LEARNING_MODES.includes(activity.mode ?? '')
      const group = completedIsLearning ? 'learning' : 'assessment'
      const activeSession = activeSessionsByQuizMode.get(`${activity.quizId}::${group}`)
      if (activeSession) {
        const declaredCount = Number(activeSession.quiz_id?.questionCount ?? 0)
        const derivedFromQuestions = Array.isArray(activeSession.quiz_id?.questions)
          ? activeSession.quiz_id.questions.length
          : 0
        const totalQuestions = declaredCount > 0 ? declaredCount : derivedFromQuestions
        const isFlashcardActive = activeSession.mode === 'flashcard'
        const fcStats = activeSession.flashcard_stats
        let answeredCount = 0
        if (isFlashcardActive && fcStats) {
          answeredCount = fcStats.cards_known + fcStats.cards_unknown
        } else if (Array.isArray(activeSession.user_answers)) {
          answeredCount = new Set(
            activeSession.user_answers
              .map((a: any) => a.question_index)
              .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
          ).size
        }

        return {
          ...activity,
          hasActiveSession: true,
          activeSessionId: activeSession._id.toString(),
          activeAnsweredCount: answeredCount,
          activeTotalCount: Math.max(totalQuestions, 0),
          activeStartedAt: activeSession.started_at,
          activityAt: activeSession.started_at, // dùng thời gian active session để sort đúng
        }
      }
      return activity
    })

    // Show active sessions for quizzes that have NO completed session in the SAME mode group
    const activeOnlyActivities = activeActivitiesRaw
      .map((session: any) =>
        mapSessionToActivity(session, payload.userId, quizMetaMap, categoryNameMap, originalCreatorMap, creatorNameMap)
      )
      // Only show if no completed session exists in the SAME mode group for this quiz
      .filter((activity) => {
        const group = LEARNING_MODES.includes(activity.mode) ? 'learning' : 'assessment'
        return !completedQuizModeGroups.has(`${activity.quizId}::${group}`)
      })

    const recentActivities = [...enhancedCompletedActivities, ...activeOnlyActivities]
      .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime())
      .slice(0, 5)

    return NextResponse.json({
      stats: {
        totalQuizzes: stats.totalQuizzes,
        averageScore: stats.averageScore?.toFixed(1) || '0.0',
        totalCorrectAnswers: stats.totalCorrectAnswers,
      },
      recentActivities
    })
  } catch (error) {
    console.error('Dashboard Stats API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

function mapSessionToActivity(
  session: any,
  userId: string,
  quizMetaMap: Map<string, any>,
  categoryNameMap: Map<string, string>,
  originalCreatorMap: Map<string, any>,
  creatorNameMap: Map<string, string>
) {
  const quizId = session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || ''
  const isMixQuiz = session.is_temp === true

  if (isMixQuiz) {
    return mapMixSessionToActivity(session, quizId)
  }

  if (!session.quiz_id || typeof session.quiz_id === 'string') {
    return mapDeletedSessionToActivity(session, quizId)
  }

  return mapRegularSessionToActivity(
    session,
    quizId,
    userId,
    quizMetaMap,
    categoryNameMap,
    originalCreatorMap,
    creatorNameMap
  )
}

function mapMixSessionToActivity(session: any, quizId: string) {
  const isActive = session.status === 'active'
  const quizTitle = session.quiz_id?.title ?? 'Quiz Trộn'
  const totalQuestions = session.quiz_id ? Number(session.quiz_id.questionCount ?? 0) : (session.user_answers?.length || 0)
  let answeredCount = 0
  let correctCount = 0

  if (Array.isArray(session.user_answers)) {
    correctCount = session.user_answers.filter((a: any) => a.is_correct).length
    answeredCount = new Set(
      session.user_answers
        .map((a: any) => a.question_index)
        .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
    ).size
  }

  const activityAt = isActive ? session.started_at : (session.completed_at ?? session.started_at)
  const score = isActive
    ? 0
    : Number(((session.score / Math.max(totalQuestions, 1)) * 10).toFixed(2))

  return {
    id: session._id.toString(),
    quizId,
    quizTitle,
    quizCode: session.quiz_id ? mixQuizDisplayCode(quizTitle) : 'TRỘN',
    categoryName: 'Quiz Trộn',
    sourceType: 'mix_quiz',
    sourceLabel: 'Quiz Trộn',
    sourceCreatorName: null,
    mode: session.mode as string,
    status: session.status as 'active' | 'completed',
    score,
    maxScore: 10,
    correctCount: isActive ? answeredCount : correctCount,
    totalCount: totalQuestions,
    activityAt,
    quizDeleted: false,
    isMix: true,
  }
}

function mapDeletedSessionToActivity(session: any, quizId: string) {
  const isActive = session.status === 'active'
  const totalQuestions = session.user_answers?.length || 0
  return {
    id: session._id.toString(),
    quizId,
    quizTitle: 'Quiz đã bị xóa',
    quizCode: 'N/A',
    categoryName: 'Chưa phân loại',
    sourceType: 'deleted',
    sourceLabel: 'Quiz đã bị xóa',
    sourceCreatorName: null,
    mode: session.mode as string,
    status: isActive ? 'active' : 'completed',
    score: isActive ? 0 : Number(((session.score / Math.max(totalQuestions, 1)) * 10).toFixed(2)),
    maxScore: 10,
    correctCount: isActive
      ? (session.user_answers?.length || 0)
      : (session.user_answers?.filter((a: any) => a.is_correct).length || 0),
    totalCount: totalQuestions,
    activityAt: isActive ? session.started_at : session.completed_at,
    quizDeleted: true,
  }
}

function mapRegularSessionToActivity(
  session: any,
  quizId: string,
  userId: string,
  quizMetaMap: Map<string, any>,
  categoryNameMap: Map<string, string>,
  originalCreatorMap: Map<string, any>,
  creatorNameMap: Map<string, string>
) {
  const isActive = session.status === 'active'
  const quizMeta = quizMetaMap.get(quizId)
  const sourceType = inferSourceType(quizMeta, userId)
  const sourceCreatorId = resolveSourceCreatorId(quizMeta, originalCreatorMap)

  const declaredCount = Number(session.quiz_id?.questionCount ?? 0)
  const derivedFromQuestions = Array.isArray(session.quiz_id?.questions)
    ? session.quiz_id.questions.length
    : 0
  const totalQuestions = declaredCount > 0 ? declaredCount : derivedFromQuestions

  const isFlashcard = session.mode === 'flashcard'
  const fcStats = session.flashcard_stats

  let correctCount = 0
  let answeredCount = 0

  if (isFlashcard && fcStats) {
    correctCount = fcStats.cards_known
    answeredCount = fcStats.cards_known + fcStats.cards_unknown
  } else if (Array.isArray(session.user_answers)) {
    correctCount = session.user_answers.filter((a: any) => a.is_correct).length
    answeredCount = new Set(
      session.user_answers
        .map((a: any) => a.question_index)
        .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
    ).size
  }

  const baseScore = isFlashcard && fcStats ? fcStats.cards_known : (session.score || 0)
  const score = isActive ? 0 : Number(((baseScore / Math.max(totalQuestions, 1)) * 10).toFixed(2))
  const activityAt = isActive ? session.started_at : session.completed_at

  return {
    id: session._id.toString(),
    quizId,
    quizTitle: session.quiz_id?.title || 'Bộ đề không xác định',
    quizCode: quizMeta?.course_code || session.quiz_id?.course_code || 'N/A',
    categoryName: session.quiz_id?.category_id
      ? categoryNameMap.get(session.quiz_id.category_id.toString()) ?? 'Chưa phân loại'
      : 'Chưa phân loại',
    sourceType,
    sourceLabel: sourceLabelFromType(sourceType),
    sourceCreatorName: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
    mode: session.mode as string,
    status: session.status as 'active' | 'completed',
    score,
    maxScore: 10,
    correctCount: isActive ? answeredCount : correctCount,
    totalCount: totalQuestions,
    activityAt,
    quizDeleted: false,
    isMix: false,
  }
}