jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({ withAuth: (handler: unknown) => handler }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { findOne: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { exists: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizComment', () => ({ QuizComment: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), findById: jest.fn() } }))
jest.mock('@/lib/modules/auth/models/User', () => ({ User: { find: jest.fn(), findById: jest.fn() } }))

import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizComment } from '@/lib/modules/quiz/models/QuizComment'
import { GET, POST } from './route'

const quizId = '507f1f77bcf86cd799439011'
const studentId = '507f1f77bcf86cd799439013'

function mockQuiz(value: unknown) {
  const lean = jest.fn().mockResolvedValue(value)
  const select = jest.fn().mockReturnValue({ lean })
  ;(Quiz.findOne as jest.Mock).mockReturnValue({ select })
}

describe('quiz comments visibility', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not query comments for a foreign private quiz', async () => {
    mockQuiz(null)

    const response = await GET(
      new Request(`https://fquiz.online/api/v1/public/quizzes/${quizId}/comments`),
      { params: Promise.resolve({ id: quizId }), payload: { userId: studentId, role: 'student' } } as any,
    )

    expect(response.status).toBe(404)
    expect(QuizComment.find).not.toHaveBeenCalled()
  })

  it('allows the private quiz owner to read comments', async () => {
    mockQuiz({ _id: quizId, created_by: studentId, is_public: false, status: 'draft' })
    const comments = { sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }
    ;(QuizComment.find as jest.Mock).mockReturnValue(comments)

    const response = await GET(
      new Request(`https://fquiz.online/api/v1/public/quizzes/${quizId}/comments`),
      { params: Promise.resolve({ id: quizId }), payload: { userId: studentId, role: 'student' } } as any,
    )

    expect(response.status).toBe(200)
    expect(QuizComment.find).toHaveBeenCalledWith({ quiz_id: expect.anything() })
  })

  it('rejects posting a comment on another owner private quiz before parsing or writing', async () => {
    mockQuiz(null)

    const response = await POST(
      new Request(`https://fquiz.online/api/v1/public/quizzes/${quizId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'comment' }),
      }),
      { params: Promise.resolve({ id: quizId }), payload: { userId: studentId, role: 'student' } } as any,
    )

    expect(response.status).toBe(404)
    expect(QuizComment.create).not.toHaveBeenCalled()
  })
})
