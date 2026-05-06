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

/**
 * Extract display code from mix quiz title.
 * "Quiz Trộn · MLN122_SP26_C1_FE + MLN122_SP26_C2_FE" → "MLN122_SP26_C1_FE + ..."
 * Truncates to keep it readable.
 */
function mixQuizDisplayCode(title: string): string {
  const prefix = 'Quiz Trộn · '
  const raw = title.startsWith(prefix) ? title.slice(prefix.length) : title
  // Truncate if too long (e.g. 5 quizzes)
  if (raw.length > 40) return raw.slice(0, 37) + '...'
  return raw
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
    const sessions = await QuizSession.aggregate([
      {
        $match: {
          student_id: studentId,
          // Hiện tất cả session: thường + mix quiz (active và completed)
        },
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
                      { $ifNull: ['$completed_at', '$started_at'] },
                      '$started_at',
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
        },
      },
    ]) as Array<{
      _id: mongoose.Types.ObjectId
      quiz_id: mongoose.Types.ObjectId
      score: number
      mode: 'immediate' | 'review' | 'flashcard'
      status: 'active' | 'completed'
      completed_at?: Date
      started_at: Date
      duration_minutes: number
      flashcard_stats?: any
      user_answers?: any[]
      is_temp?: boolean
    }>

    const total = sessions.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const skip = (safePage - 1) * limit
    const pageItems = sessions.slice(skip, skip + limit)

    const inProgress = [] // We'll combine them in the main list

    const quizIds = Array.from(
      new Set(pageItems.map((item) => item.quiz_id.toString()))
    ).map((id) => new mongoose.Types.ObjectId(id))

    const quizzes = quizIds.length
      ? await Quiz.find(
          { _id: { $in: quizIds } },
          { title: 1, questions: 1, questionCount: 1, created_by: 1, is_saved_from_explore: 1, original_quiz_id: 1, course_code: 1, category_id: 1 }
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

    const history = pageItems.map((item) => {
      const quiz = quizMap.get(item.quiz_id.toString()) as any
      const isMixQuiz = (item as any).is_temp === true

      // For mix quiz sessions, the temp quiz may have been deleted after completion
      if (isMixQuiz && !quiz) {
        let answeredCount = 0
        let correctCount = 0
        if (Array.isArray(item.user_answers)) {
          answeredCount = new Set(
            item.user_answers
              .map((a) => a.question_index)
              .filter((idx) => Number.isInteger(idx) && idx >= 0)
          ).size
          correctCount = item.user_answers.filter((a) => a.is_correct).length
        }
        const totalQuestions = answeredCount || 0
        return {
          _id: item._id.toString(),
          quiz_id: item.quiz_id.toString(),
          quiz_title: 'Quiz Trộn',
          quiz_code: 'TRỘN',
          category_name: 'Quiz Trộn',
          source_type: 'mix_quiz',
          source_label: 'Quiz Trộn',
          source_creator_name: null,
          score: item.score,
          total_questions: totalQuestions,
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

      // Mix quiz: quiz still exists — use title-derived code and fixed labels
      if (isMixQuiz && quiz) {
        const declaredCount = Number(quiz?.questionCount ?? 0)
        const derivedCount = Array.isArray(quiz?.questions) ? quiz.questions.length : 0
        const totalQuestions = declaredCount > 0 ? declaredCount : derivedCount
        let answeredCount = 0
        let correctCount = 0
        if (Array.isArray(item.user_answers)) {
          answeredCount = new Set(
            item.user_answers
              .map((a) => a.question_index)
              .filter((idx) => Number.isInteger(idx) && idx >= 0)
          ).size
          correctCount = item.user_answers.filter((a) => a.is_correct).length
        }
        return {
          _id: item._id.toString(),
          quiz_id: item.quiz_id.toString(),
          quiz_title: quiz.title ?? 'Quiz Trộn',
          quiz_code: mixQuizDisplayCode(quiz.title ?? 'Quiz Trộn'),
          category_name: 'Quiz Trộn',
          source_type: 'mix_quiz',
          source_label: 'Quiz Trộn',
          source_creator_name: null,
          score: item.score,
          total_questions: totalQuestions,
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
      const sourceCreatorId = quiz?.is_saved_from_explore
        ? originalCreatorMap.get(quiz?.original_quiz_id?.toString?.() ?? '')
        : quiz?.created_by?.toString?.()

      const declaredCount = Number(quiz?.questionCount ?? 0)
      const derivedFromQuestions = Array.isArray(quiz?.questions)
        ? quiz.questions.length
        : 0
      const totalQuestions = declaredCount > 0 ? declaredCount : derivedFromQuestions

      let answeredCount = 0
      let correctCount = 0
      if (item.flashcard_stats) {
        answeredCount = item.flashcard_stats.cards_known + item.flashcard_stats.cards_unknown
        correctCount = item.flashcard_stats.cards_known
      } else if (Array.isArray(item.user_answers)) {
        answeredCount = new Set(
          item.user_answers
            .map((answer) => answer.question_index)
            .filter((idx) => Number.isInteger(idx) && idx >= 0)
        ).size
        correctCount = item.user_answers.filter((a) => a.is_correct).length
      }

      return {
        _id: item._id.toString(),
        quiz_id: item.quiz_id.toString(),
        quiz_title: quiz?.title ?? 'Quiz đã bị xóa',
        quiz_code: quiz?.course_code ?? 'N/A',
        category_name: quiz?.category_id ? (categoryNameMap.get(quiz.category_id.toString()) ?? 'Chưa phân loại') : 'Chưa phân loại',
        source_type: sourceType,
        source_label: sourceLabelFromType(sourceType),
        source_creator_name: sourceCreatorId ? creatorNameMap.get(sourceCreatorId) ?? null : null,
        score: item.score,
        total_questions: totalQuestions,
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
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
