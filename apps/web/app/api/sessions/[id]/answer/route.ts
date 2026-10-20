import { NextResponse } from 'next/server'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { getSessionRequestErrorResponse, validateQuizSessionRequest } from '@/lib/modules/quiz/session-utils'
import { SubmitAnswerSchema } from '@/lib/modules/quiz/schemas/quiz'
import { processImmediateAnswer, processReviewAnswer, getImmediateAnswerResult } from '@/lib/modules/quiz/quiz-engine'

function answerResponse(result: unknown, requestStart: number, sessionDuration: number, answerStart: number) {
  return NextResponse.json(result, {
    status: 200,
    headers: {
      'Server-Timing': `app;dur=${(performance.now() - requestStart).toFixed(1)}, session;dur=${sessionDuration.toFixed(1)}, answer;dur=${(performance.now() - answerStart).toFixed(1)}`,
    },
  })
}

type AnswerSubmission = { answerIndexes: number[]; questionIndex?: number }

async function parseAnswerSubmission(req: Request): Promise<{ data: AnswerSubmission } | { response: NextResponse }> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }
  const parsed = SubmitAnswerSchema.safeParse(body)
  if (!parsed.success) {
    return { response: NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 }) }
  }
  const { answer_index, answer_indexes, question_index } = parsed.data
  const answerIndexes = (answer_indexes && answer_indexes.length > 0 ? answer_indexes : undefined) ??
    (typeof answer_index === 'number' ? [answer_index] : [])
  return answerIndexes.length > 0
    ? { data: { answerIndexes, questionIndex: question_index } }
    : { response: NextResponse.json({ error: 'No answers submitted' }, { status: 400 }) }
}

function getAnswerSessionResponse(session: any): NextResponse | null {
  if (session.mode !== 'immediate' && session.mode !== 'review') {
    return NextResponse.json({ error: 'Unsupported session mode', code: 'SESSION_MODE_MISMATCH' }, { status: 409 })
  }
  return null
}

function isQuestionIndexOutOfBounds(targetIndex: number, totalQuestions: number) {
  return totalQuestions > 0 && (targetIndex < 0 || targetIndex >= totalQuestions)
}

function getSessionQuestionCount(session: any) {
  if (typeof session.question_count === 'number') return session.question_count
  if (Array.isArray(session.question_order)) return session.question_order.length
  return Array.isArray(session.questions_cache) ? session.questions_cache.length : 0
}

function getRequestedQuestionIndex(session: any, questionIndex?: number) {
  return typeof questionIndex === 'number' ? questionIndex : session.current_question_index
}

function getAnswerTarget(session: any, questionIndex?: number): number | NextResponse {
  const completedResponse = getCompletedSessionResponse(session)
  if (completedResponse) return completedResponse
  const targetIndex = getRequestedQuestionIndex(session, questionIndex)
  return getQuestionIndexResponse(session, targetIndex)
}

function getCompletedSessionResponse(session: any) {
  return session.status === 'completed'
    ? NextResponse.json({ error: 'Session already completed' }, { status: 409 })
    : null
}

function getQuestionIndexResponse(session: any, targetIndex: number): number | NextResponse {
  const totalQuestions = getSessionQuestionCount(session)
  if (isQuestionIndexOutOfBounds(targetIndex, totalQuestions)) {
    return NextResponse.json({ error: 'Question index out of bounds' }, { status: 400 })
  }
  return targetIndex
}

async function getCachedImmediateAnswer(
  session: any,
  targetIndex: number,
  requestStart: number,
  sessionDuration: number
) {
  if (session.mode !== 'immediate') return null
  const existingAnswer = session.user_answers?.find((answer: { question_index: number }) => answer.question_index === targetIndex)
  if (!existingAnswer) return null
  const answerStart = performance.now()
  const result = await getImmediateAnswerResult(session, targetIndex)
  return answerResponse(result, requestStart, sessionDuration, answerStart)
}

async function processSelectedAnswer(
  session: any,
  answerIndexes: number[],
  targetIndex: number,
  requestStart: number,
  sessionDuration: number
) {
  const answerStart = performance.now()
  const result = session.mode === 'immediate'
    ? await processImmediateAnswer(session, answerIndexes, targetIndex)
    : await processReviewAnswer(session, answerIndexes, targetIndex)
  return answerResponse(result, requestStart, sessionDuration, answerStart)
}

async function processValidatedAnswer(
  req: Request,
  session: any,
  requestStart: number,
  sessionDuration: number
) {
  const parsed = await parseAnswerSubmission(req)
  if ('response' in parsed) return parsed.response
  const targetIndex = getAnswerTarget(session, parsed.data.questionIndex)
  if (targetIndex instanceof NextResponse) return targetIndex
  const cachedResponse = await getCachedImmediateAnswer(session, targetIndex, requestStart, sessionDuration)
  if (cachedResponse) return cachedResponse
  return processSelectedAnswer(session, parsed.data.answerIndexes, targetIndex, requestStart, sessionDuration)
}

async function processAnswerRequest(req: Request, id: string, payload: JWTPayload, requestStart: number) {
  const sessionStart = performance.now()
  const validation = await validateQuizSessionRequest(id, payload, {
    requireActive: true,
    select: '_id student_id is_guest guest_id status expires_at mode current_question_index user_answers score questions_cache question_order answer_version quiz_id'
  })
  if (!validation.isValid) return validation.response
  const sessionDuration = performance.now() - sessionStart
  const session = validation.session
  const sessionResponse = getAnswerSessionResponse(session)
  if (sessionResponse) return sessionResponse
  return processValidatedAnswer(req, session, requestStart, sessionDuration)
}

function answerErrorResponse(err: unknown) {
  if (err instanceof Error && (err as Error & { code?: string }).code === 'ANSWER_CONFLICT') {
    return NextResponse.json({ error: 'Answer changed while saving. Please retry.', code: 'ANSWER_CONFLICT' }, { status: 409 })
  }
  if (err instanceof Error && (err as NodeJS.ErrnoException & { status?: number }).status === 409) {
    return NextResponse.json({ error: 'Session already completed' }, { status: 409 })
  }
  console.error('POST /api/sessions/[id]/answer error:', err)
  return getSessionRequestErrorResponse(err)
}

/**
 * POST /api/sessions/[id]/answer
 * Submits an answer for the current question in a quiz session.
 * Requirements: 7.1–7.4, 8.1–8.2, 13.1, 13.2, 13.6
 */
export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  const requestStart = performance.now()
  try {
    const { id } = await params
    return await processAnswerRequest(req, id, payload, requestStart)
  } catch (err) {
    return answerErrorResponse(err)
  }
}, { roles: ['student'], allowGuest: true })
