import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest, pruneCompletedSessions } from '@/lib/modules/quiz/session-utils'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import type { UserAnswer } from '@/lib/modules/quiz/types/session'
import { calculateScore } from '@/lib/modules/quiz/quiz-engine'

/**
 * POST /api/sessions/[id]/submit
 * Finalize an active session and offload housekeeping to queue.
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

    const completed = await QuizSession.findOneAndUpdate(
      {
        _id: id,
        status: { $ne: 'completed' },
      },
      {
        $set: {
          status: 'completed',
          score,
          current_question_index: questions.length,
          completed_at: new Date(),
        },
        $unset: {
          expires_at: 1,
        },
      },
      { new: true }
    )

    if (!completed) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // Prune old completed sessions inline (guarantees retention limit even if QStash is offline)
    pruneCompletedSessions(session.student_id, session.quiz_id, session.mode)
      .catch(err => console.error('Failed inline pruneCompletedSessions:', err))

    // --- HEAVY OPERATIONS OFFLOADED TO QUEUE ---
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      const { publishJob } = await import('@/lib/core/queue/qstash')
      publishJob(`${appUrl}/api/jobs/quiz-post-submit`, {
        studentId: session.student_id,
        quizId: session.quiz_id
      }).catch(err => console.error('Failed to queue housekeeping:', err))
    } catch (e) {
      console.error('QStash module import failed:', e)
    }
    // -------------------------------------------

    return NextResponse.json(
      {
        completed: true,
        score,
        totalQuestions: questions.length,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('POST /api/sessions/[id]/submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'] })