import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'

/**
 * POST /api/sessions/[id]/flashcard-review
 * Resets the current flashcard session to only include unknown cards.
 * Instead of creating a new session, we reuse the same session to keep history clean.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (payload.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }

    await connectDB()

    const session = await QuizSession.findById(id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.student_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.mode !== 'flashcard' || session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed flashcard sessions' },
        { status: 400 }
      )
    }

    if (!session.flashcard_stats || session.flashcard_stats.cards_unknown === 0) {
      return NextResponse.json(
        { error: 'No unknown cards to review' },
        { status: 400 }
      )
    }

    // Map unknown session indices → quiz-level indices via question_order
    const originalQuestionOrder = session.question_order || []
    const unknownSessionIndices: number[] = Array.isArray(session.user_answers)
      ? session.user_answers
          .filter((ans: any) => ans.is_correct === false)
          .map((ans: any) => ans.question_index)
      : []

    const unknownQuizIndices = unknownSessionIndices
      .filter((idx: number) => idx >= 0 && idx < originalQuestionOrder.length)
      .map((sessionIdx: number) => originalQuestionOrder[sessionIdx])

    // Fallback: if tracking was broken, use full original order
    let questionOrderForReview = unknownQuizIndices.length > 0
      ? unknownQuizIndices
      : originalQuestionOrder

    // Shuffle for better learning
    questionOrderForReview = [...questionOrderForReview].sort(() => Math.random() - 0.5)

    const unknownCount = questionOrderForReview.length
    const nextRound = (session.flashcard_stats.current_round || 1) + 1

    // Reset the SAME session — no new session created
    session.status = 'active'
    session.current_question_index = 0
    session.question_order = questionOrderForReview
    session.user_answers = []
    session.score = 0
    session.completed_at = undefined
    session.last_activity_at = new Date()
    session.flashcard_stats = {
      total_cards: unknownCount,
      cards_known: 0,
      cards_unknown: 0,
      time_spent_ms: 0,
      current_round: nextRound,
    }
    // Keep session alive indefinitely (no expires_at for flashcard)
    session.expires_at = undefined

    await session.save()

    return NextResponse.json(
      {
        sessionId: session._id,
        message: 'Session reset to unknown cards',
        unknownCount,
        totalCards: unknownCount,
        round: nextRound,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('POST /api/sessions/[id]/flashcard-review error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
