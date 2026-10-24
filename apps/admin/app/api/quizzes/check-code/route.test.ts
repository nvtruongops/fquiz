jest.mock('@/lib/auth/auth', () => ({ verifyAdminToken: jest.fn() }))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/Quiz', () => ({ Quiz: { findOne: jest.fn() } }))

import { verifyAdminToken } from '@/lib/auth/auth'
import { connectDB } from '@/lib/db/mongodb'
import { Quiz } from '@/lib/models/Quiz'
import { GET } from './route'

describe('GET /api/quizzes/check-code', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(connectDB as jest.Mock).mockResolvedValue(undefined)
  })

  test('requires an Admin before querying quiz metadata', async () => {
    ;(verifyAdminToken as jest.Mock).mockResolvedValue(null)

    const response = await GET(new Request('https://admin.example.test/api/quizzes/check-code?code=private'))

    expect(response.status).toBe(401)
    expect(Quiz.findOne).not.toHaveBeenCalled()
  })

  test('allows an authenticated Admin to check code uniqueness', async () => {
    ;(verifyAdminToken as jest.Mock).mockResolvedValue({ userId: 'admin-1', role: 'admin', v: 1 })
    ;(Quiz.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'quiz-1',
          title: 'Private quiz',
          course_code: 'PRIVATE-1',
          questionCount: 2,
          status: 'draft',
        }),
      }),
    })

    const response = await GET(new Request('https://admin.example.test/api/quizzes/check-code?code=PRIVATE-1'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      exists: true,
      quiz: { _id: 'quiz-1', status: 'draft', questionCount: 2 },
    })
  })
})
