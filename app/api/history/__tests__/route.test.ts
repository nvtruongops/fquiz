/**
 * Unit tests for GET /api/history route handler
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

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  },
}))

jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    aggregate: jest.fn().mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439022',
        quiz_id: null,
        score: 10,
        mode: 'immediate',
        status: 'completed',
        started_at: new Date(),
        duration_minutes: 5,
        user_answers: [],
      },
    ]),
  },
}))

import { GET } from '../route'

describe('GET /api/history', () => {
  it('should handle sessions with null quiz_id without throwing 500 error', async () => {
    const req = new Request('http://localhost/api/history?page=1&limit=20')
    const res = await (GET as any)(req, { params: {} })

    expect(res.status).toBe(200)
    expect(res.body).toBeDefined()
    expect(res.body.history).toHaveLength(1)
    expect(res.body.history[0].quiz_id).toBe('')
  })
})
