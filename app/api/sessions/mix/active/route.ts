import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'

/**
 * GET /api/sessions/mix/active
 * Check if the current user has an active temporary mix quiz session.
 */
export async function GET(req: Request) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const now = new Date()
    const studentId = new mongoose.Types.ObjectId(payload.userId)

    const activeSession = await QuizSession.findOne({
      student_id: studentId,
      is_temp: true,
      status: 'active',
      expires_at: { $gt: now },
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
        expires_at: activeSession.expires_at,
        status: activeSession.status,
      },
    })
  } catch (err) {
    console.error('GET /api/sessions/mix/active error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
