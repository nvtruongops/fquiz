jest.mock('@/lib/modules/auth/with-auth', () => ({ withAuth: (handler: Function) => handler }))
jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/modules/auth/authz', () => ({ authorizeResource: jest.fn() }))
jest.mock('@/lib/core/utils/logger', () => ({ logSecurityEvent: jest.fn() }))
jest.mock('@/lib/modules/quiz/question-id-generator', () => ({ generateQuestionId: jest.fn() }))
jest.mock('@/lib/modules/quiz/utils/category-helper', () => ({ ensureCategoryForCourseCode: jest.fn() }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: { findById: jest.fn(), findOne: jest.fn(), aggregate: jest.fn(), updateOne: jest.fn() },
}))
jest.mock('@/lib/modules/quiz/models/QuizSession', () => ({ QuizSession: { exists: jest.fn(), aggregate: jest.fn() } }))
jest.mock('@/lib/modules/quiz/models/Category', () => ({ Category: { findById: jest.fn() } }))

import { Types } from 'mongoose'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { QuizSession } from '@/lib/modules/quiz/models/QuizSession'
import { Category } from '@/lib/modules/quiz/models/Category'
import { GET } from './route'

const quizId = '507f1f77bcf86cd799439011'
const studentId = '507f1f77bcf86cd799439012'
const ownerId = '507f1f77bcf86cd799439013'

function quizQuery(value: unknown) {
  const lean = jest.fn().mockResolvedValue(value)
  const select = jest.fn().mockReturnValue({ lean })
  return { select, lean }
}

describe('GET /api/student/quizzes/[id] temporary-session access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const id = new Types.ObjectId(quizId)
    const ownerObjectId = new Types.ObjectId(ownerId)
    ;(Quiz.findById as jest.Mock)
      .mockReturnValueOnce(quizQuery({
        _id: id,
        created_by: ownerObjectId,
        status: 'draft',
        is_public: false,
        is_temp: true,
      }))
      .mockReturnValueOnce(quizQuery({
        _id: id,
        created_by: ownerObjectId,
        status: 'draft',
        is_public: false,
        is_temp: true,
        title: 'Private temporary quiz',
        course_code: 'PRIVATE101',
        questionCount: 1,
        studentCount: 0,
        questions: [{ text: 'Private question', correct_answer: [1] }],
      }))
    ;(Quiz.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) })
    ;(QuizSession.exists as jest.Mock).mockImplementation((filter: Record<string, any>) => {
      const validExpiryClause = filter.$or?.some((clause: Record<string, any>) =>
        clause.expires_at?.$gt instanceof Date,
      )
      // This fixture represents a stale session that exists in MongoDB but has already expired.
      return Promise.resolve(validExpiryClause ? null : { _id: new Types.ObjectId() })
    })
    ;(QuizSession.aggregate as jest.Mock).mockResolvedValue([{ total: 0 }])
    ;(Quiz.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 0 })
    ;(Category.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) })
  })

  it('denies a temporary quiz when the only matching session has expired', async () => {
    const response = await GET(
      new Request(`https://fquiz.online/api/student/quizzes/${quizId}`),
      { params: Promise.resolve({ id: quizId }), payload: { userId: studentId, role: 'student' } } as any,
    )

    expect(response.status).toBe(403)
  })
})
