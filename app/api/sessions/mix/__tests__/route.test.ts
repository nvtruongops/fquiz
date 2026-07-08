/**
 * Simple test for mix-quiz route
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => handler,
}))
jest.mock('@/lib/modules/auth/auth', () => ({
  verifyToken: jest.fn(),
  JWTPayload: {},
}))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({}))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({
  QuizSession: {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ _id: 'session-1' }),
    deleteOne: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({}),
  },
}))
jest.mock('@/lib/core/schemas/common', () => ({
  MongoIdSchema: { safeParse: jest.fn(() => ({ success: true })) },
}))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({
  providerFactory: { createProvider: () => ({ check: jest.fn(() => ({ success: true })) }) },
}))
jest.mock('@/lib/core/queue/qstash', () => ({
  publishJob: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
}))

import { POST } from '../route'

describe('POST /api/sessions/mix', () => {
  it('should be a function', () => {
    expect(typeof POST).toBe('function')
  })
})
