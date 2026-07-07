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
    
    let questionOrder = session.question_order
    if (!questionOrder || questionOrder.length === 0) {
      const quizMeta = await Quiz.findById(session.quiz_id).select('questions._id').lean()
      if (!quizMeta) throw new Error('Quiz not found')
      questionOrder = Array.from({ length: quizMeta.questions.length as number }, (_, i) => i)
    }

    const actualQuestionIndex = questionOrder[questionIndex]
    
    let question: IQuestion
    let totalQuestions = questionOrder.length

    // Use cached questions if available, otherwise fetch exactly 1 question from DB using $slice
    if (session.questions_cache && session.questions_cache.length > 0) {
      question = session.questions_cache[actualQuestionIndex] as IQuestion
      totalQuestions = session.questions_cache.length
    } else {
      const quiz = await Quiz.findById(session.quiz_id, { questions: { $slice: [actualQuestionIndex, 1] } }).lean()
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
      }
      question = quiz.questions[0] as IQuestion
    }

    if (!question) {
      throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
    }

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
    const updatedAnswers = upsertAnswer(session.user_answers, userAnswer)
    
    // Calculate score. Note: calculateScore historically took all questions, but here we can't afford to load all.
    // However, immediate mode tracks score. To properly calculate score, we don't recalculate everything.
    // Instead we can increment it if correct. Wait, calculateScore was doing a full recalculation!
    // For immediate mode, if this answer is newly correct, we can just use the running score or recalculate.
    // Let's just increment score if this is a new correct answer, but we need to handle changing answers.
    const previousAnswer = session.user_answers.find(a => a.question_index === questionIndex)
    let scoreDelta = 0
    if (isCorrect && (!previousAnswer || !previousAnswer.is_correct)) scoreDelta = 1
    else if (!isCorrect && previousAnswer && previousAnswer.is_correct) scoreDelta = -1
    const score = (session.score || 0) + scoreDelta

    // Immediate mode only records answers and running score.
    // The session is completed only when user explicitly confirms submit.
    await QuizSession.findByIdAndUpdate(session._id, {
      $set: {
        user_answers: updatedAnswers,
        current_question_index: isLastQuestion ? questionIndex : nextIndex,
        score,
        last_activity_at: new Date(),
        paused_at: null,
      },
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
    
    let questionOrder = session.question_order
    if (!questionOrder || questionOrder.length === 0) {
      const quizMeta = await Quiz.findById(session.quiz_id).select('questions._id').lean()
      if (!quizMeta) throw new Error('Quiz not found')
      questionOrder = Array.from({ length: quizMeta.questions.length as number }, (_, i) => i)
    }

    const actualQuestionIndex = questionOrder[questionIndex]
    
    let question: IQuestion
    let totalQuestions = questionOrder.length

    // Use cached questions if available, otherwise fetch exactly 1 question from DB using $slice
    if (session.questions_cache && session.questions_cache.length > 0) {
      question = session.questions_cache[actualQuestionIndex] as IQuestion
      totalQuestions = session.questions_cache.length
    } else {
      const quiz = await Quiz.findById(session.quiz_id, { questions: { $slice: [actualQuestionIndex, 1] } }).lean()
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
      }
      question = quiz.questions[0] as IQuestion
    }

    if (!question) {
      throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
    }

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
    const updatedAnswers = upsertAnswer(session.user_answers, userAnswer)

    if (!isLastQuestion) {
      // Persist answer and advance — do NOT reveal correctness
      await QuizSession.findByIdAndUpdate(session._id, {
        $set: {
          user_answers: updatedAnswers,
          current_question_index: nextIndex,
          last_activity_at: new Date(),
          paused_at: null,
        },
      })

      // Return next question with correct_answer and explanation stripped (Req 12.1, 12.3)
      const nextActualQuestionIndex = questionOrder[nextIndex]
      
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

    // Last question — persist answer and running score.
    // In review mode, session completion only happens via explicit submit confirmation.
    // Calculate running score optimally:
    const previousAnswer = session.user_answers.find(a => a.question_index === questionIndex)
    let scoreDelta = 0
    if (isCorrect && (!previousAnswer || !previousAnswer.is_correct)) scoreDelta = 1
    else if (!isCorrect && previousAnswer && previousAnswer.is_correct) scoreDelta = -1
    const score = (session.score || 0) + scoreDelta
    await QuizSession.findByIdAndUpdate(session._id, {
      $set: {
        user_answers: updatedAnswers,
        current_question_index: questionIndex,
        score,
        last_activity_at: new Date(),
        paused_at: null,
      },
    })

    return { completed: false, score }
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
