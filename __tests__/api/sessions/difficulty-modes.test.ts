/**
 * Test suite for quiz difficulty modes (sequential vs random)
 * Tests the implementation of 4 quiz modes:
 * 1. Immediate + Sequential (Học nhanh)
 * 2. Immediate + Random (Học sâu)
 * 3. Review + Sequential (Chế độ dễ)
 * 4. Review + Random (Chế độ khó)
 */

import { POST as createSessionHandler } from '@/app/api/sessions/route'
import { GET as getQuestionsHandler } from '@/app/api/sessions/[id]/questions/route'
import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'
import mongoose from 'mongoose'

// Mock MongoDB connection
jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn(),
}))

// Mock CSRF
jest.mock('@/lib/csrf', () => ({
  withCsrfHeaders: jest.fn((headers) => headers),
  validateCsrfToken: jest.fn(() => true),
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn((payload) => `mock-token-${payload.userId}`),
  verifyToken: jest.fn((req) => {
    const cookie = req.headers.get('Cookie')
    if (cookie?.includes('token=')) {
      const token = cookie.split('token=')[1].split(';')[0]
      const userId = token.replace('mock-token-', '')
      return Promise.resolve({ userId, role: 'student' })
    }
    return Promise.resolve(null)
  }),
}))

describe('Quiz Difficulty Modes', () => {
  const studentId = new mongoose.Types.ObjectId()
  const quizId = new mongoose.Types.ObjectId()
  const categoryId = new mongoose.Types.ObjectId()
  
  const mockQuestions = [
    {
      _id: new mongoose.Types.ObjectId(),
      text: 'Question 1',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [0],
      explanation: 'Explanation 1',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      text: 'Question 2',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [1],
      explanation: 'Explanation 2',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      text: 'Question 3',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [2],
      explanation: 'Explanation 3',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      text: 'Question 4',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [3],
      explanation: 'Explanation 4',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      text: 'Question 5',
      options: ['A', 'B', 'C', 'D'],
      correct_answer: [0],
      explanation: 'Explanation 5',
    },
  ]

  const mockQuiz = {
    _id: quizId,
    title: 'Test Quiz',
    category_id: categoryId,
    questions: mockQuestions,
    created_by: studentId,
    is_public: true,
    status: 'published',
  }

  let studentToken: string

  beforeAll(() => {
    const { signToken } = require('@/lib/auth')
    studentToken = signToken({ userId: studentId.toString(), role: 'student' })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
  })

  function makeRequest(method: string, body?: unknown, token?: string) {
    return new Request('http://localhost/api/sessions', {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `token=${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  describe('Sequential Mode', () => {
    it('creates session with sequential question order (immediate mode)', async () => {
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuiz),
        }),
      } as any)

      jest.spyOn(QuizSession, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any)
      jest.spyOn(QuizSession, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as any)

      let capturedSession: any
      jest.spyOn(QuizSession, 'create').mockImplementation((async (data: any) => {
        capturedSession = {
          ...data,
          _id: new mongoose.Types.ObjectId(),
        }
        return [capturedSession]
      }) as any)

      jest.spyOn(require('@/models/UserHighlight').UserHighlight, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as any)

      const req = makeRequest('POST', {
        quiz_id: quizId.toString(),
        mode: 'immediate',
        difficulty: 'sequential',
      }, studentToken)

      const res = await createSessionHandler(req)
      expect(res.status).toBe(201)

      // Verify the session was created with correct properties
      expect(capturedSession.mode).toBe('immediate')
      expect(capturedSession.difficulty).toBe('sequential')
      expect(capturedSession.question_order).toEqual([0, 1, 2, 3, 4])
    })

    it('creates session with sequential question order (review mode)', async () => {
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuiz),
        }),
      } as any)

      jest.spyOn(QuizSession, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any)
      jest.spyOn(QuizSession, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as any)

      let capturedSession: any
      jest.spyOn(QuizSession, 'create').mockImplementation((async (data: any) => {
        capturedSession = {
          ...data,
          _id: new mongoose.Types.ObjectId(),
        }
        return [capturedSession]
      }) as any)

      jest.spyOn(require('@/models/UserHighlight').UserHighlight, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as any)

      const req = makeRequest('POST', {
        quiz_id: quizId.toString(),
        mode: 'review',
        difficulty: 'sequential',
      }, studentToken)

      const res = await createSessionHandler(req)
      expect(res.status).toBe(201)

      expect(capturedSession.mode).toBe('review')
      expect(capturedSession.difficulty).toBe('sequential')
      expect(capturedSession.question_order).toEqual([0, 1, 2, 3, 4])
    })
  })

  describe('Random Mode', () => {
    it('creates session with randomized question order (immediate mode)', async () => {
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuiz),
        }),
      } as any)

      jest.spyOn(QuizSession, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any)
      jest.spyOn(QuizSession, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as any)

      let capturedQuestionOrder: number[] = []
      jest.spyOn(QuizSession, 'create').mockImplementation((async (data: any) => {
        capturedQuestionOrder = data.question_order
        return [{
          ...data,
          _id: new mongoose.Types.ObjectId(),
        }]
      }) as any)

      jest.spyOn(require('@/models/UserHighlight').UserHighlight, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as any)

      const req = makeRequest('POST', {
        quiz_id: quizId.toString(),
        mode: 'immediate',
        difficulty: 'random',
      }, studentToken)

      const res = await createSessionHandler(req)
      expect(res.status).toBe(201)
      
      // Verify question_order was created and contains all indices
      expect(capturedQuestionOrder).toHaveLength(5)
      expect(capturedQuestionOrder.sort()).toEqual([0, 1, 2, 3, 4])
      
      // The order should potentially be different from sequential (though not guaranteed in a single test)
      // At minimum, verify it's a valid permutation
      const uniqueIndices = new Set(capturedQuestionOrder)
      expect(uniqueIndices.size).toBe(5)
    })

    it('creates session with randomized question order (review mode)', async () => {
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuiz),
        }),
      } as any)

      jest.spyOn(QuizSession, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any)
      jest.spyOn(QuizSession, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as any)

      let capturedQuestionOrder: number[] = []
      jest.spyOn(QuizSession, 'create').mockImplementation((async (data: any) => {
        capturedQuestionOrder = data.question_order
        return [{
          ...data,
          _id: new mongoose.Types.ObjectId(),
        }]
      }) as any)

      jest.spyOn(require('@/models/UserHighlight').UserHighlight, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as any)

      const req = makeRequest('POST', {
        quiz_id: quizId.toString(),
        mode: 'review',
        difficulty: 'random',
      }, studentToken)

      const res = await createSessionHandler(req)
      expect(res.status).toBe(201)
      
      // Verify randomization
      expect(capturedQuestionOrder).toHaveLength(5)
      expect(capturedQuestionOrder.sort()).toEqual([0, 1, 2, 3, 4])
    })
  })

  describe('Question Order Preservation', () => {
    it('preserves question_order when fetching all questions', async () => {
      const sessionId = new mongoose.Types.ObjectId()
      const randomOrder = [2, 0, 4, 1, 3] // Shuffled order

      const mockSession = {
        _id: sessionId,
        student_id: studentId,
        quiz_id: quizId,
        mode: 'immediate',
        difficulty: 'random',
        status: 'active',
        question_order: randomOrder,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      jest.spyOn(require('@/lib/authz'), 'authorizeResource').mockResolvedValue(mockSession)
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockQuiz),
      } as any)

      const req = new Request(`http://localhost/api/sessions/${sessionId}/questions`, {
        method: 'GET',
        headers: {
          Cookie: `token=${studentToken}`,
        },
      })

      const res = await getQuestionsHandler(req, { params: Promise.resolve({ id: sessionId.toString() }) } as any)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.questions).toHaveLength(5)
      
      // Verify questions are returned in the randomized order
      expect(data.questions[0]._id.toString()).toBe(mockQuestions[2]._id.toString())
      expect(data.questions[1]._id.toString()).toBe(mockQuestions[0]._id.toString())
      expect(data.questions[2]._id.toString()).toBe(mockQuestions[4]._id.toString())
      expect(data.questions[3]._id.toString()).toBe(mockQuestions[1]._id.toString())
      expect(data.questions[4]._id.toString()).toBe(mockQuestions[3]._id.toString())
    })
  })

  describe('Validation', () => {
    it('rejects invalid difficulty value', async () => {
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuiz),
        }),
      } as any)

      const req = makeRequest('POST', {
        quiz_id: quizId.toString(),
        mode: 'immediate',
        difficulty: 'invalid',
      }, studentToken)

      const res = await createSessionHandler(req)
      expect(res.status).toBe(400)

      const data = await res.json()
      expect(data.error).toBe('Validation failed')
    })

    it('uses default difficulty (sequential) when not provided', async () => {
      jest.spyOn(Quiz, 'findById').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockQuiz),
        }),
      } as any)

      jest.spyOn(QuizSession, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any)
      jest.spyOn(QuizSession, 'findOne').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as any)

      let capturedDifficulty: string = ''
      jest.spyOn(QuizSession, 'create').mockImplementation((async (data: any) => {
        capturedDifficulty = data.difficulty
        return [{
          ...data,
          _id: new mongoose.Types.ObjectId(),
        }]
      }) as any)

      jest.spyOn(require('@/models/UserHighlight').UserHighlight, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      } as any)

      const req = makeRequest('POST', {
        quiz_id: quizId.toString(),
        mode: 'immediate',
        // difficulty not provided - should default to 'sequential'
      }, studentToken)

      const res = await createSessionHandler(req)
      expect(res.status).toBe(201)

      expect(capturedDifficulty).toBe('sequential')
    })
  })
})
