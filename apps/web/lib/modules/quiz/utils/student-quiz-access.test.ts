jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { findOne: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { exists: jest.fn() } }))

import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { findStudentAccessibleQuiz, getStudentQuizVisibilityFilter, getUnexpiredQuizSessionFilter } from './student-quiz-access'

const quizId = '507f1f77bcf86cd799439011'
const userId = '507f1f77bcf86cd799439012'
const otherId = '507f1f77bcf86cd799439013'

function mockQuiz(quiz: unknown) {
  ;(Quiz.findOne as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(quiz) }),
  })
}

describe('student quiz visibility', () => {
  beforeEach(() => jest.clearAllMocks())

  it('allows an owner to access a private quiz', async () => {
    mockQuiz({ _id: quizId, created_by: userId, is_public: false, status: 'draft' })
    await expect(findStudentAccessibleQuiz(quizId, userId)).resolves.toBeTruthy()
    expect((Quiz.findOne as jest.Mock).mock.calls[0][0].$or).toContainEqual({ created_by: expect.anything() })
  })

  it('allows a public published quiz and rejects a missing public flag', async () => {
    mockQuiz({ _id: quizId, created_by: otherId, is_public: true, status: 'published' })
    await expect(findStudentAccessibleQuiz(quizId, userId)).resolves.toBeTruthy()
    expect((Quiz.findOne as jest.Mock).mock.calls[0][0].$or[0]).toMatchObject({ is_public: true, status: 'published' })
    mockQuiz(null)
    await expect(findStudentAccessibleQuiz(quizId, userId)).resolves.toBeNull()
  })

  it('allows a student-owned saved copy through its owner identity', async () => {
    mockQuiz({ _id: quizId, created_by: userId, is_saved_from_explore: true, is_public: false, status: 'draft' })
    await expect(findStudentAccessibleQuiz(quizId, userId)).resolves.toBeTruthy()
  })

  it('allows a temporary quiz only when the student has a session', async () => {
    mockQuiz({ _id: quizId, created_by: otherId, is_temp: true, is_public: false, status: 'draft' })
    ;(QuizSession.exists as jest.Mock).mockResolvedValue({ _id: 'session' })
    await expect(findStudentAccessibleQuiz(quizId, userId)).resolves.toBeTruthy()
    const sessionFilter = (QuizSession.exists as jest.Mock).mock.calls[0][0]
    expect(sessionFilter.quiz_id.toString()).toBe(quizId)
    expect(sessionFilter.student_id.toString()).toBe(userId)
    expect(sessionFilter.is_temp).toBe(true)
    expect(sessionFilter.$or).toEqual(expect.arrayContaining([
      { expires_at: { $exists: false } },
      { expires_at: null },
      { expires_at: { $gt: expect.any(Date) } },
    ]))
    expect((Quiz.findOne as jest.Mock).mock.calls[0][0].$or).toContainEqual({ is_temp: true })
  })

  it('keeps completed sessions without expiry valid but expires timed sessions by query time', () => {
    const now = new Date('2026-10-30T00:00:00Z')
    expect(getUnexpiredQuizSessionFilter(now)).toEqual({
      $or: [
        { expires_at: { $exists: false } },
        { expires_at: null },
        { expires_at: { $gt: now } },
      ],
    })
  })

  it('builds a query filter for only public, owned, and session-authorized quiz sources', () => {
    const filter = getStudentQuizVisibilityFilter(userId, [quizId])
    expect(filter.$or).toHaveLength(3)
    expect(filter.$or[0]).toMatchObject({ is_public: true, status: 'published' })
    expect(filter.$or[2]).toMatchObject({ is_temp: true, _id: { $in: [quizId] } })
  })
})
