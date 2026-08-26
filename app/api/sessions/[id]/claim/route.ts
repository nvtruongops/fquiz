import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { JWTPayload } from '@/lib/modules/auth/auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { pruneCompletedSessions } from '@/lib/modules/quiz/session-utils'
import { syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine'

/**
 * POST /api/sessions/[id]/claim
 * Associates an anonymous guest session with the currently authenticated user.
 */
export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    if (!payload.userId) {
      return NextResponse.json({ error: 'Authentication required to claim session' }, { status: 401 })
    }

    await connectDB()

    const session = await QuizSession.findById(id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only guest sessions can be claimed
    if (!session.is_guest && session.student_id?.toString() !== payload.userId) {
      return NextResponse.json({ error: 'This session is already linked to another account' }, { status: 403 })
    }

    const studentObjectId = new mongoose.Types.ObjectId(payload.userId)

    // Update session ownership
    session.student_id = studentObjectId
    session.is_guest = false
    session.guest_id = undefined

    // If session is completed, remove the 24h TTL so it persists in user history
    if (session.status === 'completed') {
      session.expires_at = undefined
    }

    await session.save()

    // Trigger housekeeping if completed
    if (session.status === 'completed' && session.quiz_id) {
      pruneCompletedSessions(studentObjectId, session.quiz_id, session.mode)
        .catch(err => console.error('Failed pruneCompletedSessions during claim:', err))

      syncUniqueStudentCount(session.quiz_id)
        .catch(err => console.error('Failed to sync student count during claim:', err))
    }

    return NextResponse.json({
      success: true,
      message: 'Session successfully claimed and added to your history',
      sessionId: session._id,
      quizId: session.quiz_id,
    }, { status: 200 })
  } catch (err) {
    console.error('POST /api/sessions/[id]/claim error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })
