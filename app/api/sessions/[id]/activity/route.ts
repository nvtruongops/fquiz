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

    const setPayload: Record<string, unknown> = {
      last_activity_at: new Date(),
    }

    const currentQuestionIndex = body.current_question_index
    if (typeof currentQuestionIndex === 'number' && Number.isInteger(currentQuestionIndex) && currentQuestionIndex >= 0) {
      setPayload.current_question_index = currentQuestionIndex
    }

    if (body.event === 'pause') {
      setPayload.paused_at = new Date()
    }

    if (body.event === 'resume') {
      setPayload.paused_at = null
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
