/**
 * Unit tests for POST /api/student/quizzes/from-pinned
 */

import { POST } from '../route'
import { Types } from 'mongoose'

jest.mock('next/server', () => {
  class MockNextResponse {
    body: any
    status: number
    constructor(body: any, init?: any) {
      this.body = body
      this.status = init?.status ?? 200
    }
    static json(body: any, init?: any) {
      return new MockNextResponse(body, init)
    }
  }
  return { NextResponse: MockNextResponse }
})

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/auth', () => ({
  verifyToken: jest.fn().mockResolvedValue({ userId: '507f1f77bcf86cd799439011', role: 'student' }),
}))

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) =>
    handler(req, {
      payload: { userId: '507f1f77bcf86cd799439011', role: 'student', v: 1 },
      params: ctx?.params,
    }),
}))

const mockQuizCountDocuments = jest.fn()
const mockQuizFind = jest.fn()
const mockQuizFindOne = jest.fn()
const mockQuizCreate = jest.fn()
const mockPinnedFind = jest.fn()
const mockEnsureCategory = jest.fn()

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    countDocuments: (...args: any[]) => mockQuizCountDocuments(...args),
    find: (...args: any[]) => mockQuizFind(...args),
    findOne: (...args: any[]) => mockQuizFindOne(...args),
    create: (...args: any[]) => mockQuizCreate(...args),
  },
}))

jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: new Types.ObjectId('507f1f77bcf86cd799439099') }),
      }),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/PinnedQuestion', () => ({
  PinnedQuestion: {
    find: (...args: any[]) => mockPinnedFind(...args),
  },
}))

jest.mock('@/lib/modules/quiz/utils/category-helper', () => ({
  ensureCategoryForCourseCode: (...args: any[]) => mockEnsureCategory(...args),
}))

describe('POST /api/student/quizzes/from-pinned', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnsureCategory.mockResolvedValue({
      _id: new Types.ObjectId('507f1f77bcf86cd799439099'),
      name: 'NWC303',
    })
    mockQuizFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    })
  })

  it('should return 400 if course_code is missing', async () => {
    const req = new Request('https://web.example.test/api/student/quizzes/from-pinned', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = (await POST(req, {} as any)) as any
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Course code is required.')
  })

  it('should return 409 if user exceeds total quota (>= 10)', async () => {
    mockQuizCountDocuments.mockResolvedValueOnce(10)
    const req = new Request('https://web.example.test/api/student/quizzes/from-pinned', {
      method: 'POST',
      body: JSON.stringify({ course_code: 'NWC303' }),
    })
    const res = (await POST(req, {} as any)) as any
    expect(res.status).toBe(409)
    expect(res.body.quotaExceeded).toBe(true)
  })

  it('should return 400 if no pinned questions exist for course', async () => {
    mockQuizCountDocuments.mockResolvedValueOnce(2)
    mockPinnedFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    })

    const req = new Request('https://web.example.test/api/student/quizzes/from-pinned', {
      method: 'POST',
      body: JSON.stringify({ course_code: 'NWC303' }),
    })
    const res = (await POST(req, {} as any)) as any
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('No pinned questions found')
  })

  it('should create a quiz from pinned questions successfully', async () => {
    mockQuizCountDocuments.mockResolvedValueOnce(2)
    mockPinnedFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId('507f1f77bcf86cd799439001'),
            text: 'Question 1',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_answer: [1],
            explanation: 'Exp 1',
          },
          {
            _id: new Types.ObjectId('507f1f77bcf86cd799439002'),
            text: 'Question 2',
            options: ['A', 'B'],
            correct_answer: [0],
          },
        ]),
      }),
    })
    mockQuizFindOne.mockResolvedValueOnce(null)
    const createdDoc = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439088'),
      title: 'NWC303 - Pinned Quiz (2 QUESTIONS)',
      course_code: 'NWC303',
      questionCount: 2,
    }
    mockQuizCreate.mockResolvedValueOnce(createdDoc)

    const req = new Request('https://web.example.test/api/student/quizzes/from-pinned', {
      method: 'POST',
      body: JSON.stringify({ course_code: 'NWC303' }),
    })
    const res = (await POST(req, {} as any)) as any

    expect(res.status).toBe(201)
    expect(res.body.quiz).toBeDefined()
    expect(mockQuizCreate).toHaveBeenCalled()
  })

  it('should update existing pinned quiz if already created previously', async () => {
    mockQuizCountDocuments.mockResolvedValueOnce(2)
    mockPinnedFind.mockReturnValueOnce({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId('507f1f77bcf86cd799439001'),
            text: 'Question 1',
            options: ['Option A', 'Option B'],
            correct_answer: [0],
          },
        ]),
      }),
    })
    const mockSave = jest.fn().mockResolvedValue(true)
    const existingDoc = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439088'),
      title: 'Old Title',
      course_code: 'NWC303',
      questions: [],
      questionCount: 0,
      save: mockSave,
    }
    mockQuizFindOne.mockResolvedValueOnce(existingDoc)

    const req = new Request('https://web.example.test/api/student/quizzes/from-pinned', {
      method: 'POST',
      body: JSON.stringify({ course_code: 'NWC303' }),
    })
    const res = (await POST(req, {} as any)) as any

    expect(res.status).toBe(201)
    expect(mockSave).toHaveBeenCalled()
    expect(mockQuizCreate).not.toHaveBeenCalled()
  })
})
