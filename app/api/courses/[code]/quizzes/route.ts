import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import logger from '@/lib/logger'
import mongoose from 'mongoose'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const payload = await verifyToken(req)
  if (!payload || payload.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await params

  try {
    await connectDB()

    const quizzes = await Quiz.find(
      { course_code: code, status: 'published' },
      { title: 1, questions: 1 }
    ).lean()

    const studentId = new mongoose.Types.ObjectId(payload.userId)

    // Fetch best scores for all quizzes in one aggregation
    const quizIds = quizzes.map((q) => q._id)
    const bestScores: { _id: mongoose.Types.ObjectId; bestScore: number }[] =
      await QuizSession.aggregate([
        {
          $match: {
            student_id: studentId,
            quiz_id: { $in: quizIds },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: '$quiz_id',
            bestScore: { $max: '$score' },
          },
        },
      ])

    const scoreMap = new Map(bestScores.map((s) => [s._id.toString(), s.bestScore]))

    const result = quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      questionCount: q.questions.length,
      bestScore: scoreMap.get(q._id.toString()) ?? null,
    }))

    return NextResponse.json({ quizzes: result })
  } catch (err) {
    logger.error({ err }, `GET /api/courses/${code}/quizzes failed`)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
