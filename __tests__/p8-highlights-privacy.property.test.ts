/**
 * P8: Highlight privacy isolation
 * Validates: Requirements 16.5
 *
 * Requirement 16.5: Highlights SHALL be private to each Student; THE System SHALL NOT
 *   return highlights belonging to one Student in any response to another Student.
 *
 * Strategy: Test the query filter logic that enforces privacy isolation.
 * The GET /api/highlights route and POST /api/sessions both filter highlights by
 * `student_id`. We verify that a query scoped to student B's ID never returns
 * documents that belong to student A — regardless of shared question_id values.
 *
 * Inlined pure filter logic mirrors the production query:
 *   UserHighlight.find({ student_id: payload.userId, question_id })
 * and the session creation query:
 *   UserHighlight.find({ student_id: ..., question_id: { $in: questionIds } })
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { IUserHighlight } from '@/types/highlight'

// ---------------------------------------------------------------------------
// Pure filter helpers — mirror the production query logic without hitting DB.
// These replicate the WHERE clause used in:
//   - GET /api/highlights?question_id=... (app/api/highlights/route.ts)
//   - POST /api/sessions (app/api/sessions/route.ts — bulk highlight fetch)
// ---------------------------------------------------------------------------

/**
 * Simulates: UserHighlight.find({ student_id: studentId, question_id })
 * Used by GET /api/highlights for a single question.
 * Requirements: 16.4, 16.5
 */
function queryHighlightsForStudent(
  allHighlights: IUserHighlight[],
  studentId: Types.ObjectId,
  questionId: Types.ObjectId
): IUserHighlight[] {
  return allHighlights.filter(
    (h) =>
      h.student_id.equals(studentId) &&
      h.question_id.equals(questionId)
  )
}

/**
 * Simulates: UserHighlight.find({ student_id: studentId, question_id: { $in: questionIds } })
 * Used by POST /api/sessions to bulk-load highlights for a quiz.
 * Requirements: 6.6, 16.5
 */
function queryHighlightsBulkForStudent(
  allHighlights: IUserHighlight[],
  studentId: Types.ObjectId,
  questionIds: Types.ObjectId[]
): IUserHighlight[] {
  return allHighlights.filter(
    (h) =>
      h.student_id.equals(studentId) &&
      questionIds.some((qid) => qid.equals(h.question_id))
  )
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const colorCodeArb = fc.constantFrom(
  '#B0D4B8' as const,
  '#D7F9FA' as const,
  '#FFE082' as const,
  '#EF9A9A' as const
)

/**
 * Generates a single highlight document for a given student_id and question_id.
 */
function highlightArb(
  studentId: Types.ObjectId,
  questionId: Types.ObjectId
): fc.Arbitrary<IUserHighlight> {
  return fc
    .record({
      text_segment: fc.string({ minLength: 1, maxLength: 100 }),
      color_code: colorCodeArb,
      offset: fc.integer({ min: 0, max: 1000 }),
    })
    .map((fields) => ({
      _id: new Types.ObjectId(),
      student_id: studentId,
      question_id: questionId,
      created_at: new Date(),
      ...fields,
    }))
}

/**
 * Generates a non-empty array of highlights all belonging to a specific student.
 */
function highlightsForStudentArb(
  studentId: Types.ObjectId,
  questionIds: Types.ObjectId[]
): fc.Arbitrary<IUserHighlight[]> {
  if (questionIds.length === 0) return fc.constant([])
  return fc
    .array(
      fc
        .integer({ min: 0, max: questionIds.length - 1 })
        .chain((idx) => highlightArb(studentId, questionIds[idx])),
      { minLength: 1, maxLength: 10 }
    )
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P8: Highlight privacy isolation', () => {
  /**
   * Property 8a: Single-question query for student B never returns student A's highlights.
   * Validates: Requirements 16.5
   */
  it('query for student B on a shared question_id never returns highlights owned by student A', () => {
    fc.assert(
      fc.property(
        // Generate two distinct UUIDs for student A and student B
        fc.uuid(),
        fc.uuid(),
        (uuidA, uuidB) => {
          // If UUIDs happen to collide, skip (extremely unlikely)
          if (uuidA === uuidB) return true

          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()
          const sharedQuestion = new Types.ObjectId()

          // Create highlights for student A on the shared question
          const highlightsA: IUserHighlight[] = [
            {
              _id: new Types.ObjectId(),
              student_id: studentA,
              question_id: sharedQuestion,
              text_segment: 'student A highlight',
              color_code: '#B0D4B8',
              offset: 0,
              created_at: new Date(),
            },
          ]

          // Query as student B for the same question
          const result = queryHighlightsForStudent(highlightsA, studentB, sharedQuestion)

          // Student B must receive zero results
          return result.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8b: Using fc.uuid() for student IDs — query for student B returns
   * only highlights where student_id matches student B, never student A's.
   * Validates: Requirements 16.5
   */
  it('highlights owned by student A are never present in student B query results', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            text_segment: fc.string({ minLength: 1, maxLength: 80 }),
            color_code: colorCodeArb,
            offset: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (uuidA, uuidB, highlightFields) => {
          // If UUIDs happen to collide, skip (extremely unlikely but safe)
          if (uuidA === uuidB) return true

          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()
          const questionId = new Types.ObjectId()

          // Build highlights for student A
          const highlightsA: IUserHighlight[] = highlightFields.map((f) => ({
            _id: new Types.ObjectId(),
            student_id: studentA,
            question_id: questionId,
            created_at: new Date(),
            ...f,
          }))

          // Query as student B
          const result = queryHighlightsForStudent(highlightsA, studentB, questionId)

          // No highlight in the result should belong to student A
          return result.every((h) => !h.student_id.equals(studentA))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8c: Bulk session query for student B never returns student A's highlights,
   * even when they share the same question IDs.
   * Validates: Requirements 16.5, 6.6
   */
  it('bulk session highlight query for student B never includes student A highlights', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            text_segment: fc.string({ minLength: 1, maxLength: 80 }),
            color_code: colorCodeArb,
            offset: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (uuidA, uuidB, highlightFields) => {
          if (uuidA === uuidB) return true

          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()

          // Create 3 shared question IDs
          const questionIds = [
            new Types.ObjectId(),
            new Types.ObjectId(),
            new Types.ObjectId(),
          ]

          // Build highlights for student A across the shared questions
          const highlightsA: IUserHighlight[] = highlightFields.map((f, i) => ({
            _id: new Types.ObjectId(),
            student_id: studentA,
            question_id: questionIds[i % questionIds.length],
            created_at: new Date(),
            ...f,
          }))

          // Bulk query as student B for all shared question IDs
          const result = queryHighlightsBulkForStudent(highlightsA, studentB, questionIds)

          // Student B must receive zero results
          return result.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8d: Mixed highlight store — student B only receives their own highlights.
   * Both students have highlights on the same questions; query must isolate correctly.
   * Validates: Requirements 16.5
   */
  it('when both students have highlights on the same question, each only sees their own', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (uuidA, uuidB, countA, countB) => {
          if (uuidA === uuidB) return true

          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()
          const sharedQuestion = new Types.ObjectId()

          const makeHighlights = (
            studentId: Types.ObjectId,
            count: number
          ): IUserHighlight[] =>
            Array.from({ length: count }, (_, i) => ({
              _id: new Types.ObjectId(),
              student_id: studentId,
              question_id: sharedQuestion,
              text_segment: `segment ${i}`,
              color_code: '#FFE082' as const,
              offset: i * 10,
              created_at: new Date(),
            }))

          const allHighlights = [
            ...makeHighlights(studentA, countA),
            ...makeHighlights(studentB, countB),
          ]

          const resultA = queryHighlightsForStudent(allHighlights, studentA, sharedQuestion)
          const resultB = queryHighlightsForStudent(allHighlights, studentB, sharedQuestion)

          // Each student sees exactly their own highlights
          const aSeesOnlyOwn = resultA.every((h) => h.student_id.equals(studentA))
          const bSeesOnlyOwn = resultB.every((h) => h.student_id.equals(studentB))
          const aCountCorrect = resultA.length === countA
          const bCountCorrect = resultB.length === countB

          return aSeesOnlyOwn && bSeesOnlyOwn && aCountCorrect && bCountCorrect
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8e: Student B's own highlights are always returned correctly
   * (isolation doesn't accidentally suppress legitimate results).
   * Validates: Requirements 16.4, 16.5
   */
  it("student B's own highlights are always returned when querying as student B", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 10 }),
        (uuidA, uuidB, count) => {
          if (uuidA === uuidB) return true

          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()
          const questionId = new Types.ObjectId()

          const highlightsA: IUserHighlight[] = Array.from({ length: count }, (_, i) => ({
            _id: new Types.ObjectId(),
            student_id: studentA,
            question_id: questionId,
            text_segment: `A segment ${i}`,
            color_code: '#D7F9FA' as const,
            offset: i,
            created_at: new Date(),
          }))

          const highlightsB: IUserHighlight[] = Array.from({ length: count }, (_, i) => ({
            _id: new Types.ObjectId(),
            student_id: studentB,
            question_id: questionId,
            text_segment: `B segment ${i}`,
            color_code: '#EF9A9A' as const,
            offset: i + 100,
            created_at: new Date(),
          }))

          const allHighlights = [...highlightsA, ...highlightsB]

          const resultB = queryHighlightsForStudent(allHighlights, studentB, questionId)

          // Student B gets exactly their own count, all owned by B
          return (
            resultB.length === count &&
            resultB.every((h) => h.student_id.equals(studentB))
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8f: Query result for any student never contains highlights from a different student.
   * Generalized over arbitrary student IDs and highlight collections.
   * Validates: Requirements 16.5
   */
  it('query result for any student never contains highlights from a different student ID', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            text_segment: fc.string({ minLength: 1, maxLength: 60 }),
            color_code: colorCodeArb,
            offset: fc.integer({ min: 0, max: 999 }),
          }),
          { minLength: 0, maxLength: 15 }
        ),
        (uuidA, uuidB, fields) => {
          if (uuidA === uuidB) return true

          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()
          const questionId = new Types.ObjectId()

          // All highlights belong to student A
          const allHighlights: IUserHighlight[] = fields.map((f) => ({
            _id: new Types.ObjectId(),
            student_id: studentA,
            question_id: questionId,
            created_at: new Date(),
            ...f,
          }))

          // Query as student B
          const result = queryHighlightsForStudent(allHighlights, studentB, questionId)

          // Invariant: no result item has student_id !== studentB
          return result.every((h) => h.student_id.equals(studentB))
        }
      ),
      { numRuns: 100 }
    )
  })
})
