jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({ withAuth: (handler: unknown) => handler }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { findOne: jest.fn() } }))

import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { GET } from './route'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'

const ownerId = '507f1f77bcf86cd799439011'
const otherId = '507f1f77bcf86cd799439012'

function mockQuiz(value: unknown) {
  const lean = jest.fn().mockResolvedValue(value)
  const select = jest.fn().mockReturnValue({ lean })
  ;(Quiz.findOne as jest.Mock).mockReturnValue({ select })
  return { select, lean }
}

describe('GET /api/student/quizzes/check-code visibility', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not disclose a foreign private quiz course code or metadata', async () => {
    mockQuiz(null)

    const response = await GET(
      new Request('https://fquiz.online/api/student/quizzes/check-code?code=PRIVATE101'),
      { params: {}, payload: { userId: otherId, role: 'student' } } as any,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ exists: false })
    const filter = (Quiz.findOne as jest.Mock).mock.calls[0][0]
    expect(filter.$or).toEqual([
      getPublicQuizFilter(),
      { created_by: expect.anything() },
    ])
    expect(String(filter.$or[1].created_by)).toBe(otherId)
  })

  it('returns the existing public quiz duplicate shape', async () => {
    mockQuiz({
      _id: { toString: () => 'public-quiz' },
      title: 'Public quiz',
      course_code: 'PUBLIC101',
      questionCount: 4,
      status: 'published',
    })

    const response = await GET(
      new Request('https://fquiz.online/api/student/quizzes/check-code?code=PUBLIC101'),
      { params: {}, payload: { userId: ownerId, role: 'student' } } as any,
    )

    expect(await response.json()).toMatchObject({ exists: true, quiz: { title: 'Public quiz', course_code: 'PUBLIC101' } })
  })
})
