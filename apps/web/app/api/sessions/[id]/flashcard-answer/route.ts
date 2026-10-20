import { NextResponse } from 'next/server'
import type { JWTPayload } from '@/lib/modules/auth/auth'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import {
  activeSessionWriteFilter,
  resolveEffectiveQuestionAtIndex,
  resolveEffectiveQuestionOrder,
  validateQuizSessionRequest,
} from '@/lib/modules/quiz/session-utils'
import { z } from 'zod'

const FlashcardAnswerSchema = z.object({
  knows: z.boolean(),
  question_index: z.number().int().min(0).optional(),
})

type FlashcardAnswer = z.infer<typeof FlashcardAnswerSchema>
type FlashcardContext = {
  quiz: any
  quizMetadata: any
  categoryName: string
  questionOrder: number[]
  totalQuestions: number
  hasStoredQuestionOrder: boolean
}
type FlashcardResult<T> = { data: T } | { response: NextResponse }

async function parseFlashcardAnswer(req: Request): Promise<FlashcardResult<FlashcardAnswer>> {
  const body = await req.json().catch(() => null)
  const parsed = FlashcardAnswerSchema.safeParse(body)
  return parsed.success
    ? { data: parsed.data }
    : { response: NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 }) }
}

async function getNextQuestion(session: any, quiz: any, questionOrder: number[], nextIndex: number) {
  const actualIndex = questionOrder[nextIndex]
  const raw = actualIndex === undefined ? null : await resolveEffectiveQuestionAtIndex(session, quiz, actualIndex)
  if (!raw) return null
  return {
    _id: raw._id,
    text: raw.text,
    options: raw.options,
    correct_answer: raw.correct_answer,
    explanation: raw.explanation,
    answer_selection_count: Array.isArray(raw.correct_answer)
      ? Math.min(Math.max(raw.correct_answer.length, 1), raw.options.length)
      : 1,
    ...(raw.image_url ? { image_url: raw.image_url } : {}),
  }
}

function isValidFlashcardAnswer(answer: any, totalQuestions: number) {
  return isValidSessionIndex(answer?.question_index, totalQuestions) && typeof answer.is_correct === 'boolean'
}

function getInitialFlashcardStats(session: any, totalQuestions: number) {
  const answersByIndex = new Map<number, boolean>()
  const userAnswers = Array.isArray(session.user_answers) ? session.user_answers : []
  for (const answer of userAnswers) {
    if (isValidFlashcardAnswer(answer, totalQuestions)) {
      answersByIndex.set(answer.question_index, answer.is_correct)
    }
  }
  const answers = Array.from(answersByIndex.values())
  const cardsKnown = answers.filter(Boolean).length
  return {
    total_cards: totalQuestions,
    cards_known: cardsKnown,
    cards_unknown: answers.length - cardsKnown,
    time_spent_ms: 0,
    current_round: 1,
  }
}

function isCompletedAnswerRetry(session: any, input: FlashcardAnswer) {
  const completedIndex = input.question_index ?? session.current_question_index - 1
  const existingAnswer = session.user_answers?.find((answer: any) => answer.question_index === completedIndex)
  return completedIndex === session.current_question_index - 1 && existingAnswer?.is_correct === input.knows
}

function getCompletedFlashcardStats(session: any) {
  return {
    known: getKnownFlashcardCount(session),
    unknown: getUnknownFlashcardCount(session),
  }
}

function getKnownFlashcardCount(session: any) {
  return session.flashcard_stats?.cards_known ?? session.user_answers.filter((answer: any) => answer.is_correct).length
}

function getUnknownFlashcardCount(session: any) {
  return session.flashcard_stats?.cards_unknown ?? session.user_answers.length - getKnownFlashcardCount(session)
}

function getCompletedFlashcardResponse(session: any, input: FlashcardAnswer): NextResponse | null {
  if (session.status !== 'completed') return null
  return isCompletedAnswerRetry(session, input)
    ? buildCompletedFlashcardResponse(session, input)
    : NextResponse.json({ error: 'Session already completed' }, { status: 409 })
}

function buildCompletedFlashcardResponse(session: any, input: FlashcardAnswer) {
  const { known, unknown } = getCompletedFlashcardStats(session)
  return NextResponse.json({
    success: true,
    knows: input.knows,
    isLastQuestion: true,
    nextQuestionIndex: null,
    stats: {
      total: session.flashcard_stats?.total_cards ?? session.current_question_index,
      known,
      unknown,
    },
  })
}

async function loadSessionQuiz(session: any): Promise<FlashcardResult<any>> {
  if (Array.isArray(session.questions_cache) && session.questions_cache.length > 0) return { data: null }
  const quiz = await Quiz.findById(session.quiz_id)
    .select('title course_code questions question_refs category_id').lean() as any
  return quiz
    ? { data: quiz }
    : { response: NextResponse.json({ error: 'Quiz not found' }, { status: 404 }) }
}

async function loadQuizMetadata(session: any, quiz: any) {
  return quiz || await Quiz.findById(session.quiz_id).select('title course_code category_id').lean() as any
}

async function getCategoryName(quizMetadata: any) {
  if (!quizMetadata?.category_id) return 'Uncategorized'
  const category = await Category.findById(quizMetadata.category_id).select('name').lean() as any
  return getCategoryFallback(category)
}

function getCategoryFallback(category: any) {
  return category?.name || 'Uncategorized'
}

function hasStoredQuestionOrder(session: any, questionOrder: number[]) {
  return Array.isArray(session.question_order) &&
    session.question_order.length === questionOrder.length &&
    session.question_order.every((index: number, position: number) => index === questionOrder[position])
}

async function loadFlashcardContext(session: any): Promise<FlashcardResult<FlashcardContext>> {
  const quizResult = await loadSessionQuiz(session)
  if ('response' in quizResult) return quizResult
  const quiz = quizResult.data
  const quizMetadata = await loadQuizMetadata(session, quiz)
  const categoryName = await getCategoryName(quizMetadata)
  const questionOrder = resolveEffectiveQuestionOrder(session, quiz)
  return {
    data: {
      quiz,
      quizMetadata,
      categoryName,
      questionOrder,
      totalQuestions: questionOrder.length,
      hasStoredQuestionOrder: hasStoredQuestionOrder(session, questionOrder),
    },
  }
}

function hasPreviousAnswer(session: any, questionIndex: number) {
  return session.user_answers?.some((answer: any) => answer.question_index === questionIndex)
}

function isValidSessionIndex(index: number, totalQuestions: number) {
  return Number.isInteger(index) && index >= 0 && index < totalQuestions
}

function isValidQuestionIndex(session: any, currentIndex: number, totalQuestions: number, isCorrection: boolean) {
  return isValidSessionIndex(session.current_question_index, totalQuestions) &&
    isValidSessionIndex(currentIndex, totalQuestions) &&
    (isCorrection || currentIndex === session.current_question_index)
}

function getQuestionPosition(
  session: any,
  input: FlashcardAnswer,
  totalQuestions: number
): FlashcardResult<{ currentIndex: number; isCorrection: boolean; nextIndex: number; isLast: boolean }> {
  const currentIndex = input.question_index ?? session.current_question_index
  const isCorrection = isCorrectionRequest(session, input)
  const validationResponse = getQuestionPositionError(session, currentIndex, totalQuestions, isCorrection)
  if (validationResponse) return { response: validationResponse }
  return { data: buildFlashcardQuestionPosition(session, currentIndex, totalQuestions, isCorrection) }
}

function isCorrectionRequest(session: any, input: FlashcardAnswer) {
  return input.question_index !== undefined && input.question_index < session.current_question_index
}

function buildFlashcardQuestionPosition(session: any, currentIndex: number, totalQuestions: number, isCorrection: boolean) {
  const nextIndex = isCorrection ? session.current_question_index : currentIndex + 1
  const isLast = !isCorrection && nextIndex >= totalQuestions
  return { currentIndex, isCorrection, nextIndex, isLast }
}

function getQuestionPositionError(session: any, currentIndex: number, totalQuestions: number, isCorrection: boolean) {
  if (!isValidQuestionIndex(session, currentIndex, totalQuestions, isCorrection)) {
    return NextResponse.json({ error: 'Invalid question index' }, { status: 400 })
  }
  return getMissingPreviousAnswerResponse(session, currentIndex, isCorrection)
}

function getMissingPreviousAnswerResponse(session: any, currentIndex: number, isCorrection: boolean) {
  return isCorrection && !hasPreviousAnswer(session, currentIndex)
    ? NextResponse.json({ error: 'Answer not found for this question index' }, { status: 404 })
    : null
}

function isQuestionMissing(
  currentQuestion: any,
  nextQuestion: any,
  isCorrection: boolean,
  nextIndex: number,
  totalQuestions: number
) {
  return !currentQuestion || (!isCorrection && nextIndex < totalQuestions && !nextQuestion)
}

async function loadCurrentAndNextQuestion(
  session: any,
  context: FlashcardContext,
  position: { currentIndex: number; isCorrection: boolean; nextIndex: number }
): Promise<FlashcardResult<{ nextQuestion: any }>> {
  const currentQuestion = await loadCurrentQuestion(session, context, position.currentIndex)
  const nextQuestion = await loadNextQuestion(session, context, position)
  return isQuestionMissing(currentQuestion, nextQuestion, position.isCorrection, position.nextIndex, context.totalQuestions)
    ? { response: NextResponse.json({ error: 'Question not found' }, { status: 404 }) }
    : { data: { nextQuestion } }
}

async function loadCurrentQuestion(session: any, context: FlashcardContext, currentIndex: number) {
  const sourceIndex = context.questionOrder[currentIndex]
  return sourceIndex === undefined
    ? null
    : resolveEffectiveQuestionAtIndex(session, context.quiz, sourceIndex)
}

async function loadNextQuestion(
  session: any,
  context: FlashcardContext,
  position: { currentIndex: number; isCorrection: boolean; nextIndex: number }
) {
  return !position.isCorrection && position.nextIndex < context.totalQuestions
    ? getNextQuestion(session, context.quiz, context.questionOrder, position.nextIndex)
    : null
}

async function initializeFlashcardStats(id: string, session: any, context: FlashcardContext) {
  if (session.flashcard_stats) return
  await QuizSession.findOneAndUpdate(
    { _id: id, ...activeSessionWriteFilter(), flashcard_stats: null },
    { $set: {
      question_order: context.questionOrder,
      flashcard_stats: getInitialFlashcardStats(session, context.totalQuestions),
    }, $inc: { answer_version: 1 } }
  )
}

function flashcardStatsResponse(session: any, totalQuestions: number, knows: boolean, isLastQuestion: boolean, nextQuestionIndex: number | null) {
  return {
    success: true,
    knows,
    isLastQuestion,
    nextQuestionIndex,
    stats: {
      total: totalQuestions,
      known: session.flashcard_stats?.cards_known,
      unknown: session.flashcard_stats?.cards_unknown,
    },
  }
}

async function updateStoredQuestionOrder(
  id: string,
  freshSession: any,
  context: FlashcardContext
) {
  if (context.hasStoredQuestionOrder) return freshSession
  return await QuizSession.findOneAndUpdate(
    { _id: id, ...activeSessionWriteFilter() },
    { $set: { question_order: context.questionOrder, 'flashcard_stats.total_cards': context.totalQuestions }, $inc: { answer_version: 1 } },
    { new: true }
  ).lean() || freshSession
}

async function correctPreviousAnswer(
  id: string,
  context: FlashcardContext,
  input: FlashcardAnswer,
  currentIndex: number
) {
  const updated = await updatePreviousFlashcardAnswer(id, context, input, currentIndex)
  if (updated) {
    return NextResponse.json(flashcardStatsResponse(updated, context.totalQuestions, input.knows, false, updated.current_question_index))
  }
  return getPreviousFlashcardAnswerResponse(id, context, input, currentIndex)
}

async function updatePreviousFlashcardAnswer(
  id: string,
  context: FlashcardContext,
  input: FlashcardAnswer,
  currentIndex: number
) {
  const statsDelta = input.knows ? { cards_known: 1, cards_unknown: -1 } : { cards_known: -1, cards_unknown: 1 }
  return QuizSession.findOneAndUpdate(
    {
      _id: id,
      ...activeSessionWriteFilter(),
      user_answers: { $elemMatch: { question_index: currentIndex, is_correct: { $ne: input.knows } } },
    },
    {
      $set: {
        'user_answers.$.is_correct': input.knows,
        question_order: context.questionOrder,
        'flashcard_stats.total_cards': context.totalQuestions,
      },
      $inc: {
        'flashcard_stats.cards_known': statsDelta.cards_known,
        'flashcard_stats.cards_unknown': statsDelta.cards_unknown,
        answer_version: 1,
      },
    },
    { new: true }
  ).lean()
}

async function getPreviousFlashcardAnswerResponse(
  id: string,
  context: FlashcardContext,
  input: FlashcardAnswer,
  currentIndex: number
) {
  const freshSession = await QuizSession.findById(id).lean()
  if (!freshSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  const existingAnswer = freshSession.user_answers.find((answer: any) => answer.question_index === currentIndex)
  if (!existingAnswer) return NextResponse.json({ error: 'Answer not found for this question index' }, { status: 404 })
  const responseSession = await updateStoredQuestionOrder(id, freshSession, context)
  return NextResponse.json(flashcardStatsResponse(responseSession, context.totalQuestions, existingAnswer.is_correct, false, responseSession.current_question_index))
}

function buildUpdatedSessionData(updated: any, context: FlashcardContext, nextQuestion: any) {
  if (!context.quizMetadata) return undefined
  return {
    session: {
      _id: updated._id,
      mode: updated.mode,
      status: updated.status,
      current_question_index: updated.current_question_index,
      totalQuestions: context.totalQuestions,
      user_answers: updated.user_answers,
      courseCode: context.quizMetadata.course_code,
      categoryName: context.categoryName,
      title: context.quizMetadata.title,
      started_at: updated.started_at,
      paused_at: updated.paused_at,
      total_paused_duration_ms: updated.total_paused_duration_ms,
      flashcard_stats: updated.flashcard_stats,
    },
    question: nextQuestion,
  }
}

function getFlashcardCompletionFields(isLast: boolean) {
  return isLast ? { status: 'completed', completed_at: new Date(), expires_at: null } : {}
}

function getFlashcardCountDelta(knows: boolean) {
  return {
    cards_known: knows ? 1 : 0,
    cards_unknown: knows ? 0 : 1,
  }
}

async function recordNewAnswer(
  id: string,
  context: FlashcardContext,
  input: FlashcardAnswer,
  position: { currentIndex: number; nextIndex: number; isLast: boolean },
  nextQuestion: any
) {
  const updated = await insertNewFlashcardAnswer(id, context, input, position)
  return getNewFlashcardAnswerResponse(updated, context, input, position, nextQuestion)
}

async function insertNewFlashcardAnswer(
  id: string,
  context: FlashcardContext,
  input: FlashcardAnswer,
  position: { currentIndex: number; nextIndex: number; isLast: boolean }
) {
  const countDelta = getFlashcardCountDelta(input.knows)
  return QuizSession.findOneAndUpdate(
    { _id: id, ...activeSessionWriteFilter(), 'user_answers.question_index': { $ne: position.currentIndex } },
    {
      $push: { user_answers: { question_index: position.currentIndex, answer_index: -1, is_correct: input.knows } },
      $set: {
        question_order: context.questionOrder,
        'flashcard_stats.total_cards': context.totalQuestions,
        current_question_index: position.nextIndex,
        last_activity_at: new Date(),
        ...getFlashcardCompletionFields(position.isLast),
      },
      $inc: {
        'flashcard_stats.cards_known': countDelta.cards_known,
        'flashcard_stats.cards_unknown': countDelta.cards_unknown,
        answer_version: 1,
      },
    },
    { new: true }
  )
}

function getNewFlashcardAnswerResponse(
  updated: any,
  context: FlashcardContext,
  input: FlashcardAnswer,
  position: { currentIndex: number; nextIndex: number; isLast: boolean },
  nextQuestion: any
) {
  if (!updated) {
    return NextResponse.json({ error: 'This flashcard has already been answered or session is not active' }, { status: 400 })
  }
  return buildRecordedFlashcardAnswerResponse(updated, context, input, position, nextQuestion)
}

function buildRecordedFlashcardAnswerResponse(
  updated: any,
  context: FlashcardContext,
  input: FlashcardAnswer,
  position: { currentIndex: number; nextIndex: number; isLast: boolean },
  nextQuestion: any
) {
  return NextResponse.json({
    success: true,
    knows: input.knows,
    isLastQuestion: position.isLast,
    nextQuestionIndex: getNextFlashcardQuestionIndex(position),
    stats: getRecordedFlashcardStats(updated, context.totalQuestions),
    updatedData: buildUpdatedSessionData(updated, context, nextQuestion),
  })
}

function getNextFlashcardQuestionIndex(position: { nextIndex: number; isLast: boolean }) {
  return position.isLast ? null : position.nextIndex
}

function getRecordedFlashcardStats(updated: any, totalQuestions: number) {
  return {
    total: totalQuestions,
    known: getRecordedKnownCount(updated),
    unknown: getRecordedUnknownCount(updated),
  }
}

function getRecordedKnownCount(updated: any) {
  return updated.flashcard_stats?.cards_known ?? 0
}

function getRecordedUnknownCount(updated: any) {
  return updated.flashcard_stats?.cards_unknown ?? 0
}

async function processActiveFlashcardAnswer(
  id: string,
  session: any,
  context: FlashcardContext,
  input: FlashcardAnswer
) {
  const positionResult = getQuestionPosition(session, input, context.totalQuestions)
  if ('response' in positionResult) return positionResult.response
  const position = positionResult.data
  const questionResult = await loadCurrentAndNextQuestion(session, context, position)
  if ('response' in questionResult) return questionResult.response
  await initializeFlashcardStats(id, session, context)
  return position.isCorrection
    ? correctPreviousAnswer(id, context, input, position.currentIndex)
    : recordNewAnswer(id, context, input, position, questionResult.data.nextQuestion)
}

function getFlashcardSessionResponse(session: any, input: FlashcardAnswer) {
  if (session.mode !== 'flashcard') return NextResponse.json({ error: 'Not a flashcard session' }, { status: 400 })
  const completedResponse = getCompletedFlashcardResponse(session, input)
  if (completedResponse) return completedResponse
  if (session.status !== 'active') return NextResponse.json({ error: 'Session is not active' }, { status: 409 })
  return null
}

async function processFlashcardAnswer(
  id: string,
  payload: JWTPayload,
  input: FlashcardAnswer
) {
  const validation = await validateQuizSessionRequest(id, payload)
  if (!validation.isValid) return validation.response
  const { session } = validation
  const sessionResponse = getFlashcardSessionResponse(session, input)
  if (sessionResponse) return sessionResponse
  const contextResult = await loadFlashcardContext(session)
  if ('response' in contextResult) return contextResult.response
  return processActiveFlashcardAnswer(id, session, contextResult.data, input)
}

export const POST = withAuth(async (
  req: Request,
  { params, payload }: { params: Promise<{ id: string }>; payload: JWTPayload }
) => {
  try {
    const { id } = await params
    const inputResult = await parseFlashcardAnswer(req)
    if ('response' in inputResult) return inputResult.response
    return await processFlashcardAnswer(id, payload, inputResult.data)
  } catch (err) {
    console.error('POST /api/sessions/[id]/flashcard-answer error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { roles: ['student'], allowGuest: true })
