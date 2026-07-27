import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
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

    const sessions = await QuizSession.aggregate([
      {
        $match: matchQuery,
      },
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
      { $sort: { started_at: -1 } },
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
    }>

    const total = sessions.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const skip = (safePage - 1) * limit
    const pageItems = sessions.slice(skip, skip + limit)

    const quizIds = Array.from(
      new Set(
        pageItems
          .map((item) => item.quiz_id?.toString?.())
          .filter((id): id is string => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
      )
    ).map((id) => new mongoose.Types.ObjectId(id))

    const quizzes = quizIds.length
      ? await Quiz.find(
          { _id: { $in: quizIds } },
          { title: 1, questions: 1, questionCount: 1, created_by: 1, is_saved_from_explore: 1, original_quiz_id: 1, course_code: 1, category_id: 1 }
        ).lean()
      : []

    const quizMap = new Map((quizzes as any[]).map((q) => [q._id.toString(), q]))

    const originalCreatorMap = await buildOriginalCreatorMap(quizzes)
    const categoryNameMap = await buildCategoryNameMap(
      quizzes.map((quiz) => quiz?.category_id?.toString?.() ?? null)
    )
    const creatorNameMap = await buildCreatorNameMap(quizzes, originalCreatorMap, new UserService())

    const history = pageItems.map((item) => {
      const quizIdStr = item.quiz_id?.toString?.() ?? ''
      const quiz = quizIdStr ? (quizMap.get(quizIdStr) as any) : null
      const isMixQuiz = (item as any).is_temp === true

      if (isMixQuiz) {
        const { answeredCount, correctCount } = calculateAnswerCounts(item)
        const sessionTotal = resolveSessionTotalQuestions(item, quiz) || answeredCount || 0
        const quizTitle = quiz?.title ?? 'Quiz Trộn'
        const quizCode = quiz ? mixQuizDisplayCode(quizTitle) : 'TRỘN'

        return {
          _id: item._id.toString(),
          quiz_id: quizIdStr,
          quiz_title: quizTitle,
          quiz_code: quizCode,
          category_name: 'Quiz Trộn',
          source_type: 'mix_quiz',
          source_label: 'Quiz Trộn',
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
      const categoryName = categoryIdStr ? (categoryNameMap.get(categoryIdStr) ?? 'Chưa phân loại') : 'Chưa phân loại'

      return {
        _id: item._id.toString(),
        quiz_id: quizIdStr,
        quiz_title: quiz?.title ?? 'Quiz đã bị xóa',
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

    return NextResponse.json({ history, inProgress: [], total, page: safePage, limit, totalPages })
  } catch (err) {
    console.error('[API GET /api/history] Error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })