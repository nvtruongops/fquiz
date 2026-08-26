import { MongoQuestionRetriever } from '../retrieval/mongo-question-retriever'
import { QuestionBank } from '@/lib/modules/quiz/models/QuestionBank'
import { Quiz } from '@/lib/modules/quiz/models/Quiz'

jest.mock('@/lib/modules/quiz/models/QuestionBank', () => ({
  QuestionBank: {
    find: jest.fn(),
  },
}))

jest.mock('@/lib/modules/quiz/models/Quiz', () => ({
  Quiz: {
    find: jest.fn(),
  },
}))

describe('MongoQuestionRetriever & Invariant 5 (Partial Failure Resiliency Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('INVARIANT 5: should recover gracefully when QuestionBank query fails but Quiz query succeeds', async () => {
    // QuestionBank throws / fails
    ;(QuestionBank.find as jest.Mock).mockImplementation(() => {
      throw new Error('QuestionBank DB connection error')
    })

    // Quiz query succeeds
    ;(Quiz.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'quiz-1',
              course_code: 'PMG201C',
              category_id: 'cat-1',
              questions: [
                {
                  _id: 'q-quiz-1',
                  text: 'What is communication management in PMG?',
                  options: ['A. Scope', 'B. Channels'],
                  correct_answer: [1],
                },
              ],
            },
          ]),
        }),
      }),
    })

    const retriever = new MongoQuestionRetriever(300)
    const results = await retriever.search({
      courseCode: 'PMG201C',
      categoryId: 'cat-1',
      currentQuestionText: 'Different question text',
      targetOptionText: 'Channels',
      userQuery: 'Có câu nào đáp án Channels không?',
      intent: 'FIND_SIMILAR_QUESTION',
    })

    // Assert that quiz results were still retrieved despite QuestionBank failure
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].sourceType).toBe('quiz')
    expect(results[0].content).toContain('communication management')
  })

  it('should exclude the current question being taken from candidates', async () => {
    const currentQText = 'What is the formula for communication channels?'

    ;(QuestionBank.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: 'qb-same-q',
              text: currentQText, // Exactly same as current question
              options: ['A. N(N-1)/2', 'B. N^2'],
              correct_answer: 0,
            },
            {
              _id: 'qb-different-q',
              text: 'A team has 10 members, how many communication channels?',
              options: ['A. 45', 'B. 90'],
              correct_answer: 0,
            },
          ]),
        }),
      }),
    })

    ;(Quiz.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    })

    const retriever = new MongoQuestionRetriever(300)
    const results = await retriever.search({
      courseCode: 'PMG201C',
      categoryId: 'cat-1',
      currentQuestionText: currentQText,
      targetOptionText: '45',
      userQuery: 'Tìm câu tương tự',
      intent: 'FIND_SIMILAR_QUESTION',
    })

    expect(results.length).toBe(1)
    expect(results[0].content).not.toBe(currentQText)
    expect(results[0].content).toContain('10 members')
  })
})
