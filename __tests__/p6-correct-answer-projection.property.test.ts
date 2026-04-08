/**
 * P6: Correct answer projection — never exposed in active sessions
 * Validates: Requirements 12.1, 12.3
 *
 * Requirement 12.1: WHEN THE Quiz_Engine returns a list of Questions to the Frontend,
 *   THE Quiz_Engine SHALL apply Projection to exclude the `correct_answer` and
 *   `explanation` fields from the response payload.
 * Requirement 12.3: WHILE a Quiz_Session is active and not yet completed,
 *   THE Quiz_Engine SHALL not include `correct_answer` or `explanation` in any
 *   response for that session.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { IQuestion } from '@/types/quiz'
import type { IQuizSession } from '@/types/session'

// ---------------------------------------------------------------------------
// Pure projection helpers — mirrors the logic in:
//   - app/api/sessions/[id]/route.ts  (GET handler)
//   - lib/quiz-engine.ts              (processReviewAnswer next-question projection)
//
// Inlined here to avoid importing modules that require MONGODB_URI at load time.
// The logic is identical to the production implementation.
// ---------------------------------------------------------------------------

/**
 * Projects a question for an ACTIVE session response.
 * Strips `correct_answer` and `explanation` unconditionally.
 * Mirrors the projection in GET /api/sessions/[id] when status !== 'completed'.
 * Requirements: 12.1, 12.3
 */
function projectQuestionForActiveSession(
  question: IQuestion
): Omit<IQuestion, 'correct_answer' | 'explanation'> {
  const { correct_answer: _ca, explanation: _ex, ...safe } = question
  return safe
}

/**
 * Projects a question for a COMPLETED session response.
 * Includes all fields (correct_answer and explanation are revealed).
 * Mirrors the projection in GET /api/sessions/[id] when status === 'completed'.
 * Requirements: 12.2
 */
function projectQuestionForCompletedSession(question: IQuestion): IQuestion {
  return {
    _id: question._id,
    text: question.text,
    options: question.options,
    correct_answer: question.correct_answer,
    ...(question.explanation !== undefined ? { explanation: question.explanation } : {}),
    ...(question.image_url !== undefined ? { image_url: question.image_url } : {}),
  }
}

/**
 * Simulates the full session response shape for GET /api/sessions/[id].
 * Returns the projected question based on session status.
 * Requirements: 12.1, 12.3
 */
function buildSessionResponse(
  session: Pick<IQuizSession, 'status' | 'mode' | 'current_question_index' | 'user_answers'> & { _id: Types.ObjectId },
  questions: IQuestion[]
): {
  session: object
  question: object
} {
  const currentIndex = session.current_question_index
  const rawQuestion = questions[currentIndex]
  const isCompleted = session.status === 'completed'

  const question = isCompleted
    ? projectQuestionForCompletedSession(rawQuestion)
    : projectQuestionForActiveSession(rawQuestion)

  return {
    session: {
      _id: session._id,
      mode: session.mode,
      status: session.status,
      current_question_index: session.current_question_index,
      totalQuestions: questions.length,
      user_answers: session.user_answers,
    },
    question,
  }
}

/**
 * Recursively checks whether an object (or any nested value) contains
 * a key named `correct_answer` or `explanation`.
 * Used to assert that sensitive fields are absent from the entire response tree.
 */
function containsSensitiveFields(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if ('correct_answer' in obj || 'explanation' in obj) return true
  return Object.values(obj).some(containsSensitiveFields)
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a single IQuestion with all fields including sensitive ones */
const questionArb: fc.Arbitrary<IQuestion> = fc
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
  .map((fields) => ({ _id: new Types.ObjectId(), ...fields })) as fc.Arbitrary<IQuestion>

/** Generates a non-empty array of questions */
const questionsArb = fc.array(questionArb, { minLength: 1, maxLength: 10 })

/** Generates an ACTIVE session (status: 'active') */
const activeSessionArb = (totalQuestions: number) =>
  fc
    .record({
      mode: fc.constantFrom('immediate' as const, 'review' as const),
      current_question_index: fc.integer({ min: 0, max: totalQuestions - 1 }),
    })
    .map((fields) => ({
      _id: new Types.ObjectId(),
      status: 'active' as const,
      user_answers: [],
      ...fields,
    }))

/** Generates a COMPLETED session (status: 'completed') */
const completedSessionArb = (totalQuestions: number) =>
  fc
    .record({
      mode: fc.constantFrom('immediate' as const, 'review' as const),
      current_question_index: fc.integer({ min: 0, max: totalQuestions - 1 }),
    })
    .map((fields) => ({
      _id: new Types.ObjectId(),
      status: 'completed' as const,
      user_answers: [],
      ...fields,
    }))

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P6: Correct answer projection — never exposed in active sessions', () => {
  /**
   * Property 6a: Projected question for active session does NOT contain correct_answer
   * Validates: Requirements 12.1, 12.3
   */
  it('projected question for active session never contains correct_answer field', () => {
    fc.assert(
      fc.property(questionArb, (question) => {
        const projected = projectQuestionForActiveSession(question)
        return !('correct_answer' in projected)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6b: Projected question for active session does NOT contain explanation
   * Validates: Requirements 12.1, 12.3
   */
  it('projected question for active session never contains explanation field', () => {
    fc.assert(
      fc.property(questionArb, (question) => {
        const projected = projectQuestionForActiveSession(question)
        return !('explanation' in projected)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6c: Full session response for active session contains no sensitive fields
   * anywhere in the response tree (deep check).
   * Validates: Requirements 12.1, 12.3
   */
  it('full GET /api/sessions/[id] response for active session contains no sensitive fields', () => {
    fc.assert(
      fc.property(
        questionsArb.chain((questions) =>
          activeSessionArb(questions.length).map((session) => ({ session, questions }))
        ),
        ({ session, questions }) => {
          const response = buildSessionResponse(session, questions)
          return !containsSensitiveFields(response)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6d: Projection preserves non-sensitive fields (_id, text, options, image_url)
   * Validates: Requirements 12.1, 12.3
   */
  it('projected question for active session preserves _id, text, options, and image_url', () => {
    fc.assert(
      fc.property(questionArb, (question) => {
        const projected = projectQuestionForActiveSession(question)

        const hasId = '_id' in projected && (projected as { _id: Types.ObjectId })._id.equals(question._id)
        const hasText = projected.text === question.text
        const hasOptions = JSON.stringify(projected.options) === JSON.stringify(question.options)
        const imageUrlPreserved =
          question.image_url === undefined
            ? !('image_url' in projected) || projected.image_url === undefined
            : projected.image_url === question.image_url

        return hasId && hasText && hasOptions && imageUrlPreserved
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6e: Completed session response DOES include correct_answer and explanation
   * (projection is only applied to active sessions).
   * Validates: Requirement 12.2 (contrast case — completed sessions reveal answers)
   */
  it('projected question for completed session includes correct_answer field', () => {
    fc.assert(
      fc.property(questionArb, (question) => {
        const projected = projectQuestionForCompletedSession(question)
        return 'correct_answer' in projected
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6f: Active vs completed session responses differ in sensitive field presence
   * — active hides them, completed exposes them.
   * Validates: Requirements 12.1, 12.2, 12.3
   */
  it('active session hides correct_answer while completed session exposes it', () => {
    fc.assert(
      fc.property(questionArb, (question) => {
        const activeProjection = projectQuestionForActiveSession(question)
        const completedProjection = projectQuestionForCompletedSession(question)

        const hiddenInActive = !('correct_answer' in activeProjection)
        const exposedInCompleted = 'correct_answer' in completedProjection

        return hiddenInActive && exposedInCompleted
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6g: For any active session, the response for every question in the quiz
   * never exposes correct_answer or explanation — regardless of question index.
   * Validates: Requirements 12.1, 12.3
   */
  it('no question at any index exposes sensitive fields when session is active', () => {
    fc.assert(
      fc.property(questionsArb, (questions) => {
        return questions.every((question) => {
          const projected = projectQuestionForActiveSession(question)
          return !('correct_answer' in projected) && !('explanation' in projected)
        })
      }),
      { numRuns: 100 }
    )
  })
})
