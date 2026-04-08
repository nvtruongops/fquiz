/// <reference types="jest" />

jest.mock('@/lib/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn() }))
jest.mock('@/models/QuizSession', () => ({
  QuizSession: {
    aggregate: jest.fn(),
    find: jest.fn(),
  },
}))
jest.mock('@/models/Quiz', () => ({
  Quiz: {
    find: jest.fn(),
  },
}))
jest.mock('@/models/Category', () => ({
  Category: {
    find: jest.fn(),
  },
}))
jest.mock('@/models/User', () => ({
  User: {
    find: jest.fn(),
  },
}))

import { Types } from 'mongoose'
import { GET as dashboardGet } from '@/app/api/student/dashboard/route'
import { verifyToken } from '@/lib/auth'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { Category } from '@/models/Category'
import { User } from '@/models/User'

function makeRequest(path = '/api/student/dashboard'): Request {
  return new Request(`http://localhost${path}`, { method: 'GET' })
}

function makeSessionFindBuilder(leanValue: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(leanValue),
  }
}

describe('GET /api/student/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 for non-student payload', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValue({ role: 'admin', userId: new Types.ObjectId().toString() })

    const res = await dashboardGet(makeRequest())
    expect(res.status).toBe(401)
  })

  it('merges completed + active activities and includes history-style source/category/quiz-code metadata', async () => {
    const studentObjectId = new Types.ObjectId()
    const userId = studentObjectId.toString()
    ;(verifyToken as jest.Mock).mockResolvedValue({ role: 'student', userId })

    const quizIdCompleted = new Types.ObjectId()
    const quizIdActive = new Types.ObjectId()
    const completedSessionId = new Types.ObjectId()
    const activeSessionId = new Types.ObjectId()
    const creatorCompleted = studentObjectId
    const creatorActive = studentObjectId

    ;(QuizSession.aggregate as jest.Mock)
      .mockResolvedValueOnce([
        { totalQuizzes: 1, averageScore: 7.5, totalCorrectAnswers: 12 },
      ])
      .mockResolvedValueOnce([
        { totalDurationMs: 3600000 },
      ])
      .mockResolvedValueOnce([
        { latestSessionId: completedSessionId },
      ])
      .mockResolvedValueOnce([
        { latestSessionId: activeSessionId },
      ])

    const completedSessions = [
      {
        _id: completedSessionId,
        quiz_id: {
          _id: quizIdCompleted,
          title: 'Completed Quiz Title',
          course_code: 'TEST_001',
          questionCount: 10,
          questions: [],
        },
        score: 8,
        user_answers: [
          { question_index: 0, is_correct: true },
          { question_index: 1, is_correct: false },
        ],
        completed_at: new Date('2026-04-08T08:00:00.000Z'),
      },
    ]

    const activeSessions = [
      {
        _id: activeSessionId,
        quiz_id: {
          _id: quizIdActive,
          title: 'Active Quiz Title',
          course_code: 'TEST_002',
          questionCount: 5,
          questions: [],
        },
        user_answers: [{ question_index: 0 }, { question_index: 1 }],
        started_at: new Date('2026-04-08T09:00:00.000Z'),
      },
    ]

    ;(QuizSession.find as jest.Mock)
      .mockImplementationOnce(() => makeSessionFindBuilder(completedSessions))
      .mockImplementationOnce(() => makeSessionFindBuilder(activeSessions))

    const categoryA = new Types.ObjectId()
    const categoryB = new Types.ObjectId()

    ;(Quiz.find as jest.Mock)
      .mockImplementationOnce(() => ({
        lean: jest.fn().mockResolvedValue([
          {
            _id: quizIdCompleted,
            category_id: categoryA,
            created_by: creatorCompleted,
            is_saved_from_explore: false,
            original_quiz_id: null,
            course_code: 'TEST_001',
          },
          {
            _id: quizIdActive,
            category_id: categoryB,
            created_by: creatorActive,
            is_saved_from_explore: false,
            original_quiz_id: null,
            course_code: 'TEST_002',
          },
        ]),
      }))
      .mockImplementationOnce(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }))

    ;(Category.find as jest.Mock).mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue([
        { _id: categoryA, name: 'Test' },
        { _id: categoryB, name: 'Test 2' },
      ]),
    }))

    ;(User.find as jest.Mock).mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue([
        { _id: creatorCompleted, username: 'admin' },
        { _id: creatorActive, username: 'student' },
      ]),
    }))

    const res = await dashboardGet(makeRequest())
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data.recentActivities)).toBe(true)
    expect(data.recentActivities).toHaveLength(2)

    const byQuizCode = new Map<string, any>(
      data.recentActivities.map((item: any) => [item.quizCode, item])
    )

    expect(byQuizCode.get('TEST_001')?.categoryName).toBe('Test')
    expect(byQuizCode.get('TEST_001')?.sourceLabel).toBe('Tự tạo')
    expect(byQuizCode.get('TEST_001')?.sourceCreatorName).toBe('student')
    expect(byQuizCode.get('TEST_001')?.status).toBe('completed')

    expect(byQuizCode.get('TEST_002')?.categoryName).toBe('Test 2')
    expect(byQuizCode.get('TEST_002')?.sourceLabel).toBe('Tự tạo')
    expect(byQuizCode.get('TEST_002')?.sourceCreatorName).toBe('student')
    expect(byQuizCode.get('TEST_002')?.status).toBe('active')
  })
})
