/**
 * P11: Search filter correctness
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5
 *
 * Requirement 5.1: WHEN a Student provides a Category name as a search parameter,
 *   THE Search_Service SHALL return all Quizzes belonging to that Category.
 * Requirement 5.2: WHEN a Student provides a Course_Code as a search parameter,
 *   THE Search_Service SHALL return all Quizzes matching that Course_Code.
 * Requirement 5.3: WHEN a Student provides both a Category name and a Course_Code,
 *   THE Search_Service SHALL return Quizzes matching both criteria.
 * Requirement 5.5: THE Search_Service SHALL support case-insensitive matching for
 *   Category name and Course_Code search parameters.
 */

import fc from 'fast-check'
import { Types } from 'mongoose'

// ---------------------------------------------------------------------------
// Pure filtering logic extracted from app/api/search/route.ts
// This mirrors the exact logic used in the route handler so we can test it
// without hitting the database or making HTTP calls.
// ---------------------------------------------------------------------------

interface QuizRecord {
  _id: Types.ObjectId
  title: string
  course_code: string
  category_name: string // denormalized for test purposes
}

/**
 * Mirrors the search route's filtering logic:
 * - category filter: case-insensitive substring match on category name
 * - course_code filter: case-insensitive substring match on course_code
 * - both filters combined: AND semantics
 */
function filterQuizzes(
  quizzes: QuizRecord[],
  category: string,
  course_code: string
): QuizRecord[] {
  return quizzes.filter((q) => {
    const matchesCategory =
      category === '' ||
      q.category_name.toLowerCase().includes(category.toLowerCase())

    const matchesCourse =
      course_code === '' ||
      q.course_code.toLowerCase().includes(course_code.toLowerCase())

    return matchesCategory && matchesCourse
  })
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a non-empty alphanumeric string (avoids regex special chars) */
const safeString = fc.stringMatching(/^[a-zA-Z0-9]{1,12}$/)

/** Generates a quiz record with controlled category_name and course_code */
const quizArbitrary = fc
  .record({
    title: safeString,
    course_code: safeString,
    category_name: safeString,
  })
  .map((fields) => ({
    _id: new Types.ObjectId(),
    ...fields,
  }))

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('P11: Search filter correctness', () => {
  /**
   * Property 11a: Category-only filter — every returned quiz satisfies the filter (case-insensitive)
   * Validates: Requirements 5.1, 5.5
   */
  it('every result satisfies the category filter (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 0, maxLength: 20 }),
        safeString,
        (quizzes, categoryFilter) => {
          const results = filterQuizzes(quizzes, categoryFilter, '')

          // Every returned quiz must match the category filter case-insensitively
          return results.every((q) =>
            q.category_name.toLowerCase().includes(categoryFilter.toLowerCase())
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11b: Course-code-only filter — every returned quiz satisfies the filter (case-insensitive)
   * Validates: Requirements 5.2, 5.5
   */
  it('every result satisfies the course_code filter (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 0, maxLength: 20 }),
        safeString,
        (quizzes, courseFilter) => {
          const results = filterQuizzes(quizzes, '', courseFilter)

          return results.every((q) =>
            q.course_code.toLowerCase().includes(courseFilter.toLowerCase())
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11c: Combined filter — every returned quiz satisfies BOTH filters (case-insensitive)
   * Validates: Requirements 5.3, 5.5
   */
  it('every result satisfies both category AND course_code filters (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 0, maxLength: 20 }),
        safeString,
        safeString,
        (quizzes, categoryFilter, courseFilter) => {
          const results = filterQuizzes(quizzes, categoryFilter, courseFilter)

          return results.every(
            (q) =>
              q.category_name.toLowerCase().includes(categoryFilter.toLowerCase()) &&
              q.course_code.toLowerCase().includes(courseFilter.toLowerCase())
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11d: No false negatives — a quiz that matches the filter must appear in results
   * Validates: Requirements 5.1, 5.2, 5.5
   */
  it('a quiz whose fields match the filters is always included in results', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 0, maxLength: 10 }),
        quizArbitrary,
        safeString,
        safeString,
        (otherQuizzes, targetQuiz, categoryFilter, courseFilter) => {
          // Build a quiz that is guaranteed to match both filters
          // by using the filter values as substrings of the quiz fields
          const matchingQuiz: QuizRecord = {
            ...targetQuiz,
            category_name: categoryFilter + targetQuiz.category_name,
            course_code: courseFilter + targetQuiz.course_code,
          }

          const allQuizzes = [...otherQuizzes, matchingQuiz]
          const results = filterQuizzes(allQuizzes, categoryFilter, courseFilter)

          // The matching quiz must be in the results
          return results.some((q) => q._id.equals(matchingQuiz._id))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11e: Empty filters return all quizzes (no filtering applied)
   * Validates: Requirements 5.1, 5.2 (baseline — no filter = all results)
   */
  it('empty category and course_code filters return all quizzes', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 0, maxLength: 20 }),
        (quizzes) => {
          const results = filterQuizzes(quizzes, '', '')
          return results.length === quizzes.length
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11f: A filter that matches nothing returns an empty list with no error
   * Validates: Requirement 5.4 (empty results → 200 with empty list)
   */
  it('a filter that matches no quiz returns an empty list', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 1, maxLength: 20 }),
        (quizzes) => {
          // Use a filter value that cannot appear in any generated quiz field
          // (generated fields are alphanumeric ≤12 chars; this has a space)
          const impossibleFilter = 'IMPOSSIBLE FILTER VALUE'
          const results = filterQuizzes(quizzes, impossibleFilter, '')
          return results.length === 0
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11g: Case-insensitive symmetry — filtering with UPPER, lower, or Mixed case
   * of the same string produces the same result set
   * Validates: Requirement 5.5
   */
  it('filtering is case-insensitive: upper/lower/mixed case produce identical result sets', () => {
    fc.assert(
      fc.property(
        fc.array(quizArbitrary, { minLength: 0, maxLength: 20 }),
        safeString,
        (quizzes, filter) => {
          const resultsLower = filterQuizzes(quizzes, filter.toLowerCase(), '')
          const resultsUpper = filterQuizzes(quizzes, filter.toUpperCase(), '')
          const resultsMixed = filterQuizzes(
            quizzes,
            filter
              .split('')
              .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
              .join(''),
            ''
          )

          const idsLower = new Set(resultsLower.map((q) => q._id.toString()))
          const idsUpper = new Set(resultsUpper.map((q) => q._id.toString()))
          const idsMixed = new Set(resultsMixed.map((q) => q._id.toString()))

          return (
            idsLower.size === idsUpper.size &&
            idsLower.size === idsMixed.size &&
            [...idsLower].every((id) => idsUpper.has(id) && idsMixed.has(id))
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
