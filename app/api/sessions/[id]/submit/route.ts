import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest, pruneCompletedSessions } from '@/lib/modules/quiz/session-utils'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import type { UserAnswer } from '@/lib/modules/quiz/types/session'
import { calculateScore, syncUniqueStudentCount } from '@/lib/modules/quiz/quiz-engine'

/**
 * POST /api/sessions/[id]/submit
 * Finalize an active session and perform post-submit housekeeping.
 */
export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const validation = await validateQuizSessionRequest(id, payload, { checkCompleted: true })
    if (!validation.isValid) return validation.response

    const session = validation.session

    const quiz = await Quiz.findById(session.quiz_id).lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const questions = (session.questions_cache?.length ? session.questions_cache : (quiz.questions ?? [])) as IQuestion[]
    const userAnswers = (session.user_answers ?? []) as UserAnswer[]
    const score = calculateScore(userAnswers, questions, session.question_order)

    const updateDoc: Record<string, any> = {
      $set: {
        status: 'completed',
        score,
        current_question_index: questions.length,
        completed_at: new Date(),
      },
    }

    if (!session.is_guest) {
      updateDoc.$unset = { expires_at: 1 }
    } else {
      // Keep 24h retention for completed guest sessions before auto-purge
      updateDoc.$set.expires_at = new Date(Date.now() + 86400000)
    }

    const completed = await QuizSession.findOneAndUpdate(
      {
        _id: id,
        status: { $ne: 'completed' },
      },
      updateDoc,
      { new: true }
    )

    if (!completed) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // Prune old completed sessions inline (for authenticated students)
    if (session.student_id) {
      pruneCompletedSessions(session.student_id, session.quiz_id, session.mode)
        .catch(err => console.error('Failed inline pruneCompletedSessions:', err))

      // Sync global unique student stats in background
      syncUniqueStudentCount(session.quiz_id)
        .catch(err => console.error('Failed to sync student count on submit:', err))
    }

    return NextResponse.json(
      {
        completed: true,
        score,
        totalQuestions: questions.length,
        isGuest: Boolean(session.is_guest),
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('POST /api/sessions/[id]/submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'], allowGuest: true })