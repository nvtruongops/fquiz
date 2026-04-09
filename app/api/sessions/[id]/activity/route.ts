import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'

interface ActivityBody {
  event?: 'pause' | 'resume'
  current_question_index?: number
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (payload.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }

    let body: ActivityBody = {}
    try {
      body = (await req.json()) as ActivityBody
    } catch {
      body = {}
    }

    await connectDB()

    const session = await QuizSession.findById(id).lean()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.student_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    if (session.status !== 'active') {
      return NextResponse.json({ ok: true })
    }

    const now = new Date()
    const setPayload: Record<string, unknown> = {
      last_activity_at: now,
    }

    const currentQuestionIndex = body.current_question_index
    if (typeof currentQuestionIndex === 'number' && Number.isInteger(currentQuestionIndex) && currentQuestionIndex >= 0) {
      setPayload.current_question_index = currentQuestionIndex
    }

    // Handle pause event
    if (body.event === 'pause') {
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
}
