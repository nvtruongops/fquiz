import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyToken } from '@/lib/modules/auth/auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { SubmitAnswerSchema } from '@/lib/modules/quiz/schemas/quiz'
import { processImmediateAnswer, processReviewAnswer } from '@/lib/modules/quiz/quiz-engine'

/**
 * POST /api/sessions/[id]/answer
 * Submits an answer for the current question in a quiz session.
 * Requirements: 7.1–7.4, 8.1–8.2, 13.1, 13.2, 13.6
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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = SubmitAnswerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { answer_index, answer_indexes, question_index } = parsed.data
    const submittedAnswerIndexes =
      (answer_indexes && answer_indexes.length > 0 ? answer_indexes : undefined) ??
      (typeof answer_index === 'number' ? [answer_index] : [])

    if (submittedAnswerIndexes.length === 0) {
      return NextResponse.json({ error: 'No answers submitted' }, { status: 400 })
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

    if (session.status === 'active' && session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Session expired. Please start a new attempt.', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    // Req 13.6: reject if session already completed
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // [SECURITY FIX]: Prevent re-answering a question that already has an answer in the session
    // This is critical for immediate mode where the answer is revealed.
    const targetIndex = typeof question_index === 'number' ? question_index : session.current_question_index
    const alreadyAnswered = session.user_answers.some(a => a.question_index === targetIndex)
    if (alreadyAnswered) {
      return NextResponse.json({ error: 'Câu hỏi này đã được ghi nhận câu trả lời.' }, { status: 400 })
    }

    // Delegate to quiz engine based on mode
    if (session.mode === 'immediate') {
      const result = await processImmediateAnswer(session, submittedAnswerIndexes, targetIndex)
      return NextResponse.json(result, { status: 200 })
    } else {
      // review mode
      const result = await processReviewAnswer(session, submittedAnswerIndexes, targetIndex)
      return NextResponse.json(result, { status: 200 })
    }
  } catch (err) {
    // Handle race condition: session completed concurrently
    if (err instanceof Error && (err as NodeJS.ErrnoException & { status?: number }).status === 409) {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }
    console.error('POST /api/sessions/[id]/answer error:', err)
    if (err instanceof Error && err.message.includes('MongoDB connection failed')) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
