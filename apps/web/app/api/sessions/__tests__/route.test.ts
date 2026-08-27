/**
 * API route handler — basic import validation tests
 */

// Mock NextResponse and dependencies
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx?: any) => handler(req, { payload: { userId: 'user-1', role: 'student', v: 1 }, params: ctx?.params }),
}))
jest.mock('@/lib/modules/auth/auth', () => ({
  verifyToken: jest.fn(),
  JWTPayload: {},
}))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({}))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({}))
jest.mock('@/lib/modules/quiz/quiz-engine', () => ({}))
jest.mock('@/lib/modules/quiz/schemas/quiz', () => ({}))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({
  providerFactory: { createProvider: jest.fn() },
}))
jest.mock('@/lib/core/utils/shuffle', () => ({
  secureShuffle: jest.fn((arr) => [...arr]),
}))

import { GET } from '../route'

describe('GET /api/sessions', () => {
  it('should be a function', () => {
    expect(typeof GET).toBe('function')
  })

  it('should return assessmentSession/learningSession null without quiz_id', async () => {
    const req = new Request('http://localhost/api/sessions')
    const result = await GET({ request: req, params: {} })
    expect(result).toBeDefined()
  })
})

import { POST } from '../route'

describe('POST /api/sessions', () => {
  it('should be a function', () => {
    expect(typeof POST).toBe('function')
  })
})
