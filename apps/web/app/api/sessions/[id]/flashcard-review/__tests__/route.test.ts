/**
 * Flashcard review route test
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })),
  },
}))

jest.mock('@/lib/core/utils/shuffle', () => ({
  secureShuffle: jest.fn((arr) => [...arr]),
}))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: Function) => handler,
}))
jest.mock('@/lib/modules/auth/auth', () => ({
  verifyToken: jest.fn(),
  JWTPayload: {},
}))
jest.mock('@/lib/modules/quiz/session-utils', () => ({
  validateQuizSessionRequest: jest.fn(),
}))

import { POST } from '../route'

describe('POST /api/sessions/[id]/flashcard-review', () => {
  it('should be a function', () => {
    expect(typeof POST).toBe('function')
  })
})
