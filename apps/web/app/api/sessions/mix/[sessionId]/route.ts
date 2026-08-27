import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'

/**
 * DELETE /api/sessions/mix/[sessionId]
 * Immediately delete a temporary mix quiz session and its associated temp quiz.
 * Called when user clicks "Thoát & Xóa Quiz" on the result page, or when creating a new mix quiz.
 */
export const DELETE = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ sessionId: string }>; payload: JWTPayload }
) => {
  try {
    const { sessionId } = await params
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    try {
      await connectDB()
    } catch {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const studentId = new mongoose.Types.ObjectId(payload.userId)

    // This is called when user clicks "Làm mới" to start a fresh mix quiz.
    const session = await QuizSession.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(sessionId),
      student_id: studentId,
      is_temp: true,
    }).lean() as any

    if (!session) {
      // Already deleted (TTL or race condition) — treat as success
      return NextResponse.json({ success: true })
    }

    // Delete the associated temp quiz
    if (session.quiz_id) {
      await Quiz.findOneAndDelete({
        _id: session.quiz_id,
        is_temp: true,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/sessions/mix/[sessionId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })