import { GET, POST } from '../route'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'

jest.mock('next/server', () => ({ NextResponse: class {
  static json(body: any, init?: any) { return { body, status: init?.status ?? 200 } }
} }))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: async () => {} }))
jest.mock('@/lib/modules/auth/with-auth', () => ({ withAuth: (handler: any) => (req: Request) => handler(req, { payload: { userId: '507f1f77bcf86cd799439011', role: 'student' } }) }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { findById: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { find: jest.fn(), create: jest.fn(), deleteMany: jest.fn().mockResolvedValue({}) } }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: {} }))
jest.mock('@/lib/modules/quiz/quiz-engine', () => ({ syncUniqueStudentCount: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/modules/quiz/quiz-stats-queue', () => ({ enqueueUniqueStudentCountSync: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/core/security/rate-limit/provider', () => ({
  RateLimitStoreUnavailableError: class RateLimitStoreUnavailableError extends Error {},
  providerFactory: { createProvider: () => ({ check: async () => ({ success: true }) }) },
}))

const quizId = '507f1f77bcf86cd799439012'
const active = { _id: 'session-1', quiz_id: quizId, mode: 'review', status: 'active', score: 1,
  user_answers: [{ question_index: 0, answer_index: 0, answer_indexes: [0, 1], is_correct: true }],
  questions_cache: [{ correct_answer: [0, 1], explanation: 'Secret' }], current_question_index: 0 }

beforeEach(() => {
  jest.clearAllMocks()
  ;(Quiz.findById as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => ({
    _id: quizId, is_public: true, status: 'published', course_code: 'TEST', title: 'Quiz',
    questions: [{ _id: '507f1f77bcf86cd799439013', text: 'Choose 2 answers', options: ['A', 'B', 'C'], correct_answer: [0, 1], explanation: 'Secret' }],
  }) }) })
  ;(QuizSession.find as jest.Mock).mockReturnValue({ sort: () => ({ lean: async () => [] }) })
  ;(QuizSession.create as jest.Mock).mockImplementation(async (params) => ({ ...params, _id: 'session-1' }))
})

it('omits score and correctness from new active review payloads', async () => {
  const response = await POST(new Request('https://web.example.test/api/sessions', { method: 'POST', body: JSON.stringify({ quiz_id: quizId, mode: 'review', difficulty: 'sequential', shuffle_options: false }) }))
  expect(response.status).toBe(201)
  expect(response.body.initialData.session).not.toHaveProperty('score')
  expect(response.body.initialData.session.user_answers).toEqual([])
  expect(response.body.preloadData.questions[0]).not.toHaveProperty('correct_answer')
  expect(response.body.preloadData.questions[0]).not.toHaveProperty('explanation')
})

it('returns only public resume metadata for active review list and continue responses', async () => {
  ;(QuizSession.find as jest.Mock).mockReturnValue({ sort: () => ({ lean: async () => [active] }) })
  const list = await GET(new Request(`https://web.example.test/api/sessions?quiz_id=${quizId}`))
  expect(list.body.assessmentSession).toMatchObject({ sessionId: 'session-1', mode: 'review', answeredCount: 1 })
  for (const key of ['score', 'user_answers', 'questions_cache', 'correct_count']) expect(list.body.assessmentSession).not.toHaveProperty(key)
  const resumed = await POST(new Request('https://web.example.test/api/sessions', { method: 'POST', body: JSON.stringify({ quiz_id: quizId, mode: 'review', difficulty: 'sequential', action: 'continue' }) }))
  expect(resumed.status).toBe(200)
  expect(resumed.body.resumed).toBe(true)
  for (const key of ['score', 'user_answers', 'questions_cache', 'correct_count']) expect(resumed.body).not.toHaveProperty(key)
})
