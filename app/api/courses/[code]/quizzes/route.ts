import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import logger from '@/lib/core/utils/logger'
import mongoose from 'mongoose'

export const GET = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ code: string }>; payload: JWTPayload }
) => {
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
      questionCount: q.questions?.length ?? 0,
      bestScore: scoreMap.get(q._id.toString()) ?? null,
    }))

    return NextResponse.json({ quizzes: result })
  } catch (err) {
    logger.error({ err }, `GET /api/courses/${code}/quizzes failed`)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}, { roles: ['student'] })