import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'

interface ActivityBody {
  event?: 'pause' | 'resume'
  current_question_index?: number
}

export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const validation = await validateQuizSessionRequest(id, payload)
    if (!validation.isValid) return validation.response

    const session = validation.session

    let body: ActivityBody = {}
    try {
      body = (await req.json()) as ActivityBody
    } catch {
      body = {}
    }

    if (session.status !== 'active') {
      return NextResponse.json({ ok: true })
    }

    const now = new Date()
    const setPayload: Record<string, unknown> = {
      last_activity_at: now,
    }

    // Only update current_question_index on pause (to save progress)
    // Never update on resume - the DB value is the source of truth
    if (body.event === 'pause') {
      const currentQuestionIndex = body.current_question_index
      if (typeof currentQuestionIndex === 'number' && Number.isInteger(currentQuestionIndex) && currentQuestionIndex >= 0) {
        setPayload.current_question_index = currentQuestionIndex
      }
      setPayload.paused_at = now
    }

    // Handle resume event - calculate paused duration
    if (body.event === 'resume') {
      // If there's a paused_at timestamp, calculate the pause duration
      if (session.paused_at) {
        const pausedDuration = now.getTime() - new Date(session.paused_at).getTime()
        const currentPausedTotal = session.total_paused_duration_ms || 0
        setPayload.total_paused_duration_ms = currentPausedTotal + pausedDuration
        setPayload.paused_at = null
      } 
      // Auto-detect pause: If last_activity was more than 5 minutes ago and no paused_at
      // This handles cases where user closed tab without proper pause event
      else if (session.last_activity_at) {
        const timeSinceLastActivity = now.getTime() - new Date(session.last_activity_at).getTime()
        const AUTO_PAUSE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
        
        if (timeSinceLastActivity > AUTO_PAUSE_THRESHOLD) {
          // Assume user was away, add the time to paused duration
          const currentPausedTotal = session.total_paused_duration_ms || 0
          setPayload.total_paused_duration_ms = currentPausedTotal + timeSinceLastActivity
        }
      }
    }

    await QuizSession.updateOne({ _id: session._id }, { $set: setPayload })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })