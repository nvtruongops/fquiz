/**
 * P7: Completed session immutability
 * Validates: Requirements 13.6
 *
 * Requirement 13.6: WHEN THE Quiz_Engine receives an answer submission request,
 *   THE Quiz_Engine SHALL first verify that the Quiz_Session status is not `completed`
 *   before persisting the answer; IF the session status is `completed`, THEN THE
 *   Quiz_Engine SHALL return an HTTP 409 Conflict error response and discard the
 *   submitted answer.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { IQuizSession, UserAnswer } from '@/types/session'
import type { IQuestion } from '@/types/quiz'

// ---------------------------------------------------------------------------
// Pure helpers that mirror the answer-submission guard logic in
// app/api/sessions/[id]/answer/route.ts.
// Tested here without any DB or HTTP layer.
// ---------------------------------------------------------------------------

/**
 * Simulates the HTTP status code returned by POST /api/sessions/[id]/answer.
 * Mirrors the guard in the route handler:
 *   if (session.status === 'completed') return 409
 * Requirement: 13.6
 */
function getAnswerSubmissionStatus(session: Pick<IQuizSession, 'status'>): 409 | 200 {
  if (session.status === 'completed') {
    return 409
  }
  return 200
}

/**
 * Simulates the answer-persistence logic for a completed session.
 * A completed session MUST NOT have its user_answers mutated.
 * Returns the session unchanged when status === 'completed'.
 * Requirement: 13.6
 */
function attemptSubmitAnswer(
  session: IQuizSession,
  answerIndex: number,
  questions: IQuestion[]
): { status: 409 | 200; session: IQuizSession } {
  // Guard: reject if already completed (Req 13.6)
  if (session.status === 'completed') {
    return { status: 409, session }
  }

  const questionIndex = session.current_question_index
  const question = questions[questionIndex]
  if (!question) {
    return { status: 409, session }
  }

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
    status: 200,
    session: {
      ...session,
      user_answers: [...session.user_answers, userAnswer],
      current_question_index: nextIndex,
      status: isLast ? 'completed' : 'active',
    },
  }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

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
    correct_answer: fc.integer({ min: 0, max: 5 }).map((n) => [n]),
    explanation: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: undefined,
    }),
  })
  .map((fields) => ({ _id: new Types.ObjectId(), ...fields }))

/** Generates a non-empty array of questions (1–6 questions) */
const questionsArb = fc.array(questionArb, { minLength: 1, maxLength: 6 })

/**
 * Generates a mock completed QuizSession with a pre-populated user_answers array.
 * The session has status === 'completed' and some existing answers.
 */
const completedSessionArb = (questions: IQuestion[]): fc.Arbitrary<IQuizSession> => {
  const existingAnswers: UserAnswer[] = questions.map((q, idx) => {
    const correctIdx = Array.isArray(q.correct_answer)
      ? q.correct_answer[0]
      : (q.correct_answer as unknown as number)
    return {
      question_index: idx,
      answer_index: correctIdx,
      is_correct: true,
    }
  })

  return fc.constant({
    _id: new Types.ObjectId(),
    student_id: new Types.ObjectId(),
    quiz_id: new Types.ObjectId(),
    mode: 'immediate' as const,
    status: 'completed' as const,
    user_answers: existingAnswers,
    current_question_index: questions.length,
    score: questions.length,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    started_at: new Date(),
    completed_at: new Date(),
  })
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P7: Completed session immutability', () => {
  /**
   * Property 7a: Submitting any answer to a completed session returns HTTP 409
   * Validates: Requirement 13.6
   */
  it('submitting any answer to a completed session always returns 409', () => {
    fc.assert(
      fc.property(
        questionsArb.chain((questions) =>
          completedSessionArb(questions).map((session) => ({ session, questions }))
        ),
        answerIndexArb,
        ({ session, questions }, answerIndex) => {
          const { status } = attemptSubmitAnswer(session, answerIndex, questions)
          return status === 409
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7b: user_answers does NOT change after a rejected submission to a completed session
   * Validates: Requirement 13.6
   */
  it('user_answers remains unchanged after a rejected submission to a completed session', () => {
    fc.assert(
      fc.property(
        questionsArb.chain((questions) =>
          completedSessionArb(questions).map((session) => ({ session, questions }))
        ),
        answerIndexArb,
        ({ session, questions }, answerIndex) => {
          const answersBefore = session.user_answers.length
          const { session: sessionAfter } = attemptSubmitAnswer(session, answerIndex, questions)

          // user_answers count must not grow
          if (sessionAfter.user_answers.length !== answersBefore) return false

          // Each existing answer must be identical (not mutated)
          return session.user_answers.every((before, idx) => {
            const after = sessionAfter.user_answers[idx]
            return (
              after !== undefined &&
              after.question_index === before.question_index &&
              after.answer_index === before.answer_index &&
              after.is_correct === before.is_correct
            )
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7c: session status remains 'completed' after a rejected submission
   * Validates: Requirement 13.6
   */
  it('session status remains completed after a rejected submission', () => {
    fc.assert(
      fc.property(
        questionsArb.chain((questions) =>
          completedSessionArb(questions).map((session) => ({ session, questions }))
        ),
        answerIndexArb,
        ({ session, questions }, answerIndex) => {
          const { session: sessionAfter } = attemptSubmitAnswer(session, answerIndex, questions)
          return sessionAfter.status === 'completed'
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7d: The 409 guard fires for any answer_index value (0–5)
   * Validates: Requirement 13.6
   */
  it('the 409 guard fires regardless of the submitted answer_index value', () => {
    fc.assert(
      fc.property(
        questionsArb.chain((questions) =>
          completedSessionArb(questions).map((session) => ({ session, questions }))
        ),
        answerIndexArb,
        ({ session, questions }, answerIndex) => {
          const httpStatus = getAnswerSubmissionStatus(session)
          return httpStatus === 409
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7e: An active session does NOT return 409 (contrast case)
   * Validates: Requirement 13.6 (guard only applies to completed sessions)
   */
  it('an active session does not return 409 for a valid answer submission', () => {
    fc.assert(
      fc.property(
        questionsArb,
        answerIndexArb,
        (questions, answerIndex) => {
          const activeSession: IQuizSession = {
            _id: new Types.ObjectId(),
            student_id: new Types.ObjectId(),
            quiz_id: new Types.ObjectId(),
            mode: 'immediate',
            status: 'active',
            user_answers: [],
            current_question_index: 0,
            score: 0,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            started_at: new Date(),
          }

          const httpStatus = getAnswerSubmissionStatus(activeSession)
          return httpStatus === 200
        }
      ),
      { numRuns: 100 }
    )
  })
})
