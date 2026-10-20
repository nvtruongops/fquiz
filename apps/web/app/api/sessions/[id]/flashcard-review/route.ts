import { NextResponse } from 'next/server'
import { secureShuffle } from '@/lib/core/utils/shuffle'
import { withQuizSessionRoute } from '@/lib/modules/quiz/session-route'
import { getSessionRequestErrorResponse } from '@/lib/modules/quiz/session-utils'

/**
 * POST /api/sessions/[id]/flashcard-review
 * Resets the current flashcard session to only include unknown cards.
 * Instead of creating a new session, we reuse the same session to keep history clean.
 */
export const POST = withQuizSessionRoute(async (_req, _id, session) => {
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

  const originalQuestionOrder = session.question_order || []
  const unknownSessionIndices: number[] = Array.isArray(session.user_answers)
    ? session.user_answers
        .filter((ans: any) => ans.is_correct === false)
        .map((ans: any) => ans.question_index)
    : []

  const unknownQuizIndices = unknownSessionIndices
    .filter((idx: number) => idx >= 0 && idx < originalQuestionOrder.length)
    .map((sessionIdx: number) => originalQuestionOrder[sessionIdx])
  const questionOrderForReview = secureShuffle(unknownQuizIndices.length > 0 ? unknownQuizIndices : originalQuestionOrder)
  const unknownCount = questionOrderForReview.length
  const nextRound = (session.flashcard_stats.current_round || 1) + 1

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
  session.expires_at = undefined

  await session.save()

  return NextResponse.json({
    sessionId: session._id,
    message: 'Session reset to unknown cards',
    unknownCount,
    totalCards: unknownCount,
    round: nextRound,
  }, { status: 200 })
}, { lean: false }, (err) => {
  console.error('POST /api/sessions/[id]/flashcard-review error:', err)
  return getSessionRequestErrorResponse(err)
})
