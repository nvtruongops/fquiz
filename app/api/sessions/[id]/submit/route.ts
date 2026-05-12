import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import type { UserAnswer } from '@/lib/modules/quiz/types/session'
import { calculateScore } from '@/lib/modules/quiz/quiz-engine'

/**
 * POST /api/sessions/[id]/submit
 * Finalize an active session and offload housekeeping to queue.
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

    const session = await QuizSession.findById(id).lean()
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.student_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    const quiz = await Quiz.findById(session.quiz_id).lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const questions = (quiz.questions ?? []) as IQuestion[]
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
}
