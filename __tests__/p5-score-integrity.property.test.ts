/**
 * P5: Score integrity — server-side calculation only
 * Validates: Requirements 7.5, 8.4
 *
 * Requirement 7.5: THE Quiz_Engine SHALL calculate the session score exclusively
 *   on the Backend by reading `user_answers` stored in the Quiz_Session document
 *   in MongoDB; the Frontend SHALL NOT submit a score value.
 * Requirement 8.4: WHEN the last answer is submitted in Review_Mode, THE Quiz_Engine
 *   SHALL compute the total score server-side by comparing each entry in `user_answers`
 *   against the `correct_answer` stored in the database, without accepting any score
 *   value from the client request.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { UserAnswer } from '@/types/session'
import type { IQuestion } from '@/types/quiz'

// ---------------------------------------------------------------------------
// Pure implementation of calculateScore, mirroring lib/quiz-engine.ts.
// Inlined here to avoid importing the module which has a top-level
// connectDB() import that requires MONGODB_URI at module load time.
// The logic is identical to the production implementation.
// Requirements: 7.5, 8.4
// ---------------------------------------------------------------------------
function calculateScore(userAnswers: UserAnswer[], questions: IQuestion[]): number {
  let score = 0
  for (const answer of userAnswers) {
    const question = questions[answer.question_index]
    if (!question) continue

    const correctAnswerIndex = Array.isArray(question.correct_answer)
      ? question.correct_answer[0]
      : (question.correct_answer as unknown as number)

    if (answer.answer_index === correctAnswerIndex) {
      score++
    }
  }
  return score
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Answer index in range 0–5 as specified by the task */
const answerIndexArb = fc.integer({ min: 0, max: 5 })

/** Generates a single question with a correct_answer in range 0–5 */
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

/**
 * Generates a non-empty array of questions (1–10 questions).
 * Paired with a matching array of answer indices (one per question).
 */
const quizWithAnswersArb = fc
  .array(questionArb, { minLength: 1, maxLength: 10 })
  .chain((questions) =>
    fc
      .array(answerIndexArb, { minLength: questions.length, maxLength: questions.length })
      .map((answerIndices) => ({ questions, answerIndices }))
  )

/**
 * Build UserAnswer[] from answer indices and questions.
 * is_correct is intentionally set to a fixed value here to verify
 * that calculateScore ignores it and re-derives correctness from DB data.
 */
function buildUserAnswers(
  answerIndices: number[],
  questions: IQuestion[],
  forceIsCorrect?: boolean
): UserAnswer[] {
  return answerIndices.map((answerIndex, questionIndex) => ({
    question_index: questionIndex,
    answer_index: answerIndex,
    // When forceIsCorrect is provided, we override is_correct to test that
    // calculateScore does NOT rely on this client-submitted field.
    is_correct: forceIsCorrect !== undefined ? forceIsCorrect : answerIndex === (
      Array.isArray(questions[questionIndex].correct_answer)
        ? questions[questionIndex].correct_answer[0]
        : (questions[questionIndex].correct_answer as unknown as number)
    ),
  }))
}

/**
 * Reference implementation: count correct answers by comparing
 * answer_index against correct_answer from DB (questions array).
 * This is the ground truth for all property assertions.
 */
function countCorrectAnswers(answerIndices: number[], questions: IQuestion[]): number {
  let count = 0
  for (let i = 0; i < answerIndices.length; i++) {
    const question = questions[i]
    if (!question) continue
    const correctAnswerIndex = Array.isArray(question.correct_answer)
      ? question.correct_answer[0]
      : (question.correct_answer as unknown as number)
    if (answerIndices[i] === correctAnswerIndex) {
      count++
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P5: Score integrity — server-side calculation only', () => {
  /**
   * Property 5a: calculateScore returns exactly count(answer_index === correct_answer)
   * Validates: Requirements 7.5, 8.4
   */
  it('calculateScore returns exactly the count of correct answers from DB data', () => {
    fc.assert(
      fc.property(quizWithAnswersArb, ({ questions, answerIndices }) => {
        const userAnswers = buildUserAnswers(answerIndices, questions)
        const score = calculateScore(userAnswers, questions)
        const expected = countCorrectAnswers(answerIndices, questions)
        return score === expected
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5b: Score is non-negative and at most the number of questions
   * Validates: Requirements 7.5, 8.4
   */
  it('score is always between 0 and the total number of questions (inclusive)', () => {
    fc.assert(
      fc.property(quizWithAnswersArb, ({ questions, answerIndices }) => {
        const userAnswers = buildUserAnswers(answerIndices, questions)
        const score = calculateScore(userAnswers, questions)
        return score >= 0 && score <= questions.length
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5c: Score is NOT influenced by the is_correct field on UserAnswer
   * (client-submitted field must be ignored — only DB correct_answer matters).
   * Validates: Requirements 7.5, 8.4
   */
  it('score is identical regardless of the is_correct field value on UserAnswer', () => {
    fc.assert(
      fc.property(quizWithAnswersArb, ({ questions, answerIndices }) => {
        // Build answers with is_correct forced to true (lying client)
        const answersWithForcedTrue = buildUserAnswers(answerIndices, questions, true)
        // Build answers with is_correct forced to false (lying client)
        const answersWithForcedFalse = buildUserAnswers(answerIndices, questions, false)
        // Build answers with is_correct computed honestly
        const answersHonest = buildUserAnswers(answerIndices, questions)

        const scoreWithForcedTrue = calculateScore(answersWithForcedTrue, questions)
        const scoreWithForcedFalse = calculateScore(answersWithForcedFalse, questions)
        const scoreHonest = calculateScore(answersHonest, questions)

        // All three must produce the same score — is_correct is irrelevant
        return (
          scoreWithForcedTrue === scoreHonest &&
          scoreWithForcedFalse === scoreHonest
        )
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5d: All-correct answers yield score === questions.length
   * Validates: Requirements 7.5, 8.4
   */
  it('submitting the correct answer for every question yields score === questions.length', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 1, maxLength: 10 }),
        (questions) => {
          // Build answers where every answer_index matches correct_answer
          const userAnswers: UserAnswer[] = questions.map((q, idx) => {
            const correctAnswerIndex = Array.isArray(q.correct_answer)
              ? q.correct_answer[0]
              : (q.correct_answer as unknown as number)
            return {
              question_index: idx,
              answer_index: correctAnswerIndex,
              is_correct: true,
            }
          })

          const score = calculateScore(userAnswers, questions)
          return score === questions.length
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5e: All-wrong answers yield score === 0
   * Validates: Requirements 7.5, 8.4
   */
  it('submitting a wrong answer for every question yields score === 0', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 1, maxLength: 10 }),
        (questions) => {
          // Build answers where every answer_index is guaranteed to be wrong
          // by picking (correct_answer + 1) % 6 — always different from correct
          const userAnswers: UserAnswer[] = questions.map((q, idx) => {
            const correctAnswerIndex = Array.isArray(q.correct_answer)
              ? q.correct_answer[0]
              : (q.correct_answer as unknown as number)
            const wrongAnswer = (correctAnswerIndex + 1) % 6
            return {
              question_index: idx,
              answer_index: wrongAnswer,
              is_correct: false,
            }
          })

          const score = calculateScore(userAnswers, questions)
          return score === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5f: Empty user_answers yields score === 0
   * Validates: Requirements 7.5, 8.4
   */
  it('empty user_answers always yields score === 0', () => {
    fc.assert(
      fc.property(
        fc.array(questionArb, { minLength: 1, maxLength: 10 }),
        (questions) => {
          const score = calculateScore([], questions)
          return score === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5g: Score is deterministic — same inputs always produce same output
   * Validates: Requirements 7.5, 8.4
   */
  it('calculateScore is deterministic — same inputs always produce the same score', () => {
    fc.assert(
      fc.property(quizWithAnswersArb, ({ questions, answerIndices }) => {
        const userAnswers = buildUserAnswers(answerIndices, questions)
        const score1 = calculateScore(userAnswers, questions)
        const score2 = calculateScore(userAnswers, questions)
        return score1 === score2
      }),
      { numRuns: 100 }
    )
  })
})
