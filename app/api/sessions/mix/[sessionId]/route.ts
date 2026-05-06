import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'

/**
 * DELETE /api/sessions/mix/[sessionId]
 * Immediately delete a temporary mix quiz session and its associated temp quiz.
 * Called when user clicks "Thoát & Xóa Quiz" on the result page, or when creating a new mix quiz.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
}
