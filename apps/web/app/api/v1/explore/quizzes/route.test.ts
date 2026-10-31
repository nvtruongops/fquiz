import { NextRequest } from 'next/server'

jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { find: jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
}) } }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }) } }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: { find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }) } }))
jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/quiz/public-quiz-listing-helpers', () => ({
  parseQuizListingParams: jest.fn().mockReturnValue({ limit: 10, offset: 0, search: undefined, category_id: undefined, sort: 'popular' }),
  buildQuizListingQuery: jest.fn().mockReturnValue({ is_public: true, status: 'published' }),
  loadExploreSessionMap: jest.fn().mockResolvedValue(new Map()),
  mapExploreQuizRows: jest.fn().mockReturnValue([]),
}))

import { GET } from './route'

describe('GET /api/v1/explore/quizzes cache policy', () => {
  it('marks the response private and non-cacheable because it may include user session data', async () => {
    const response = await GET(new NextRequest('https://fquiz.online/api/v1/explore/quizzes'))

    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
