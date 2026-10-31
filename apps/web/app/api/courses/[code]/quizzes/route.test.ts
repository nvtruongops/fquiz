jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/auth', () => ({ verifyToken: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { find: jest.fn(), findById: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { aggregate: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: { find: jest.fn() } }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { findById: jest.fn() } }))
jest.mock('@/lib/core/utils/logger', () => ({ __esModule: true, default: { error: jest.fn() } }))

import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { Category } from '@/lib/modules/quiz/models/Category'
import { GET } from './route'

describe('GET /api/courses/[code]/quizzes visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Category.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    })
    ;(Quiz.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
  })

  it('requires explicitly public, published quizzes in course listings', async () => {
    const response = await GET(
      new Request('https://fquiz.online/api/courses/ABC101/quizzes'),
      { params: Promise.resolve({ code: 'ABC101' }) },
    )

    expect(response.status).toBe(200)
    expect(Quiz.find).toHaveBeenCalledWith(expect.objectContaining({
      is_public: true,
      status: 'published',
      is_temp: { $ne: true },
      is_saved_from_explore: { $ne: true },
    }), expect.any(Object))
  })
})
