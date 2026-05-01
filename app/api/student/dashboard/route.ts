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

    // 2. Fetch Recent Activities (Top 5 latest-by-quiz), including active quizzes.
    const latestSessionIdsByQuiz = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'completed', is_temp: { $ne: true } } },
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
      { $match: { student_id: userId, status: 'active', is_temp: { $ne: true } } },
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
      { $match: { student_id: userId, status: 'completed', is_temp: { $ne: true } } },
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

    const quizDocs = uniqueQuizIds.length
      ? await Quiz.find(
          { _id: { $in: uniqueQuizIds } },
          { category_id: 1, created_by: 1, is_saved_from_explore: 1, original_quiz_id: 1, course_code: 1 }
        ).lean()
      : []
    const quizMetaMap = new Map((quizDocs as any[]).map((quiz) => [quiz._id.toString(), quiz]))

    // Lấy category IDs từ populated data
    const categoryIds = Array.from(
      new Set(
        [...recentActivitiesRaw, ...activeActivitiesRaw]
          .map((session: any) => session.quiz_id?.category_id?.toString?.() ?? null)
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
      
      // Nếu quiz bị xóa (không có quiz_id populated)
      if (!session.quiz_id || typeof session.quiz_id === 'string') {
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
          status: 'completed' as const,
          score: Number(((session.score / Math.max(totalQuestions, 1)) * 10).toFixed(2)),
          maxScore: 10,
          correctCount: session.user_answers?.filter((a: any) => a.is_correct).length || 0,
          totalCount: totalQuestions,
          activityAt: session.completed_at,
          quizDeleted: true,
        }
      }
      
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

      const isFlashcard = session.mode === 'flashcard'
      const fcStats = session.flashcard_stats
      const actualCorrectCount = isFlashcard && fcStats 
        ? fcStats.cards_known
        : session.user_answers?.filter((a: any) => a.is_correct)?.length || 0
      const baseScore = isFlashcard && fcStats ? fcStats.cards_known : (session.score || 0)

      return {
        id: session._id.toString(),
        quizId,
        quizTitle: session.quiz_id?.title || 'Bộ đề không xác định',
        quizCode: quizMeta?.course_code || session.quiz_id?.course_code || 'N/A',
        categoryName: session.quiz_id?.category_id ? (categoryNameMap.get(session.quiz_id.category_id.toString()) ?? 'Chưa phân loại') : 'Chưa phân loại',
        sourceType,
        sourceLabel: sourceLabelFromType(sourceType),
        sourceCreatorName: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
        mode: session.mode as string,
        status: 'completed' as const,
        score: Number(((baseScore / Math.max(totalQuestions, 1)) * 10).toFixed(2)),
        maxScore: 10,
        correctCount: actualCorrectCount,
        totalCount: totalQuestions,
        activityAt: session.completed_at,
        quizDeleted: false,
      }
    })

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
        const isFlashcard = session.mode === 'flashcard'
        const fcStats = session.flashcard_stats
        
        let answeredCount = 0
        if (isFlashcard && fcStats) {
          answeredCount = fcStats.cards_known + fcStats.cards_unknown
        } else if (Array.isArray(session.user_answers)) {
          answeredCount = new Set(
            session.user_answers
              .map((a: any) => a.question_index)
              .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
          ).size
        }

        return {
          id: session._id.toString(),
          quizId,
          quizTitle: session.quiz_id?.title || 'Bộ đề không xác định',
          quizCode: quizMeta?.course_code || session.quiz_id?.course_code || 'N/A',
          categoryName: session.quiz_id?.category_id ? (categoryNameMap.get(session.quiz_id.category_id.toString()) ?? 'Chưa phân loại') : 'Chưa phân loại',
          sourceType,
          sourceLabel: sourceLabelFromType(sourceType),
          sourceCreatorName: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
          mode: session.mode as string,
          status: 'active' as const,
          score: 0,
          maxScore: 10,
          correctCount: answeredCount,
          totalCount: Math.max(totalQuestions, 0),
          activityAt: session.started_at,
          quizDeleted: false,
        }
      })
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
}
