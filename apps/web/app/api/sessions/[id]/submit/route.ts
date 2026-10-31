import { NextResponse } from 'next/server'
import { withQuizSessionRoute } from '@/lib/modules/quiz/session-route'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { activeSessionWriteFilter, resolveEffectiveQuestionDeck, pruneCompletedSessions } from '@/lib/modules/quiz/session-utils'
import type { UserAnswer } from '@/lib/modules/quiz/types/session'
import { calculateScore } from '@/lib/modules/quiz/quiz-engine'

function getSubmissionStateResponse(session: any): NextResponse | null {
  return session.status === 'completed'
    ? buildCompletedSubmissionResponse(session)
    : getInactiveSubmissionResponse(session)
}

function buildCompletedSubmissionResponse(session: any) {
  return NextResponse.json({
    completed: true,
    score: session.score ?? 0,
    totalQuestions: Array.isArray(session.question_order)
      ? session.question_order.length
      : session.current_question_index ?? 0,
    isGuest: Boolean(session.is_guest),
  })
}

function getInactiveSubmissionResponse(session: any) {
  return session.status === 'active'
    ? null
    : NextResponse.json({ error: 'Session is not active' }, { status: 409 })
}

function getAnswerVersionFilter(session: any) {
  return session.answer_version === undefined
    ? { answer_version: { $exists: false } }
    : { answer_version: session.answer_version }
}

function buildCompletionUpdate(session: any, score: number, questionCount: number) {
  const set: Record<string, unknown> = {
    status: 'completed',
    score,
    current_question_index: questionCount,
    completed_at: new Date(),
  }
  const update: Record<string, any> = { $set: set }
  if (session.is_guest) set.expires_at = new Date(Date.now() + 86400000)
  else update.$unset = { expires_at: 1 }
  return update
}

function scheduleSessionCleanup(session: any) {
  if (!session.student_id) return
  pruneCompletedSessions(session.student_id, session.quiz_id, session.mode)
    .catch(err => console.error('Failed inline pruneCompletedSessions:', err))
}

async function completeSession(id: string, session: any): Promise<NextResponse> {
  const quiz = await Quiz.findById(session.quiz_id).select('questions question_refs').lean()
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const { questions, questionOrder } = await resolveEffectiveQuestionDeck(session, quiz)
  const score = calculateScore((session.user_answers ?? []) as UserAnswer[], questions, questionOrder)
  const completed = await QuizSession.findOneAndUpdate(
    {
      $and: [
        { _id: id, ...activeSessionWriteFilter() },
        getAnswerVersionFilter(session),
      ],
    },
    buildCompletionUpdate(session, score, questionOrder.length),
    { new: true }
  )
  if (!completed) {
    return NextResponse.json(
      { error: 'Session changed while submitting. Reload and try again.', code: 'SESSION_CHANGED' },
      { status: 409 }
    )
  }

  scheduleSessionCleanup(session)
  return NextResponse.json({
    completed: true,
    score,
    totalQuestions: questionOrder.length,
    isGuest: Boolean(session.is_guest),
  }, { status: 200 })
}

/**
 * POST /api/sessions/[id]/submit
 * Finalize an active session and perform post-submit housekeeping.
 */
export const POST = withQuizSessionRoute(async (_req, id, session) => {
  const stateResponse = getSubmissionStateResponse(session)
  if (stateResponse) return stateResponse
  return completeSession(id, session)
}, {}, (err) => {
  console.error('POST /api/sessions/[id]/submit error:', err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
})
