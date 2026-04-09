import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import type { IQuestion } from '@/types/quiz'
import type { UserAnswer } from '@/types/session'
import { calculateScore, syncUniqueStudentCount } from '@/lib/quiz-engine'

const MAX_COMPLETED_ATTEMPTS_PER_QUIZ = 10

/**
 * POST /api/sessions/[id]/submit
 * Finalize an active session even when not all questions are answered.
 * Unanswered questions are counted as wrong because they are absent from user_answers.
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
      },
      { new: true }
    )

    if (!completed) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // Keep only the latest N completed attempts per student+quiz to control DB growth.
    const overflowAttempts = await QuizSession.find(
      {
        student_id: session.student_id,
        quiz_id: session.quiz_id,
        status: 'completed',
      },
      { _id: 1 }
    )
      .sort({ completed_at: -1, _id: -1 })
      .skip(MAX_COMPLETED_ATTEMPTS_PER_QUIZ)
      .lean()

    if (overflowAttempts.length > 0) {
      await QuizSession.deleteMany({
        _id: { $in: overflowAttempts.map((attempt) => attempt._id) },
      })
    }

    await syncUniqueStudentCount(session.quiz_id)

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
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
