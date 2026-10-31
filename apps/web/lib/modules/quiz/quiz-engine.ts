import mongoose from 'mongoose'
import type { IQuizSession, UserAnswer } from '@/lib/modules/quiz/types/session'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { normalizeIndexes, isExactArrayMatch } from '@/lib/core/utils/array-utils'
import {
  activeSessionWriteFilter,
  resolveEffectiveQuestionAtIndex,
  resolveEffectiveQuestionOrder,
} from '@/lib/modules/quiz/session-utils'

export interface ImmediateAnswerResult {
  isCorrect: boolean
  answerIndexes: number[]
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

export interface ReviewAnswerResult {
  answerIndexes?: number[]
  answerRevision?: number
  nextQuestion?: Omit<IQuestion, 'correct_answer' | 'explanation'>
  completed?: boolean

}

export async function syncUniqueStudentCount(quizId: any): Promise<void> {
  if (!quizId) return
  const objectId = typeof quizId === 'string' && mongoose.Types.ObjectId.isValid(quizId)
    ? new mongoose.Types.ObjectId(quizId)
    : quizId

  const counts = await QuizSession.aggregate([
    { $match: { quiz_id: objectId } },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$is_guest', true] },
            { $ifNull: ['$guest_id', '$_id'] },
            { $ifNull: ['$student_id', '$_id'] },
          ],
        },
      },
    },
    { $count: 'total' },
  ])

  const totalCount = counts?.[0]?.total || 0

  await Quiz.updateOne(
    { _id: objectId },
    { $set: { studentCount: totalCount } }
  )
}

function upsertAnswer(userAnswers: UserAnswer[], incoming: UserAnswer): UserAnswer[] {
  const nextAnswers = userAnswers.filter((a) => a.question_index !== incoming.question_index)
  nextAnswers.push(incoming)
  return nextAnswers
}

interface PersistAnswerOptions {
  updateScore: boolean
  isLast: boolean
  nextIndex: number
  questionIndex: number
  isCorrect: boolean
  insertOnly?: boolean
  answerRevision?: number
}

function isAnswerConflict(err: unknown): err is Error & { status: number; code: string } {
  return err instanceof Error &&
    (err as Error & { code?: string }).code === 'ANSWER_CONFLICT'
}

function calculateScoreDelta(isCorrect: boolean, previousAnswer: UserAnswer | undefined): number {
  if (isCorrect && (!previousAnswer || !previousAnswer.is_correct)) return 1
  if (!isCorrect && previousAnswer && previousAnswer.is_correct) return -1
  return 0
}

function getDuplicateInsertResult(currentSession: any, existingAnswer: UserAnswer | undefined, insertOnly: boolean) {
  if (insertOnly && existingAnswer) {
    return { success: true, score: currentSession.score ?? null, answer: existingAnswer }
  }
  return null
}

function buildUpdatedAnswers(currentSession: any, userAnswer: UserAnswer, insertOnly: boolean) {
  if (!insertOnly && userAnswer.answer_indexes?.length === 0) {
    return (currentSession.user_answers || []).filter((answer: UserAnswer) => answer.question_index !== userAnswer.question_index)
  }
  return insertOnly
    ? [...(currentSession.user_answers || []), userAnswer]
    : upsertAnswer(currentSession.user_answers || [], userAnswer)
}

function getUpdatedScore(currentSession: any, options: PersistAnswerOptions, existingAnswer: UserAnswer | undefined) {
  if (!options.updateScore) return null
  const scoreDelta = calculateScoreDelta(options.isCorrect, existingAnswer)
  return (currentSession.score || 0) + scoreDelta
}

function getTargetNextIndex(isLast: boolean, questionIndex: number, nextIndex: number) {
  return isLast ? questionIndex : nextIndex
}

function buildAnswerPersistenceUpdate(
  currentSession: any,
  updatedAnswers: UserAnswer[],
  options: PersistAnswerOptions,
  score: number | null
) {
  const targetNextIndex = getTargetNextIndex(options.isLast, options.questionIndex, options.nextIndex)
  return {
    $set: {
      user_answers: updatedAnswers,
      ...(options.answerRevision !== undefined ? { [`answer_revisions.${options.questionIndex}`]: options.answerRevision } : {}),
      current_question_index: Math.max(currentSession.current_question_index ?? 0, targetNextIndex),
      ...(options.updateScore ? { score } : {}),
      last_activity_at: new Date(),
      paused_at: null,
    },
    $inc: { answer_version: 1 },
  }
}

function getVersionFilter(cv: number | undefined) {
  return cv === undefined
    ? { answer_version: { $exists: false } }
    : { answer_version: cv }
}

function answerIntentConflict() {
  return Object.assign(new Error('A newer answer intent is already saved. Select the answer again to make a new change.'),
    { status: 409, code: 'ANSWER_CONFLICT' })
}

function getPersistedAnswerRevision(revisions: any, questionIndex: number): number | undefined {
  return revisions instanceof Map ? revisions.get(String(questionIndex)) : revisions?.[questionIndex]
}

function getAnswerIndexes(answer: UserAnswer | undefined): number[] {
  return answer ? answer.answer_indexes ?? [answer.answer_index] : []
}

function getRevisionAcknowledgement(currentSession: any, options: PersistAnswerOptions, incoming: UserAnswer, existing: UserAnswer | undefined) {
  const revision = getPersistedAnswerRevision(currentSession.answer_revisions, options.questionIndex)
  if (revision === undefined) return null
  if (options.answerRevision === revision && isExactArrayMatch(getAnswerIndexes(incoming), getAnswerIndexes(existing))) {
    return { success: true, score: currentSession.score ?? null, answer: existing ?? incoming }
  }
  if (options.answerRevision === undefined || options.answerRevision <= revision) throw answerIntentConflict()
  return null
}

function getRevisionWriteFilter(options: PersistAnswerOptions) {
  const path = `answer_revisions.${options.questionIndex}`
  return options.answerRevision === undefined
    ? { [path]: { $exists: false } }
    : { $or: [{ [path]: { $exists: false } }, { [path]: { $lt: options.answerRevision } }] }
}

async function tryPersistAnswerIteration(
  sessionId: string | mongoose.Types.ObjectId,
  userAnswer: UserAnswer,
  options: PersistAnswerOptions,
  select: string,
  providedSession?: any
): Promise<{ success: boolean; score: number | null; answer: UserAnswer }> {
  const { questionIndex } = options
  const insertOnly = options.insertOnly ?? false
  const currentSession = providedSession || await QuizSession.findById(sessionId).select(select).lean()
  if (!currentSession) throw new Error('Session not found')

  const existingAnswer = (currentSession.user_answers || []).find(
    (answer: UserAnswer) => answer.question_index === questionIndex
  )
  const revisionAcknowledgement = !insertOnly ? getRevisionAcknowledgement(currentSession, options, userAnswer, existingAnswer) : null
  if (revisionAcknowledgement) return revisionAcknowledgement
  const duplicateResult = getDuplicateInsertResult(currentSession, existingAnswer, insertOnly)
  if (duplicateResult) return duplicateResult

  const updatedAnswers = buildUpdatedAnswers(currentSession, userAnswer, insertOnly)
  const score = getUpdatedScore(currentSession, options, existingAnswer)
  const versionFilter = getVersionFilter(currentSession.answer_version)

  const result = await QuizSession.updateOne(
    { $and: [{ _id: sessionId }, activeSessionWriteFilter(), versionFilter, ...(!insertOnly ? [getRevisionWriteFilter(options)] : [])] },
    buildAnswerPersistenceUpdate(currentSession, updatedAnswers, options, score)
  )

  return {
    success: result.modifiedCount === 1,
    score,
    answer: userAnswer,
  }
}

async function persistAnswerWithOCC(
  sessionId: string | mongoose.Types.ObjectId,
  userAnswer: UserAnswer,
  options: PersistAnswerOptions,
  cachedSession?: any
): Promise<{ score: number | null; answer: UserAnswer }> {
  const select = options.updateScore
    ? 'answer_version answer_revisions user_answers score current_question_index'
    : 'answer_version answer_revisions user_answers current_question_index'
  let retries = 3
  while (retries > 0) {
    const sessionToUse = retries === 3 && cachedSession?.answer_version !== undefined && options.answerRevision === undefined ? cachedSession : undefined
    const { success, score, answer } = await tryPersistAnswerIteration(
      sessionId,
      userAnswer,
      options,
      select,
      sessionToUse
    )
    if (success) return { score, answer }
    retries--
    if (retries === 0) {
      throw Object.assign(
        new Error('Failed to update answer after retries (concurrent modification)'),
        { status: 409, code: 'ANSWER_CONFLICT' }
      )
    }
  }
  return { score: null, answer: userAnswer }
}

async function resolveQuestion(
  session: IQuizSession,
  questionIndex: number
): Promise<{ question: IQuestion; totalQuestions: number; questionOrder: number[] }> {
  const hasCachedQuestions = Array.isArray(session.questions_cache) && session.questions_cache.length > 0
  const quiz = hasCachedQuestions
    ? null
    : await Quiz.findById(session.quiz_id).select('questions question_refs').lean() as any
  if (!hasCachedQuestions && !quiz) throw new Error('Quiz not found')

  const questionOrder = resolveEffectiveQuestionOrder(session, quiz)
  const actualQuestionIndex = questionOrder[questionIndex]
  const question = actualQuestionIndex === undefined
    ? null
    : await resolveEffectiveQuestionAtIndex(session, quiz, actualQuestionIndex)

  if (!question) {
    throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
  }

  return { question, totalQuestions: questionOrder.length, questionOrder }
}

function prepareSubmittedAnswer(
  question: IQuestion,
  questionIndex: number,
  submittedAnswerIndexes: number[],
  totalQuestions: number
) {
  const correctAnswerIndexes = normalizeIndexes(
    Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]
  )
  const submittedIndexes = normalizeIndexes(submittedAnswerIndexes)
  const isCorrect = isExactArrayMatch(submittedIndexes, correctAnswerIndexes)
  const nextIndex = questionIndex + 1

  return {
    correctAnswerIndexes,
    submittedIndexes,
    isCorrect,
    nextIndex,
    isLastQuestion: nextIndex >= totalQuestions,
    userAnswer: {
      question_index: questionIndex,
      answer_index: submittedIndexes[0],
      answer_indexes: submittedIndexes,
      is_correct: isCorrect,
    } satisfies UserAnswer,
  }
}

/**
 * Immediate mode: persist answer to DB, return correctness + correct_answer + explanation.
 * Requirements: 7.1, 7.2, 7.3, 13.1
 */
export async function processImmediateAnswer(
  session: IQuizSession,
  submittedAnswerIndexes: number[],
  forcedQuestionIndex?: number
): Promise<ImmediateAnswerResult> {
  try {
    await connectDB()

    const questionIndex =
      typeof forcedQuestionIndex === 'number' ? forcedQuestionIndex : session.current_question_index
    
    const { question, totalQuestions } = await resolveQuestion(session, questionIndex)

    const { correctAnswerIndexes, isCorrect, userAnswer, submittedIndexes, nextIndex, isLastQuestion } =
      prepareSubmittedAnswer(question, questionIndex, submittedAnswerIndexes, totalQuestions)

    const persistedAnswer = await persistAnswerWithOCC(session._id, userAnswer, {
      updateScore: true,
      isLast: isLastQuestion,
      nextIndex,
      questionIndex,
      isCorrect,
      insertOnly: true,
    }, session)

    return {
      isCorrect: persistedAnswer.answer.is_correct,
      answerIndexes: Array.isArray(persistedAnswer.answer.answer_indexes)
        ? persistedAnswer.answer.answer_indexes
        : typeof persistedAnswer.answer.answer_index === 'number' ? [persistedAnswer.answer.answer_index] : [],
      correctAnswer: correctAnswerIndexes[0],
      correctAnswers: correctAnswerIndexes,
      explanation: question.explanation,
    }
  } catch (err) {
    if (isAnswerConflict(err)) throw err
    throw new Error(
      `processImmediateAnswer failed: ${(err as Error).message}`
    )
  }
}

/**
 * Read-only evaluation of an existing answer in immediate mode.
 * Returns correctness, correct answers, and explanation WITHOUT writing to DB or altering current_question_index.
 */
export async function getImmediateAnswerResult(
  session: IQuizSession,
  questionIndex: number
): Promise<ImmediateAnswerResult> {
  const { question } = await resolveQuestion(session, questionIndex)

  const correctAnswerIndexes = normalizeIndexes(
    Array.isArray(question.correct_answer)
      ? question.correct_answer
      : [question.correct_answer]
  )

  const existingAnswer = session.user_answers?.find((a) => a.question_index === questionIndex)
  const submittedIndexes = Array.isArray(existingAnswer?.answer_indexes)
    ? existingAnswer.answer_indexes
    : typeof existingAnswer?.answer_index === 'number'
    ? [existingAnswer.answer_index]
    : []

  const isCorrect = existingAnswer?.is_correct ?? isExactArrayMatch(submittedIndexes, correctAnswerIndexes)

  return {
    isCorrect,
    answerIndexes: submittedIndexes,
    correctAnswer: correctAnswerIndexes[0],
    correctAnswers: correctAnswerIndexes,
    explanation: question.explanation,
  }
}

/**
 * Review mode: persist answer, return next question (without correct_answer/explanation)
 * or an acknowledgement for the last question. Grading is revealed only after submission.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 12.1, 12.3, 13.1
 */
export async function processReviewAnswer(
  session: IQuizSession,
  submittedAnswerIndexes: number[],
  forcedQuestionIndex?: number,
  answerRevision?: number
): Promise<ReviewAnswerResult> {
  try {
    await connectDB()

    const questionIndex =
      typeof forcedQuestionIndex === 'number' ? forcedQuestionIndex : session.current_question_index
    
    const { question, totalQuestions } = await resolveQuestion(session, questionIndex)

    const { isCorrect, userAnswer, nextIndex, isLastQuestion } =
      prepareSubmittedAnswer(question, questionIndex, submittedAnswerIndexes, totalQuestions)

    if (!isLastQuestion) {
      const { question: nextQuestion } = await resolveQuestion(session, nextIndex)

      // Persist answer and advance – do NOT reveal correctness with optimistic concurrency check
      await persistAnswerWithOCC(session._id, userAnswer, {
        updateScore: false,
        answerRevision,
        isLast: false,
        nextIndex,
        questionIndex,
        isCorrect,
      }, session)

      // Return next question with correct_answer and explanation stripped (Req 12.1, 12.3)
      const safeQuestion = {
        _id: nextQuestion._id,
        text: nextQuestion.text,
        options: nextQuestion.options,
        image_url: nextQuestion.image_url,
      }

      return { answerIndexes: userAnswer.answer_indexes, answerRevision, nextQuestion: safeQuestion as Omit<IQuestion, 'correct_answer' | 'explanation'> }
    }

    // Last question – persist the editable selection with optimistic concurrency check.
    // In review mode, session completion only happens via explicit submit confirmation.
    await persistAnswerWithOCC(session._id, userAnswer, {
      updateScore: false,
      answerRevision,
      isLast: true,
      nextIndex,
      questionIndex,
      isCorrect,
    }, session)

    return { answerIndexes: userAnswer.answer_indexes, answerRevision, completed: false }
  } catch (err) {
    if (isAnswerConflict(err)) throw err
    throw new Error(`processReviewAnswer failed: ${(err as Error).message}`)
  }
}

/**
 * Calculate score server-side from DB data.
 * Counts entries where answer matches correct_answer, using question_order for random quizzes.
 * Requirements: 7.5, 8.4
 */
export function calculateScore(
  userAnswers: UserAnswer[],
  questions: Array<IQuestion | null>,
  questionOrder?: number[]
): number {
  let score = 0
  const order = questionOrder || Array.from({ length: questions.length }, (_, i) => i)
  
  for (const answer of userAnswers) {
    // answer.question_index is the display index (0, 1, 2...)
    // We need to get the actual question using question_order
    const actualQuestionIndex = order[answer.question_index]
    const question = questions[actualQuestionIndex]
    if (!question) continue

    const correctAnswerIndexes = normalizeIndexes(
      Array.isArray(question.correct_answer)
        ? question.correct_answer
        : [question.correct_answer]
    )
    const submittedIndexes = normalizeIndexes(
      Array.isArray(answer.answer_indexes)
        ? answer.answer_indexes
        : [answer.answer_index]
    )

    if (isExactArrayMatch(submittedIndexes, correctAnswerIndexes)) {
      score++
    }
  }
  return score
}

async function resolveCompletionQuestions(session: any): Promise<IQuestion[]> {
  const questions = session.questions_cache?.length > 0
    ? session.questions_cache as IQuestion[]
    : await resolveQuestionsFromQuiz(session.quiz_id, session.question_order)
  if (!questions || questions.length === 0) {
    throw new Error('No questions available to finalize session score')
  }
  return questions
}

function recordCompletedAssignmentResult(result: any, totalQuestions: number) {
  if (!result || !result.assignment_id || !result.classroom_id) return
  const scorePercent = totalQuestions > 0 ? Math.round(((result.score || 0) / totalQuestions) * 100) : 0
  import('@/lib/modules/classroom/services/classroom-service').then(({ ClassroomService }) => {
    ClassroomService.recordAssignmentResult({
      assignmentId: result.assignment_id.toString(),
      classroomId: result.classroom_id.toString(),
      studentId: result.student_id.toString(),
      sessionId: result._id.toString(),
      scorePercent,
    }).catch(() => {})
  })
}

/**
 * Atomic session completion using findOneAndUpdate with $ne condition
 * to prevent race conditions.
 *
 * SECURITY: The final score is recalculated server-side from the persisted
 * answers and the authoritative question set (cached or fetched from DB).
 * No client-supplied score, answers, or currentQuestionIndex is accepted.
 * This prevents score/answer manipulation via direct API calls.
 *
 * Returns true if session was successfully completed, false if already completed
 * or not found. Requirements: 13.6
 */
export async function atomicCompleteSession(sessionId: string): Promise<boolean> {
  try {
    await connectDB()

    for (let attempt = 0; attempt < 3; attempt++) {
      const session = await QuizSession.findById(sessionId).lean()
      if (!session) {
        return false
      }

      if (session.status === 'completed') {
        return false
      }

      const questions = await resolveCompletionQuestions(session)

      const userAnswers = (session.user_answers ?? []) as UserAnswer[]
      const score = calculateScore(userAnswers, questions, session.question_order)
      const currentQuestionIndex = questions.length

      const result = await QuizSession.findOneAndUpdate(
        {
          _id: sessionId,
          status: { $ne: 'completed' },
          ...getVersionFilter(session.answer_version),
        },
        {
          $set: {
            status: 'completed',
            score,
            current_question_index: currentQuestionIndex,
            completed_at: new Date(),
          },
          // Keep completed results permanently; TTL should apply to active sessions only.
          $unset: {
            expires_at: 1,
          },
        },
        { new: true }
      )

      recordCompletedAssignmentResult(result, questions.length)

      if (result) return true
    }
    throw new Error('Answers changed while submitting. Please retry.')
  } catch (err) {
    throw new Error(
      `atomicCompleteSession failed: ${(err as Error).message}`
    )
  }
}

/**
 * Resolve the full ordered question set from a Quiz document.
 * Used as a fallback when the session question cache is not populated.
 */
async function resolveQuestionsFromQuiz(
  quizId: import('mongoose').Types.ObjectId,
  questionOrder?: number[]
): Promise<IQuestion[]> {
  const quiz = await Quiz.findById(quizId).lean()
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return []
  }

  const questions = quiz.questions as IQuestion[]

  if (!questionOrder || questionOrder.length === 0) {
    return questions
  }

  return questionOrder
    .map((displayIndex) => questions[displayIndex])
    .filter((q): q is IQuestion => Boolean(q))
}
