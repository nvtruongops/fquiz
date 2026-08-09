import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Category } from '@/lib/modules/quiz/models/Category'
import { User } from '@/lib/modules/auth/models/User'
import logger from '@/lib/core/utils/logger'
import mongoose from 'mongoose'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  try {
    await connectDB()

    // 1. Find category by exact match first (index hit), fallback to case-insensitive regex
    let category = await Category.findOne({
      $or: [{ name: code }, { name: code.toUpperCase() }],
    }).lean()

    if (!category) {
      const escapedCode = escapeRegex(code)
      category = await Category.findOne({
        name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
      }).lean()
    }

    let query: any = { is_public: true, status: 'published', is_temp: { $ne: true } }
    let categoryName = code.toUpperCase()

    if (category) {
      query.category_id = category._id
      categoryName = category.name
    } else {
      const escapedCode = escapeRegex(code)
      query.course_code = { $regex: new RegExp(`^${escapedCode}$`, 'i') }
    }

    const quizzes = await Quiz.find(
      query,
      { title: 1, questions: 1 }
    ).lean()

    // Try to resolve authenticated user (optional auth)
    let studentId: mongoose.Types.ObjectId | null = null
    try {
      const payload = await verifyToken(req)
      if (payload?.userId) {
        studentId = new mongoose.Types.ObjectId(payload.userId as string)
      }
    } catch {
      // No valid auth — continue as guest
    }

    const quizIds = quizzes.map((q) => q._id)
    let scoreMap = new Map<string, number>()

    let savedQuizIds: string[] = []
    let pinnedQuizIds: string[] = []
    let isCategoryPinned = false

    if (studentId) {
      // Fetch user's pinned categories and pinned quizzes
      const userDoc = (await User.findById(studentId).select('pinned_categories pinned_quizzes').lean()) as any
      if (userDoc) {
        pinnedQuizIds = userDoc.pinned_quizzes ?? []
        if (category?._id) {
          isCategoryPinned = (userDoc.pinned_categories ?? []).includes(category._id.toString())
        }
      }

      // Fetch best scores for all quizzes in one aggregation
      const bestScores: { _id: mongoose.Types.ObjectId; bestScore: number }[] =
        await QuizSession.aggregate([
          {
            $match: {
              student_id: studentId,
              quiz_id: { $in: quizIds },
              status: 'completed',
              mode: { $ne: 'flashcard' },
            },
          },
          {
            $group: {
              _id: '$quiz_id',
              bestScore: { $max: '$score' },
            },
          },
        ])
      scoreMap = new Map(bestScores.map((s) => [s._id.toString(), s.bestScore]))

      // Fetch saved quiz shortcuts for this student
      const savedShortcuts = await Quiz.find(
        {
          created_by: studentId,
          original_quiz_id: { $in: quizIds },
          is_saved_from_explore: true,
        },
        { original_quiz_id: 1 }
      ).lean()

      savedQuizIds = savedShortcuts
        .map((s) => s.original_quiz_id?.toString())
        .filter((id): id is string => Boolean(id))
    }

    const result = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      questionCount: q.questions?.length ?? 0,
      bestScore: scoreMap.get(q._id.toString()) ?? null,
    }))

    // Sort: Attempted quizzes (bestScore !== null) first, then unattempted, sorted naturally by title
    result.sort((a, b) => {
      const aDone = a.bestScore !== null
      const bDone = b.bestScore !== null
      if (aDone && !bDone) return -1
      if (!aDone && bDone) return 1
      return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json({
      categoryId: category?._id?.toString() ?? null,
      categoryName,
      quizzes: result,
      savedQuizIds,
      pinnedQuizIds,
      isCategoryPinned,
    })
  } catch (err) {
    logger.error({ err }, `GET /api/courses/${code}/quizzes failed`)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}