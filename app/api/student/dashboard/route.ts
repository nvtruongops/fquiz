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

    // 1c. Weekly activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const weeklyActivityAgg = await QuizSession.aggregate([
      { 
        $match: { 
          student_id: userId, 
          started_at: { $gte: sevenDaysAgo } 
        } 
      },
      {
        $project: {
          dayOfWeek: { $dayOfWeek: { $add: ["$started_at", 7 * 60 * 60 * 1000] } }, // Adjust for UTC+7 if needed, or keep as is
          answerCount: { $size: { $ifNull: ["$user_answers", []] } }
        }
      },
      {
        $group: {
          _id: "$dayOfWeek",
          count: { $sum: "$answerCount" }
        }
      }
    ])

    // Map Mongo dayOfWeek (1=Sun, 7=Sat) to Vietnamese labels
    const dayMap: Record<number, string> = {
      1: 'CN', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7'
    }
    
    // Ensure all 7 days are present
    const weeklyActivity = [2, 3, 4, 5, 6, 7, 1].map(dayNum => {
      const found = weeklyActivityAgg.find(item => item._id === dayNum)
      return {
        day: dayMap[dayNum],
        val: found ? found.count : 0
      }
    })

    // 1d. Streak calculation
    const allActivityDatesAgg = await QuizSession.aggregate([
      { $match: { student_id: userId } },
      {
        $project: {
          date: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: { $add: ["$started_at", 7 * 60 * 60 * 1000] } 
            } 
          }
        }
      },
      { $group: { _id: "$date" } },
      { $sort: { _id: -1 } }
    ])

    const activityDates = allActivityDatesAgg.map(x => x._id)
    let streak = 0
    if (activityDates.length > 0) {
      const today = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]
      const yesterday = new Date(new Date().getTime() + 7 * 60 * 60 * 1000 - 86400000).toISOString().split('T')[0]
      
      let currentCheckDate: string | null = null
      if (activityDates[0] === today) {
        currentCheckDate = today
      } else if (activityDates[0] === yesterday) {
        currentCheckDate = yesterday
      }

      if (currentCheckDate) {
        streak = 1
        let checkDateObj = new Date(currentCheckDate)
        for (let i = 1; i < activityDates.length; i++) {
          checkDateObj.setDate(checkDateObj.getDate() - 1)
          const prevDateStr = checkDateObj.toISOString().split('T')[0]
          if (activityDates[i] === prevDateStr) {
            streak++
          } else {
            break
          }
        }
      }
    }

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
      .populate('quiz_id', 'title course_code questionCount questions category_id created_by is_saved_from_explore original_quiz_id')
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
      .populate('quiz_id', 'title course_code questionCount questions category_id created_by is_saved_from_explore original_quiz_id')
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
        status: 'completed' as const,
        score: Number(((baseScore / Math.max(totalQuestions, 1)) * 10).toFixed(2)),
        maxScore: 10,
        correctCount: actualCorrectCount,
        totalCount: totalQuestions,
        activityAt: session.completed_at,
        quizDeleted: false,
      }
    })

    // Map active sessions by quizId for quick lookup
    const activeSessionsByQuizId = new Map<string, any>()
    activeActivitiesRaw.forEach((session: any) => {
      const quizId = session.quiz_id?._id?.toString?.() || session.quiz_id?.toString?.() || ''
      if (quizId) {
        activeSessionsByQuizId.set(quizId, session)
      }
    })

    // Enhance completed activities with active session info if exists
    const enhancedCompletedActivities = completedActivities.map((activity) => {
      const activeSession = activeSessionsByQuizId.get(activity.quizId)
      if (activeSession) {
        const declaredCount = Number(activeSession.quiz_id?.questionCount ?? 0)
        const derivedFromQuestions = Array.isArray(activeSession.quiz_id?.questions)
          ? activeSession.quiz_id.questions.length
          : 0
        const totalQuestions = declaredCount > 0 ? declaredCount : derivedFromQuestions
        const answeredCount = Array.isArray(activeSession.user_answers)
          ? new Set(
              activeSession.user_answers
                .map((a: any) => a.question_index)
                .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
            ).size
          : 0

        return {
          ...activity,
          hasActiveSession: true,
          activeSessionId: activeSession._id.toString(),
          activeAnsweredCount: answeredCount,
          activeTotalCount: Math.max(totalQuestions, 0),
          activeStartedAt: activeSession.started_at,
        }
      }
      return activity
    })

    // Only show active sessions for quizzes that have NO completed sessions
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
          status: 'active' as const,
          score: 0,
          maxScore: 10,
          correctCount: answeredCount, // Note: For active session this shows answered_count
          totalCount: Math.max(totalQuestions, 0),
          activityAt: session.started_at,
        }
      })
      .filter((activity) => !completedActivities.some((completed) => completed.quizId === activity.quizId))

    const recentActivities = [...enhancedCompletedActivities, ...activeOnlyActivities]
      .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime())
      .slice(0, 5)

    return NextResponse.json({
      stats: {
        totalQuizzes: stats.totalQuizzes,
        averageScore: stats.averageScore?.toFixed(1) || '0.0',
        totalCorrectAnswers: stats.totalCorrectAnswers,
        learningHours: Number(learningHoursRaw.toFixed(2)),
        learningMinutes,
        weeklyActivity,
        streak,
      },
      recentActivities
    })
  } catch (error) {
    console.error('Dashboard Stats API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
