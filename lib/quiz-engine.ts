import type { IQuizSession, UserAnswer } from '@/types/session'
import type { IQuestion } from '@/types/quiz'
import { connectDB } from '@/lib/mongodb'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'

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

export async function syncUniqueStudentCount(quizId: unknown): Promise<void> {
  const uniqueStudents = await QuizSession.distinct('student_id', {
    quiz_id: quizId,
    status: 'completed',
  })

  await Quiz.updateOne(
    { _id: quizId },
    { $set: { studentCount: uniqueStudents.length } }
  )
}

function normalizeIndexes(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

function isExactAnswerSetMatch(submitted: number[], correct: number[]): boolean {
  if (submitted.length !== correct.length) return false
  for (let i = 0; i < submitted.length; i += 1) {
    if (submitted[i] !== correct[i]) return false
  }
  return true
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
  questionIndexInput?: number
): Promise<ImmediateAnswerResult> {
  try {
    await connectDB()

    // Use cached questions if available, otherwise fetch from DB
    let questions: IQuestion[]
    if (session.questions_cache && session.questions_cache.length > 0) {
      questions = session.questions_cache
    } else {
      const quiz = await Quiz.findById(session.quiz_id).lean()
      if (!quiz) {
        throw new Error('Quiz not found')
      }
      questions = quiz.questions as IQuestion[]
    }

    const questionIndex =
      typeof questionIndexInput === 'number' ? questionIndexInput : session.current_question_index
    
    // Use question_order to get the actual question index
    const questionOrder = session.question_order || Array.from({ length: questions.length }, (_, i) => i)
    const actualQuestionIndex = questionOrder[questionIndex]
    const question = questions[actualQuestionIndex]
    
    if (!question) {
      throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
    }

    const correctAnswerIndexes = normalizeIndexes(
      Array.isArray(question.correct_answer)
        ? question.correct_answer
        : [question.correct_answer as unknown as number]
    )

    const submittedIndexes = normalizeIndexes(submittedAnswerIndexes)
    const isCorrect = isExactAnswerSetMatch(submittedIndexes, correctAnswerIndexes)

    const userAnswer: UserAnswer = {
      question_index: questionIndex,
      answer_index: submittedIndexes[0],
      answer_indexes: submittedIndexes,
      is_correct: isCorrect,
    }

    const nextIndex = questionIndex + 1
    const isLastQuestion = nextIndex >= questions.length
    const updatedAnswers = upsertAnswer(session.user_answers, userAnswer)
    const score = calculateScore(updatedAnswers, questions, session.question_order)

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
  questionIndexInput?: number
): Promise<ReviewAnswerResult> {
  try {
    await connectDB()

    // Use cached questions if available, otherwise fetch from DB
    let questions: IQuestion[]
    if (session.questions_cache && session.questions_cache.length > 0) {
      questions = session.questions_cache
    } else {
      const quiz = await Quiz.findById(session.quiz_id).lean()
      if (!quiz) {
        throw new Error('Quiz not found')
      }
      questions = quiz.questions as IQuestion[]
    }

    const questionIndex =
      typeof questionIndexInput === 'number' ? questionIndexInput : session.current_question_index
    
    // Use question_order to get the actual question index
    const questionOrder = session.question_order || Array.from({ length: questions.length }, (_, i) => i)
    const actualQuestionIndex = questionOrder[questionIndex]
    const question = questions[actualQuestionIndex]
    
    if (!question) {
      throw new Error(`Question at index ${questionIndex} (actual: ${actualQuestionIndex}) not found`)
    }

    const correctAnswerIndexes = normalizeIndexes(
      Array.isArray(question.correct_answer)
        ? question.correct_answer
        : [question.correct_answer as unknown as number]
    )

    const submittedIndexes = normalizeIndexes(submittedAnswerIndexes)
    const isCorrect = isExactAnswerSetMatch(submittedIndexes, correctAnswerIndexes)

    const userAnswer: UserAnswer = {
      question_index: questionIndex,
      answer_index: submittedIndexes[0],
      answer_indexes: submittedIndexes,
      is_correct: isCorrect,
    }

    const nextIndex = questionIndex + 1
    const isLastQuestion = nextIndex >= questions.length
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
      const nextQuestion = questions[nextActualQuestionIndex]
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
    const score = calculateScore(updatedAnswers, questions, session.question_order)
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
        : [question.correct_answer as unknown as number]
    )
    const submittedIndexes = normalizeIndexes(
      answer.answer_indexes && answer.answer_indexes.length > 0
        ? answer.answer_indexes
        : [answer.answer_index]
    )

    if (isExactAnswerSetMatch(submittedIndexes, correctAnswerIndexes)) {
      score++
    }
  }
  return score
}

/**
 * Atomic session completion using findOneAndUpdate with $ne condition
 * to prevent race conditions.
 * Returns true if session was successfully completed, false if already completed (409).
 * Requirements: 13.6
 */
export async function atomicCompleteSession(
  sessionId: string,
  score: number,
  userAnswers: UserAnswer[],
  currentQuestionIndex: number
): Promise<boolean> {
  try {
    await connectDB()

    const result = await QuizSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: { $ne: 'completed' },
      },
      {
        $set: {
          status: 'completed',
          score,
          user_answers: userAnswers,
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

    // If result is null, the session was already completed
    return result !== null
  } catch (err) {
    throw new Error(
      `atomicCompleteSession failed: ${(err as Error).message}`
    )
  }
}
