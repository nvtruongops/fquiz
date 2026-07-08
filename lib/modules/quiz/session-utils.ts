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
