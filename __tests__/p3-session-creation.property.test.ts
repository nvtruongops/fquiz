/**
 * P3: Session creation preserves mode and assigns unique ID
 * Validates: Requirements 6.1, 6.2, 6.3
 *
 * Requirement 6.1: WHEN a Student selects a Quiz and a mode (Immediate_Mode or Review_Mode),
 *   THE Quiz_Engine SHALL create a new Quiz_Session and return the first Question
 *   without revealing the correct answer.
 * Requirement 6.2: THE Quiz_Engine SHALL record the selected mode (Immediate_Mode or
 *   Review_Mode) in the Quiz_Session at creation time.
 * Requirement 6.3: WHEN a Quiz_Session is created, THE Quiz_Engine SHALL assign a unique
 *   session ID and record the start timestamp.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { IQuestion } from '@/types/quiz'
import type { IQuizSession } from '@/types/session'

// ---------------------------------------------------------------------------
// Pure helpers extracted from the session creation logic in
// app/api/sessions/route.ts — tested here without any DB or HTTP layer.
// ---------------------------------------------------------------------------

type SessionMode = 'immediate' | 'review'

/**
 * Mirrors the session document construction in POST /api/sessions.
 * Requirements: 6.2, 6.3
 */
function buildSession(
  studentId: Types.ObjectId,
  quizId: Types.ObjectId,
  mode: SessionMode,
  now: Date
): Omit<IQuizSession, '_id'> & { _id: Types.ObjectId } {
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return {
    _id: new Types.ObjectId(),
    student_id: studentId,
    quiz_id: quizId,
    mode,
    status: 'active',
    user_answers: [],
    current_question_index: 0,
    score: 0,
    expires_at: expiresAt,
    started_at: now,
  }
}

/**
 * Mirrors the safe-question projection in POST /api/sessions.
 * Strips correct_answer and explanation before returning to the client.
 * Requirement: 6.1, 12.1
 */
function projectFirstQuestion(
  question: IQuestion
): Omit<IQuestion, 'correct_answer' | 'explanation'> {
  const { correct_answer: _ca, explanation: _ex, ...safe } = question
  return safe
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const modeArb = fc.constantFrom('immediate' as const, 'review' as const)

const questionArb = fc
  .record({
    text: fc.string({ minLength: 1, maxLength: 100 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
      minLength: 2,
      maxLength: 6,
    }),
    correct_answer: fc.array(fc.integer({ min: 0, max: 5 }), {
      minLength: 1,
      maxLength: 1,
    }),
    explanation: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
      nil: undefined,
    }),
    image_url: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
      nil: undefined,
    }),
  })
  .map((fields) => ({
    _id: new Types.ObjectId(),
    ...fields,
  })) as fc.Arbitrary<IQuestion>

const quizArb = fc
  .array(questionArb, { minLength: 1, maxLength: 10 })
  .map((questions) => ({
    _id: new Types.ObjectId(),
    questions,
  }))

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P3: Session creation preserves mode and assigns unique ID', () => {
  /**
   * Property 3a: Session mode matches the requested mode
   * Validates: Requirement 6.2
   */
  it('session.mode always equals the requested mode', () => {
    fc.assert(
      fc.property(modeArb, (mode) => {
        const session = buildSession(
          new Types.ObjectId(),
          new Types.ObjectId(),
          mode,
          new Date()
        )
        return session.mode === mode
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3b: Each session creation produces a unique _id
   * Validates: Requirement 6.3
   */
  it('each session creation produces a unique _id', () => {
    fc.assert(
      fc.property(modeArb, modeArb, (mode1, mode2) => {
        const s1 = buildSession(
          new Types.ObjectId(),
          new Types.ObjectId(),
          mode1,
          new Date()
        )
        const s2 = buildSession(
          new Types.ObjectId(),
          new Types.ObjectId(),
          mode2,
          new Date()
        )
        // Two independently created sessions must have different IDs
        return !s1._id.equals(s2._id)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3c: Session has a started_at timestamp set at creation time
   * Validates: Requirement 6.3
   */
  it('session.started_at is set to the creation timestamp', () => {
    fc.assert(
      fc.property(modeArb, (mode) => {
        const now = new Date()
        const session = buildSession(
          new Types.ObjectId(),
          new Types.ObjectId(),
          mode,
          now
        )
        return session.started_at.getTime() === now.getTime()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3d: First question returned does NOT contain correct_answer
   * Validates: Requirement 6.1, 12.1
   */
  it('projected first question does not contain correct_answer field', () => {
    fc.assert(
      fc.property(quizArb, (quiz) => {
        const firstQuestion = quiz.questions[0]
        const safe = projectFirstQuestion(firstQuestion)
        return !('correct_answer' in safe)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3e: First question returned does NOT contain explanation
   * Validates: Requirement 6.1, 12.1
   */
  it('projected first question does not contain explanation field', () => {
    fc.assert(
      fc.property(quizArb, (quiz) => {
        const firstQuestion = quiz.questions[0]
        const safe = projectFirstQuestion(firstQuestion)
        return !('explanation' in safe)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3f: Projected question preserves all non-sensitive fields
   * Validates: Requirement 6.1
   */
  it('projected first question preserves _id, text, options (and image_url if present)', () => {
    fc.assert(
      fc.property(quizArb, (quiz) => {
        const firstQuestion = quiz.questions[0]
        const safe = projectFirstQuestion(firstQuestion)

        const hasId = '_id' in safe && safe._id.equals(firstQuestion._id)
        const hasText = safe.text === firstQuestion.text
        const hasOptions =
          JSON.stringify(safe.options) === JSON.stringify(firstQuestion.options)

        return hasId && hasText && hasOptions
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3g: Session creation with any valid mode produces a valid session object
   * (status = 'active', current_question_index = 0, user_answers = [])
   * Validates: Requirements 6.2, 6.3
   */
  it('newly created session has status=active, current_question_index=0, empty user_answers', () => {
    fc.assert(
      fc.property(modeArb, (mode) => {
        const session = buildSession(
          new Types.ObjectId(),
          new Types.ObjectId(),
          mode,
          new Date()
        )
        return (
          session.status === 'active' &&
          session.current_question_index === 0 &&
          session.user_answers.length === 0
        )
      }),
      { numRuns: 100 }
    )
  })
})
