/**
 * Unit tests for GET /api/student/dashboard route handler
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) =>
    handler(req, {
      payload: { userId: '507f1f77bcf86cd799439011', role: 'student', v: 1 },
      params: ctx?.params,
    }),
}))

const mockSessionFindLean = jest.fn().mockResolvedValue([])
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    aggregate: jest.fn().mockResolvedValue([]),
    find: jest.fn(() => ({
      sort: jest.fn().mockReturnValue({ lean: mockSessionFindLean }),
    })),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
    aggregate: jest.fn().mockResolvedValue([]),
  },
}))

const mockCategoryFindLean = jest.fn().mockResolvedValue([])
jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    find: jest.fn(() => ({ lean: mockCategoryFindLean })),
  },
}))

const mockUserSelectLean = jest.fn().mockResolvedValue({ pinned_categories: [] })
jest.mock('@/lib/modules/auth/models/User', () => ({
  User: {
    findById: jest.fn(() => ({
      select: jest.fn().mockReturnValue({ lean: mockUserSelectLean }),
    })),
  },
}))

jest.mock('@/lib/modules/quiz/quiz-source-utils', () => ({
  inferSourceType: jest.fn().mockReturnValue('own'),
  sourceLabelFromType: jest.fn().mockReturnValue('Của tôi'),
  mixQuizDisplayCode: jest.fn().mockReturnValue('TRỘN'),
  buildOriginalCreatorMap: jest.fn().mockResolvedValue(new Map()),
  buildCategoryNameMap: jest.fn().mockResolvedValue(new Map()),
  buildCreatorNameMap: jest.fn().mockResolvedValue(new Map()),
  resolveSourceCreatorId: jest.fn().mockReturnValue(null),
}))

jest.mock('@/lib/modules/auth/services/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => ({})),
}))

import { GET } from '../route'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Types } from 'mongoose'

describe('GET /api/student/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUserSelectLean.mockResolvedValue({ pinned_categories: [] })
    mockCategoryFindLean.mockResolvedValue([])
    mockSessionFindLean.mockResolvedValue([])
    // Restore default implementations (clearAllMocks keeps prior mockImplementation overrides)
    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([])
    ;(QuizSession.find as jest.Mock).mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({ lean: mockSessionFindLean }),
    }))
    ;(Quiz.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    })
    ;(Quiz.aggregate as jest.Mock).mockResolvedValue([])
  })

  it('should return empty recentActivities and pinnedCategories for fresh user', async () => {
    const req = new Request('http://localhost/api/student/dashboard')
    const res = await (GET as any)(req, { params: {} })

    expect(res.status).toBe(200)
    expect(res.body.recentActivities).toEqual([])
    expect(res.body.pinnedCategories).toEqual([])
  })

  it('should exclude expired active sessions from the active aggregation', async () => {
    const req = new Request('http://localhost/api/student/dashboard')
    await (GET as any)(req, { params: {} })

    // 2nd aggregate call = active sessions lookup
    const activePipeline = (QuizSession.aggregate as jest.Mock).mock.calls[1][0]
    const match = activePipeline[0].$match
    expect(match.status).toBe('active')
    expect(match.$or).toEqual(
      expect.arrayContaining([
        { expires_at: { $gt: expect.any(Date) } },
        { expires_at: { $exists: false } },
        { expires_at: null },
      ])
    )
  })

  it('should resolve pinned categories with names and quiz counts in pin order', async () => {
    const pinnedId = '507f1f77bcf86cd799439033'
    mockUserSelectLean.mockResolvedValue({ pinned_categories: [pinnedId] })
    mockCategoryFindLean.mockResolvedValue([{ _id: pinnedId, name: 'DBS401' }])

    const { Quiz } = jest.requireMock('@/lib/modules/quiz/models/Quiz')
    ;(Quiz.aggregate as jest.Mock).mockResolvedValue([{ _id: pinnedId, count: 7 }])

    const req = new Request('http://localhost/api/student/dashboard')
    const res = await (GET as any)(req, { params: {} })

    expect(res.status).toBe(200)
    expect(res.body.pinnedCategories).toEqual([{ id: pinnedId, name: 'DBS401', quizCount: 7 }])
  })

  it('should skip pinned IDs that no longer resolve to a category', async () => {
    mockUserSelectLean.mockResolvedValue({ pinned_categories: ['507f1f77bcf86cd799439044'] })
    mockCategoryFindLean.mockResolvedValue([]) // category deleted

    const req = new Request('http://localhost/api/student/dashboard')
    const res = await (GET as any)(req, { params: {} })

    expect(res.status).toBe(200)
    expect(res.body.pinnedCategories).toEqual([])
  })

  it('should score retry-wrong sessions by session question count, not the whole quiz count', async () => {
    // Regression: a 2-question retry session with 2 correct used to show 0.4/10
    // because the score was divided by the quiz's global questionCount (50).
    const quizId = '507f1f77bcf86cd799439110'
    const sessionId = '607f1f77bcf86cd799439110'
    const session = {
      _id: new Types.ObjectId(sessionId),
      quiz_id: new Types.ObjectId(quizId),
      mode: 'immediate',
      status: 'completed',
      score: 2, // 2 correct
      user_answers: [
        { question_index: 5, answer_index: 0, is_correct: true },
        { question_index: 12, answer_index: 1, is_correct: true },
      ],
      question_order: [5, 12], // retry-wrong subset of 2 questions
      started_at: new Date('2026-07-27T10:00:00Z'),
      completed_at: new Date('2026-07-27T10:05:00Z'),
      is_temp: false,
    }
    const quiz = {
      _id: new Types.ObjectId(quizId),
      title: 'DBS401_SP26_RE',
      course_code: 'DBS401_SP26_RE',
      questionCount: 50, // full quiz has 50 questions
      category_id: null,
      created_by: null,
      is_saved_from_explore: false,
      original_quiz_id: null,
    }

    ;(QuizSession.aggregate as jest.Mock)
      .mockResolvedValueOnce([{ latestSessionId: session._id }])
      .mockResolvedValueOnce([]) // no active sessions
      .mockResolvedValueOnce([{ _id: { quiz_id: session.quiz_id, mode_group: 'assessment' } }])
    ;(QuizSession.find as jest.Mock).mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([session]) }),
    }))
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([quiz]) })

    const req = new Request('http://localhost/api/student/dashboard')
    const res = await (GET as any)(req, { params: {} })

    expect(res.status).toBe(200)
    expect(res.body.recentActivities).toHaveLength(1)
    const activity = res.body.recentActivities[0]
    expect(activity.totalCount).toBe(2)
    expect(activity.score).toBe(10) // 2/2 = 10/10, not (2/50)*10 = 0.4
  })

  it('should keep an older in-progress session in the feed instead of dropping it past the limit', async () => {
    // 5 completed sessions on distinct quizzes — all NEWER than the active session.
    // Old behavior: .slice(0, 5) dropped the active session from /dashboard while /history still showed it.
    const quizIds = [
      '507f1f77bcf86cd799439101',
      '507f1f77bcf86cd799439102',
      '507f1f77bcf86cd799439103',
      '507f1f77bcf86cd799439104',
      '507f1f77bcf86cd799439105',
    ]
    const sessionIds = [
      '607f1f77bcf86cd799439101',
      '607f1f77bcf86cd799439102',
      '607f1f77bcf86cd799439103',
      '607f1f77bcf86cd799439104',
      '607f1f77bcf86cd799439105',
    ]
    const activeQuizId = '507f1f77bcf86cd799439199'
    const activeSessionId = '607f1f77bcf86cd7994391bb'

    const completedSessions = quizIds.map((qid, i) => ({
      _id: new Types.ObjectId(sessionIds.at(i)),
      quiz_id: new Types.ObjectId(qid),
      mode: 'immediate',
      status: 'completed',
      score: 40,
      user_answers: [],
      started_at: new Date(`2026-07-27T0${i}:00:00Z`),
      completed_at: new Date(`2026-07-27T0${i}:30:00Z`),
      is_temp: false,
    }))
    const activeSession = {
      _id: new Types.ObjectId(activeSessionId),
      quiz_id: new Types.ObjectId(activeQuizId),
      mode: 'flashcard',
      status: 'active',
      score: 0,
      user_answers: [],
      started_at: new Date('2026-07-24T01:00:00Z'), // older than every completed session
      is_temp: false,
    }
    const allSessions = [...completedSessions, activeSession]
    const quizzes = [...quizIds, activeQuizId].map((qid) => ({
      _id: new Types.ObjectId(qid),
      title: `Quiz ${qid.slice(-3)}`,
      course_code: `CODE${qid.slice(-3)}`,
      questionCount: 50,
      category_id: null,
      created_by: null,
      is_saved_from_explore: false,
      original_quiz_id: null,
    }))

    ;(QuizSession.aggregate as jest.Mock)
      .mockResolvedValueOnce(completedSessions.map((s) => ({ latestSessionId: s._id }))) // completed latest ids
      .mockResolvedValueOnce([{ latestSessionId: activeSession._id }]) // active latest ids
      .mockResolvedValueOnce(
        completedSessions.map((s) => ({ _id: { quiz_id: s.quiz_id, mode_group: 'assessment' } }))
      ) // all completed groups

    ;(QuizSession.find as jest.Mock).mockImplementation((query: any) => {
      const ids: any[] = query?._id?.$in ?? []
      const docs = allSessions.filter((s) => ids.some((id) => String(id) === String(s._id)))
      return { sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(docs) }) }
    })
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(quizzes) })

    const req = new Request('http://localhost/api/student/dashboard')
    const res = await (GET as any)(req, { params: {} })

    expect(res.status).toBe(200)
    const active = res.body.recentActivities.find((a: any) => a.status === 'active')
    expect(active).toBeDefined()
    expect(active.id).toBe(activeSessionId)
    // In-progress sessions surface ahead of completed ones
    expect(res.body.recentActivities[0].status).toBe('active')
    expect(res.body.recentActivities.length).toBeLessThanOrEqual(6)
  })
})
