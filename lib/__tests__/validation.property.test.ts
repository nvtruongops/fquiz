import fc from 'fast-check'
import {
  RegisterSchema,
  QuestionSchema,
  CreateQuizSchema,
  CreateHighlightSchema,
} from '../schemas'

/**
 * Property-based tests using fast-check for comprehensive validation coverage
 */

// Arbitraries for generating test data
const validUsernameArb = fc.stringMatching(/^[a-zA-Z0-9_]{3,30}$/)

const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,20}$/),
    fc.stringMatching(/^[a-z0-9]{1,15}$/),
    fc.constantFrom('com', 'net', 'org', 'io', 'edu', 'vn')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

const validPasswordArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[A-Z]{2,5}$/),
    fc.stringMatching(/^[0-9]{3,5}$/)
  )
  .map(([lower, upper, digit]) => lower + upper + digit) // Min: 3+2+3=8 chars

const mongoIdArb = fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 24, maxLength: 24 })
  .map(arr => arr.map(n => n.toString(16)).join(''))

const validColorArb = fc.constantFrom('#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A')

describe('Property-based: RegisterSchema', () => {
  it('P1: accepts all valid registration combinations', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        validPasswordArb,
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === true
        }
      ),
      { numRuns: 200 }
    )
  })

  it('P2: rejects all usernames shorter than 3 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 2 }),
        validEmailArb,
        validPasswordArb,
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P3: rejects all usernames longer than 30 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 31, maxLength: 50 }),
        validEmailArb,
        validPasswordArb,
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P4: rejects all passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        fc.string({ maxLength: 7 }),
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P5: rejects all passwords without uppercase letter', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        fc.stringMatching(/^[a-z0-9]{8,20}$/),
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P6: rejects all passwords without lowercase letter', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        fc.stringMatching(/^[A-Z0-9]{8,20}$/),
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P7: rejects all passwords without digit', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        fc.stringMatching(/^[a-zA-Z]{8,20}$/),
        (username, email, password) => {
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword: password,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P8: rejects all mismatched password confirmations', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        validPasswordArb,
        validPasswordArb,
        (username, email, password, confirmPassword) => {
          fc.pre(password !== confirmPassword)
          const result = RegisterSchema.safeParse({
            username,
            email,
            password,
            confirmPassword,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property-based: QuestionSchema', () => {
  const validQuestionArb = fc.record({
    text: fc.string({ minLength: 1, maxLength: 100 }),
    options: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
    correct_answer: fc.array(fc.nat(9), { minLength: 1, maxLength: 5 }),
    explanation: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  })

  it('P9: accepts valid questions with correct_answer within bounds', () => {
    fc.assert(
      fc.property(validQuestionArb, (question) => {
        // Ensure correct_answer indices are within options bounds
        const validQuestion = {
          ...question,
          correct_answer: question.correct_answer.filter(idx => idx < question.options.length),
        }
        
        if (validQuestion.correct_answer.length === 0) {
          validQuestion.correct_answer = [0]
        }

        const result = QuestionSchema.safeParse(validQuestion)
        return result.success === true
      }),
      { numRuns: 200 }
    )
  })

  it('P10: rejects questions with correct_answer out of bounds', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
        (text, options) => {
          const outOfBoundsIndex = options.length + 1
          const result = QuestionSchema.safeParse({
            text,
            options,
            correct_answer: [outOfBoundsIndex],
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P11: rejects questions with less than 2 options', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 1 }),
        (text, options) => {
          const result = QuestionSchema.safeParse({
            text,
            options,
            correct_answer: [0],
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P12: rejects questions with more than 10 options', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 11, maxLength: 15 }),
        (text, options) => {
          const result = QuestionSchema.safeParse({
            text,
            options,
            correct_answer: [0],
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property-based: CreateQuizSchema', () => {
  const validQuizArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }),
    category_id: mongoIdArb,
    course_code: fc.string({ minLength: 1, maxLength: 50 }),
    questions: fc.array(
      fc.record({
        text: fc.string({ minLength: 1, maxLength: 100 }),
        options: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
        correct_answer: fc.constant([0]),
      }),
      { minLength: 1, maxLength: 100 }
    ),
    status: fc.constantFrom('published' as const, 'draft' as const),
  })

  it('P13: accepts all valid quiz configurations', () => {
    fc.assert(
      fc.property(validQuizArb, (quiz) => {
        const result = CreateQuizSchema.safeParse(quiz)
        return result.success === true
      }),
      { numRuns: 200 }
    )
  })

  it('P14: rejects quizzes with invalid category_id format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 23 }), // Too short
          fc.string({ minLength: 25, maxLength: 50 }), // Too long
          fc.constant('GGGGGGGGGGGGGGGGGGGGGGGG'), // Invalid chars
          fc.constant('12345678901234567890123Z'), // Invalid char at end
          fc.constant('not-a-valid-objectid-!!!') // Clearly invalid
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        (title, category_id, course_code) => {
          const result = CreateQuizSchema.safeParse({
            title,
            category_id,
            course_code,
            questions: [
              {
                text: 'Question?',
                options: ['A', 'B'],
                correct_answer: [0],
              },
            ],
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P15: rejects quizzes with no questions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        mongoIdArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (title, category_id, course_code) => {
          const result = CreateQuizSchema.safeParse({
            title,
            category_id,
            course_code,
            questions: [],
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P16: rejects quizzes with more than 100 questions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        mongoIdArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            options: fc.constant(['A', 'B']),
            correct_answer: fc.constant([0]),
          }),
          { minLength: 101, maxLength: 105 }
        ),
        (title, category_id, course_code, questions) => {
          const result = CreateQuizSchema.safeParse({
            title,
            category_id,
            course_code,
            questions,
          })
          return result.success === false
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('Property-based: CreateHighlightSchema', () => {
  const validHighlightArb = fc.record({
    question_id: mongoIdArb,
    text_segment: fc.string({ minLength: 1, maxLength: 500 }),
    color_code: validColorArb,
    offset: fc.integer({ min: 0, max: 10000 }),
  })

  it('P17: accepts all valid highlight configurations', () => {
    fc.assert(
      fc.property(validHighlightArb, (highlight) => {
        const result = CreateHighlightSchema.safeParse(highlight)
        return result.success === true
      }),
      { numRuns: 200 }
    )
  })

  it('P18: rejects highlights with invalid question_id', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 23 }), // Too short
          fc.string({ minLength: 25, maxLength: 50 }), // Too long
          fc.constant('GGGGGGGGGGGGGGGGGGGGGGGG'), // Invalid chars
          fc.constant('not-valid-id-at-all-!!!!') // Clearly invalid
        ),
        fc.string({ minLength: 1, maxLength: 500 }),
        validColorArb,
        fc.integer({ min: 0, max: 10000 }),
        (question_id, text_segment, color_code, offset) => {
          const result = CreateHighlightSchema.safeParse({
            question_id,
            text_segment,
            color_code,
            offset,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P19: rejects highlights with negative offset', () => {
    fc.assert(
      fc.property(
        mongoIdArb,
        fc.string({ minLength: 1, maxLength: 500 }),
        validColorArb,
        fc.integer({ max: -1 }),
        (question_id, text_segment, color_code, offset) => {
          const result = CreateHighlightSchema.safeParse({
            question_id,
            text_segment,
            color_code,
            offset,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P20: rejects highlights with offset > 10000', () => {
    fc.assert(
      fc.property(
        mongoIdArb,
        fc.string({ minLength: 1, maxLength: 500 }),
        validColorArb,
        fc.integer({ min: 10001, max: 100000 }),
        (question_id, text_segment, color_code, offset) => {
          const result = CreateHighlightSchema.safeParse({
            question_id,
            text_segment,
            color_code,
            offset,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P21: rejects highlights with invalid color codes', () => {
    fc.assert(
      fc.property(
        mongoIdArb,
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 6, maxLength: 6 })
          .map(arr => '#' + arr.map(n => n.toString(16)).join('').toUpperCase())
          .filter(c => !['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A'].includes(c)),
        fc.integer({ min: 0, max: 10000 }),
        (question_id, text_segment, color_code, offset) => {
          const result = CreateHighlightSchema.safeParse({
            question_id,
            text_segment,
            color_code,
            offset,
          })
          return result.success === false
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property-based: Edge cases and invariants', () => {
  it('P22: trimming never changes validation result for valid inputs', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        validPasswordArb,
        fc.string({ maxLength: 5 }).filter(s => /^\s*$/.test(s)),
        (username, email, password, whitespace) => {
          const withWhitespace = RegisterSchema.safeParse({
            username: whitespace + username + whitespace,
            email: whitespace + email + whitespace,
            password,
            confirmPassword: password,
          })
          
          const withoutWhitespace = RegisterSchema.safeParse({
            username,
            email: email.toLowerCase(),
            password,
            confirmPassword: password,
          })
          
          // Both should succeed since we're using validPasswordArb
          return withWhitespace.success === true && withoutWhitespace.success === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('P23: email case normalization is consistent', () => {
    fc.assert(
      fc.property(
        validUsernameArb,
        validEmailArb,
        validPasswordArb,
        (username, email, password) => {
          const upperResult = RegisterSchema.safeParse({
            username,
            email: email.toUpperCase(),
            password,
            confirmPassword: password,
          })
          
          const lowerResult = RegisterSchema.safeParse({
            username,
            email: email.toLowerCase(),
            password,
            confirmPassword: password,
          })
          
          return upperResult.success === lowerResult.success
        }
      ),
      { numRuns: 100 }
    )
  })
})
