import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import { authorizeResource } from '@/lib/authz'

/**
 * GET /api/sessions/[id]/questions
 * Returns all questions for a quiz session based on mode.
 * - Immediate mode: includes correct_answer and explanation
 * - Review mode: excludes correct_answer and explanation
 * Requirements: 6.1, 12.1, 12.3
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

    const session = await authorizeResource(payload, id, QuizSession, 'session', 'student_id')
    
    // Check if session is expired
    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    const quiz = await Quiz.findById(session.quiz_id).select('questions').lean()
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const isCompleted = session.status === 'completed'
    const isImmediateMode = session.mode === 'immediate'
    const isFlashcardMode = session.mode === 'flashcard'

    // Get question order (use existing or create sequential)
    const questionOrder = session.question_order || Array.from({ length: quiz.questions.length }, (_, i) => i)

    // For immediate mode or completed sessions: include correct_answer and explanation
    // For review mode (active): exclude correct_answer and explanation
    const questions = questionOrder.map((originalIndex: number) => {
      const q = quiz.questions[originalIndex]
      const baseQuestion = {
        _id: q._id,
        text: q.text,
        options: q.options,
        answer_selection_count: Array.isArray(q.correct_answer)
          ? Math.min(Math.max(q.correct_answer.length, 1), q.options.length)
          : 1,
        ...(q.image_url ? { image_url: q.image_url } : {}),
      }

      // Include answers for immediate mode, completed sessions, or flashcard mode
      if (isImmediateMode || isCompleted || isFlashcardMode) {
        return {
          ...baseQuestion,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }
      }

      // Review mode (active): exclude answers
      return baseQuestion
    })

    return NextResponse.json(
      {
        sessionId: session._id,
        mode: session.mode,
        difficulty: session.difficulty,
        status: session.status,
        totalQuestions: questions.length,
        questions,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/sessions/[id]/questions error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
