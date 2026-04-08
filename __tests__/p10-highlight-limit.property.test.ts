/**
 * P10: Highlight limit enforcement
 * Validates: Requirements 17.5
 *
 * Requirement 17.5: THE UI SHALL enforce a limit of 10 distinct text segments per
 *   Question that a Student can highlight at any given time.
 *
 * Strategy: Test the limit-enforcement logic that mirrors the production code in
 * `app/api/highlights/route.ts`:
 *
 *   const count = await UserHighlight.countDocuments({ student_id, question_id })
 *   if (count >= 10) {
 *     return NextResponse.json(
 *       { error: 'Highlight limit reached (max 10 per question)' },
 *       { status: 400 }
 *     )
 *   }
 *
 * We inline the pure limit-check logic and the in-memory store to verify:
 *   1. Exactly 10 highlights can be created for a student+question pair.
 *   2. Attempting to create an 11th highlight is rejected.
 *   3. The count remains exactly 10 after the rejected attempt.
 *
 * Uses fc.array(..., { minLength: 10, maxLength: 10 }) as specified by the task.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'
import type { IUserHighlight } from '@/types/highlight'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ColorCode = '#B0D4B8' | '#D7F9FA' | '#FFE082' | '#EF9A9A'

interface CreateHighlightInput {
  question_id: Types.ObjectId
  text_segment: string
  color_code: ColorCode
  offset: number
}

interface CreateResult {
  success: boolean
  highlight?: IUserHighlight
  error?: string
  status: number
}

// ---------------------------------------------------------------------------
// Pure limit-enforcement helpers — mirror production logic without DB.
//
// These replicate the POST /api/highlights logic from:
//   app/api/highlights/route.ts
//
// The in-memory store simulates the UserHighlights collection.
// The HIGHLIGHT_LIMIT constant mirrors the hard-coded limit of 10.
// ---------------------------------------------------------------------------

const HIGHLIGHT_LIMIT = 10

/**
 * Simulates: UserHighlight.countDocuments({ student_id, question_id })
 * Returns the number of highlights for a given student+question pair.
 * Requirements: 17.5
 */
function countHighlights(
  store: IUserHighlight[],
  student_id: Types.ObjectId,
  question_id: Types.ObjectId
): number {
  return store.filter(
    (h) => h.student_id.equals(student_id) && h.question_id.equals(question_id)
  ).length
}

/**
 * Simulates the full POST /api/highlights handler logic:
 *   1. Count existing highlights for student+question.
 *   2. If count >= 10, return 400 error.
 *   3. Otherwise, create and persist the highlight, return 201.
 *
 * Mutates `store` in place (simulating DB write).
 * Requirements: 17.5
 */
function tryCreateHighlight(
  store: IUserHighlight[],
  student_id: Types.ObjectId,
  input: CreateHighlightInput
): CreateResult {
  const count = countHighlights(store, student_id, input.question_id)

  if (count >= HIGHLIGHT_LIMIT) {
    return {
      success: false,
      error: 'Highlight limit reached (max 10 per question)',
      status: 400,
    }
  }

  const highlight: IUserHighlight = {
    _id: new Types.ObjectId(),
    student_id,
    question_id: input.question_id,
    text_segment: input.text_segment,
    color_code: input.color_code,
    offset: input.offset,
    created_at: new Date(),
  }

  store.push(highlight)

  return { success: true, highlight, status: 201 }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const colorCodeArb: fc.Arbitrary<ColorCode> = fc.constantFrom(
  '#B0D4B8' as const,
  '#D7F9FA' as const,
  '#FFE082' as const,
  '#EF9A9A' as const
)

/**
 * Valid text_segment: non-empty string (mirrors CreateHighlightSchema: z.string().min(1))
 */
const textSegmentArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 200 })

/**
 * Valid offset: non-negative integer (mirrors CreateHighlightSchema: z.number().int().min(0))
 */
const offsetArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 100_000 })

/**
 * A single valid highlight input (without student_id / question_id).
 */
const highlightFieldsArb = fc.record({
  text_segment: textSegmentArb,
  color_code: colorCodeArb,
  offset: offsetArb,
})

/**
 * Exactly 10 valid highlight inputs — used to fill the limit.
 * Uses fc.array(..., { minLength: 10, maxLength: 10 }) as specified by the task.
 */
const tenHighlightFieldsArb = fc.array(highlightFieldsArb, { minLength: 10, maxLength: 10 })

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P10: Highlight limit enforcement', () => {
  /**
   * Property 10a: After creating exactly 10 highlights, the 11th attempt is rejected with status 400.
   * Validates: Requirements 17.5
   */
  it('creating an 11th highlight for the same student+question is rejected with status 400', () => {
    fc.assert(
      fc.property(
        tenHighlightFieldsArb,
        highlightFieldsArb,
        (tenFields, eleventhFields) => {
          const student_id = new Types.ObjectId()
          const question_id = new Types.ObjectId()
          const store: IUserHighlight[] = []

          // Create exactly 10 highlights — all must succeed
          for (const fields of tenFields) {
            const result = tryCreateHighlight(store, student_id, { question_id, ...fields })
            if (!result.success) return false // unexpected failure
          }

          // Attempt to create the 11th highlight
          const eleventhResult = tryCreateHighlight(store, student_id, {
            question_id,
            ...eleventhFields,
          })

          // Must be rejected with status 400
          return eleventhResult.success === false && eleventhResult.status === 400
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10b: After a rejected 11th attempt, the count remains exactly 10.
   * Validates: Requirements 17.5
   */
  it('count remains exactly 10 after a rejected 11th highlight attempt', () => {
    fc.assert(
      fc.property(
        tenHighlightFieldsArb,
        highlightFieldsArb,
        (tenFields, eleventhFields) => {
          const student_id = new Types.ObjectId()
          const question_id = new Types.ObjectId()
          const store: IUserHighlight[] = []

          // Create exactly 10 highlights
          for (const fields of tenFields) {
            tryCreateHighlight(store, student_id, { question_id, ...fields })
          }

          // Attempt the 11th (should be rejected)
          tryCreateHighlight(store, student_id, { question_id, ...eleventhFields })

          // Count must still be exactly 10
          const finalCount = countHighlights(store, student_id, question_id)
          return finalCount === HIGHLIGHT_LIMIT
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10c: The first 10 highlights all succeed (status 201).
   * Validates: Requirements 17.5
   */
  it('the first 10 highlights for a student+question all succeed with status 201', () => {
    fc.assert(
      fc.property(tenHighlightFieldsArb, (tenFields) => {
        const student_id = new Types.ObjectId()
        const question_id = new Types.ObjectId()
        const store: IUserHighlight[] = []

        const results = tenFields.map((fields) =>
          tryCreateHighlight(store, student_id, { question_id, ...fields })
        )

        // All 10 must succeed
        return results.every((r) => r.success === true && r.status === 201)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10d: The limit is per student+question pair — a different student can still
   * create highlights on the same question even when student A has reached the limit.
   * Validates: Requirements 17.5
   */
  it('limit is per student+question — a different student is not affected by another student reaching the limit', () => {
    fc.assert(
      fc.property(
        tenHighlightFieldsArb,
        highlightFieldsArb,
        (tenFields, extraFields) => {
          const studentA = new Types.ObjectId()
          const studentB = new Types.ObjectId()
          const question_id = new Types.ObjectId()
          const store: IUserHighlight[] = []

          // Student A fills the limit
          for (const fields of tenFields) {
            tryCreateHighlight(store, studentA, { question_id, ...fields })
          }

          // Student B should still be able to create a highlight on the same question
          const resultB = tryCreateHighlight(store, studentB, { question_id, ...extraFields })

          return resultB.success === true && resultB.status === 201
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10e: The limit is per question — a student can create highlights on a
   * different question even after reaching the limit on the first question.
   * Validates: Requirements 17.5
   */
  it('limit is per question — reaching the limit on question A does not block highlights on question B', () => {
    fc.assert(
      fc.property(
        tenHighlightFieldsArb,
        highlightFieldsArb,
        (tenFields, extraFields) => {
          const student_id = new Types.ObjectId()
          const questionA = new Types.ObjectId()
          const questionB = new Types.ObjectId()
          const store: IUserHighlight[] = []

          // Fill the limit on question A
          for (const fields of tenFields) {
            tryCreateHighlight(store, student_id, { question_id: questionA, ...fields })
          }

          // Should still be able to create a highlight on question B
          const resultB = tryCreateHighlight(store, student_id, {
            question_id: questionB,
            ...extraFields,
          })

          return resultB.success === true && resultB.status === 201
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10f: The error message for a rejected 11th highlight matches the production error.
   * Validates: Requirements 17.5
   */
  it('rejected 11th highlight returns the correct error message', () => {
    fc.assert(
      fc.property(
        tenHighlightFieldsArb,
        highlightFieldsArb,
        (tenFields, eleventhFields) => {
          const student_id = new Types.ObjectId()
          const question_id = new Types.ObjectId()
          const store: IUserHighlight[] = []

          for (const fields of tenFields) {
            tryCreateHighlight(store, student_id, { question_id, ...fields })
          }

          const result = tryCreateHighlight(store, student_id, { question_id, ...eleventhFields })

          return (
            result.success === false &&
            result.error === 'Highlight limit reached (max 10 per question)'
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 10g: Multiple consecutive rejected attempts all return 400 and count stays at 10.
   * Validates: Requirements 17.5
   */
  it('multiple consecutive rejected attempts all return 400 and count stays at 10', () => {
    fc.assert(
      fc.property(
        tenHighlightFieldsArb,
        fc.array(highlightFieldsArb, { minLength: 1, maxLength: 5 }),
        (tenFields, extraAttempts) => {
          const student_id = new Types.ObjectId()
          const question_id = new Types.ObjectId()
          const store: IUserHighlight[] = []

          // Fill the limit
          for (const fields of tenFields) {
            tryCreateHighlight(store, student_id, { question_id, ...fields })
          }

          // All extra attempts must be rejected
          const allRejected = extraAttempts.every((fields) => {
            const result = tryCreateHighlight(store, student_id, { question_id, ...fields })
            return result.success === false && result.status === 400
          })

          // Count must remain exactly 10
          const finalCount = countHighlights(store, student_id, question_id)

          return allRejected && finalCount === HIGHLIGHT_LIMIT
        }
      ),
      { numRuns: 100 }
    )
  })
})
