import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { User } from '@/lib/modules/auth/models/User'
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

    // 1. Fetch Recent Activities — completed sessions (thường + mix quiz)
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
      .lean()

    // Exclude expired active sessions (they can't be resumed — validateQuizSessionRequest returns 410).
    // Flashcard sessions have no expires_at and stay resumable.
    const now = new Date()
    const latestActiveIdsByQuiz = await QuizSession.aggregate([
      {
        $match: {
          student_id: userId,
          status: 'active',
          $or: [
            { expires_at: { $gt: now } },
            { expires_at: { $exists: false } },
            { expires_at: null },
          ],
        },
      },
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
      .lean()

    // Application-level join for quiz_id without using Mongoose .populate()
    const rawQuizIds = Array.from(
      new Set(
        [...recentActivitiesRaw, ...activeActivitiesRaw]
          .map((s: any) => s.quiz_id?.toString())
          .filter((id): id is string => Boolean(id))
      )
    )
    const quizDocsFetched = await Quiz.find(
      { _id: { $in: rawQuizIds.map((id) => new Types.ObjectId(id)) } },
      'title course_code questionCount category_id created_by is_saved_from_explore original_quiz_id'
    ).lean()
    const quizMapByObjId = new Map(quizDocsFetched.map((q: any) => [q._id.toString(), q]))

    recentActivitiesRaw.forEach((s: any) => {
      if (s.quiz_id) {
        s.quiz_id = quizMapByObjId.get(s.quiz_id.toString()) || s.quiz_id
      }
    })
    activeActivitiesRaw.forEach((s: any) => {
      if (s.quiz_id) {
        s.quiz_id = quizMapByObjId.get(s.quiz_id.toString()) || s.quiz_id
      }
    })

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
        const totalQuestions = resolveSessionTotalQuestions(activeSession, quizQuestionCountOf(activeSession.quiz_id))
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

    // Matches the dashboard UI feed window (page slices recentActivities.slice(0, 6)).
    const RECENT_ACTIVITIES_LIMIT = 6
    const allActivities = [...enhancedCompletedActivities, ...activeOnlyActivities]
      .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime())

    // In-progress sessions (đang dở) must never be silently dropped by the feed limit:
    // they surface first (most recent first), then recent completed fill remaining slots.
    // Previously an older unsubmitted session disappeared from /dashboard while still
    // visible in /history once 5+ newer completed activities existed.
    const isInProgressActivity = (a: any) => a.status === 'active' || a.hasActiveSession === true
    const recentActivities = [
      ...allActivities.filter(isInProgressActivity),
      ...allActivities.filter((a) => !isInProgressActivity(a)),
    ].slice(0, RECENT_ACTIVITIES_LIMIT)

    // 2. Pinned categories — quick access shortcuts (same data as /explore pins)
    const pinnedCategories = await resolvePinnedCategories(payload.userId)

    return NextResponse.json({
      recentActivities,
      pinnedCategories,
    })
  } catch (error) {
    console.error('Dashboard Stats API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}, { roles: ['student'] })

/**
 * Resolve user's pinned category IDs (stored on User.pinned_categories) into
 * display-ready items with quiz counts. Preserves the user's pin order.
 * Application-level join — no Mongoose .populate().
 */
async function resolvePinnedCategories(userId: string) {
  const userDoc = (await User.findById(userId).select('pinned_categories').lean()) as any
  const pinnedIds: string[] = (userDoc?.pinned_categories ?? []).filter((id: unknown): id is string =>
    typeof id === 'string' && Types.ObjectId.isValid(id)
  )
  if (pinnedIds.length === 0) return []

  const objectIds = pinnedIds.map((id) => new Types.ObjectId(id))
  const catDocs = await Category.find({ _id: { $in: objectIds } }, 'name').lean()
  if (catDocs.length === 0) return []

  const quizCounts = await Quiz.aggregate([
    {
      $match: {
        category_id: { $in: catDocs.map((c: any) => c._id) },
        status: 'published',
        is_public: true,
        is_temp: { $ne: true },
      },
    },
    { $group: { _id: '$category_id', count: { $sum: 1 } } },
  ])
  const countMap = new Map(quizCounts.map((x: any) => [x._id.toString(), x.count]))
  const catMap = new Map(catDocs.map((c: any) => [c._id.toString(), c]))

  return pinnedIds
    .map((id) => {
      const cat = catMap.get(id) as any
      if (!cat) return null
      return { id, name: cat.name as string, quizCount: countMap.get(id) ?? 0 }
    })
    .filter((c): c is { id: string; name: string; quizCount: number } => Boolean(c))
}

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

/**
 * Resolve the ACTUAL question count of a session. Retry-wrong / custom sessions
 * run on a subset of the quiz (question_order), so dividing the raw score by the
 * quiz's global questionCount produces wrong scores (e.g. 2/2 shown as 0.4/10).
 * Same resolution order as /api/history: question_order → questions_cache →
 * flashcard_stats.total_cards → fallback quiz questionCount.
 */
function resolveSessionTotalQuestions(session: any, fallbackQuestionCount: number): number {
  if (Array.isArray(session.question_order) && session.question_order.length > 0) {
    return session.question_order.length
  }
  if (Array.isArray(session.questions_cache) && session.questions_cache.length > 0) {
    return session.questions_cache.length
  }
  if (session.flashcard_stats?.total_cards) {
    return session.flashcard_stats.total_cards
  }
  return fallbackQuestionCount
}

function quizQuestionCountOf(quizDoc: any): number {
  const declaredCount = Number(quizDoc?.questionCount ?? 0)
  const derivedFromQuestions = Array.isArray(quizDoc?.questions) ? quizDoc.questions.length : 0
  return declaredCount > 0 ? declaredCount : derivedFromQuestions
}

function mapMixSessionToActivity(session: any, quizId: string) {
  const isActive = session.status === 'active'
  const quizTitle = session.quiz_id?.title ?? 'Quiz Trộn'
  const fallbackCount = session.quiz_id ? Number(session.quiz_id.questionCount ?? 0) : (session.user_answers?.length || 0)
  const totalQuestions = resolveSessionTotalQuestions(session, fallbackCount)
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

function calculateSessionAnswerCounts(session: any) {
  const isFlashcard = session.mode === 'flashcard'
  const fcStats = session.flashcard_stats

  if (isFlashcard && fcStats) {
    return {
      correctCount: fcStats.cards_known,
      answeredCount: fcStats.cards_known + fcStats.cards_unknown,
      baseScore: fcStats.cards_known,
    }
  }

  let correctCount = 0
  let answeredCount = 0
  if (Array.isArray(session.user_answers)) {
    correctCount = session.user_answers.filter((a: any) => a.is_correct).length
    answeredCount = new Set(
      session.user_answers
        .map((a: any) => a.question_index)
        .filter((idx: unknown) => Number.isInteger(idx) && Number(idx) >= 0)
    ).size
  }

  return {
    correctCount,
    answeredCount,
    baseScore: session.score || 0,
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

  const totalQuestions = resolveSessionTotalQuestions(session, quizQuestionCountOf(session.quiz_id))

  const { correctCount, answeredCount, baseScore } = calculateSessionAnswerCounts(session)

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