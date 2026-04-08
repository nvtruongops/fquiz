/**
 * Integration tests for API input validation
 * Tests that API routes properly validate inputs using schemas
 */

import {
  RegisterSchema,
  LoginSchema,
  CreateQuizSchema,
  SubmitAnswerSchema,
  CreateHighlightSchema,
  UpdateProfileSchema,
} from '../schemas'

describe('API Input Validation Integration', () => {
  describe('Authentication API Validation', () => {
    describe('Register endpoint', () => {
      it('validates username format', () => {
        const testCases = [
          { username: 'ab', valid: false, reason: 'too short' },
          { username: 'a'.repeat(31), valid: false, reason: 'too long' },
          { username: 'test@user', valid: false, reason: 'invalid characters' },
          { username: 'test user', valid: false, reason: 'contains space' },
          { username: 'test-user', valid: false, reason: 'contains hyphen' },
          { username: 'test_user', valid: true, reason: 'valid with underscore' },
          { username: 'TestUser123', valid: true, reason: 'valid alphanumeric' },
        ]

        testCases.forEach(({ username, valid, reason }) => {
          const result = RegisterSchema.safeParse({
            username,
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
          })
          expect(result.success).toBe(valid)
        })
      })

      it('validates email format', () => {
        const testCases = [
          { email: 'test@example.com', valid: true },
          { email: 'user.name+tag@example.co.uk', valid: true },
          { email: 'invalid', valid: false },
          { email: '@example.com', valid: false },
          { email: 'test@', valid: false },
          { email: 'test @example.com', valid: false },
          { email: '', valid: false },
        ]

        testCases.forEach(({ email, valid }) => {
          const result = RegisterSchema.safeParse({
            username: 'testuser',
            email,
            password: 'Password123',
            confirmPassword: 'Password123',
          })
          expect(result.success).toBe(valid)
        })
      })

      it('validates password strength', () => {
        const testCases = [
          { password: 'Pass123', valid: false, reason: 'too short' },
          { password: 'password123', valid: false, reason: 'no uppercase' },
          { password: 'PASSWORD123', valid: false, reason: 'no lowercase' },
          { password: 'PasswordABC', valid: false, reason: 'no digit' },
          { password: 'Password123', valid: true, reason: 'valid strong password' },
          { password: 'MyP@ssw0rd', valid: true, reason: 'valid with special char' },
        ]

        testCases.forEach(({ password, valid, reason }) => {
          const result = RegisterSchema.safeParse({
            username: 'testuser',
            email: 'test@example.com',
            password,
            confirmPassword: password,
          })
          expect(result.success).toBe(valid)
        })
      })

      it('validates password confirmation match', () => {
        const mismatchResult = RegisterSchema.safeParse({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password456',
        })
        expect(mismatchResult.success).toBe(false)

        const matchResult = RegisterSchema.safeParse({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
        expect(matchResult.success).toBe(true)
      })
    })

    describe('Login endpoint', () => {
      it('validates required fields', () => {
        const emptyIdentifier = LoginSchema.safeParse({
          identifier: '',
          password: 'password',
        })
        expect(emptyIdentifier.success).toBe(false)

        const emptyPassword = LoginSchema.safeParse({
          identifier: 'testuser',
          password: '',
        })
        expect(emptyPassword.success).toBe(false)

        const validLogin = LoginSchema.safeParse({
          identifier: 'testuser',
          password: 'password',
        })
        expect(validLogin.success).toBe(true)
      })

      it('accepts both email and username as identifier', () => {
        const emailLogin = LoginSchema.safeParse({
          identifier: 'test@example.com',
          password: 'password',
        })
        expect(emailLogin.success).toBe(true)

        const usernameLogin = LoginSchema.safeParse({
          identifier: 'testuser',
          password: 'password',
        })
        expect(usernameLogin.success).toBe(true)
      })
    })
  })

  describe('Quiz API Validation', () => {
    describe('Create Quiz endpoint', () => {
      it('validates quiz structure', () => {
        const validQuiz = {
          title: 'Math Quiz',
          category_id: '507f1f77bcf86cd799439011',
          course_code: 'MATH101',
          questions: [
            {
              text: 'What is 2+2?',
              options: ['3', '4', '5', '6'],
              correct_answer: [1],
            },
          ],
        }
        const result = CreateQuizSchema.safeParse(validQuiz)
        expect(result.success).toBe(true)
      })

      it('validates category_id is valid MongoDB ObjectId', () => {
        const invalidIds = [
          'invalid',
          '123',
          'not-a-mongo-id',
          '507f1f77bcf86cd79943901', // too short
          '507f1f77bcf86cd799439011z', // invalid character
        ]

        invalidIds.forEach(category_id => {
          const result = CreateQuizSchema.safeParse({
            title: 'Quiz',
            category_id,
            course_code: 'CODE',
            questions: [
              {
                text: 'Question?',
                options: ['A', 'B'],
                correct_answer: [0],
              },
            ],
          })
          expect(result.success).toBe(false)
        })
      })

      it('validates questions array constraints', () => {
        const baseQuiz = {
          title: 'Quiz',
          category_id: '507f1f77bcf86cd799439011',
          course_code: 'CODE',
        }

        // No questions
        const noQuestions = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: [],
        })
        expect(noQuestions.success).toBe(false)

        // Too many questions
        const tooManyQuestions = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: Array(101).fill({
            text: 'Question?',
            options: ['A', 'B'],
            correct_answer: [0],
          }),
        })
        expect(tooManyQuestions.success).toBe(false)

        // Valid number of questions
        const validQuestions = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: Array(50).fill({
            text: 'Question?',
            options: ['A', 'B'],
            correct_answer: [0],
          }),
        })
        expect(validQuestions.success).toBe(true)
      })

      it('validates question options constraints', () => {
        const baseQuiz = {
          title: 'Quiz',
          category_id: '507f1f77bcf86cd799439011',
          course_code: 'CODE',
        }

        // Too few options
        const tooFewOptions = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: [
            {
              text: 'Question?',
              options: ['Only one'],
              correct_answer: [0],
            },
          ],
        })
        expect(tooFewOptions.success).toBe(false)

        // Too many options
        const tooManyOptions = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: [
            {
              text: 'Question?',
              options: Array(11).fill('option'),
              correct_answer: [0],
            },
          ],
        })
        expect(tooManyOptions.success).toBe(false)

        // Valid options
        const validOptions = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: [
            {
              text: 'Question?',
              options: ['A', 'B', 'C', 'D'],
              correct_answer: [1],
            },
          ],
        })
        expect(validOptions.success).toBe(true)
      })

      it('validates correct_answer indices are within bounds', () => {
        const baseQuiz = {
          title: 'Quiz',
          category_id: '507f1f77bcf86cd799439011',
          course_code: 'CODE',
        }

        // Out of bounds
        const outOfBounds = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: [
            {
              text: 'Question?',
              options: ['A', 'B', 'C'],
              correct_answer: [5],
            },
          ],
        })
        expect(outOfBounds.success).toBe(false)

        // Within bounds
        const withinBounds = CreateQuizSchema.safeParse({
          ...baseQuiz,
          questions: [
            {
              text: 'Question?',
              options: ['A', 'B', 'C'],
              correct_answer: [0, 2],
            },
          ],
        })
        expect(withinBounds.success).toBe(true)
      })
    })

    describe('Submit Answer endpoint', () => {
      it('validates single answer submission', () => {
        const validSingle = SubmitAnswerSchema.safeParse({
          answer_index: 2,
          question_index: 0,
        })
        expect(validSingle.success).toBe(true)

        const negativeSingle = SubmitAnswerSchema.safeParse({
          answer_index: -1,
          question_index: 0,
        })
        expect(negativeSingle.success).toBe(false)
      })

      it('validates multiple answer submission', () => {
        const validMultiple = SubmitAnswerSchema.safeParse({
          answer_indexes: [0, 2, 3],
          question_index: 0,
        })
        expect(validMultiple.success).toBe(true)

        const emptyMultiple = SubmitAnswerSchema.safeParse({
          answer_indexes: [],
          question_index: 0,
        })
        expect(emptyMultiple.success).toBe(false)

        const negativeMultiple = SubmitAnswerSchema.safeParse({
          answer_indexes: [0, -1, 2],
          question_index: 0,
        })
        expect(negativeMultiple.success).toBe(false)
      })

      it('requires either answer_index or answer_indexes', () => {
        const neither = SubmitAnswerSchema.safeParse({
          question_index: 0,
        })
        expect(neither.success).toBe(false)

        const both = SubmitAnswerSchema.safeParse({
          answer_index: 1,
          answer_indexes: [1, 2],
          question_index: 0,
        })
        expect(both.success).toBe(true)
      })
    })
  })

  describe('Highlight API Validation', () => {
    it('validates highlight creation', () => {
      const validHighlight = CreateHighlightSchema.safeParse({
        question_id: '507f1f77bcf86cd799439011',
        text_segment: 'important text',
        color_code: '#B0D4B8',
        offset: 10,
      })
      expect(validHighlight.success).toBe(true)
    })

    it('validates only allowed color codes', () => {
      const allowedColors = ['#B0D4B8', '#D7F9FA', '#FFE082', '#EF9A9A']
      const invalidColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF']

      allowedColors.forEach(color => {
        const result = CreateHighlightSchema.safeParse({
          question_id: '507f1f77bcf86cd799439011',
          text_segment: 'text',
          color_code: color,
          offset: 0,
        })
        expect(result.success).toBe(true)
      })

      invalidColors.forEach(color => {
        const result = CreateHighlightSchema.safeParse({
          question_id: '507f1f77bcf86cd799439011',
          text_segment: 'text',
          color_code: color,
          offset: 0,
        })
        expect(result.success).toBe(false)
      })
    })

    it('validates offset constraints', () => {
      const testCases = [
        { offset: -1, valid: false },
        { offset: 0, valid: true },
        { offset: 5000, valid: true },
        { offset: 10000, valid: true },
        { offset: 10001, valid: false },
      ]

      testCases.forEach(({ offset, valid }) => {
        const result = CreateHighlightSchema.safeParse({
          question_id: '507f1f77bcf86cd799439011',
          text_segment: 'text',
          color_code: '#B0D4B8',
          offset,
        })
        expect(result.success).toBe(valid)
      })
    })
  })

  describe('Profile API Validation', () => {
    it('validates profile bio length', () => {
      const validBio = UpdateProfileSchema.safeParse({
        profile_bio: 'This is a valid bio',
      })
      expect(validBio.success).toBe(true)

      const tooLongBio = UpdateProfileSchema.safeParse({
        profile_bio: 'a'.repeat(301),
      })
      expect(tooLongBio.success).toBe(false)

      const maxLengthBio = UpdateProfileSchema.safeParse({
        profile_bio: 'a'.repeat(300),
      })
      expect(maxLengthBio.success).toBe(true)
    })

    it('validates avatar URL format', () => {
      const validUrls = [
        'https://example.com/avatar.jpg',
        'http://cdn.example.com/images/user/123.png',
        'https://www.example.com/path/to/image.gif',
      ]

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/image.jpg',
        'javascript:alert(1)',
        '//example.com/image.jpg',
      ]

      validUrls.forEach(url => {
        const result = UpdateProfileSchema.safeParse({
          avatar_url: url,
        })
        expect(result.success).toBe(true)
      })

      invalidUrls.forEach(url => {
        const result = UpdateProfileSchema.safeParse({
          avatar_url: url,
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Data Sanitization', () => {
    it('trims whitespace from string inputs', () => {
      const result = RegisterSchema.safeParse({
        username: '  testuser  ',
        email: '  test@example.com  ',
        password: 'Password123',
        confirmPassword: 'Password123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.username).toBe('testuser')
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('normalizes email to lowercase', () => {
      const result = RegisterSchema.safeParse({
        username: 'testuser',
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
        confirmPassword: 'Password123',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('trims whitespace from quiz fields', () => {
      const result = CreateQuizSchema.safeParse({
        title: '  Math Quiz  ',
        category_id: '507f1f77bcf86cd799439011',
        course_code: '  MATH101  ',
        questions: [
          {
            text: 'Question?',
            options: ['A', 'B'],
            correct_answer: [0],
          },
        ],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Math Quiz')
        expect(result.data.course_code).toBe('MATH101')
      }
    })
  })

  describe('Security Validation', () => {
    it('prevents excessively long inputs', () => {
      const longUsername = RegisterSchema.safeParse({
        username: 'a'.repeat(1000),
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      })
      expect(longUsername.success).toBe(false)

      const longPassword = RegisterSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'P'.repeat(1000) + 'assword123',
        confirmPassword: 'P'.repeat(1000) + 'assword123',
      })
      expect(longPassword.success).toBe(false)
    })

    it('validates MongoDB ObjectId format to prevent injection', () => {
      const injectionAttempts = [
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '${process.env.SECRET}',
      ]

      injectionAttempts.forEach(malicious => {
        const result = CreateQuizSchema.safeParse({
          title: 'Quiz',
          category_id: malicious,
          course_code: 'CODE',
          questions: [
            {
              text: 'Question?',
              options: ['A', 'B'],
              correct_answer: [0],
            },
          ],
        })
        expect(result.success).toBe(false)
      })
    })
  })
})
