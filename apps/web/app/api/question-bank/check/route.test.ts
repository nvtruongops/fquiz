jest.mock('@/lib/core/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/modules/auth/with-auth', () => ({ withAuth: (handler: unknown) => handler }))
jest.mock('@/lib/modules/quiz/models/Quiz', () => ({ Quiz: { find: jest.fn() } }))
jest.mock('@/lib/modules/quiz/question-bank-manager', () => ({ checkQuestionsInBank: jest.fn() }))

import { Quiz } from '@/lib/modules/quiz/models/Quiz'
import { checkQuestionsInBank } from '@/lib/modules/quiz/question-bank-manager'
import { getPublicQuizFilter } from '@/lib/modules/quiz/utils/public-quiz-filter'
import { POST } from './route'

const categoryId = '507f1f77bcf86cd799439011'
const userId = '507f1f77bcf86cd799439012'

describe('POST /api/question-bank/check visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('limits answer variants and conflict fields to accessible quiz sources', async () => {
    const visibleQuizId = '507f1f77bcf86cd799439013'
    ;(Quiz.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{
          _id: { toString: () => visibleQuizId },
          course_code: 'PUBLIC101',
          questions: [{ text: 'Question text', options: ['A', 'B'], correct_answer: [1] }],
        }]),
      }),
    })
    ;(checkQuestionsInBank as jest.Mock).mockResolvedValue(new Map([[0, {
      hasConflict: true,
      conflictType: 'different_answer',
      message: 'private-code-and-answer-must-not-leak',
      existingQuestion: {
        _id: 'private-question-id',
        text: 'Question text',
        options: ['A', 'B'],
        correct_answer: [0],
        explanation: 'private-explanation-marker',
        used_in_quizzes: ['PRIVATE101'],
        used_in_quiz_ids: ['private-quiz-id'],
        usage_count: 9,
      },
    }]]))

    const response = await POST(new Request('https://fquiz.online/api/question-bank/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        category_id: categoryId,
        questions: [{ text: 'Question text', options: ['A', 'B'], correct_answer: [0] }],
      }),
    }), { params: {}, payload: { userId, role: 'student' } } as any)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(JSON.stringify(body)).not.toContain('private-code-and-answer-must-not-leak')
    expect(JSON.stringify(body)).not.toContain('private-explanation-marker')
    expect(JSON.stringify(body)).not.toContain('PRIVATE101')
    expect(JSON.stringify(body)).not.toContain('private-question-id')
    expect(body.conflicts.different_answer[0].existingQuestion.correct_answer).toEqual([1])
    expect(body.conflicts.different_answer[0].existingQuestion.used_in_quizzes).toEqual(['PUBLIC101'])

    const filter = (Quiz.find as jest.Mock).mock.calls[0][0]
    expect(filter.$or).toEqual([
      getPublicQuizFilter(),
      { created_by: expect.objectContaining({ toString: expect.any(Function) }) },
    ])
    expect(checkQuestionsInBank).toHaveBeenCalledWith(
      categoryId,
      [{ text: 'Question text', options: ['A', 'B'], correct_answer: [0] }],
      [{ toString: expect.any(Function) }],
    )
  })
})
