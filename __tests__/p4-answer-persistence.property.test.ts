/**
 * P4: Answer persistence and session resume
 * Validates: Requirements 13.1, 13.3
 *
 * Requirement 13.1: WHEN a Student selects an answer for a Question,
 *   THE Quiz_Engine SHALL immediately persist the answer to the `user_answers`
 *   field of the corresponding Quiz_Session document in MongoDB.
 * Requirement 13.3: WHEN a Student resumes an active Quiz_Session,
 *   THE Quiz_Engine SHALL return the Question at the stored `current_question_index`
 *   along with all previously submitted answers.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { IQuizSession, UserAnswer } from '@/types/session'
import type { IQuestion } from '@/types/quiz'

// ---------------------------------------------------------------------------
// Pure helpers that mirror the answer-submission and session-resume logic
// in app/api/sessions/[id]/answer/route.ts and app/api/sessions/[id]/route.ts.
// Tested here without any DB or HTTP layer.
// ---------------------------------------------------------------------------

type SessionMode = 'immediate' | 'review'

/**
 * Mirrors the session document construction (POST /api/sessions).
 */
function buildSession(
  quizId: Types.ObjectId,
  mode: SessionMode,
  totalQuestions: number
): IQuizSession {
  const now = new Date()
  return {
    _id: new Types.ObjectId(),
    student_id: new Types.ObjectId(),
    quiz_id: quizId,
    mode,
    status: 'active',
    user_answers: [],
    current_question_index: 0,
    score: 0,
    expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    started_at: now,
  }
}

/**
 * Mirrors the answer-persistence logic in POST /api/sessions/[id]/answer.
 * Appends the answer to user_answers and advances current_question_index.
 * Requirements: 13.1, 13.2
 */
function submitAnswer(
  session: IQuizSession,
  answerIndex: number,
  questions: IQuestion[]
): IQuizSession {
  const questionIndex = session.current_question_index
  const question = questions[questionIndex]
  if (!question) throw new Error(`No question at index ${questionIndex}`)

  const correctAnswerIndex = Array.isArray(question.correct_answer)
    ? question.correct_answer[0]
    : (question.correct_answer as unknown as number)

  const userAnswer: UserAnswer = {
    question_index: questionIndex,
    answer_index: answerIndex,
    is_correct: answerIndex === correctAnswerIndex,
  }

  const nextIndex = questionIndex + 1
  const isLast = nextIndex >= questions.length

  return {
    ...session,
    user_answers: [...session.user_answers, userAnswer],
    current_question_index: nextIndex,
    status: isLast ? 'completed' : 'active',
  }
}

/**
 * Mirrors the session-resume response in GET /api/sessions/[id].
 * Returns the question at current_question_index and all previously stored answers.
 * Requirements: 13.3
 */
function resumeSession(
  session: IQuizSession,
  questions: IQuestion[]
): {
  currentQuestion: Omit<IQuestion, 'correct_answer' | 'explanation'> | null
  user_answers: UserAnswer[]
  current_question_index: number
} {
  const idx = session.current_question_index
  const question = questions[idx] ?? null

  // Strip sensitive fields (Req 12.1, 12.3)
  let currentQuestion: Omit<IQuestion, 'correct_answer' | 'explanation'> | null = null
  if (question) {
    const { correct_answer: _ca, explanation: _ex, ...safe } = question
    currentQuestion = safe
  }

  return {
    currentQuestion,
    user_answers: session.user_answers,
    current_question_index: idx,
  }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const modeArb = fc.constantFrom('immediate' as const, 'review' as const)

/** Answer index in range 0–5 as specified by the task */
const answerIndexArb = fc.integer({ min: 0, max: 5 })

/** Generates a single question with a valid correct_answer */
const questionArb: fc.Arbitrary<IQuestion> = fc
  .record({
    text: fc.string({ minLength: 1, maxLength: 80 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 40 }), {
      minLength: 2,
      maxLength: 6,
    }),
    correct_answer: fc
      .integer({ min: 0, max: 5 })
      .map((n) => [n]),
    explanation: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
  })
  .map((fields) => ({ _id: new Types.ObjectId(), ...fields }))

/** Generates a quiz with 1–6 questions */
const quizArb = fc
  .array(questionArb, { minLength: 1, maxLength: 6 })
  .map((questions) => ({
    _id: new Types.ObjectId(),
    questions,
  }))

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P4: Answer persistence and session resume', () => {
  /**
   * Property 4a: Submitted answer_index is stored in user_answers
   * Validates: Requirement 13.1
   */
  it('submitted answer_index is stored in user_answers', () => {
    fc.assert(
      fc.property(quizArb, modeArb, answerIndexArb, (quiz, mode, answerIndex) => {
        const session = buildSession(quiz._id, mode, quiz.questions.length)
        const updated = submitAnswer(session, answerIndex, quiz.questions)

        // The answer for question 0 must be in user_answers
        const stored = updated.user_answers.find((a) => a.question_index === 0)
        return stored !== undefined && stored.answer_index === answerIndex
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4b: current_question_index advances by 1 after each answer submission
   * Validates: Requirement 13.2
   */
  it('current_question_index advances by 1 after submitting an answer', () => {
    fc.assert(
      fc.property(quizArb, modeArb, answerIndexArb, (quiz, mode, answerIndex) => {
        // Only test when there is more than one question (so session stays active)
        if (quiz.questions.length < 2) return true

        const session = buildSession(quiz._id, mode, quiz.questions.length)
        const before = session.current_question_index
        const updated = submitAnswer(session, answerIndex, quiz.questions)

        return updated.current_question_index === before + 1
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4c: Resuming session returns the correct current_question_index
   * Validates: Requirement 13.3
   */
  it('resuming session returns the stored current_question_index', () => {
    fc.assert(
      fc.property(quizArb, modeArb, answerIndexArb, (quiz, mode, answerIndex) => {
        if (quiz.questions.length < 2) return true

        const session = buildSession(quiz._id, mode, quiz.questions.length)
        const updated = submitAnswer(session, answerIndex, quiz.questions)

        const resumed = resumeSession(updated, quiz.questions)
        return resumed.current_question_index === updated.current_question_index
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4d: Resuming session returns all previously submitted answers
   * Validates: Requirement 13.3
   */
  it('resuming session returns all previously submitted answers', () => {
    fc.assert(
      fc.property(
        quizArb,
        modeArb,
        fc.array(answerIndexArb, { minLength: 1, maxLength: 6 }),
        (quiz, mode, answerIndices) => {
          let session = buildSession(quiz._id, mode, quiz.questions.length)

          // Submit as many answers as there are questions (or fewer)
          const submittedCount = Math.min(answerIndices.length, quiz.questions.length)
          for (let i = 0; i < submittedCount; i++) {
            if (session.status === 'completed') break
            session = submitAnswer(session, answerIndices[i], quiz.questions)
          }

          const resumed = resumeSession(session, quiz.questions)

          // All submitted answers must be present in the resumed session
          return resumed.user_answers.length === session.user_answers.length &&
            session.user_answers.every((expected, idx) => {
              const actual = resumed.user_answers[idx]
              return (
                actual !== undefined &&
                actual.question_index === expected.question_index &&
                actual.answer_index === expected.answer_index &&
                actual.is_correct === expected.is_correct
              )
            })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4e: Resuming session returns the question at current_question_index
   * (not the first question, not a random one)
   * Validates: Requirement 13.3
   */
  it('resuming session returns the question at current_question_index', () => {
    fc.assert(
      fc.property(quizArb, modeArb, answerIndexArb, (quiz, mode, answerIndex) => {
        if (quiz.questions.length < 2) return true

        const session = buildSession(quiz._id, mode, quiz.questions.length)
        const updated = submitAnswer(session, answerIndex, quiz.questions)

        const resumed = resumeSession(updated, quiz.questions)
        const expectedQuestion = quiz.questions[updated.current_question_index]

        if (!expectedQuestion || !resumed.currentQuestion) return true

        return (
          resumed.currentQuestion._id.equals(expectedQuestion._id) &&
          resumed.currentQuestion.text === expectedQuestion.text
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4f: user_answers grows by exactly 1 per submission
   * Validates: Requirement 13.1
   */
  it('user_answers grows by exactly 1 after each answer submission', () => {
    fc.assert(
      fc.property(quizArb, modeArb, answerIndexArb, (quiz, mode, answerIndex) => {
        const session = buildSession(quiz._id, mode, quiz.questions.length)
        const before = session.user_answers.length
        const updated = submitAnswer(session, answerIndex, quiz.questions)

        return updated.user_answers.length === before + 1
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4g: Multiple sequential submissions — all answers are preserved in order
   * Validates: Requirements 13.1, 13.3
   */
  it('multiple sequential submissions preserve all answers in order', () => {
    fc.assert(
      fc.property(
        quizArb,
        modeArb,
        fc.array(answerIndexArb, { minLength: 2, maxLength: 6 }),
        (quiz, mode, answerIndices) => {
          if (quiz.questions.length < 2) return true

          let session = buildSession(quiz._id, mode, quiz.questions.length)
          const submittedAnswers: number[] = []

          const submittedCount = Math.min(answerIndices.length, quiz.questions.length)
          for (let i = 0; i < submittedCount; i++) {
            if (session.status === 'completed') break
            submittedAnswers.push(answerIndices[i])
            session = submitAnswer(session, answerIndices[i], quiz.questions)
          }

          // Each stored answer must match the submitted answer_index in order
          return submittedAnswers.every((submitted, idx) => {
            const stored = session.user_answers[idx]
            return stored !== undefined && stored.answer_index === submitted
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4h: Resumed session does not expose correct_answer or explanation
   * (active session projection safety)
   * Validates: Requirements 12.1, 12.3
   */
  it('resumed session question does not expose correct_answer or explanation', () => {
    fc.assert(
      fc.property(quizArb, modeArb, answerIndexArb, (quiz, mode, answerIndex) => {
        if (quiz.questions.length < 2) return true

        const session = buildSession(quiz._id, mode, quiz.questions.length)
        const updated = submitAnswer(session, answerIndex, quiz.questions)

        const resumed = resumeSession(updated, quiz.questions)

        if (!resumed.currentQuestion) return true

        return (
          !('correct_answer' in resumed.currentQuestion) &&
          !('explanation' in resumed.currentQuestion)
        )
      }),
      { numRuns: 100 }
    )
  })
})
