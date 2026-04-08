/// <reference types="jest" />

type StudentQuizResponse = {
  quizzes: Array<{ course_code: string; sourceStatus: 'available' | 'source_locked' | 'not_applicable' }>
}
jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/models/Quiz', () => ({
  Quiz: {
    find: jest.fn(),
  },
}))
jest.mock('@/models/QuizSession', () => ({
  QuizSession: {
    aggregate: jest.fn(),
  },
}))
jest.mock('@/models/Category', () => ({
  Category: {
    findById: jest.fn(),
  },
}))
jest.mock('@/lib/cloudinary', () => ({
  uploadImage: jest.fn(),
}))

import { Types } from 'mongoose'
import { GET as studentQuizzesGet } from '@/app/api/student/quizzes/route'
import { verifyToken } from '@/lib/auth'
import { Quiz } from '@/models/Quiz'
import { QuizSession } from '@/models/QuizSession'

function makeRequest(path = '/api/student/quizzes'): Request {
  return new Request(`http://localhost${path}`, { method: 'GET' })
}

function makeQuizFindBuilder(leanValue: unknown) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(leanValue),
  }
  return builder
}

describe('GET /api/student/quizzes - sourceStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns sourceStatus=available and sourceStatus=source_locked for saved Explore quizzes', async () => {
    const userId = new Types.ObjectId().toString()
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId, role: 'student' })

    const displaySavedAvailableId = new Types.ObjectId()
    const displaySavedLockedId = new Types.ObjectId()
    const displayOwnQuizId = new Types.ObjectId()

    const originalAvailableId = new Types.ObjectId()
    const originalLockedId = new Types.ObjectId()

    const quizzesForList = [
      {
        _id: displaySavedAvailableId,
        title: 'Saved 1',
        course_code: 'SAVE1',
        questionCount: 0,
        questions: [],
        status: 'published',
        is_public: false,
        created_at: new Date(),
        category_id: { _id: new Types.ObjectId(), name: 'Cat A' },
        is_saved_from_explore: true,
        original_quiz_id: {
          _id: originalAvailableId,
          questionCount: 12,
          questions: [],
        },
      },
      {
        _id: displaySavedLockedId,
        title: 'Saved 2',
        course_code: 'SAVE2',
        questionCount: 0,
        questions: [],
        status: 'published',
        is_public: false,
        created_at: new Date(),
        category_id: { _id: new Types.ObjectId(), name: 'Cat A' },
        is_saved_from_explore: true,
        original_quiz_id: {
          _id: originalLockedId,
          questionCount: 8,
          questions: [],
        },
      },
      {
        _id: displayOwnQuizId,
        title: 'Own quiz',
        course_code: 'OWN1',
        questionCount: 5,
        questions: [1, 2, 3, 4, 5],
        status: 'draft',
        is_public: false,
        created_at: new Date(),
        category_id: { _id: new Types.ObjectId(), name: 'Cat B' },
        is_saved_from_explore: false,
        original_quiz_id: null,
      },
    ]

    const originalMeta = [
      { _id: originalAvailableId, status: 'published', is_public: true },
      { _id: originalLockedId, status: 'draft', is_public: false },
    ]

    ;(Quiz.find as jest.Mock)
      .mockImplementationOnce(() => makeQuizFindBuilder(quizzesForList))
      .mockImplementationOnce(() => makeQuizFindBuilder(originalMeta))

    ;(QuizSession.aggregate as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const res = await studentQuizzesGet(makeRequest())
    expect(res.status).toBe(200)

    const data = (await res.json()) as StudentQuizResponse
    expect(Array.isArray(data.quizzes)).toBe(true)

    const byCode = new Map<string, StudentQuizResponse['quizzes'][number]>(
      data.quizzes.map((q) => [q.course_code, q])
    )

    expect(byCode.get('SAVE1')?.sourceStatus).toBe('available')
    expect(byCode.get('SAVE2')?.sourceStatus).toBe('source_locked')
    expect(byCode.get('OWN1')?.sourceStatus).toBe('not_applicable')
  })

  it('returns 400 for invalid categoryId format', async () => {
    const userId = new Types.ObjectId().toString()
    ;(verifyToken as jest.Mock).mockResolvedValue({ userId, role: 'student' })

    const res = await studentQuizzesGet(makeRequest('/api/student/quizzes?categoryId=not-an-objectid'))
    expect(res.status).toBe(400)
  })
})
