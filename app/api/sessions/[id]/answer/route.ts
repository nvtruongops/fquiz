import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { SubmitAnswerSchema } from '@/lib/modules/quiz/schemas/quiz'
import { processImmediateAnswer, processReviewAnswer } from '@/lib/modules/quiz/quiz-engine'

/**
 * POST /api/sessions/[id]/answer
 * Submits an answer for the current question in a quiz session.
 * Requirements: 7.1–7.4, 8.1–8.2, 13.1, 13.2, 13.6
 */
export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params

    const validation = await validateQuizSessionRequest(id, payload)
    if (!validation.isValid) return validation.response

    const session = validation.session

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

    // Req 13.6: reject if session already completed
    if (session.status === 'completed') {
      return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    }

    // [SECURITY FIX]: Use atomic update to prevent TOCTOU race condition
    const targetIndex = typeof question_index === 'number' ? question_index : session.current_question_index

    // Atomic: update only if this question hasn't been answered yet
    const updated = await QuizSession.findOneAndUpdate(
      { _id: id, 'user_answers.question_index': { $ne: targetIndex } },
      { $push: { user_answers: { question_index: targetIndex, answer_index: submittedAnswerIndexes[0], is_correct: false } } },
      { new: true }
    ).lean()

    if (!updated) {
      return NextResponse.json({ error: 'Câu hỏi này đã được ghi nhận câu trả lời.' }, { status: 400 })
    }

    // Reload session with full data for quiz engine
    const freshSession = await QuizSession.findById(id)
    if (!freshSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Delegate to quiz engine based on mode
    if (freshSession.mode === 'immediate') {
      const result = await processImmediateAnswer(freshSession, submittedAnswerIndexes, targetIndex)
      return NextResponse.json(result, { status: 200 })
    } else {
      // review mode
      const result = await processReviewAnswer(freshSession, submittedAnswerIndexes, targetIndex)
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
}, { roles: ['student'] })