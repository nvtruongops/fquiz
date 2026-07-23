import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Category } from '@/lib/modules/quiz/models/Category'
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

    const escapedCode = escapeRegex(code)

    // 1. Find category case-insensitively by name
    const category = await Category.findOne({
      name: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
    }).lean()

    let query: any = { status: 'published', is_temp: { $ne: true } }
    let categoryName = code.toUpperCase()

    if (category) {
      query.category_id = category._id
      categoryName = category.name
    } else {
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

    if (studentId) {
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
    }

    const result = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      questionCount: q.questions?.length ?? 0,
      bestScore: scoreMap.get(q._id.toString()) ?? null,
    }))

    return NextResponse.json({
      categoryId: category?._id?.toString() ?? null,
      categoryName,
      quizzes: result,
    })
  } catch (err) {
    logger.error({ err }, `GET /api/courses/${code}/quizzes failed`)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}