jest.mock('@/lib/auth/with-auth', () => ({
  withAuth: (handler: any) => handler,
}))
jest.mock('@/lib/db/mongodb', () => ({ connectDB: jest.fn() }))
jest.mock('@/lib/models/Quiz', () => ({ Quiz: { find: jest.fn(), aggregate: jest.fn() } }))
jest.mock('@/lib/models/QuestionBank', () => ({ QuestionBank: { findOneAndUpdate: jest.fn() } }))

import { Quiz } from '@/lib/models/Quiz'
import { GET } from './route'

describe('GET /api/question-bank/conflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('groups legacy quiz questions without stored IDs and reports different answers', async () => {
    const questionText = 'Legacy question without a stored ID?'
    ;(Quiz.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'quiz-1',
          course_code: 'COURSE_A',
          questions: [{ text: questionText, options: ['Correct answer', 'Wrong answer'], correct_answer: [0] }],
        },
        {
          _id: 'quiz-2',
          course_code: 'COURSE_B',
          questions: [{ text: questionText, options: ['Correct answer', 'Wrong answer'], correct_answer: [1] }],
        },
      ]),
    })

    const response = await GET(
      new Request('https://admin.example.test/api/question-bank/conflicts?category_id=all')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      total_conflicts: 1,
      conflicts: [
        {
          text: questionText,
          answer_groups: [
            { answer_texts: ['correct answer'], quizzes: ['COURSE_A'] },
            { answer_texts: ['wrong answer'], quizzes: ['COURSE_B'] },
          ],
        },
      ],
    })
  })
})
