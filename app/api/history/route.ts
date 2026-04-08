import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { User } from '@/models/User'

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
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const studentId = new mongoose.Types.ObjectId(payload.userId)
    const grouped = await QuizSession.aggregate([
      {
        $match: {
          student_id: studentId,
          status: 'completed',
        },
      },
      {
        $addFields: {
          duration_ms: {
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
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSession: { $first: '$$ROOT' },
          totalDurationMs: { $sum: '$duration_ms' },
          attempt_count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          quiz_id: '$_id',
          latest_session_id: '$latestSession._id',
          score: '$latestSession.score',
          mode: '$latestSession.mode',
          completed_at: '$latestSession.completed_at',
          started_at: '$latestSession.started_at',
          total_study_minutes: { $round: [{ $divide: ['$totalDurationMs', 60000] }, 0] },
          attempt_count: 1,
        },
      },
      { $sort: { completed_at: -1 } },
    ]) as Array<{
      quiz_id: mongoose.Types.ObjectId
      latest_session_id: mongoose.Types.ObjectId
      score: number
      mode: 'immediate' | 'review'
      completed_at: Date
      started_at: Date
      total_study_minutes: number
      attempt_count: number
    }>

    const total = grouped.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const skip = (safePage - 1) * limit
    const pageItems = grouped.slice(skip, skip + limit)

    const activeGrouped = await QuizSession.aggregate([
      {
        $match: {
          student_id: studentId,
          status: 'active',
        },
      },
      { $sort: { started_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSession: { $first: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          quiz_id: '$_id',
          active_session_id: '$latestSession._id',
          started_at: '$latestSession.started_at',
          current_question_index: '$latestSession.current_question_index',
          user_answers: '$latestSession.user_answers',
        },
      },
      { $sort: { started_at: -1 } },
    ]) as Array<{
      quiz_id: mongoose.Types.ObjectId
      active_session_id: mongoose.Types.ObjectId
      started_at: Date
      current_question_index: number
      user_answers?: Array<{ question_index: number }>
    }>

    const quizIds = Array.from(
      new Set([
        ...pageItems.map((item) => item.quiz_id.toString()),
        ...activeGrouped.map((item) => item.quiz_id.toString()),
      ])
    ).map((id) => new mongoose.Types.ObjectId(id))

    const quizzes = quizIds.length
      ? await Quiz.find(
          { _id: { $in: quizIds } },
          { title: 1, questions: 1, created_by: 1, is_saved_from_explore: 1, original_quiz_id: 1, course_code: 1, category_id: 1 }
        ).lean()
      : []

    const quizMap = new Map((quizzes as any[]).map((q) => [q._id.toString(), q]))

    const originalSourceIds = Array.from(
      new Set(
        (quizzes as any[])
          .filter((quiz) => quiz?.is_saved_from_explore && quiz?.original_quiz_id)
          .map((quiz) => quiz.original_quiz_id.toString())
      )
    ).map((id) => new mongoose.Types.ObjectId(id))

    const originalSources = originalSourceIds.length
      ? await Quiz.find({ _id: { $in: originalSourceIds } }, { created_by: 1 }).lean()
      : []
    const originalCreatorMap = new Map((originalSources as any[]).map((q) => [q._id.toString(), q.created_by?.toString?.() ?? null]))

    const categoryIds = Array.from(
      new Set(
        (quizzes as any[])
          .map((quiz) => quiz?.category_id?.toString?.() ?? null)
          .filter((id): id is string => Boolean(id))
      )
    ).map((id) => new mongoose.Types.ObjectId(id))

    const categories = categoryIds.length
      ? await Category.find({ _id: { $in: categoryIds } }, { name: 1 }).lean()
      : []
    const categoryNameMap = new Map((categories as any[]).map((category) => [category._id.toString(), category.name]))

    const sourceCreatorIds = Array.from(
      new Set(
        (quizzes as any[])
          .map((quiz) => {
            if (quiz?.is_saved_from_explore && quiz?.original_quiz_id) {
              return originalCreatorMap.get(quiz.original_quiz_id.toString()) ?? null
            }
            return quiz?.created_by?.toString?.() ?? null
          })
          .filter((id): id is string => Boolean(id))
      )
    ).map((id) => new mongoose.Types.ObjectId(id))

    const sourceCreators = sourceCreatorIds.length
      ? await User.find({ _id: { $in: sourceCreatorIds } }, { username: 1 }).lean()
      : []
    const creatorNameMap = new Map((sourceCreators as any[]).map((u) => [u._id.toString(), u.username]))

    const allHistory = pageItems.map((item) => {
      const quiz = quizMap.get(item.quiz_id.toString()) as any
      const sourceType = inferSourceType(quiz, payload.userId)
      const sourceCreatorId = quiz?.is_saved_from_explore
        ? originalCreatorMap.get(quiz?.original_quiz_id?.toString?.() ?? '')
        : quiz?.created_by?.toString?.()

      return {
        _id: item.quiz_id.toString(),
        quiz_id: item.quiz_id,
        latest_session_id: item.latest_session_id,
        quiz_title: quiz?.title ?? null,
        quiz_code: quiz?.course_code ?? null,
        category_name: quiz?.category_id ? (categoryNameMap.get(quiz.category_id.toString()) ?? null) : null,
        source_type: sourceType,
        source_label: sourceLabelFromType(sourceType),
        source_creator_name: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
        score: item.score,
        total_questions: quiz?.questions?.length ?? 0,
        mode: item.mode,
        completed_at: item.completed_at,
        started_at: item.started_at,
        total_study_minutes: item.total_study_minutes,
        attempt_count: item.attempt_count,
      }
    })

    const history = allHistory

    const inProgressRaw = activeGrouped.map((item) => {
      const quiz = quizMap.get(item.quiz_id.toString()) as any
      const sourceType = inferSourceType(quiz, payload.userId)
      const answeredCount = new Set(
        (item.user_answers ?? [])
          .map((answer) => answer.question_index)
          .filter((idx) => Number.isInteger(idx) && idx >= 0)
      ).size
      const sourceCreatorId = quiz?.is_saved_from_explore
        ? originalCreatorMap.get(quiz?.original_quiz_id?.toString?.() ?? '')
        : quiz?.created_by?.toString?.()

      return {
        _id: item.quiz_id.toString(),
        quiz_id: item.quiz_id,
        active_session_id: item.active_session_id,
        quiz_title: quiz?.title ?? null,
        quiz_code: quiz?.course_code ?? null,
        category_name: quiz?.category_id ? (categoryNameMap.get(quiz.category_id.toString()) ?? null) : null,
        source_type: sourceType,
        source_label: sourceLabelFromType(sourceType),
        source_creator_name: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
        started_at: item.started_at,
        answered_count: answeredCount,
        total_questions: quiz?.questions?.length ?? 0,
        current_question_index: Math.max(0, Number(item.current_question_index ?? 0)),
      }
    })

    const inProgress = inProgressRaw.slice(0, 10)

    return NextResponse.json({ history, inProgress, total, page: safePage, limit, totalPages })
  } catch (err) {
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
