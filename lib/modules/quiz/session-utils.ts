import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { JWTPayload } from '@/lib/modules/auth/auth'

export interface ValidateQuizSessionOptions {
  checkCompleted?: boolean
  checkExpired?: boolean
  lean?: boolean
}

export async function validateQuizSessionRequest(
  sessionId: string,
  payload: JWTPayload,
  options: ValidateQuizSessionOptions = {}
): Promise<
  | { isValid: true; session: any; response?: undefined }
  | { isValid: false; session?: undefined; response: NextResponse }
> {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Invalid session id' }, { status: 400 }),
    }
  }

  await connectDB()

  const lean = options.lean !== false
  const query = QuizSession.findById(sessionId)
  const session = await (lean ? query.lean() : query)

  if (!session) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Session not found' }, { status: 404 }),
    }
  }

  // Verify session belongs to the requesting student
  if (session.student_id.toString() !== payload.userId) {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  // Check expired status
  if (options.checkExpired !== false && session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    return {
      isValid: false,
      response: NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      ),
    }
  }

  // Check completed status
  if (options.checkCompleted && session.status === 'completed') {
    return {
      isValid: false,
      response: NextResponse.json({ error: 'Session already completed' }, { status: 409 }),
    }
  }

  return { isValid: true, session }
}

export const MAX_COMPLETED_SESSIONS_PER_QUIZ = 20

/**
 * Prunes older completed sessions for a given student, quiz, and mode group
 * if the total completed count exceeds MAX_COMPLETED_SESSIONS_PER_QUIZ.
 */
export async function pruneCompletedSessions(
  studentId: mongoose.Types.ObjectId | string,
  quizId: mongoose.Types.ObjectId | string,
  mode: string
): Promise<number> {
  try {
    await connectDB()
    const studentObjectId = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId
    const quizObjectId = typeof quizId === 'string' ? new mongoose.Types.ObjectId(quizId) : quizId

    const completedSessions = await QuizSession.find({
      student_id: studentObjectId,
      quiz_id: quizObjectId,
      mode,
      status: 'completed',
    })
      .sort({ completed_at: -1 })
      .select('_id')
      .lean()

    if (completedSessions.length > MAX_COMPLETED_SESSIONS_PER_QUIZ) {
      const toDeleteIds = completedSessions
        .slice(MAX_COMPLETED_SESSIONS_PER_QUIZ)
        .map((s: any) => s._id)

      const result = await QuizSession.deleteMany({ _id: { $in: toDeleteIds } })
      return result.deletedCount || 0
    }
    return 0
  } catch (err) {
    console.error('pruneCompletedSessions error:', err)
    return 0
  }
}

