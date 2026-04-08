import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import type { IQuestion } from '@/types/quiz'
import type { UserAnswer } from '@/types/session'

/**
 * GET /api/sessions/[id]/result
 * Returns the full result for a completed quiz session.
 * Requirements: 9.3, 12.2, 12.4
 */
export async function GET(
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

    // Verify session belongs to the requesting student
    if (session.student_id.toString() !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Req 12.4: return 403 if session is not completed
    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Session is not completed yet' },
        { status: 403 }
      )
    }

    const quiz = await Quiz.findById(session.quiz_id).lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const quizQuestions = (quiz.questions ?? []) as IQuestion[]
    const sessionAnswers = (session.user_answers ?? []) as UserAnswer[]

    // Build full result — include correct_answer and explanation (Req 12.2)
    const questions = quizQuestions.map((q: IQuestion, idx: number) => {
      const submitted = sessionAnswers.find((a: UserAnswer) => a.question_index === idx)
      const correctAnswerIndex = Array.isArray(q.correct_answer)
        ? q.correct_answer[0]
        : (q.correct_answer as unknown as number)

      return {
        _id: q._id,
        text: q.text,
        options: q.options,
        correct_answer: correctAnswerIndex,
        explanation: q.explanation,
        ...(q.image_url ? { image_url: q.image_url } : {}),
        submitted_answer: submitted?.answer_index ?? null,
        is_correct: submitted?.answer_index === correctAnswerIndex,
      }
    })

    return NextResponse.json(
      {
        sessionId: session._id,
        quizId: session.quiz_id,
        mode: session.mode,
        score: session.score,
        totalQuestions: quizQuestions.length,
        completed_at: session.completed_at,
        user_answers: sessionAnswers,
        questions,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/sessions/[id]/result error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
