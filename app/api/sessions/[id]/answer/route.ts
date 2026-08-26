import { NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { SubmitAnswerSchema } from '@/lib/modules/quiz/schemas/quiz'
import { processImmediateAnswer, processReviewAnswer, getImmediateAnswerResult } from '@/lib/modules/quiz/quiz-engine'

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

    const targetIndex = typeof question_index === 'number' ? question_index : session.current_question_index
    const totalQuestions = session.question_count ?? session.question_order?.length ?? session.questions_cache?.length ?? 0

    if (totalQuestions > 0 && (targetIndex < 0 || targetIndex >= totalQuestions)) {
      return NextResponse.json({ error: 'Question index out of bounds' }, { status: 400 })
    }

    // In immediate mode:
    // If this question was already answered, return cached result read-only without side-effects (200 OK)
    if (session.mode === 'immediate') {
      const existingAnswer = session.user_answers?.find((a: { question_index: number }) => a.question_index === targetIndex)
      if (existingAnswer) {
        const result = await getImmediateAnswerResult(session, targetIndex)
        return NextResponse.json(result, { status: 200 })
      }
    }

    // Delegate to quiz engine based on mode (processImmediateAnswer & processReviewAnswer handle atomic upsert via OCC)
    if (session.mode === 'immediate') {
      const result = await processImmediateAnswer(session, submittedAnswerIndexes, targetIndex)
      return NextResponse.json(result, { status: 200 })
    } else {
      // review mode allows changing/updating answers before final submission
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
}, { roles: ['student'], allowGuest: true })