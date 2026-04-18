import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'

/**
 * POST /api/sessions/[id]/flashcard-review
 * Creates a new review session for unknown cards from a completed flashcard session
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

    // Get the original completed session
    const originalSession = await QuizSession.findById(id)
    if (!originalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (originalSession.student_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify it's a completed flashcard session
    if (originalSession.mode !== 'flashcard' || originalSession.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed flashcard sessions' },
        { status: 400 }
      )
    }

    // Check if there are unknown cards
    if (!originalSession.flashcard_stats || originalSession.flashcard_stats.cards_unknown === 0) {
      return NextResponse.json(
        { error: 'No unknown cards to review' },
        { status: 400 }
      )
    }

    // In flashcard mode: is_correct === false means 'unknown'
    // user_answers.question_index is the SESSION-level index (0, 1, 2...)
    // We need to map it through question_order to get the QUIZ-level index
    const originalQuestionOrder = originalSession.question_order || []
    const unknownSessionIndices = Array.isArray(originalSession.user_answers)
      ? originalSession.user_answers
          .filter((ans: any) => ans.is_correct === false)
          .map((ans: any) => ans.question_index)
      : []

    // Map session indices -> quiz indices via question_order
    const unknownQuizIndices = unknownSessionIndices
      .filter((idx: number) => idx >= 0 && idx < originalQuestionOrder.length)
      .map((sessionIdx: number) => originalQuestionOrder[sessionIdx])

    // If we somehow didn't track user_answers properly before,
    // fallback to original order. Otherwise, use ONLY the unknown indices!
    let questionOrderForReview = unknownQuizIndices.length > 0 
       ? unknownQuizIndices 
       : originalQuestionOrder

    // Shuffle the array to make review more difficult/dynamic
    questionOrderForReview = [...questionOrderForReview].sort(() => Math.random() - 0.5)
    
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Create a new flashcard session for review
    const reviewSession = await QuizSession.create({
      student_id: originalSession.student_id,
      quiz_id: originalSession.quiz_id,
      mode: 'flashcard',
      difficulty: 'random', // Shuffle for better learning
      status: 'active',
      current_question_index: 0,
      question_order: questionOrderForReview,
      user_answers: [],
      score: 0,
      flashcard_stats: {
        total_cards: questionOrderForReview.length,
        cards_known: 0,
        cards_unknown: 0,
        time_spent_ms: 0,
        current_round: (originalSession.flashcard_stats.current_round || 1) + 1,
      },
      expires_at: expiresAt,
      started_at: now,
      last_activity_at: now,
      paused_at: null,
      total_paused_duration_ms: 0,
    })

    return NextResponse.json(
      {
        sessionId: reviewSession._id,
        message: 'Review session created successfully',
        unknownCount: originalSession.flashcard_stats.cards_unknown,
        totalCards: questionOrderForReview.length,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/sessions/[id]/flashcard-review error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
