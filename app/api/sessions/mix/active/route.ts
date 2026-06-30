import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'

/**
 * GET /api/sessions/mix/active
 * Check if the current user has an active temporary mix quiz session.
 * Sessions no longer have a TTL — they persist until completed or manually deleted.
 */
export const GET = withAuth(async (req: Request, { payload }) => {
  try {
    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const studentId = new mongoose.Types.ObjectId(payload.userId)

    // No expires_at filter — session lives until completed or deleted
    const activeSession = await QuizSession.findOne({
      student_id: studentId,
      is_temp: true,
      status: 'active',
    })
      .sort({ started_at: -1 })
      .lean() as any

    if (!activeSession) {
      return NextResponse.json({ hasActive: false })
    }

    const quiz = await Quiz.findById(activeSession.quiz_id)
      .select('title questionCount')
      .lean() as any

    return NextResponse.json({
      hasActive: true,
      session: {
        sessionId: activeSession._id,
        quizId: activeSession.quiz_id,
        title: quiz?.title ?? 'Quiz Trộn',
        question_count: quiz?.questionCount ?? 0,
        mode: activeSession.mode,
        status: activeSession.status,
      },
    })
  } catch (err) {
    console.error('GET /api/sessions/mix/active error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })