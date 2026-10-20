import { NextResponse } from 'next/server'
import { withQuizSessionRoute } from '@/lib/modules/quiz/session-route'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'

interface ActivityBody {
  event?: 'pause' | 'resume'
  current_question_index?: number
}

export const POST = withQuizSessionRoute(async (req, _id, session) => {
  let body: ActivityBody = {}
  try {
    body = (await req.json()) as ActivityBody
  } catch {
    body = {}
  }

  if (session.status !== 'active') return NextResponse.json({ ok: true })

  const now = new Date()
  const setPayload: Record<string, unknown> = { last_activity_at: now }
  if (body.event === 'pause') {
    const currentQuestionIndex = body.current_question_index
    if (typeof currentQuestionIndex === 'number' && Number.isInteger(currentQuestionIndex) && currentQuestionIndex >= 0) {
      setPayload.current_question_index = Math.max(session.current_question_index ?? 0, currentQuestionIndex)
    }
    setPayload.paused_at = now
  }

  const updateQuery: Record<string, any> = { $set: setPayload }
  if (body.event === 'resume' && session.paused_at) {
    const pausedDuration = Math.max(0, now.getTime() - new Date(session.paused_at).getTime())
    const currentPausedTotal = session.total_paused_duration_ms || 0
    setPayload.total_paused_duration_ms = currentPausedTotal + pausedDuration
    updateQuery.$unset = { paused_at: 1 }
  }

  await QuizSession.updateOne({ _id: session._id }, updateQuery)
  return NextResponse.json({ ok: true })
})
