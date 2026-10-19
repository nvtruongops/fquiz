import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import {
  inferSourceType,
  sourceLabelFromType,
  mixQuizDisplayCode,
  buildOriginalCreatorMap,
  buildCreatorNameMap,
  resolveSourceCreatorId,
} from '@/lib/modules/quiz/quiz-source-utils'
import { UserService } from '@/lib/modules/auth/services/UserService'

const MAX_HISTORY_SEARCH_LENGTH = 100

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHistoryFilterPipeline(matchQuery: Record<string, any>, search: string) {
  const pipeline: Record<string, any>[] = [
    { $match: matchQuery },
    {
      $lookup: {
        from: Quiz.collection.name,
        let: {
          quizId: { $convert: { input: '$quiz_id', to: 'objectId', onError: null, onNull: null } },
        },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$quizId'] } } },
          {
            $project: {
              title: 1,
              course_code: 1,
              category_id: 1,
              created_by: 1,
              is_saved_from_explore: 1,
              original_quiz_id: 1,
              questionCount: {
                $let: {
                  vars: {
                    declaredCount: { $ifNull: ['$questionCount', 0] },
                    derivedCount: { $cond: [{ $isArray: '$questions' }, { $size: '$questions' }, 0] },
                  },
                  in: {
                    $cond: [{ $gt: ['$$declaredCount', 0] }, '$$declaredCount', '$$derivedCount'],
                  },
                },
              },
            },
          },
        ],
        as: 'historyQuiz',
      },
    },
    { $unwind: { path: '$historyQuiz', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Category.collection.name,
        let: {
          categoryId: { $convert: { input: '$historyQuiz.category_id', to: 'objectId', onError: null, onNull: null } },
        },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$categoryId'] } } },
          { $project: { name: 1 } },
        ],
        as: 'historyCategory',
      },
    },
    { $unwind: { path: '$historyCategory', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        historySearchTitle: { $ifNull: ['$historyQuiz.title', 'Deleted Quiz'] },
        historySearchCode: { $ifNull: ['$historyQuiz.course_code', 'N/A'] },
        historySearchCategory: {
          $cond: [
            { $eq: ['$is_temp', true] },
            'Mix Quiz',
            { $ifNull: ['$historyCategory.name', 'Uncategorized'] },
          ],
        },
        historyTotalQuestions: {
          $let: {
            vars: {
              orderCount: { $cond: [{ $isArray: '$question_order' }, { $size: '$question_order' }, 0] },
              cacheCount: { $cond: [{ $isArray: '$questions_cache' }, { $size: '$questions_cache' }, 0] },
              flashcardCount: { $ifNull: ['$flashcard_stats.total_cards', 0] },
              quizCount: { $ifNull: ['$historyQuiz.questionCount', 0] },
              answeredCount: {
                $let: {
                  vars: {
                    answerIndices: {
                      $map: {
                        input: {
                          $filter: {
                            input: { $cond: [{ $isArray: '$user_answers' }, '$user_answers', []] },
                            as: 'answer',
                            cond: {
                              $and: [
                                { $isNumber: '$$answer.question_index' },
                                { $eq: ['$$answer.question_index', { $trunc: '$$answer.question_index' }] },
                                { $gte: ['$$answer.question_index', 0] },
                              ],
                            },
                          },
                        },
                        as: 'answer',
                        in: '$$answer.question_index',
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $ne: [{ $ifNull: ['$flashcard_stats', null] }, null] },
                      {
                        $add: [
                          { $ifNull: ['$flashcard_stats.cards_known', 0] },
                          { $ifNull: ['$flashcard_stats.cards_unknown', 0] },
                        ],
                      },
                      { $size: { $setUnion: ['$$answerIndices', []] } },
                    ],
                  },
                },
              },
            },
            in: {
              $switch: {
                branches: [
                  { case: { $gt: ['$$orderCount', 0] }, then: '$$orderCount' },
                  { case: { $gt: ['$$cacheCount', 0] }, then: '$$cacheCount' },
                  { case: { $gt: ['$$flashcardCount', 0] }, then: '$$flashcardCount' },
                ],
                default: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$is_temp', true] },
                        { $lte: ['$$quizCount', 0] },
                      ],
                    },
                    '$$answeredCount',
                    '$$quizCount',
                  ],
                },
              },
            },
          },
        },
      },
    },
  ]

  if (search) {
    const escapedSearch = escapeRegex(search)
    pipeline.push({
      $match: {
        $or: [
          { historySearchTitle: { $regex: escapedSearch, $options: 'i' } },
          { historySearchCode: { $regex: escapedSearch, $options: 'i' } },
          { historySearchCategory: { $regex: escapedSearch, $options: 'i' } },
        ],
      },
    })
  }

  return pipeline
}

function resolveSessionTotalQuestions(item: any, fallbackQuiz: any) {
  if (Array.isArray(item.question_order) && item.question_order.length > 0) {
    return item.question_order.length
  }
  if (Array.isArray(item.questions_cache) && item.questions_cache.length > 0) {
    return item.questions_cache.length
  }
  if (item.flashcard_stats?.total_cards) {
    return item.flashcard_stats.total_cards
  }
  const declaredCount = Number(fallbackQuiz?.questionCount ?? 0)
  const derivedFromQuestions = Array.isArray(fallbackQuiz?.questions) ? fallbackQuiz.questions.length : 0
  return declaredCount > 0 ? declaredCount : derivedFromQuestions
}

function calculateAnswerCounts(item: any) {
  if (item.flashcard_stats) {
    return {
      answeredCount: item.flashcard_stats.cards_known + item.flashcard_stats.cards_unknown,
      correctCount: item.flashcard_stats.cards_known,
    }
  }
  if (Array.isArray(item.user_answers)) {
    const answeredCount = new Set(
      item.user_answers
        .map((a: any) => a.question_index)
        .filter((idx: any) => Number.isInteger(idx) && idx >= 0)
    ).size
    const correctCount = item.user_answers.filter((a: any) => a.is_correct).length
    return { answeredCount, correctCount }
  }
  return { answeredCount: 0, correctCount: 0 }
}

export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20))
    const search = (searchParams.get('search') || '').trim().slice(0, MAX_HISTORY_SEARCH_LENGTH)
    const statusFilter = searchParams.get('status') || 'all'
    const modeFilter = searchParams.get('mode') || 'all'

    if (!['all', 'active', 'completed'].includes(statusFilter)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }
    if (!['all', 'immediate', 'review', 'flashcard'].includes(modeFilter)) {
      return NextResponse.json({ error: 'Invalid mode filter' }, { status: 400 })
    }
    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    if (!payload?.userId || !mongoose.Types.ObjectId.isValid(payload.userId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
    }

    const studentId = new mongoose.Types.ObjectId(payload.userId)
    const quizIdParam = searchParams.get('quiz_id')
    const matchQuery: Record<string, any> = {
      $or: [
        { student_id: studentId },
        { student_id: payload.userId },
      ],
      status: { $in: ['active', 'completed'] },
    }
    if (quizIdParam && mongoose.Types.ObjectId.isValid(quizIdParam)) {
      matchQuery.quiz_id = new mongoose.Types.ObjectId(quizIdParam)
    }
    if (statusFilter !== 'all') matchQuery.status = statusFilter
    if (modeFilter !== 'all') matchQuery.mode = modeFilter

    const summaryRows = await QuizSession.aggregate([
      ...(buildHistoryFilterPipeline(matchQuery, search) as mongoose.PipelineStage[]),
      {
        $group: {
          _id: {
            $ifNull: [
              { $convert: { input: '$quiz_id', to: 'string', onError: null, onNull: null } },
              { $cond: [{ $eq: ['$is_temp', true] }, 'MIX', '$historySearchCode'] },
            ],
          },
          attempts: { $sum: 1 },
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          perfectScores: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $gt: ['$historyTotalQuestions', 0] },
                    { $gte: [{ $ifNull: ['$score', 0] }, '$historyTotalQuestions'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          totalAttempts: { $sum: '$attempts' },
          completedCount: { $sum: '$completedCount' },
          perfectScores: { $sum: '$perfectScores' },
        },
      },
    ])
    const stats = summaryRows[0]
      ? {
          totalQuizzes: summaryRows[0].totalQuizzes,
          totalAttempts: summaryRows[0].totalAttempts,
          completedCount: summaryRows[0].completedCount,
          perfectScores: summaryRows[0].perfectScores,
        }
      : { totalQuizzes: 0, totalAttempts: 0, completedCount: 0, perfectScores: 0 }
    const total = stats.totalAttempts
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const skip = (safePage - 1) * limit
    const pageItems = await QuizSession.aggregate([
      ...(buildHistoryFilterPipeline(matchQuery, search) as mongoose.PipelineStage[]),
      { $sort: { started_at: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $addFields: {
          duration_ms: {
            $max: [
              0,
              {
                $subtract: [
                  {
                    $subtract: [
                      { $ifNull: ['$completed_at', { $ifNull: ['$started_at', new Date()] }] },
                      { $ifNull: ['$started_at', new Date()] },
                    ],
                  },
                  { $ifNull: ['$total_paused_duration_ms', 0] },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          quiz_id: 1,
          score: 1,
          mode: 1,
          status: 1,
          completed_at: 1,
          started_at: 1,
          duration_minutes: { $round: [{ $divide: ['$duration_ms', 60000] }, 0] },
          flashcard_stats: 1,
          user_answers: 1,
          is_temp: 1,
          question_order: 1,
          questions_cache: 1,
          historyQuiz: 1,
          historyCategory: 1,
        },
      },
    ]) as Array<{
      _id: mongoose.Types.ObjectId
      quiz_id?: mongoose.Types.ObjectId | null
      score: number
      mode: 'immediate' | 'review' | 'flashcard'
      status: 'active' | 'completed'
      completed_at?: Date
      started_at: Date
      duration_minutes: number
      flashcard_stats?: any
      user_answers?: any[]
      is_temp?: boolean
      question_order?: number[]
      questions_cache?: any[]
      historyQuiz?: any
      historyCategory?: { _id?: mongoose.Types.ObjectId; name?: string }
    }>

    const quizzes = Array.from(
      new Map(
        pageItems
          .filter((item) => item.historyQuiz?._id)
          .map((item) => [item.historyQuiz._id.toString(), item.historyQuiz])
      ).values()
    )

    const quizMap = new Map((quizzes as any[]).map((q) => [q._id.toString(), q]))

    const originalCreatorMap = await buildOriginalCreatorMap(quizzes)
    const categoryNameMap = new Map<string, string>()
    pageItems.forEach((item) => {
      const categoryId = item.historyQuiz?.category_id?.toString?.()
      if (categoryId && item.historyCategory?.name) categoryNameMap.set(categoryId, item.historyCategory.name)
    })
    const creatorNameMap = await buildCreatorNameMap(quizzes, originalCreatorMap, new UserService())

    const history = pageItems.map((item) => {
      const quizIdStr = item.quiz_id?.toString?.() ?? ''
      const quiz = quizIdStr ? (quizMap.get(quizIdStr) as any) : null
      const isMixQuiz = (item as any).is_temp === true

      if (isMixQuiz) {
        const { answeredCount, correctCount } = calculateAnswerCounts(item)
        const sessionTotal = resolveSessionTotalQuestions(item, quiz) || answeredCount || 0
        const quizTitle = quiz?.title ?? 'Mix Quiz'
        const quizCode = quiz ? mixQuizDisplayCode(quizTitle) : 'MIX'

        return {
          _id: item._id.toString(),
          quiz_id: quizIdStr,
          quiz_title: quizTitle,
          quiz_code: quizCode,
          category_name: 'Mix Quiz',
          source_type: 'mix_quiz',
          source_label: 'Mix Quiz',
          source_creator_name: null,
          score: item.score,
          total_questions: sessionTotal,
          answered_count: answeredCount,
          correct_count: correctCount,
          mode: item.mode,
          status: item.status,
          completed_at: item.completed_at,
          started_at: item.started_at,
          duration_minutes: item.duration_minutes,
          flashcard_stats: item.flashcard_stats,
          is_mix: true,
        }
      }

      const sourceType = inferSourceType(quiz, payload.userId)
      const sourceCreatorId = resolveSourceCreatorId(quiz, originalCreatorMap)
      const sessionTotal = resolveSessionTotalQuestions(item, quiz)
      const { answeredCount, correctCount } = calculateAnswerCounts(item)

      const categoryIdStr = quiz?.category_id?.toString?.()
      const categoryName = categoryIdStr ? (categoryNameMap.get(categoryIdStr) ?? 'Uncategorized') : 'Uncategorized'

      return {
        _id: item._id.toString(),
        quiz_id: quizIdStr,
        quiz_title: quiz?.title ?? 'Deleted Quiz',
        quiz_code: quiz?.course_code ?? 'N/A',
        category_name: categoryName,
        source_type: sourceType,
        source_label: sourceLabelFromType(sourceType),
        source_creator_name: sourceCreatorId ? (creatorNameMap.get(sourceCreatorId) ?? null) : null,
        score: item.score,
        total_questions: sessionTotal,
        answered_count: answeredCount,
        correct_count: correctCount,
        mode: item.mode,
        status: item.status,
        completed_at: item.completed_at,
        started_at: item.started_at,
        duration_minutes: item.duration_minutes,
        flashcard_stats: item.flashcard_stats,
      }
    })

    return NextResponse.json({ history, inProgress: [], total, page: safePage, limit, totalPages, stats })
  } catch (err) {
    console.error('[API GET /api/history] Error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })
