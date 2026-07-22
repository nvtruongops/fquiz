import mongoose from 'mongoose'
import type { IQuizSession, UserAnswer } from '@/lib/modules/quiz/types/session'
import type { IQuestion } from '@/lib/modules/quiz/types/quiz'
import { connectDB } from '@/lib/core/db/mongodb'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { normalizeIndexes, isExactArrayMatch } from '@/lib/core/utils/array-utils'

export interface ImmediateAnswerResult {
  isCorrect: boolean
  correctAnswer: number
  correctAnswers?: number[]
  explanation?: string
}

export interface ReviewAnswerResult {
  nextQuestion?: Omit<IQuestion, 'correct_answer' | 'explanation'>
  completed?: boolean
  score?: number
  results?: Array<{
    question: IQuestion
    userAnswer: number
    userAnswers?: number[]
    isCorrect: boolean
  }>
}

export async function syncUniqueStudentCount(quizId: any): Promise<void> {
  const uniqueStudents = await QuizSession.distinct('student_id', {
    quiz_id: quizId,
    // Đếm cả active và completed sessions - tính ngay khi user bắt đầu làm
  })

  await Quiz.updateOne(
    { _id: quizId },
    { $set: { studentCount: uniqueStudents.length } }
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
}

function calculateScoreDelta(isCorrect: boolean, previousAnswer: UserAnswer | undefined): number {
  if (isCorrect && (!previousAnswer || !previousAnswer.is_correct)) return 1
  if (!isCorrect && previousAnswer && previousAnswer.is_correct) return -1
  return 0
}

function getVersionFilter(cv: number | undefined) {
  return cv == null
    ? { $or: [{ answer_version: 1 }, { answer_version: { $exists: false } }] }
    : { answer_version: cv }
}

async function tryPersistAnswerIteration(
  sessionId: string | mongoose.Types.ObjectId,
  userAnswer: UserAnswer,
  options: PersistAnswerOptions,
  select: string
): Promise<{ success: boolean; score: number | null }> {
  const { updateScore, isLast, nextIndex, questionIndex, isCorrect } = options
  const currentSession = await QuizSession.findById(sessionId).select(select).lean()
  if (!currentSession) throw new Error('Session not found')

  const updatedAnswers = upsertAnswer(currentSession.user_answers || [], userAnswer)
  let score: number | null = null

  if (updateScore) {
    const previousAnswer = (currentSession.user_answers || []).find(
      (a: UserAnswer) => a.question_index === questionIndex
    )
    const scoreDelta = calculateScoreDelta(isCorrect, previousAnswer)
    score = (currentSession.score || 0) + scoreDelta
  }

  const versionFilter = getVersionFilter(currentSession.answer_version)

  const result = await QuizSession.updateOne(
    { _id: sessionId, ...versionFilter },
    {
      $set: {
        user_answers: updatedAnswers,
        current_question_index: isLast ? questionIndex : nextIndex,
        ...(updateScore ? { score } : {}),
        last_activity_at: new Date(),
        paused_at: null,
      },
      $inc: { answer_version: 1 },
    }
  )

  return {
    success: result.modifiedCount === 1,
    score,
  }
}

async function persistAnswerWithOCC(
  sessionId: string | mongoose.Types.ObjectId,
  userAnswer: UserAnswer,
  options: PersistAnswerOptions
): Promise<{ score: number | null }> {
  const select = options.updateScore ? 'answer_version user_answers score' : 'answer_version user_answers'
  let retries = 3
  while (retries > 0) {
    const { success, score } = await tryPersistAnswerIteration(sessionId, userAnswer, options, select)
    if (success) return { score }
    retries--
    if (retries === 0) {
      throw new Error('Failed to update answer after retries (concurrent modification)')
    }
  }
  return { score: null }
}

async function resolveQuestion(
  session: IQuizSession,
  questionIndex: number
): Promise<{ question: IQuestion; totalQuestions: number; questionOrder: number[] }> {
  let questionOrder = session.question_order
  if (!questionOrder || questionOrder.length === 0) {
    const quizMeta = await Quiz.findById(session.quiz_id).select('questions._id question_refs').lean() as any
    if (!quizMeta) throw new Error('Quiz not found')
    const totalCount = (quizMeta.question_refs?.length) || (quizMeta.questions?.length) || 0
    questionOrder = Array.from({ length: totalCount }, (_, i) => i)
  }

  const actualQuestionIndex = questionOrder[questionIndex]
  let question: IQuestion | null = null
  let totalQuestions = questionOrder.length

  // Use questions_cache ONLY IF its length matches totalQuestions to prevent index-shift mismatches
  if (
    session.questions_cache &&
    session.questions_cache.length === totalQuestions &&
    session.questions_cache[actualQuestionIndex]
  ) {
    question = session.questions_cache[actualQuestionIndex] as IQuestion
  }

  // Fallback: Fetch directly from Quiz / Question model if cache is missing or out-of-sync
  if (!question) {
    const quiz = await Quiz.findById(session.quiz_id)
      .select('questions question_refs')
      .lean() as any
    if (!quiz) throw new Error('Quiz not found')

    if (Array.isArray(quiz.question_refs) && quiz.question_refs.length > actualQuestionIndex) {
      const refId = quiz.question_refs[actualQuestionIndex]
      const { Question } = await import('@/lib/modules/quiz/models/Question')
      const qDoc = await Question.findById(refId).lean()
      if (qDoc) question = qDoc as unknown as IQuestion
    }

    if (!question && Array.isArray(quiz.questions) && quiz.questions.length > actualQuestionIndex) {
      question = quiz.questions[actualQuestionIndex] as IQuestion
    }
  }

  if (!question) {
    throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
  }

  return { question, totalQuestions, questionOrder }
}

function hasAnsweredAllQuestions(userAnswers: UserAnswer[], totalQuestions: number): boolean {
  if (totalQuestions <= 0) return false
  if (userAnswers.length !== totalQuestions) return false

  const answeredIndexes = new Set<number>()
  for (const answer of userAnswers) {
    if (answer.question_index < 0 || answer.question_index >= totalQuestions) return false
    answeredIndexes.add(answer.question_index)
  }

  if (answeredIndexes.size !== totalQuestions) return false

  for (let i = 0; i < totalQuestions; i += 1) {
    if (!answeredIndexes.has(i)) return false
  }

  return true
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

    const correctAnswerIndexes = normalizeIndexes(
      Array.isArray(question.correct_answer)
        ? question.correct_answer
        : [question.correct_answer]
    )

    const submittedIndexes = normalizeIndexes(submittedAnswerIndexes)
    const isCorrect = isExactArrayMatch(submittedIndexes, correctAnswerIndexes)

    const userAnswer: UserAnswer = {
      question_index: questionIndex,
      answer_index: submittedIndexes[0],
      answer_indexes: submittedIndexes,
      is_correct: isCorrect,
    }

    const nextIndex = questionIndex + 1
    const isLastQuestion = nextIndex >= totalQuestions

    await persistAnswerWithOCC(session._id, userAnswer, {
      updateScore: true,
      isLast: isLastQuestion,
      nextIndex,
      questionIndex,
      isCorrect,
    })

    return {
      isCorrect,
      correctAnswer: correctAnswerIndexes[0],
      correctAnswers: correctAnswerIndexes,
      explanation: question.explanation,
    }
  } catch (err) {
    throw new Error(
      `processImmediateAnswer failed: ${(err as Error).message}`
    )
  }
}

/**
 * Review mode: persist answer, return next question (without correct_answer/explanation)
 * or full results if it's the last question.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 12.1, 12.3, 13.1
 */
export async function processReviewAnswer(
  session: IQuizSession,
  submittedAnswerIndexes: number[],
  forcedQuestionIndex?: number
): Promise<ReviewAnswerResult> {
  try {
    await connectDB()

    const questionIndex =
      typeof forcedQuestionIndex === 'number' ? forcedQuestionIndex : session.current_question_index
    
    const { question, totalQuestions, questionOrder: resolvedOrder } = await resolveQuestion(session, questionIndex)

    const correctAnswerIndexes = normalizeIndexes(
      Array.isArray(question.correct_answer)
        ? question.correct_answer
        : [question.correct_answer]
    )

    const submittedIndexes = normalizeIndexes(submittedAnswerIndexes)
    const isCorrect = isExactArrayMatch(submittedIndexes, correctAnswerIndexes)

    const userAnswer: UserAnswer = {
      question_index: questionIndex,
      answer_index: submittedIndexes[0],
      answer_indexes: submittedIndexes,
      is_correct: isCorrect,
    }

    const nextIndex = questionIndex + 1
    const isLastQuestion = nextIndex >= totalQuestions

    if (!isLastQuestion) {
      // Persist answer and advance – do NOT reveal correctness with optimistic concurrency check
      await persistAnswerWithOCC(session._id, userAnswer, {
        updateScore: false,
        isLast: false,
        nextIndex,
        questionIndex,
        isCorrect,
      })

      // Return next question with correct_answer and explanation stripped (Req 12.1, 12.3)
      const nextActualQuestionIndex = resolvedOrder[nextIndex]
      
      let nextQuestion: IQuestion
      if (session.questions_cache && session.questions_cache.length > 0) {
        nextQuestion = session.questions_cache[nextActualQuestionIndex] as IQuestion
      } else {
        const nextQuiz = await Quiz.findById(session.quiz_id, { questions: { $slice: [nextActualQuestionIndex, 1] } }).lean()
        nextQuestion = nextQuiz!.questions[0] as IQuestion
      }

      const safeQuestion = {
        _id: nextQuestion._id,
        text: nextQuestion.text,
        options: nextQuestion.options,
        image_url: nextQuestion.image_url,
      }

      return { nextQuestion: safeQuestion as Omit<IQuestion, 'correct_answer' | 'explanation'> }
    }

    // Last question – persist answer and running score with optimistic concurrency check.
    // In review mode, session completion only happens via explicit submit confirmation.
    const { score } = await persistAnswerWithOCC(session._id, userAnswer, {
      updateScore: true,
      isLast: true,
      nextIndex,
      questionIndex,
      isCorrect,
    })

    return { completed: false, score: score ?? 0 }
  } catch (err) {
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
  questions: IQuestion[],
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
      answer.answer_indexes && answer.answer_indexes.length > 0
        ? answer.answer_indexes
        : [answer.answer_index]
    )

    if (isExactArrayMatch(submittedIndexes, correctAnswerIndexes)) {
      score++
    }
  }
  return score
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

    const session = await QuizSession.findById(sessionId).lean()
    if (!session) {
      return false
    }

    if (session.status === 'completed') {
      return false
    }

    // Resolve authoritative question set: prefer cached copy, fallback to quiz document.
    const questions = (session.questions_cache && session.questions_cache.length > 0)
      ? (session.questions_cache as IQuestion[])
      : await resolveQuestionsFromQuiz(
          session.quiz_id as unknown as import('mongoose').Types.ObjectId,
          session.question_order
        )

    if (!questions || questions.length === 0) {
      throw new Error('No questions available to finalize session score')
    }

    const userAnswers = (session.user_answers ?? []) as UserAnswer[]
    const score = calculateScore(userAnswers, questions, session.question_order)
    const currentQuestionIndex = questions.length

    const result = await QuizSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: { $ne: 'completed' },
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

    // If result is null, the session was already completed by a concurrent request
    if (result && result.assignment_id && result.classroom_id) {
      const totalQuestions = questions.length
      const scorePercent = totalQuestions > 0 ? Math.round(((result.score || 0) / totalQuestions) * 100) : 0
      import('@/lib/modules/classroom/services/classroom-service').then(({ ClassroomService }) => {
        ClassroomService.recordAssignmentResult({
          assignmentId: result.assignment_id!.toString(),
          classroomId: result.classroom_id!.toString(),
          studentId: result.student_id.toString(),
          sessionId: result._id.toString(),
          scorePercent,
        }).catch(() => {})
      })
    }

    return result !== null
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
