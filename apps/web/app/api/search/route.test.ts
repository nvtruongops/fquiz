jest.mock('@fquiz/auth', () => ({ getClientIp: jest.fn(() => '127.0.0.1') }))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn().mockResolvedValue({ userId: 'student-1', role: 'student' }) }))
jest.mock('@/lib/modules/auth/with-auth', () => ({
  withAuth: (handler: (request: Request, context: { payload: unknown }) => unknown) =>
    (request: Request) => handler(request, { payload: { userId: 'student-1', role: 'student' } }),
}))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { find: jest.fn(), countDocuments: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: { findOne: jest.fn() } }))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({ rateLimiter: { check: jest.fn().mockResolvedValue({ success: true }) } }))
jest.mock('@/lib/core/utils/logger', () => ({ logSecurityEvent: jest.fn() }))

import { GET } from './route'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

function quizQuery(rows: unknown[]) {
  return {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  }
}

describe('GET /api/search public visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Quiz.find as jest.Mock).mockReturnValue(quizQuery([]))
    ;(Quiz.countDocuments as jest.Mock).mockResolvedValue(0)
  })

  it('applies the public quiz predicate to empty-filter search and its count', async () => {
    const response = await GET(new Request('https://fquiz.online/api/search'))

    expect(response.status).toBe(200)
    expect(Quiz.find).toHaveBeenCalledWith(getPublicQuizFilter(), expect.any(Object))
    expect(Quiz.countDocuments).toHaveBeenCalledWith(getPublicQuizFilter())
  })
})
