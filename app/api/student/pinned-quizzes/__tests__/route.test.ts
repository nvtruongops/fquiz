/**
 * Unit tests for GET & POST /api/student/pinned-quizzes
 */

import { GET, POST } from '../route'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

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

const mockUserSelectLean = jest.fn()
const mockUserUpdateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 })

jest.mock('@/lib/modules/auth/models/User', () => ({
  User: {
    findById: jest.fn(() => ({
      select: jest.fn().mockReturnValue({ lean: mockUserSelectLean }),
    })),
    updateOne: jest.fn((...args) => mockUserUpdateOne(...args)),
  },
}))

describe('GET & POST /api/student/pinned-quizzes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET should return empty array if user has no pinned quizzes', async () => {
    mockUserSelectLean.mockResolvedValueOnce({ pinned_quizzes: [] })
    const req = new Request('http://localhost:3000/api/student/pinned-quizzes')
    const res = (await GET(req)) as any

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ pinnedQuizzes: [] })
  })

  it('POST should pin a quiz if not already pinned', async () => {
    mockUserSelectLean.mockResolvedValueOnce({ pinned_quizzes: [] })
    const req = new Request('http://localhost:3000/api/student/pinned-quizzes', {
      method: 'POST',
      body: JSON.stringify({ quizId: 'quiz_123' }),
    })
    const res = (await POST(req, {} as any)) as any

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ pinned: true, pinnedQuizzes: ['quiz_123'] })
    expect(mockUserUpdateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011' },
      { $addToSet: { pinned_quizzes: 'quiz_123' } }
    )
  })

  it('POST should unpin a quiz if already pinned', async () => {
    mockUserSelectLean.mockResolvedValueOnce({ pinned_quizzes: ['quiz_123'] })
    const req = new Request('http://localhost:3000/api/student/pinned-quizzes', {
      method: 'POST',
      body: JSON.stringify({ quizId: 'quiz_123' }),
    })
    const res = (await POST(req, {} as any)) as any

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ pinned: false, pinnedQuizzes: [] })
    expect(mockUserUpdateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011' },
      { $pull: { pinned_quizzes: 'quiz_123' } }
    )
  })

  it('POST should return 400 if quizId is missing', async () => {
    const req = new Request('http://localhost:3000/api/student/pinned-quizzes', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = (await POST(req, {} as any)) as any

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('quizId required')
  })
})
